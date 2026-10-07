import { z } from 'zod';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool, SafeToolInputError } from '../tool-wrapper.js';

export const JobIdSchema = z.string().regex(/^vjob_[a-f0-9]{32}$/);
const ItemId = z.string().min(1).max(128).refine(s => s === s.trim() && Buffer.byteLength(s) <= 128);
const Identity = z.string().min(1).max(200).regex(/^[\x20-\x7e]+$/).refine(s => s === s.trim());
const Room = z.object({ name: z.string().optional(), roomType: z.string().optional(), zone: z.string().optional() }).passthrough();
const AssessmentInput = z.object({ inputSource: z.enum(['seller-supplied', 'plan-derived', 'measured']).optional(), rooms: z.array(Room).min(1).optional() }).passthrough();
const PlanInput = z.object({ rooms: z.array(Room).min(1).optional(), grid: z.union([z.string(), z.array(z.array(z.string()))]).optional(), plot: z.object({ width: z.number().positive().optional(), length: z.number().positive().optional() }).passthrough().optional() }).passthrough();
const ReportInput = PlanInput.extend({ format: z.enum(['json','html']).optional(), brand: z.object({ reportTitle: z.string().optional(), generatedFor: z.string().optional() }).passthrough().optional() });
const item = (input: z.ZodTypeAny) => z.object({ id: ItemId, input }).strict();
const common = { webhookId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/).optional() };
export const VastuJobRequestSchema = z.discriminatedUnion('operation', [
  z.object({ ...common, operation: z.literal('assessments'), items: z.array(item(AssessmentInput)).min(1).max(1000) }).strict(),
  z.object({ ...common, operation: z.literal('plan-analyze'), items: z.array(item(PlanInput)).min(1).max(1000) }).strict(),
  z.object({ ...common, operation: z.literal('plan-report'), items: z.array(item(ReportInput)).min(1).max(1000) }).strict(),
]).superRefine((request,ctx) => {
  if (new Set(request.items.map(i=>i.id)).size !== request.items.length) ctx.addIssue({code:z.ZodIssueCode.custom,message:'Item IDs must be unique'});
  if (Buffer.byteLength(JSON.stringify(request)) > 5*1024*1024 || request.items.some(i=>Buffer.byteLength(JSON.stringify(i.input)) > 128*1024)) ctx.addIssue({code:z.ZodIssueCode.custom,message:'Job must fit 5 MiB and each input 128 KiB'});
});
const Operation = z.enum(['assessments','plan-analyze','plan-report']);
const Status = z.enum(['queued','running','completed','partial','failed','cancelled']);
const SubmitData = z.object({ jobId: JobIdSchema, status: Status, itemCount: z.number().int(), maxCharge: z.number().nonnegative(), replayed: z.boolean() });
const Billing = z.object({ currency: z.literal('USD'), pricePerItem: z.number(), maxCharge: z.number(), charged: z.number(), basis: z.string() });
const StatusData = z.object({ jobId: JobIdSchema, status: Status, operation: Operation, itemCount: z.number().int(), counts: z.object({succeeded:z.number().int(),failed:z.number().int(),pending:z.number().int(),cancelled:z.number().int()}), billing: Billing, cancelRequested:z.boolean(), createdAt:z.number(),updatedAt:z.number(),expiresAt:z.number(),resultsUrl:z.string() }).passthrough();
const StoredArtifact = z.object({
  jobId: JobIdSchema, itemId: ItemId, artifactId: z.string().min(1),
  contentType: z.string(), filename: z.string(), content: z.string(),
});
const ResultItem = z.object({ id: ItemId, index:z.number().int(),status:z.number().int(),code:z.string().nullable().optional(),response:z.record(z.unknown()),artifacts:z.array(StoredArtifact).optional() });
const ResultsData = z.object({ jobId:JobIdSchema,jobStatus:Status,results:z.array(ResultItem),nextCursor:z.string().nullable() });
const envelope = <T extends z.ZodTypeAny>(data:T) => z.object({success:z.literal(true),data});
const ArtifactData = z.object({jobId:JobIdSchema,itemId:ItemId,artifactId:z.string(),uri:z.string(),contentType:z.string(),filename:z.string(),content:z.string(),billing:z.record(z.unknown()).optional()});
const jobPath = (id:string) => `/v2/astrology/vastu/jobs/${JobIdSchema.parse(id)}`;
const resourceUri = (jobId:string,itemId:string) => `vedika://vastu/jobs/${jobId}/items/${encodeURIComponent(itemId)}`;
function reply(value: unknown) { return {content:[{type:'text' as const,text:JSON.stringify(value)}],structuredContent:value as Record<string,unknown>}; }

export async function fetchVastuJobArtifact(client:VedikaApiClient, jobId:string, itemId:string) {
  JobIdSchema.parse(jobId); ItemId.parse(itemId);
  let cursor:string|undefined;
  const seen = new Set<string>();
  for (let page=0;page<20;page++) {
    const result = envelope(ResultsData).parse(await client.get(jobPath(jobId)+'/results',cursor ? {cursor} : undefined));
    if (result.data.jobId !== jobId) throw new SafeToolInputError('Job result identity does not match');
    const found = result.data.results.find(i=>i.id===itemId);
    if (found) {
      if (found.status!==200 || found.response['success']!==true || !found.response['data']) throw new SafeToolInputError('This item has no completed artifact; inspect its result and receipt');
      const data = found.response['data'] as Record<string,unknown>;
      const artifact = data['artifact'] as Record<string,unknown>|undefined;
      const stored = found.artifacts?.[0];
      if (stored && (stored.jobId !== jobId || stored.itemId !== itemId || stored.artifactId !== `${jobId}:${found.index}`)) {
        throw new SafeToolInputError('Artifact identity does not match the requested item');
      }
      return envelope(ArtifactData).parse({success:true,data:{jobId,itemId,artifactId:stored?.artifactId ?? `${jobId}:${found.index}`,uri:resourceUri(jobId,itemId),contentType:stored?.contentType ?? artifact?.['contentType'] ?? 'application/json',filename:stored?.filename ?? artifact?.['filename'] ?? 'vastu-result.json',content:stored?.content ?? artifact?.['content'] ?? JSON.stringify(data),billing:found.response['billing']}});
    }
    if (result.data.nextCursor===null) break;
    if (seen.has(result.data.nextCursor)) throw new SafeToolInputError('Results cursor repeated; retry later');
    seen.add(result.data.nextCursor); cursor=result.data.nextCursor;
  }
  throw new SafeToolInputError('Item artifact is not available yet; poll status and inspect results');
}

export function registerVastuJobTools(server:McpServer,client:VedikaApiClient):void {
  server.registerTool('vastu_job_submit',{description:'Submit 1-1000 assessment, plan analysis or report inputs. Retain the Idempotency-Key. Quote is maxCharge; only successful items charge the existing operation price. No job fee.',inputSchema:{request:VastuJobRequestSchema,idempotencyKey:Identity},outputSchema:envelope(SubmitData).shape},async args=>safeTool(async()=>reply(envelope(SubmitData).parse(await client.post('/v2/astrology/vastu/jobs',args.request,30000,args.idempotencyKey)))));
  server.registerTool('vastu_job_status',{description:'Read job status, counts and billing. Read-only; does not charge.',inputSchema:{jobId:JobIdSchema},outputSchema:envelope(StatusData).shape,annotations:{readOnlyHint:true}},async args=>safeTool(async()=>reply(envelope(StatusData).parse(await client.get(jobPath(args.jobId))))));
  server.registerTool('vastu_job_results',{description:'Read one results page with per-item response, receipts and artifacts. Pass nextCursor verbatim; null ends pagination. Results expire after 7 days.',inputSchema:{jobId:JobIdSchema,cursor:z.string().min(1).optional()},outputSchema:envelope(ResultsData).shape,annotations:{readOnlyHint:true}},async args=>safeTool(async()=>reply(envelope(ResultsData).parse(await client.get(jobPath(args.jobId)+'/results',args.cursor?{cursor:args.cursor}:undefined)))));
  server.registerTool('vastu_job_cancel',{description:'Cancel unstarted job items. An item already in flight can finish and charge. This call does not charge.',inputSchema:{jobId:JobIdSchema},outputSchema:envelope(StatusData).shape},async args=>safeTool(async()=>reply(envelope(StatusData).parse(await client.post(jobPath(args.jobId)+'/cancel',{})))));
  server.registerTool('vastu_job_artifact',{description:'Fetch the exact completed item artifact and original receipt by stable job and item IDs. HTML reports use format:html at submit. No arbitrary URLs are fetched; reads do not charge.',inputSchema:{jobId:JobIdSchema,itemId:ItemId},outputSchema:envelope(ArtifactData).shape,annotations:{readOnlyHint:true}},async args=>safeTool(async()=>reply(await fetchVastuJobArtifact(client,args.jobId,args.itemId))));
  server.registerResource('vastu-job-artifact',new ResourceTemplate('vedika://vastu/jobs/{jobId}/items/{itemId}',{list:undefined}),{description:'Completed Vastu item artifact, stable IDs and original receipt',mimeType:'application/json'},async(uri,vars)=>{
    try {
      const artifact = await fetchVastuJobArtifact(client,JobIdSchema.parse(vars['jobId']),ItemId.parse(decodeURIComponent(String(vars['itemId']))));
      return {contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(artifact)}]};
    } catch { throw new Error('Vastu artifact is unavailable; inspect job status and results'); }
  });
}

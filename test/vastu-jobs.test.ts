import assert from 'node:assert/strict';
import test from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { VedikaApiClient } from '../src/client.js';
import { registerVastuJobTools, VastuJobRequestSchema, fetchVastuJobArtifact } from '../src/tools/vastu-jobs.js';
const jobId = 'vjob_'+'a'.repeat(32);
const data = {jobId,status:'completed',operation:'plan-report',itemCount:1,counts:{succeeded:1,failed:0,pending:0,cancelled:0},billing:{currency:'USD',pricePerItem:0.01,maxCharge:0.01,charged:0.01,basis:'success only'},cancelRequested:false,createdAt:1,updatedAt:2,expiresAt:9,resultsUrl:'https://api.vedika.io/v2/vastu/jobs/'+jobId+'/results'};
const results = {success:true,data:{jobId,jobStatus:'completed',results:[{id:'unit-1',index:0,status:200,response:{success:true,data:{artifact:{contentType:'text/html',filename:'vastu-report.html',content:'<html>Report</html>'}},billing:{charged:0.01,currency:'USD'}}}],nextCursor:null}};

test('typed lifecycle tools execute over MCP and artifact resources retain exact receipt',async()=>{
  const calls:unknown[][]=[];
  const api = {post:async(path:string,body:unknown,timeout?:number,key?:string)=>{calls.push([path,body,key]);return path.endsWith('/cancel')?{success:true,data}:{success:true,data:{jobId,status:'queued',itemCount:1,maxCharge:0.01,replayed:false}};},get:async(path:string,params?:unknown)=>{calls.push([path,params]);return path.endsWith('/results')?results:{success:true,data};}} as unknown as VedikaApiClient;
  const server = new McpServer({name:'test',version:'1'});
  registerVastuJobTools(server,api);
  const client = new Client({name:'test-client',version:'1'});
  const [a,b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const tools = (await client.listTools()).tools;
    assert.equal(tools.length,5);
    for(const tool of tools) assert.ok(tool.inputSchema && tool.outputSchema);
    const request = {operation:'plan-report',items:[{id:'unit-1',input:{rooms:[{name:'kitchen',zone:'SE'}],format:'html'}}]};
    const submitted = await client.callTool({name:'vastu_job_submit',arguments:{request,idempotencyKey:'retain-key'}});
    assert.equal(submitted.isError,undefined);
    assert.equal((submitted.structuredContent as {data:{jobId:string}}).data.jobId,jobId);
    assert.equal(calls[0]?.[2],'retain-key');
    for(const name of ['vastu_job_status','vastu_job_results','vastu_job_cancel']) {
      assert.equal((await client.callTool({name,arguments:{jobId}})).isError,undefined);
    }
    const artifact = await client.callTool({name:'vastu_job_artifact',arguments:{jobId,itemId:'unit-1'}});
    const output = artifact.structuredContent as {data:{uri:string,content:string,billing:{charged:number}}};
    assert.equal(output.data.content,'<html>Report</html>');assert.equal(output.data.billing.charged,0.01);
    const resource=await client.readResource({uri:output.data.uri});assert.match(String(resource.contents[0]?.text),/vastu-report.html/);
    const before=calls.length;
    const rejected = await client.callTool({name:'vastu_job_status',arguments:{jobId:'../../other'}});
    assert.equal(rejected.isError,true);assert.equal(calls.length,before);
  } finally {await client.close();await server.close();}
});

test('submit validation rejects unsupported operations, duplicated IDs, unknown root fields and oversized items',()=>{
  const input={operation:'plan-analyze',items:[{id:'unit-1',input:{rooms:[{name:'kitchen',zone:'SE'}]}}]};
  assert.ok(VastuJobRequestSchema.safeParse(input).success);
  for(const request of [{...input,operation:'plan-generate'},{...input,items:[...input.items,...input.items]},{...input,extra:true},{...input,items:[{id:'unit-1',input:{note:'x'.repeat(128*1024)}}]}]) assert.equal(VastuJobRequestSchema.safeParse(request).success,false);
});

test('artifact lookup follows pages and fails closed on errors, mismatched jobs and repeated cursors',async()=>{
  let calls=0;
  const api={get:async()=>++calls===1?{success:true,data:{...results.data,results:[],nextCursor:'693439'}}:results} as unknown as VedikaApiClient;
  assert.equal((await fetchVastuJobArtifact(api,jobId,'unit-1')).data.content,'<html>Report</html>');assert.equal(calls,2);
  for(const page of [{...results.data,jobId:'vjob_'+'b'.repeat(32)},{...results.data,results:[],nextCursor:'693439'},{...results.data,results:[{...results.data.results[0],status:400}]}]) {
    await assert.rejects(fetchVastuJobArtifact({get:async()=>({success:true,data:page})} as unknown as VedikaApiClient,jobId,'unit-1'));
  }
});

test('artifact resources decode reserved and unicode item IDs exactly once',async()=>{
  for(const itemId of ['building/floor 1/यूनिट','unit%2F1']) {
    const page={...results,data:{...results.data,results:[{...results.data.results[0],id:itemId}]}};
    const api={get:async()=>page} as unknown as VedikaApiClient;
    const server=new McpServer({name:'resource-test',version:'1'});
    registerVastuJobTools(server,api);
    const client=new Client({name:'resource-client',version:'1'});
    const [a,b]=InMemoryTransport.createLinkedPair();
    await server.connect(a);await client.connect(b);
    try {
      const uri=`vedika://vastu/jobs/${jobId}/items/${encodeURIComponent(itemId)}`;
      const resource=await client.readResource({uri});
      const payload=JSON.parse(String(resource.contents[0]?.text));
      assert.equal(payload.data.itemId,itemId);
      assert.equal(payload.data.uri,uri);
      assert.equal(payload.data.content,'<html>Report</html>');
    } finally {await client.close();await server.close();}
  }
});


test('artifact retrieval preserves server bytes and rejects mismatched artifact identities',async()=>{
  const stored={jobId,itemId:'unit-1',artifactId:`${jobId}:0`,contentType:'application/json',filename:'analysis.json',content:'{"score":1.0}'};
  const page={success:true,data:{...results.data,results:[{...results.data.results[0],response:{success:true,data:{score:1}},artifacts:[stored]}]}};
  const api={get:async()=>page} as unknown as VedikaApiClient;
  const artifact=await fetchVastuJobArtifact(api,jobId,'unit-1');
  assert.equal(artifact.data.content,'{"score":1.0}');
  assert.equal(artifact.data.filename,'analysis.json');
  for(const invalid of [{...stored,jobId:'vjob_'+'b'.repeat(32)},{...stored,itemId:'other'},{...stored,artifactId:`${jobId}:1`}]) {
    const malformed={...page,data:{...page.data,results:[{...page.data.results[0],artifacts:[invalid]}]}};
    await assert.rejects(fetchVastuJobArtifact({get:async()=>malformed} as unknown as VedikaApiClient,jobId,'unit-1'));
  }
});

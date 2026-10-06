import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool, SafeToolInputError } from '../tool-wrapper.js';

// Vastu Shastra (VASTU_OPERATIONS below, under /v2/astrology/vastu/). Vastu takes a
// BUILDING — a plot polygon, a room list, a compass zone — never a birth
// chart, so none of these tools use BirthDetailsSchema/extractBirthDetails.
// This file exposes a focused subset of the surface as dedicated tools, plus
// a generic escape hatch (vastu_operation) for the long tail.

const VastuZoneEnum = z.enum([
  'north', 'northeast', 'east', 'southeast',
  'south', 'southwest', 'west', 'northwest', 'center',
]);

// Every operation path suffix under /v2/astrology/vastu/, as published in the
// API's OpenAPI contract. Counts shown to agents are derived from this list.
export const VASTU_OPERATIONS: readonly string[] = [
  'ar/anchor-recommendations',
  'ar/attestation/challenge',
  'ar/capture-merge',
  'ar/deity-icons',
  'ar/heatmap-raster',
  'ar/room-capture',
  'ar/scan-quality',
  'ar/true-north-calibrate',
  'ar/yantra-meshes',
  'ar/zone-textures',
  'archive/delete',
  'archive/export',
  'archive/summary',
  'archive/tier',
  'assessments',
  'assessments/batch',
  'audit/floor-plan',
  'audit/floor-plan-detailed',
  'audit/single-room',
  'compare/before-after-remedy',
  'compound/wall-analysis',
  'direction/auspicious-facing',
  'direction/correct',
  'direction/declination',
  'direction/sun-path',
  'direction/zone-from-bearing',
  'elements/balance-suggest',
  'elements/distribution',
  'entrance/obstruction-check',
  'entrance/pada',
  'entrance/recommend',
  'feed/listings',
  'floor/level-analysis',
  'fusion/chart',
  'mandala/project/81-pada',
  'mandala/project/9-zone',
  'mandala/project/brahmasthan',
  'merchant/catalog/delete',
  'merchant/catalog/get',
  'merchant/catalog/upload',
  'merchant/remedies',
  'multi-storey/floor-rules',
  'placement/balcony',
  'placement/borewell',
  'placement/garden',
  'placement/generator-electrical',
  'placement/main-gate',
  'placement/overhead-tank',
  'placement/septic-tank',
  'placement/tree',
  'placement/well',
  'placement/window',
  'plan/analyze',
  'plan/compare-versions',
  'plan/convert-units',
  'plan/export-dxf',
  'plan/export-ifc',
  'plan/from-requirements',
  'plan/generate',
  'plan/import-dxf',
  'plan/import-ifc',
  'plan/import-image',
  'plan/import-pdf',
  'plan/optimize',
  'plan/report',
  'plan/upload',
  'plot/extensions-cuts',
  'plot/from-survey',
  'plot/orientation',
  'plot/ratio',
  'plot/road-orientation',
  'plot/shape',
  'plot/slope',
  'portfolio/analytics',
  'portfolio/budgets/get',
  'portfolio/budgets/set',
  'portfolio/compare',
  'portfolio/search',
  'portfolio/usage',
  'portfolio/usage/export',
  'properties/activity/export',
  'properties/activity/list',
  'properties/collaboration/comment',
  'properties/collaboration/get',
  'properties/collaboration/invite',
  'properties/collaboration/members',
  'properties/collaboration/review',
  'properties/collaboration/revoke',
  'properties/collaboration/update',
  'properties/create',
  'properties/delete',
  'properties/get',
  'properties/link-scan',
  'properties/list',
  'properties/update',
  'quote/calculate',
  'receipt/verify',
  'reference/colors-by-zone',
  'reference/defects/catalog',
  'reference/directions/16',
  'reference/directions/32',
  'reference/directions/8',
  'reference/gate-obstructions',
  'reference/mandala/45-devatas',
  'reference/mandala/64-pada',
  'reference/mandala/9-zone',
  'reference/materials-by-zone',
  'reference/remedies/catalog',
  'remediation/reassess',
  'remediation/tasks/delete',
  'remediation/tasks/list',
  'remediation/tasks/upsert',
  'report/drawing-sheet',
  'room/bedroom',
  'room/dining',
  'room/kitchen',
  'room/living',
  'room/pooja',
  'room/staircase',
  'room/store',
  'room/study',
  'room/toilet',
  'room/water-storage',
  'rules/versions',
  'scans/delete',
  'scans/list',
  'scans/retrieve',
  'scans/save',
  'scans/timelapse',
  'score/compliance-index',
  'score/overall',
  'score/zone-wise',
  'specialized/commercial',
  'specialized/educational',
  'specialized/factory',
  'specialized/hospital',
  'specialized/residential',
  'specialized/restaurant',
  'specialized/temple',
  'timing/bhumi-pujan',
  'timing/construction-start',
  'timing/grihapravesh',
  'timing/vastu-shanti',
];

// Literal path segments under /v2/astrology/vastu/room/{roomType} — the
// "Room placement" family in the real endpoint inventory.
const VastuRoomTypeEnum = z.enum([
  'kitchen', 'bedroom', 'pooja', 'toilet', 'living',
  'dining', 'store', 'study', 'staircase', 'water-storage',
]);

// Literal path segments under /v2/astrology/vastu/mandala/project/{scheme}.
const VastuMandalaSchemeEnum = z.enum(['9-zone', '81-pada', 'brahmasthan']);

const VastuPlotPointSchema = z.tuple([z.number(), z.number()]);

const VastuPlotSchema = z.object({
  width: z.number().positive().describe('Plot width. Required.'),
  length: z.number().positive().describe('Plot length/depth. Required.'),
  facing: z.union([z.string(), z.number()]).optional()
    .describe('Compass direction the plot/entrance faces — a name like "E", "north-east", "SW", or a bearing in degrees (0-360). Default: E.'),
  polygon: z.array(VastuPlotPointSchema).optional()
    .describe('Optional traced plot outline as an array of [x, y] points; normalized onto width/length when provided.'),
});

const VastuPlanRequirementsSchema = z.object({
  bhk: z.union([z.string(), z.number()]).refine(value => {
    const raw = typeof value === 'string' ? value.trim().replace(/bhk$/i, '').trim() : value;
    const n = raw === '' ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 8.5 && Number.isInteger(n * 2);
  }, 'BHK must be 0 to 8.5 in steps of 0.5, optionally followed by BHK').optional()
    .describe('Configuration shorthand, e.g. "2BHK" or "2.5 BHK". Includes living/kitchen; a half room adds study unless explicitly overridden.'),
  bedrooms: z.number().int().min(0).max(8).optional().describe('Number of bedrooms. Required unless bhk is supplied.'),
  toilets: z.number().int().min(0).max(8).optional().describe('Number of toilets. Supply this or bathrooms.'),
  bathrooms: z.number().int().min(0).max(8).optional().describe('Alias for toilets.'),
  floors: z.number().int().min(1).max(5).describe('Number of floors/storeys (1-5). Required.'),
  parking: z.number().int().min(0).max(8).optional().describe('Number of parking bays (0-8).'),
  hasLiving: z.boolean().optional().describe('Include living room. Required unless bhk is supplied.'),
  hasKitchen: z.boolean().optional().describe('Include kitchen. Required unless bhk is supplied.'),
  hasPooja: z.boolean().describe('Include a dedicated pooja room.'),
  hasStudy: z.boolean().optional().describe('Include a study. Required unless bhk is supplied.'),
  hasDining: z.boolean().describe('Include a separate dining room.'),
  hasStore: z.boolean().describe('Include a store/storage room.'),
  hasGuest: z.boolean().describe('Include a guest room.'),
  hasStaircase: z.boolean().describe('Include an internal staircase (multi-floor).'),
}).superRefine((brief, ctx) => {
  const required = [];
  if (brief.bhk === undefined) {
    for (const field of ['bedrooms', 'hasLiving', 'hasKitchen', 'hasStudy'] as const) {
      if (brief[field] === undefined) required.push(field);
    }
  }
  if (brief.toilets === undefined && brief.bathrooms === undefined) required.push('toilets');
  for (const field of required) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} or its documented alternative is required` });
});

// key -> real GET path, under /v2/astrology/vastu/reference/...
const REFERENCE_TABLE_PATHS: Record<string, string> = {
  'mandala-9-zone': '/v2/astrology/vastu/reference/mandala/9-zone',
  'mandala-45-devatas': '/v2/astrology/vastu/reference/mandala/45-devatas',
  'mandala-64-pada': '/v2/astrology/vastu/reference/mandala/64-pada',
  'directions-8': '/v2/astrology/vastu/reference/directions/8',
  'directions-16': '/v2/astrology/vastu/reference/directions/16',
  'directions-32': '/v2/astrology/vastu/reference/directions/32',
  'defects-catalog': '/v2/astrology/vastu/reference/defects/catalog',
  'remedies-catalog': '/v2/astrology/vastu/reference/remedies/catalog',
  'colors-by-zone': '/v2/astrology/vastu/reference/colors-by-zone',
  'materials-by-zone': '/v2/astrology/vastu/reference/materials-by-zone',
  'gate-obstructions': '/v2/astrology/vastu/reference/gate-obstructions',
};

export function registerVastuTools(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vastu_reference',
    'Look up a static Vastu Shastra reference table — no calculation, no building input required. mandala-9-zone/mandala-45-devatas/mandala-64-pada = the Vastu Purusha Mandala grids and their presiding devatas. directions-8/16/32 = the compass direction system at increasing resolution. defects-catalog/remedies-catalog = known Vastu doshas (defects) and their corresponding remedies. colors-by-zone/materials-by-zone = recommended colors/materials per compass zone. gate-obstructions = the Brihat Samhita 53.76-81 table of features (road/tree/well/pillar/etc.) opposite the main gate and their verdicts. Billed reference operation.',
    {
      table: z.enum([
        'mandala-9-zone', 'mandala-45-devatas', 'mandala-64-pada',
        'directions-8', 'directions-16', 'directions-32',
        'defects-catalog', 'remedies-catalog',
        'colors-by-zone', 'materials-by-zone',
        'gate-obstructions',
      ]).describe('Which reference table to fetch.'),
    },
    async (args) => safeTool(async () => {
      const path = REFERENCE_TABLE_PATHS[args.table] ?? REFERENCE_TABLE_PATHS['mandala-9-zone'];
      const result = await client.get(path);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );

  server.tool(
    'vastu_audit_floor_plan',
    'Audit an entire floor plan for Vastu compliance in one call — pass every room in the building with the compass zone it actually occupies, and get back a per-room compliance verdict, severity, and remedy for anything misplaced, plus an overall score. Use vastu_room_placement instead if you only need guidance for a single room.',
    {
      rooms: z.array(z.object({
        roomType: z.string()
          .describe('Room type. Free text — synonyms are normalized server-side (e.g. "master bedroom", "pooja"/"puja"/"mandir", "toilet"/"bathroom", "store"/"storage", "stairs"/"staircase", "entrance"/"door").'),
        zone: VastuZoneEnum.describe('Compass zone the room actually occupies in the building.'),
      })).min(1).describe('Every room in the building with its placed zone.'),
    },
    async (args) => safeTool(async () => {
      const result = await client.post('/v2/astrology/vastu/audit/floor-plan', { rooms: args.rooms });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );

  server.tool(
    'vastu_room_placement',
    'Get Vastu Shastra placement guidance for ONE room type in a specific (or proposed) compass zone — whether it is compliant, the severity if not, the recommended zone, and the remedy. One dedicated backend endpoint per room type. Use vastu_audit_floor_plan instead to check a whole building at once.',
    {
      roomType: VastuRoomTypeEnum.describe('Which room to check.'),
      zone: VastuZoneEnum.describe('The compass zone this room is placed (or proposed to be placed) in.'),
    },
    async (args) => safeTool(async () => {
      const result = await client.post(`/v2/astrology/vastu/room/${args.roomType}`, { zone: args.zone });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );

  server.tool(
    'vastu_mandala_project',
    'Project a Vastu Purusha Mandala grid onto a plot polygon. "9-zone" = the coarse 9-sector grid. "81-pada" = the 81-square plan of Brihat Samhita 53.43-48: each cell carries its verse square number and, where the verse names one, the devata it seats there (28 squares have none). Fitting that grid to YOUR polygon is a computed layout convention, not a classical measurement. "brahmasthan" = just the central sacred zone that must stay unbuilt. Returns which mandala cell/devata falls where on the plot.',
    {
      scheme: VastuMandalaSchemeEnum.describe('Which mandala grid to project.'),
      plotPolygon: z.array(VastuPlotPointSchema).min(3)
        .describe('Plot boundary as an array of >=3 [x, y] points, in plan-view coordinates (e.g. meters or feet).'),
      bearingDeg: z.number().min(0).max(360).optional()
        .describe('True-north bearing of the plot in degrees (0-360). Default: 0 (grid already north-aligned).'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = { plotPolygon: args.plotPolygon };
      if (args.bearingDeg !== undefined) body.bearingDeg = args.bearingDeg;
      const result = await client.post(`/v2/astrology/vastu/mandala/project/${args.scheme}`, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );

  server.tool(
    'vastu_generate_plan',
    'Generate a Vastu-compliant floor plan from a high-level brief instead of an explicit room list — give it plot dimensions plus a room programme (BHK, bathrooms, parking, pooja room, etc.) and it infers and places the rooms. Returns up to 3 ranked variants.',
    {
      plot: VastuPlotSchema.describe('Plot dimensions and orientation.'),
      requirements: VastuPlanRequirementsSchema
        .describe('Complete room programme: bedrooms or BHK, toilets or bathrooms, floors, and explicit inclusion flags. No default brief.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = { plot: args.plot };
      if (args.requirements) body.requirements = args.requirements;
      const result = await client.post('/v2/astrology/vastu/plan/from-requirements', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );

  server.tool(
    'vastu_declination',
    'Look up a coarse magnetic-declination reference estimate for India. The result is unverified and is not field calibration; do not treat it as a verified compass correction.',
    {
      lat: z.number().min(-90).max(90).describe('Location latitude.'),
      lon: z.number().min(-180).max(180).describe('Location longitude.'),
      date: z.string().optional().describe('ISO date to compute the epoch-adjusted declination for. Default: today.'),
    },
    async (args) => safeTool(async () => {
      const params: Record<string, string> = { lat: String(args.lat), lon: String(args.lon) };
      if (args.date) params.date = args.date;
      const result = await client.get('/v2/astrology/vastu/direction/declination', params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );

  server.tool(
    'vastu_operation',
    `Call any Vastu Shastra operation directly by its path suffix under /v2/astrology/vastu/ — for the long tail of the ${VASTU_OPERATIONS.length}-operation surface not covered by the dedicated vastu_* tools. Examples: "entrance/recommend", "entrance/pada", "entrance/obstruction-check", "placement/borewell", "placement/main-gate", "score/overall", "score/zone-wise", "specialized/temple", "timing/grihapravesh", "timing/bhumi-pujan", "plot/shape", "plot/slope", "compound/wall-analysis", "elements/distribution", "plan/analyze", "plan/optimize", "direction/sun-path", "ar/true-north-calibrate". Prefer a dedicated vastu_* tool when your need matches one.`,
    {
      op: z.string().describe('Path suffix under /v2/astrology/vastu/, e.g. "score/overall" or "placement/borewell". A leading slash or surrounding whitespace is trimmed.'),
      params: z.record(z.unknown()).default({}).describe('Request body for the operation. Shape depends on the operation.'),
      idempotencyKey: z.string().min(1).max(200).optional().describe('Required for assessments/batch. Retain the same key for retries of one logical batch; use a new key for a new batch. Sent as the Idempotency-Key header, outside the body.'),
    },
    async (args) => safeTool(async () => {
      // Path-safety: `op` is agent-supplied and appended to the URL, so it must
      // stay INSIDE the /v2/astrology/vastu/ namespace. A leading slash and
      // surrounding whitespace are NORMALIZED away (so "/score/overall" and
      // " score/overall " both work), then the remainder must be a plain
      // lowercase family/name path-segment set — this rejects traversal (..),
      // absolute/scheme escapes, and query/fragment injection.
      const op = args.op.trim().replace(/^\/+/, '');
      if (!/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(op)) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text:
            `Invalid Vastu op "${args.op}". Use a plain path suffix like "score/overall" or "placement/borewell" (a leading slash or surrounding whitespace is trimmed) — no "..", scheme, query, or fragment.` }],
        };
      }
      // Verb parity: the 11 `reference/*` tables (10 original +
      // `reference/gate-obstructions`) are GET-only (POST -> 405) and
      // `direction/declination` is a GET+POST dual whose verified path is
      // GET-with-query; rules/versions is GET-only. Everything else is POST. Kept in
      // sync with VASTU_GET_REFERENCE_ROUTES + VASTU_DUAL_ROUTE in vastu.rs.
      const isGet = op.startsWith('reference/') || op === 'direction/declination' || op === 'rules/versions';
      let result: unknown;
      if (isGet) {
        const query: Record<string, string> = {};
        for (const [k, v] of Object.entries(args.params)) query[k] = String(v);
        result = await client.get(`/v2/astrology/vastu/${op}`, query);
      } else {
        if (op === 'assessments/batch' && !args.idempotencyKey?.trim()) {
          throw new SafeToolInputError('assessments/batch requires a retained Idempotency-Key');
        }
        result = await client.post(`/v2/astrology/vastu/${op}`, args.params, undefined, args.idempotencyKey);
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}

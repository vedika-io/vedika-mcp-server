import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';

import { registerAiChatTool } from './ai-chat.js';
import { registerConversationTool } from './conversation.js';
import { registerBirthChartTool } from './birth-chart.js';
import { registerDashaTool } from './dasha.js';
import { registerDoshasTool } from './doshas.js';
import { registerCompatibilityTool } from './compatibility.js';
import { registerPanchangTool } from './panchang.js';
import { registerMuhurtaTool } from './muhurta.js';
import { registerDivisionalChartsTool } from './divisional.js';
import { registerPredictionsTool } from './predictions.js';
import { registerAshtakavargaTool } from './ashtakavarga.js';
import { registerWesternTransitsTool } from './western-transits.js';
import { registerWesternProgressionsTool } from './western-progressions.js';
import { registerWesternSolarReturnTool } from './western-solar-return.js';
import { registerWesternRelationshipTool } from './western-relationship.js';
import { registerHoroscopeTool } from './horoscope.js';
import { registerNumerologyTool } from './numerology.js';
import { registerVarshaphalTool } from './varshaphal.js';
import { registerStrengthTool } from './strength.js';
import { registerCalendarTool } from './calendar.js';
import { registerUsageTool } from './usage.js';

// Project Dominion: New domain tools
import { registerTarotDrawTool } from './tarot-draw.js';
import { registerTarotDailyTool } from './tarot-daily.js';
import { registerChineseZodiacTool } from './chinese-zodiac.js';
import { registerChineseBaziTool } from './chinese-bazi.js';
import { registerIChingTool } from './iching.js';
import { registerCrystalsTool } from './crystals.js';
import { registerHumanDesignTool } from './human-design.js';
import { registerMatrimonyMatchTool } from './matrimony-match.js';
import { registerSpiritualMantraTool } from './spiritual-mantra.js';
import { registerSpiritualDeityTool } from './spiritual-deity.js';
import { registerDailyBundleTool } from './daily-bundle.js';
import { registerHealthAyurvedicTool } from './health-ayurvedic.js';
import { registerNumerologyCompleteTool } from './numerology-complete.js';
import { registerDashaAshtottariTool } from './dasha-ashtottari.js';
import { registerLalkitabRemediesTool } from './lalkitab-remedies.js';

export function registerAllTools(server: McpServer, client: VedikaApiClient): void {
  // Core (2 tools)
  registerAiChatTool(server, client);
  registerConversationTool(server, client);

  // Vedic Computation (9 tools)
  registerBirthChartTool(server, client);
  registerDashaTool(server, client);
  registerDoshasTool(server, client);
  registerCompatibilityTool(server, client);
  registerPanchangTool(server, client);
  registerMuhurtaTool(server, client);
  registerDivisionalChartsTool(server, client);
  registerPredictionsTool(server, client);
  registerAshtakavargaTool(server, client);

  // Western (4 tools)
  registerWesternTransitsTool(server, client);
  registerWesternProgressionsTool(server, client);
  registerWesternSolarReturnTool(server, client);
  registerWesternRelationshipTool(server, client);

  // Cross-System (3 tools)
  registerHoroscopeTool(server, client);
  registerNumerologyTool(server, client);
  registerVarshaphalTool(server, client);

  // Supplementary (2 tools)
  registerStrengthTool(server, client);
  registerCalendarTool(server, client);

  // Utility (1 tool)
  registerUsageTool(server, client);

  // --- Project Dominion: New Domains (15 tools) ---

  // Tarot & Divination (3 tools)
  registerTarotDrawTool(server, client);
  registerTarotDailyTool(server, client);
  registerIChingTool(server, client);

  // Chinese Astrology (2 tools)
  registerChineseZodiacTool(server, client);
  registerChineseBaziTool(server, client);

  // Alternative Systems (2 tools)
  registerHumanDesignTool(server, client);
  registerCrystalsTool(server, client);

  // Vedic Extended (4 tools)
  registerMatrimonyMatchTool(server, client);
  registerDashaAshtottariTool(server, client);
  registerLalkitabRemediesTool(server, client);
  registerSpiritualMantraTool(server, client);

  // Spiritual & Wellness (2 tools)
  registerSpiritualDeityTool(server, client);
  registerHealthAyurvedicTool(server, client);

  // Bundles (2 tools)
  registerDailyBundleTool(server, client);
  registerNumerologyCompleteTool(server, client);
}

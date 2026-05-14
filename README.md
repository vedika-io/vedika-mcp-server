# @vedika-io/mcp-server

MCP server for the [Vedika Intelligence API](https://vedika.io) — 140+ astrology and divination endpoints across Vedic, Western, KP, Chinese, Tarot, I Ching, Human Design, Numerology, and Ayurvedic domains, exposed as 36 semantic tools for AI agents.

All calculations powered by Vedika AI. Zero external astrology API dependencies.

## Quick Start

```bash
npm install -g @vedika-io/mcp-server
```

Get your API key at [vedika.io/pricing](https://vedika.io/pricing) (starts at $12/mo). No free tier — every query costs money.

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vedika": {
      "command": "npx",
      "args": ["-y", "@vedika-io/mcp-server"],
      "env": {
        "VEDIKA_API_KEY": "vk_live_your_key_here"
      }
    }
  }
}
```

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "vedika": {
      "command": "npx",
      "args": ["-y", "@vedika-io/mcp-server"],
      "env": {
        "VEDIKA_API_KEY": "vk_live_your_key_here"
      }
    }
  }
}
```

### Cursor

Add to Cursor Settings > MCP Servers:

```json
{
  "vedika": {
    "command": "npx",
    "args": ["-y", "@vedika-io/mcp-server"],
    "env": {
      "VEDIKA_API_KEY": "vk_live_your_key_here"
    }
  }
}
```

### Windsurf

Add to `~/.windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "vedika": {
      "command": "npx",
      "args": ["-y", "@vedika-io/mcp-server"],
      "env": {
        "VEDIKA_API_KEY": "vk_live_your_key_here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VEDIKA_API_KEY` | Yes | — | Your API key (format: `vk_live_*`) |
| `VEDIKA_BASE_URL` | No | `https://api.vedika.io` | API base URL override |

---

## 36 Tools

### Core (2 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_ai_chat` | Natural language astrology Q&A with AI interpretation. Vedic/Western/KP systems. 30 languages. Multi-turn conversations. Anti-hallucination validated. | $0.008-0.05/query |
| `vedika_conversation` | List, get, delete, or extend multi-turn conversations. | Free |

### Vedic Computation (9 tools)

| Tool | Types | Cost |
|------|-------|------|
| `vedika_birth_chart` | kundli, birth-chart, planetary-positions, house-cusps, ascendant, birth-details | $0.016-0.028 |
| `vedika_dasha` | vimshottari, mahadasha, antardasha, pratyantardasha, yogini | $0.016-0.028 |
| `vedika_doshas` | mangal, kaal-sarp, pitru, nadi, all, sade-sati, sade-sati-advanced | $0.016-0.040 |
| `vedika_compatibility` | guna-milan, kundali, nakshatra-porutham, thirumana-porutham | $0.040-0.048 |
| `vedika_panchang` | full, tithi, nakshatra, yoga, karana | $0.012 |
| `vedika_muhurta` | choghadiya, hora, rahu-kaal, gulika-kaal, yamaghanta, abhijit, brahma, durmuhurta, combined, auspicious | $0.012-0.020 |
| `vedika_divisional_charts` | D2-D60 (15 charts: Hora, Drekkana, Chaturthamsa, Saptamsa, Navamsa, Dashamsa, Dwadashamsa, Shodasamsa, Vimsamsa, Chaturvimsamsa, Bhamsa, Trimsamsa, Khavedamsa, Akshavedamsa, Shashtiamsa) | $0.005 |
| `vedika_predictions` | daily, weekly, monthly, quarterly, yearly | $0.020-0.088 |
| `vedika_ashtakavarga` | planet (Bhinnashtakavarga), sarva (Sarvashtakavarga) | $0.025 |

### Western Astrology (4 tools)

| Tool | Types | Cost |
|------|-------|------|
| `vedika_western_transits` | chart, positions, aspects | $0.064 |
| `vedika_western_progressions` | chart, positions, aspects | $0.092 |
| `vedika_western_solar_return` | chart, positions, aspects | $0.120 |
| `vedika_western_relationship` | synastry, synastry-aspects, composite, composite-aspects | $0.148 |

### Cross-System (3 tools)

| Tool | Types | Cost |
|------|-------|------|
| `vedika_horoscope` | Vedic or Western, daily/weekly/monthly | $0.048-0.092 |
| `vedika_numerology` | life-path, destiny, personality, soul-urge, personal-year, complete, compatibility | $0.003-0.010 |
| `vedika_varshaphal` | Vedic annual solar return (Tajaka system) | $0.006 |

### Supplementary (2 tools)

| Tool | Types | Cost |
|------|-------|------|
| `vedika_strength` | chandra-bala, tara-bala, upagraha, planet-relationship, shadbala | $0.020 |
| `vedika_calendar` | ritu, solstice, anandadi-yoga, auspicious-yoga, auspicious-period, inauspicious-period, gowri-nalla-neram, disha-shool, planet-transit, chandrashtama, chandrashtama-periods | $0.016-0.020 |

### Tarot & Divination (3 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_tarot_draw` | Draw tarot cards in single, three-card, celtic-cross, horseshoe, relationship, or career spreads. Rider-Waite, Thoth, or Marseille decks. | $0.020-0.048 |
| `vedika_tarot_daily` | Card of the day with meanings, keywords, and daily guidance. Cached per day. | $0.008 |
| `vedika_iching_cast` | Cast an I Ching hexagram (yarrow or coin method). Primary hexagram + changing lines + transformed hexagram. | $0.012 |

### Chinese Astrology (2 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_chinese_zodiac` | Chinese zodiac animal, element, yin/yang, lucky numbers/colors, compatible/incompatible animals. Accounts for Chinese New Year dates. | $0.003 |
| `vedika_chinese_bazi` | Ba Zi Four Pillars of Destiny: Year/Month/Day/Hour pillars, Day Master, 10-year Luck Pillars, Five Element balance. | $0.028 |

### Alternative Systems (2 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_human_design_chart` | Human Design BodyGraph: Type, Strategy, Authority, Profile, defined/undefined Centers, Channels, Gates. | $0.040 |
| `vedika_crystals_recommend` | Crystal and gemstone recommendations by zodiac sign, planet, or need. Vedic ratna-shastra + modern crystal healing. | $0.012 |

### Vedic Extended (4 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_matrimony_match` | Comprehensive Kundali matching with Mangal/Nadi/Bhakoot dosha cancellation analysis. North + South Indian systems. | $0.056 |
| `vedika_dasha_ashtottari` | Ashtottari 108-year dasha cycle (alternative to Vimshottari). 8 planets, Mahadasha/Antardasha/Pratyantardasha depth. | $0.020 |
| `vedika_lalkitab_remedies` | Lal Kitab remedies for afflicted planets. Unique totkas (practical remedies) distinct from classical BPHS. Optional debt (rina) analysis. | $0.020 |
| `vedika_spiritual_mantra` | Personalized mantra recommendations from classical texts. Sanskrit + IAST transliteration, japa count, muhurta, mala material. | $0.016 |

### Spiritual & Wellness (2 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_spiritual_deity` | Ishta Devata (personal deity) from Atmakaraka in Navamsa. Also Dharma, Palana, and Guru Devata. Per BPHS Ch.33. | $0.020 |
| `vedika_health_ayurvedic` | Ayurvedic Prakriti (constitution) analysis from birth chart. Vata/Pitta/Kapha balance, diet, herbs, seasonal recommendations. | $0.024 |

### Bundles (2 tools)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_daily_bundle` | All daily content in one call: horoscope + panchang + tarot card + lucky numbers + transits. Saves cost vs individual calls. | $0.040 |
| `vedika_numerology_complete` | Full numerology report: Life Path, Destiny, Soul Urge, Personality, Maturity, Pinnacles, Challenges, Karmic Debt/Lessons. Pythagorean or Chaldean. | $0.010 |

### Utility (1 tool)

| Tool | Description | Cost |
|------|-------------|------|
| `vedika_usage` | Check wallet balance, usage history, summary, model breakdown | Free |

---

## Input Patterns

### Birth Details (required by most Vedic/Western tools)

```json
{
  "datetime": "1990-06-15T14:30:00",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timezone": "+05:30",
  "ayanamsa": "lahiri"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `datetime` | string | Yes | ISO 8601 format. Time is required for accurate house/ascendant. |
| `latitude` | number | Yes | -90 to 90. Polar latitudes >66.5 are rejected (unreliable houses). |
| `longitude` | number | Yes | -180 to 180. |
| `timezone` | string | Yes | UTC offset preferred (`+05:30`). IANA names also accepted (`Asia/Kolkata`). |
| `ayanamsa` | string | No | Default: `lahiri`. Options: `lahiri`, `kp`, `raman`, `yukteshwar`, `fagan-bradley`, `true-chitra`, `true-revati`, `ss-citra`. Only for Vedic -- Western tools ignore this. |

### Vedic Compatibility (male/female)

```json
{
  "type": "guna-milan",
  "male": { "datetime": "1992-03-15T10:30:00", "latitude": 28.61, "longitude": 77.20, "timezone": "+05:30" },
  "female": { "datetime": "1994-07-22T08:15:00", "latitude": 19.07, "longitude": 72.87, "timezone": "+05:30" }
}
```

### Western Relationship (person1/person2 -- gender-neutral)

```json
{
  "type": "synastry",
  "person1": { "datetime": "1990-01-15T14:30:00", "latitude": 40.71, "longitude": -74.00, "timezone": "-05:00" },
  "person2": { "datetime": "1992-08-22T09:45:00", "latitude": 34.05, "longitude": -118.24, "timezone": "-08:00" }
}
```

### Location-Only (panchang, muhurta)

```json
{
  "type": "choghadiya",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "timezone": "+05:30"
}
```

All location fields are optional -- defaults to Delhi (28.6139, 77.2090, +05:30).

### Zodiac Signs (predictions, horoscope)

Accepts both English and Hindi (Roman transliteration):

| English | Hindi |
|---------|-------|
| aries | mesha |
| taurus | vrishabha |
| gemini | mithuna |
| cancer | karka |
| leo | simha |
| virgo | kanya |
| libra | tula |
| scorpio | vrishchika |
| sagittarius | dhanu |
| capricorn | makara |
| aquarius | kumbha |
| pisces | meena |

### Tarot Spreads

```json
{
  "spread": "celtic-cross",
  "question": "What should I focus on this month?",
  "deck": "rider-waite"
}
```

### Chinese Ba Zi

```json
{
  "datetime": "1990-06-15T14:30:00",
  "timezone": "+08:00",
  "gender": "male"
}
```

### Matrimony Match (bride/groom)

```json
{
  "bride": { "datetime": "1994-07-22T08:15:00", "latitude": 19.07, "longitude": 72.87, "timezone": "+05:30", "gender": "female" },
  "groom": { "datetime": "1992-03-15T10:30:00", "latitude": 28.61, "longitude": 77.20, "timezone": "+05:30", "gender": "male" },
  "includeRemedies": true
}
```

---

## Output Examples

### vedika_birth_chart (type: "kundli")

```json
{
  "ascendant": { "sign": "Virgo", "degree": 14.23, "nakshatra": "Hasta", "pada": 2 },
  "planets": [
    { "name": "Sun", "sign": "Taurus", "house": 9, "degree": 0.85, "nakshatra": "Krittika", "pada": 4, "retrograde": false, "dignity": "Neutral" },
    { "name": "Moon", "sign": "Cancer", "house": 11, "degree": 22.14, "nakshatra": "Ashlesha", "pada": 3, "retrograde": false, "dignity": "Own" },
    { "name": "Mars", "sign": "Pisces", "house": 7, "degree": 6.52, "nakshatra": "Uttara Bhadrapada", "pada": 2, "retrograde": false, "dignity": "Neutral" }
  ],
  "houses": [
    { "house": 1, "sign": "Virgo", "degree": 14.23, "lord": "Mercury" },
    { "house": 2, "sign": "Libra", "degree": 12.15, "lord": "Venus" }
  ]
}
```

### vedika_dasha (system: "vimshottari")

```json
{
  "currentDasha": {
    "mahadasha": { "planet": "Jupiter", "start": "2020-03-15", "end": "2036-03-15" },
    "antardasha": { "planet": "Saturn", "start": "2024-09-01", "end": "2027-03-15" },
    "pratyantar": { "planet": "Mercury", "start": "2025-11-20", "end": "2026-04-30" }
  },
  "dashaTimeline": [
    { "planet": "Ketu", "start": "1990-06-15", "end": "1997-06-15", "years": 7 },
    { "planet": "Venus", "start": "1997-06-15", "end": "2017-06-15", "years": 20 },
    { "planet": "Sun", "start": "2017-06-15", "end": "2023-06-15", "years": 6 }
  ]
}
```

### vedika_tarot_draw (spread: "three-card")

```json
{
  "spread": "three-card",
  "cards": [
    { "position": "past", "card": "The Tower", "number": 16, "suit": "major", "reversed": false, "meaning": "Sudden upheaval, revelation, awakening" },
    { "position": "present", "card": "Two of Cups", "number": 2, "suit": "cups", "reversed": false, "meaning": "Partnership, harmony, mutual attraction" },
    { "position": "future", "card": "The Star", "number": 17, "suit": "major", "reversed": false, "meaning": "Hope, renewal, inspiration, serenity" }
  ],
  "deck": "rider-waite"
}
```

### vedika_chinese_bazi

```json
{
  "dayMaster": { "element": "Fire", "stem": "Bing", "strength": "strong" },
  "pillars": {
    "year": { "stem": "Geng", "branch": "Wu", "element": "Metal Horse" },
    "month": { "stem": "Ren", "branch": "Wu", "element": "Water Horse" },
    "day": { "stem": "Bing", "branch": "Xu", "element": "Fire Dog" },
    "hour": { "stem": "Jia", "branch": "Wu", "element": "Wood Horse" }
  },
  "elementBalance": { "wood": 1, "fire": 4, "earth": 2, "metal": 1, "water": 1 },
  "favorableElements": ["Water", "Metal"],
  "unfavorableElements": ["Fire", "Wood"]
}
```

### vedika_compatibility (type: "guna-milan")

```json
{
  "totalScore": 26,
  "maxScore": 36,
  "recommendation": "Good match",
  "factors": [
    { "name": "Varna", "score": 1, "maxScore": 1, "description": "Spiritual compatibility" },
    { "name": "Vashya", "score": 2, "maxScore": 2, "description": "Mutual attraction" },
    { "name": "Tara", "score": 3, "maxScore": 3, "description": "Birth star compatibility" },
    { "name": "Yoni", "score": 3, "maxScore": 4, "description": "Physical compatibility" },
    { "name": "Graha Maitri", "score": 5, "maxScore": 5, "description": "Mental compatibility" },
    { "name": "Gana", "score": 5, "maxScore": 6, "description": "Temperament" },
    { "name": "Bhakoot", "score": 7, "maxScore": 7, "description": "Health & wealth" },
    { "name": "Nadi", "score": 0, "maxScore": 8, "description": "Genetic compatibility" }
  ],
  "mangalDosha": { "male": false, "female": true, "compatible": true }
}
```

### vedika_panchang (element: "full")

```json
{
  "date": "2026-03-13",
  "vara": { "name": "Friday", "deity": "Shukra" },
  "tithi": { "name": "Krishna Chaturdashi", "deity": "Shiva", "endTime": "2026-03-13T18:45:00+05:30" },
  "nakshatra": { "name": "Purva Bhadrapada", "lord": "Jupiter", "endTime": "2026-03-13T22:10:00+05:30" },
  "yoga": { "name": "Siddha", "endTime": "2026-03-13T15:30:00+05:30" },
  "karana": { "name": "Vanija", "endTime": "2026-03-13T18:45:00+05:30" },
  "sunrise": "06:28:00+05:30",
  "sunset": "18:22:00+05:30"
}
```

### vedika_ai_chat

```json
{
  "response": "Based on your birth chart, Jupiter is currently transiting your 7th house...",
  "conversationId": "conv_abc123",
  "tokens": { "input": 1250, "output": 480 },
  "cost": 0.012,
  "system": "vedic"
}
```

### vedika_predictions (period: "daily")

```json
{
  "sign": "aries",
  "period": "daily",
  "date": "2026-03-13",
  "prediction": {
    "overall": "A favorable day for career decisions...",
    "career": "Professional growth opportunities emerge...",
    "love": "Venus influence brings harmony...",
    "health": "Focus on physical activity...",
    "finance": "Avoid impulsive spending..."
  },
  "luckyNumber": 7,
  "luckyColor": "Red"
}
```

### vedika_western_transits (type: "aspects")

```json
{
  "transitAspects": [
    {
      "transitPlanet": "Saturn",
      "transitSign": "Pisces",
      "transitDegree": 22.5,
      "natalPlanet": "Moon",
      "natalSign": "Gemini",
      "natalDegree": 24.1,
      "aspect": "Square",
      "orb": 1.6,
      "applying": true,
      "influence": "challenging"
    }
  ]
}
```

### vedika_usage (action: "wallet")

```json
{
  "walletBalance": 5456,
  "currency": "USD",
  "displayBalance": "$54.56",
  "plan": "professional",
  "subscriptionEndDate": "2026-04-01T00:00:00Z"
}
```

> **Note:** `walletBalance` is in USD cents. Divide by 100 to display as dollars.

---

## Error Handling

All errors are returned as MCP tool errors with descriptive messages:

| Status | Meaning | Message Example |
|--------|---------|-----------------|
| 400 | Invalid input | `Bad Request: datetime is required` |
| 401 | Bad API key | `Invalid API key. Get one at https://vedika.io/pricing -- format: vk_live_*` |
| 402 | No balance | `Insufficient wallet balance ($2.50 remaining). Add funds at https://vedika.io/dashboard` |
| 403 | Inactive sub | `Subscription inactive or endpoint not included in your plan.` |
| 429 | Rate limited | `Rate limited. Retry after 5s.` |
| 5xx | Server error | Automatically retried once with 1s backoff. |
| Timeout | Too slow | `Request timed out after 30s -- /v2/astrology/kundli` |

### Timeout Configuration

| Request Type | Timeout | Retries |
|-------------|---------|---------|
| AI chat (`vedika_ai_chat`) | 90s | No retry (already long) |
| POST computation endpoints | 30s | 1 retry on 5xx |
| GET endpoints | 15s | 1 retry on 5xx |

---

## Pricing

No free tier. Every query costs money. Free sandbox available at [vedika.io/sandbox](https://vedika.io/sandbox) for testing with mock data.

| Plan | Price | Wallet Credits/mo | Rate Limit |
|------|-------|-------------------|------------|
| Starter | $12/mo | $12 | 60 req/min |
| Professional | $60/mo | $60 | 120 req/min |
| Business | $120/mo | $120 | 300 req/min |
| Enterprise | $240/mo | $240 | 600 req/min |

Get your API key at [vedika.io/pricing](https://vedika.io/pricing).

---

## Technical Details

- **Runtime**: Node.js 20+
- **Transport**: stdio (MCP standard)
- **Dependencies**: `@modelcontextprotocol/sdk`, `zod` (zero other runtime deps)
- **HTTP**: Native `fetch` (no axios)
- **Idempotency**: Every request includes `x-request-id` UUID header to prevent double-billing on retries
- **Retry**: Automatic 1-retry with 1s backoff on 5xx server errors (not on 4xx or AI chat timeouts)
- **Timeouts**: AI chat 90s, POST computation 30s, GET endpoints 15s

## Links

- [API Documentation](https://vedika.io/docs)
- [API Reference](https://vedika.io/api-reference)
- [Pricing](https://vedika.io/pricing)
- [Dashboard](https://vedika.io/dashboard)
- [MCP Server Page](https://vedika.io/mcp)
- [Support](mailto:support@vedika.io)

## License

MIT

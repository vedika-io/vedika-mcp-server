# Unreleased

- Typed `vastu_job_submit`, `vastu_job_status`, `vastu_job_results`, `vastu_job_cancel` and `vastu_job_artifact` tools, with input/output schemas and completed-artifact MCP resources.
- Bulk plan-analyze and plan-report workflow, retained idempotency keys, maximum quotes and exact per-item billing receipts.
- Refreshed published Vastu operation inventory. No npm publication in this change.
- Stop sending an automatic `x-request-id` on every request. The API reads a caller-sent `x-request-id` on `/v2` as an idempotency claim and answers 422 `IDEMPOTENCY_NOT_SUPPORTED` on endpoints that are not certified for idempotency. The header is now sent only when a tool is given an explicit `idempotencyKey`, and then it equals that key.
- A billed POST is no longer retried on 5xx or a dropped connection unless it carries a caller `idempotencyKey`, so a failed call cannot charge twice. GET requests keep their single retry.
- Tool errors now carry the detail an agent needs: 402 `INSUFFICIENT_BALANCE*` reports required, available and deficit and says not to retry; 429 is classified by the body `code` (`DAILY_LIMIT_EXCEEDED` is not retryable, `RATE_LIMIT_EXCEEDED` reports `retryAfter`); 422 `IDEMPOTENCY_NOT_SUPPORTED` says to resend without a key. Upstream text is still never echoed.
- `vedika_matrimony_match` called `/v2/astrology/matrimony/match`, which does not exist (404). It now calls `/v2/matrimony/unified-match`, or `/v2/matrimony/south-match` with `southIndian`, with the `male`/`female` body the API takes. The unused `includeRemedies` input is gone.
- `vedika_daily_bundle` described a horoscope, panchang and transits bundle. The API returns tarot, angel number, crystal, mantra, moon phase, rune and I Ching, and reads only `date` and `lang`. The tool now matches.
- `VEDIKA_BASE_URL` may also be `https://api.vedika.io/sandbox` for the free sandbox. Any other value is still refused at startup.
- README: current tool inventory (including Vastu), `VEDIKA_BASE_URL`, error handling, retry and idempotency behaviour.
- Raise the `fast-uri` override from 3.1.6 to 3.1.8: 3.1.6 is inside the vulnerable range and `npm audit` reported two high findings; it now reports none.

# Changelog

## [2.0.6] - 2026-09-17

### Changed
- `vastu_operation` states the size of the Vastu surface from the operation list
  it ships with: 93 operations. It said 92.
- `vastu_mandala_project` describes the 81-pada plan as the API now returns it:
  each cell carries its Brihat Samhita 53.43-48 square number and, where the verse
  names one, the devata seated there (28 squares have none).

## [2.0.5] - 2026-09-16

See the npm version history for 2.0.5 and earlier releases.

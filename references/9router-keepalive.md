# 9router Provider Management

## Provider Setup

- **Active providers** with API keys: anthropic, antigravity, openrouter, deepseek, gemini, groq, cerebras
- **XAI provider** configured but blocked on credits (403)
- **Provider keys** stored in SQLite: `/data/home/.9router/db/data.sqlite` → `providerConnections` table, JSON `data` field

## Model Combo Reasoning

- **Combo `reasoning`**: 20 models (3 working Gemini + 17 others)
- **Working models** (tested, sorted by latency):
  1. `gemini/gemini-3.1-flash-lite-preview` — 627ms ✓
  2. `gemini/gemini-3-flash-preview` — 6288ms ✓
  3. `gemini/gemini-3.5-flash-lite` — 7096ms ✓
- **Failed models**: 401 (missing API key) or 403 (no credits)
- **Rate limited**: OpenRouter free models (429 daily limit)

## Test Script Patterns

- **Async testing**: Use aiohttp with `Authorization: Bearer <N9ROUTER_API_KEY>`
- **Streaming fix**: Add `stream: false` to payload
- **Reasoning config**: `"reasoning_effort": "auto"` for combo models
- **Output format**: JSON log to `/data/home/.hermes/logs/reasoning_combo_test.json`

## Keepalive Configuration

- **Local cron**: `*/25 * * * * /data/home/.hermes/scripts/keepalive.sh`
- **External ping**: cron-job.org hitting `https://9router.nurvan.my.id/api/health` with CF-Access headers
- **Health endpoint**: Returns 11 bytes JSON `{"ok":true}`
- **External status**: Tracked in `/tmp/9router_health.json` with `external_status` field
# FloraMap — Cloudflare Worker Proxy

Keeps the Gemini API key server-side so it is never shipped inside the app binary.

## First-time setup

```bash
# 1. Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# 2. Log in
wrangler login

# 3. Deploy
cd cloudflare-worker
wrangler deploy

# 4. Add secrets (never commit these)
wrangler secret put GEMINI_API_KEY   # paste your Google AI key
wrangler secret put FLORAMAP_TOKEN   # paste the same random value as in app .env
```

After deploy, Wrangler prints your worker URL:
```
https://floramap-proxy.<your-subdomain>.workers.dev
```

## App configuration

In the app `.env` file (and as an EAS secret):
```
EXPO_PUBLIC_API_PROXY_URL=https://floramap-proxy.<your-subdomain>.workers.dev
EXPO_PUBLIC_API_TOKEN=<same random value as FLORAMAP_TOKEN>
```

When `EXPO_PUBLIC_API_PROXY_URL` is set the app routes all Gemini calls through
the worker. When it is not set (local dev) the app falls back to a direct
Gemini call using `EXPO_PUBLIC_GEMINI_API_KEY`.

## Optional rate limiting

Uncomment the `[[kv_namespaces]]` block in `wrangler.toml` and create the
namespace:
```bash
wrangler kv:namespace create RATE_LIMIT
# paste the returned id into wrangler.toml
wrangler deploy
```
This limits each IP to 60 Gemini calls per calendar day.

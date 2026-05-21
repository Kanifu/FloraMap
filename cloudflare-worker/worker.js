/**
 * FloraMap — Gemini API Proxy
 *
 * Deploy via:  wrangler deploy
 * Secrets:     wrangler secret put GEMINI_API_KEY
 *              wrangler secret put FLORAMAP_TOKEN
 *
 * KV namespace (optional, enables per-IP rate limiting):
 *   wrangler kv:namespace create RATE_LIMIT
 *   → copy the id into wrangler.toml [[kv_namespaces]]
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const DAILY_LIMIT = 60; // max Gemini calls per IP per calendar day

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-FloraMap-Token',
};

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    // Token guard — shared secret between app and worker
    const token = request.headers.get('X-FloraMap-Token');
    if (!env.FLORAMAP_TOKEN || token !== env.FLORAMAP_TOKEN) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Optional per-IP rate limiting via KV
    if (env.RATE_LIMIT) {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const day = new Date().toISOString().slice(0, 10);
      const key = `rl:${ip}:${day}`;
      const count = parseInt((await env.RATE_LIMIT.get(key)) ?? '0');
      if (count >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ error: { message: 'Dagelijks limiet bereikt. Probeer morgen opnieuw.' } }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      ctx.waitUntil(env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 86400 }));
    }

    // Forward the path as-is to Gemini, appending our API key
    const incomingUrl = new URL(request.url);
    const geminiUrl = `${GEMINI_BASE}${incomingUrl.pathname}?key=${env.GEMINI_API_KEY}`;

    const body = await request.text();

    let geminiResponse;
    try {
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: 'Proxy kon Gemini niet bereiken.' } }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const responseBody = await geminiResponse.text();
    return new Response(responseBody, {
      status: geminiResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};

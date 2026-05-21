const PROXY_URL = process.env.EXPO_PUBLIC_API_PROXY_URL;
const PROXY_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;
const DIRECT_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';

/** Returns the fetch URL and headers for a given Gemini model path. */
export const geminiEndpoint = (
  path: string,
): { url: string; headers: Record<string, string> } => {
  if (PROXY_URL) {
    return {
      url: `${PROXY_URL.replace(/\/$/, '')}${path}`,
      headers: {
        'Content-Type': 'application/json',
        'X-FloraMap-Token': PROXY_TOKEN ?? '',
      },
    };
  }
  return {
    url: `${GEMINI_BASE}${path}?key=${DIRECT_KEY ?? ''}`,
    headers: { 'Content-Type': 'application/json' },
  };
};

export const hasApiAccess = (): boolean =>
  Boolean(PROXY_URL || DIRECT_KEY);

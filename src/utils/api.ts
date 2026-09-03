/**
 * Safe JSON fetch utility that prevents "Unexpected token '<', <!doctype... is not valid JSON"
 * errors when endpoints return HTML error pages or proxy gateway timeouts.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackValue: T | null = null
): Promise<T | null> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    
    // If response is not ok or not JSON, gracefully return fallback
    if (!res.ok || !contentType.toLowerCase().includes('application/json')) {
      console.warn(`[safeFetchJson] Non-JSON or error response (${res.status}) from ${typeof input === 'string' ? input : 'URL'}`);
      return fallbackValue;
    }

    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      console.warn(`[safeFetchJson] HTML detected instead of JSON from ${typeof input === 'string' ? input : 'URL'}`);
      return fallbackValue;
    }

    return JSON.parse(text) as T;
  } catch (err) {
    console.warn(`[safeFetchJson] Network or parse failure:`, err);
    return fallbackValue;
  }
}

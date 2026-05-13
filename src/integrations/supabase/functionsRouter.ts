/**
 * functionsRouter — auto-detects whether a local Supabase Functions
 * server is running and returns the right base URL.
 *
 * Why this exists: streaming edge-function calls can't go through
 * `supabase.functions.invoke()` (the JS SDK reads the whole response
 * into a buffer). We have to use raw `fetch()` instead, which means we
 * also have to know the base URL. In production that's just
 * `<VITE_SUPABASE_URL>/functions/v1`. In local dev we want to point at
 * `http://localhost:54321/functions/v1` IF the developer is running
 * `supabase functions serve` — and silently fall back to prod if not.
 *
 * Workflow:
 *   • Production build → always returns the prod URL (no probe).
 *   • Dev build, first call → probes localhost:54321 with a 1s timeout.
 *     - If it responds → uses local for the rest of the session.
 *     - If it times out / errors → uses prod for the rest of the session.
 *   • Result is cached in module scope so subsequent calls are sync.
 *   • Logs the resolved choice once to the console so the developer
 *     knows which one is in play without checking devtools.
 *
 * Drop-in usage:
 *   const url = await getFunctionsBaseUrl();
 *   const res = await fetch(`${url}/ai-improve-story?stream=true`, {...});
 *
 * For non-streaming calls keep using `supabase.functions.invoke()` — it
 * handles auth headers automatically and goes through the SDK's pinned
 * prod URL. This helper is only needed when you're streaming.
 */

const PROD_FUNCTIONS_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * Local-dev candidates, probed in order on first call. First one that
 * responds wins. We support two local workflows:
 *
 *   1. `supabase functions serve` (port 54321, prefix `/functions/v1`)
 *      — the canonical path, requires `supabase start` to be running.
 *
 *   2. `deno run --allow-all --env-file=.env supabase/functions/<name>/index.ts`
 *      (port 8000, no prefix) — bypasses the whole local Supabase
 *      stack. Works when migration replay in `supabase start` is
 *      broken. The function ignores the path, so `${base}/<name>`
 *      still routes to the same handler.
 */
const LOCAL_CANDIDATES: { label: string; url: string }[] = [
  { label: "Supabase CLI", url: "http://localhost:54321/functions/v1" },
  { label: "Deno direct", url: "http://localhost:8000" },
];

let cachedBase: string | null = null;
let inflightProbe: Promise<string> | null = null;

async function probeOne(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    // `mode: 'no-cors'` skips the CORS preflight entirely — we don't
    // need to READ the response, only know whether the server
    // answered at all. With CORS disabled, fetch resolves opaquely on
    // any HTTP response and rejects only on network-level failure
    // (connection refused, DNS, abort). That's exactly the signal we
    // want: "is something listening on this port?".
    //
    // Earlier version used `method: 'OPTIONS'` but Chrome preflights
    // cross-origin OPTIONS requests themselves, and the function's
    // preflight response didn't always include OPTIONS in the allowed
    // methods, so the probe failed even when the function was up.
    await fetch(`${url}/ai-improve-story`, {
      method: "GET",
      mode: "no-cors",
      signal,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getFunctionsBaseUrl(): Promise<string> {
  if (cachedBase) return cachedBase;

  // Production builds skip the probe entirely — local serves are a
  // dev-only workflow.
  if (!import.meta.env.DEV) {
    cachedBase = PROD_FUNCTIONS_URL;
    return cachedBase;
  }

  if (inflightProbe) return inflightProbe;

  inflightProbe = (async () => {
    // Probe candidates in order with a 1s budget per attempt. Stop on
    // the first hit — preserves preference order (Supabase CLI wins
    // over Deno direct if both are running).
    for (const candidate of LOCAL_CANDIDATES) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      try {
        const ok = await probeOne(candidate.url, controller.signal);
        if (ok) {
          // eslint-disable-next-line no-console
          console.info(
            `[supabase] functions router → using LOCAL endpoint (${candidate.label})`,
            candidate.url,
          );
          cachedBase = candidate.url;
          return cachedBase;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line no-console
    console.info(
      "[supabase] functions router → no local endpoint reachable, using PROD",
      PROD_FUNCTIONS_URL,
    );
    cachedBase = PROD_FUNCTIONS_URL;
    return cachedBase;
  })().finally(() => {
    inflightProbe = null;
  });

  return inflightProbe;
}

/**
 * Convenience wrapper — fetches against the resolved base URL with the
 * caller's auth headers already attached. Caller is responsible for
 * setting `Content-Type` and request body. Returns the raw `Response`
 * so the caller can stream the body.
 */
export async function fetchFunction(
  name: string,
  options: { method?: string; body?: BodyInit; headers?: HeadersInit; signal?: AbortSignal } & {
    accessToken?: string | null;
  } = {},
): Promise<Response> {
  const base = await getFunctionsBaseUrl();
  const headers = new Headers(options.headers);
  // Supabase functions accept either an `apikey` header or a Bearer
  // token. We prefer the user's session token when available so RLS
  // applies inside the function; fall back to the publishable key.
  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  } else {
    const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (anon) {
      headers.set("apikey", anon);
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${anon}`);
      }
    }
  }
  return fetch(`${base}/${name}`, {
    method: options.method ?? "POST",
    body: options.body,
    headers,
    signal: options.signal,
  });
}

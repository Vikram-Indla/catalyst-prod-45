/**
 * _shared/llm.ts — shared Deno LLM provider abstraction for docintel-* functions.
 *
 * API (all functions capture durationMs; no secrets hardcoded; env-only keys):
 *   generateText(opts)   → LlmResult { text, provider, model, durationMs, attempts, parsed?, tokens? }
 *   generateStream(opts) → { stream: ReadableStream<string>, meta: Promise<LlmResult w/o text> }
 *   embed(texts, opts?)  → { embeddings, model, provider, durationMs } — Gemini-only, 1536-dim
 *   logUsage(admin, {..})→ best-effort ai_usage_log insert (never throws)
 *
 * Provider chain (failover on 429 / 5xx / network / timeout, per-provider AbortController):
 *   gemini (GEMINI_API_KEY, primary) → anthropic (ANTHROPIC_API_KEY) → qwen (DASHSCOPE_API_KEY, dormant)
 * A provider with no key is skipped silently and recorded as status 'skipped_no_key' in attempts.
 * jsonSchema: Gemini native responseSchema; Anthropic/Qwen get schema-in-prompt + strict-JSON;
 * result.parsed carries the parsed object with one repair-reparse retry on JSON.parse failure.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
export type Provider = "gemini" | "anthropic" | "qwen";

export type LlmMessage = {
  role: "system" | "user";
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
};

export type LlmAttempt = {
  provider: Provider;
  model: string;
  status: "ok" | "error" | "skipped_no_key";
  error?: string;
};

export type LlmResult = {
  text: string;
  provider: Provider;
  model: string;
  durationMs: number;
  attempts: LlmAttempt[];
  parsed?: unknown;
  inputTokens?: number;
  outputTokens?: number;
};

export type GenerateTextOpts = {
  messages: LlmMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  jsonSchema?: Record<string, unknown>;
  timeoutMs?: number;
  providerOrder?: Provider[];
  modelOverrides?: Partial<Record<Provider, string>>;
};

export type GenerateStreamOpts = Omit<GenerateTextOpts, "jsonSchema">;

// ─────────────────────────────────────────────────────────────────────
// Defaults / endpoints
// ─────────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_PROVIDER_ORDER: Provider[] = ["gemini", "anthropic", "qwen"];

// Same-provider retry policy for TRANSIENT faults (429 / 5xx / network / timeout).
// Under bulk fan-out (many small concurrent translate calls) Gemini returns
// transient 503 "high demand" / 429 rate-limit errors. We retry the SAME provider
// with exponential backoff + jitter BEFORE failing over — a failover only helps
// if a DIFFERENT provider has a key + credits, which is not guaranteed here.
// MAX_RETRIES additional attempts after the first → up to 4 tries per provider.
const MAX_RETRIES = 3;
// Base backoff before retry N (0-based): ~800ms, ~1800ms, ~3800ms (+ jitter).
const RETRY_BACKOFF_MS = [800, 1800, 3800];
const RETRY_JITTER_MS = 400;

/** Await ms milliseconds (no busy-wait). */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Backoff for retry attempt i (0-based) with +[0,RETRY_JITTER_MS) jitter. */
function backoffMs(i: number): number {
  const base = RETRY_BACKOFF_MS[Math.min(i, RETRY_BACKOFF_MS.length - 1)];
  return base + Math.floor(Math.random() * RETRY_JITTER_MS);
}

/**
 * Classify a caught error for the same-provider retry loop.
 *  - HttpError with a retryable status (429/5xx) → retryable
 *  - HttpError with a non-retryable status (4xx other than 429) → NOT retryable
 *    (e.g. Anthropic 400 no-credits, 401 bad key) → fail over immediately
 *  - status 0 (network / abort / timeout, no HttpError) → retryable transient
 */
function isTransient(e: unknown): boolean {
  if (e instanceof HttpError) return isRetryable(e.status);
  return true; // network error / AbortError / timeout → transient
}

const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_DIMS = 1536;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

const DEFAULT_QWEN_MODEL = "qwen-max";
const QWEN_VL_MODEL = "qwen-vl-max";
const DEFAULT_DASHSCOPE_BASE = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

// ─────────────────────────────────────────────────────────────────────
// Small pure helpers
// ─────────────────────────────────────────────────────────────────────
function envKey(p: Provider): string | undefined {
  if (p === "gemini") return Deno.env.get("GEMINI_API_KEY") ?? undefined;
  if (p === "anthropic") return Deno.env.get("ANTHROPIC_API_KEY") ?? undefined;
  return Deno.env.get("DASHSCOPE_API_KEY") ?? undefined; // qwen
}

function hasInlineData(messages: LlmMessage[]): boolean {
  return messages.some((m) => m.parts.some((p) => !!p.inlineData));
}

function modelFor(p: Provider, messages: LlmMessage[], overrides?: GenerateTextOpts["modelOverrides"]): string {
  if (overrides?.[p]) return overrides[p]!;
  if (p === "gemini") return GEMINI_TEXT_MODEL;
  if (p === "anthropic") return Deno.env.get("ANTHROPIC_MODEL") ?? DEFAULT_ANTHROPIC_MODEL;
  // qwen: VL variant when the request carries any image/document inlineData
  const envQwen = Deno.env.get("QWEN_MODEL");
  if (envQwen) return envQwen;
  return hasInlineData(messages) ? QWEN_VL_MODEL : DEFAULT_QWEN_MODEL;
}

/** Failover-worthy: rate-limit, server error, network/abort/timeout. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Concatenate system parts into one instruction string; used by native providers. */
function systemText(messages: LlmMessage[]): string {
  return messages
    .filter((m) => m.role === "system")
    .flatMap((m) => m.parts.map((p) => p.text ?? ""))
    .filter(Boolean)
    .join("\n\n");
}

function strictJsonInstruction(schema: Record<string, unknown>): string {
  return (
    "You MUST respond with a single valid JSON value and nothing else — no prose, no markdown fences. " +
    "The JSON must conform to this schema:\n" +
    JSON.stringify(schema)
  );
}

/** Best-effort JSON extraction: strips ```json fences, then falls back to the first {...} / [...] block. */
function tryParseJson(raw: string): unknown | undefined {
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

async function withTimeout(timeoutMs: number): Promise<{ signal: AbortSignal; clear: () => void }> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

// ─────────────────────────────────────────────────────────────────────
// Provider payload builders — map LlmMessage[] to each provider's shape
// ─────────────────────────────────────────────────────────────────────

/** Gemini native: system_instruction + contents[] with inlineData preserved verbatim. */
function toGeminiBody(
  messages: LlmMessage[],
  temperature: number,
  maxOutputTokens: number,
  jsonSchema?: Record<string, unknown>,
): Record<string, unknown> {
  const sys = systemText(messages);
  const contents = messages
    .filter((m) => m.role === "user")
    .map((m) => ({
      role: "user",
      parts: m.parts.map((p) =>
        p.inlineData ? { inlineData: p.inlineData } : { text: p.text ?? "" },
      ),
    }));
  const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens };
  if (jsonSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = jsonSchema;
  }
  const body: Record<string, unknown> = { contents, generationConfig };
  if (sys) body.system_instruction = { parts: [{ text: sys }] };
  return body;
}

/** Anthropic: content-block array; inlineData → image/document blocks (base64 source). */
function toAnthropicBody(
  model: string,
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
  jsonSchema?: Record<string, unknown>,
): Record<string, unknown> {
  let sys = systemText(messages);
  if (jsonSchema) sys = `${sys}\n\n${strictJsonInstruction(jsonSchema)}`.trim();

  const content = messages
    .filter((m) => m.role === "user")
    .flatMap((m) =>
      m.parts.map((p) => {
        if (p.inlineData) {
          const isPdf = p.inlineData.mimeType === "application/pdf";
          return isPdf
            ? {
                type: "document",
                source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data },
              }
            : {
                type: "image",
                source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data },
              };
        }
        return { type: "text", text: p.text ?? "" };
      }),
    );

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content }],
  };
  if (sys) body.system = sys;
  return body;
}

/** Qwen VL (OpenAI-compatible): messages[].content as a text/image_url array. */
function toQwenBody(
  model: string,
  messages: LlmMessage[],
  temperature: number,
  maxTokens: number,
  jsonSchema?: Record<string, unknown>,
  stream = false,
): Record<string, unknown> {
  let sys = systemText(messages);
  if (jsonSchema) sys = `${sys}\n\n${strictJsonInstruction(jsonSchema)}`.trim();

  const userContent = messages
    .filter((m) => m.role === "user")
    .flatMap((m) =>
      m.parts.map((p) =>
        p.inlineData
          ? {
              type: "image_url",
              image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
            }
          : { type: "text", text: p.text ?? "" },
      ),
    );

  const oaMessages: Array<Record<string, unknown>> = [];
  if (sys) oaMessages.push({ role: "system", content: sys });
  oaMessages.push({ role: "user", content: userContent });

  const body: Record<string, unknown> = {
    model,
    messages: oaMessages,
    temperature,
    max_tokens: maxTokens,
  };
  if (stream) body.stream = true;
  if (jsonSchema) body.response_format = { type: "json_object" };
  return body;
}

// ─────────────────────────────────────────────────────────────────────
// Per-provider single-shot calls → { text, inputTokens?, outputTokens? }
// Throw on non-ok (caller decides failover). No retry here — the orchestrator
// walks the provider chain; the whole request is bounded by timeoutMs.
// ─────────────────────────────────────────────────────────────────────
type CallResult = { text: string; inputTokens?: number; outputTokens?: number };

async function callGemini(
  model: string,
  o: GenerateTextOpts,
  signal: AbortSignal,
): Promise<CallResult> {
  const key = envKey("gemini")!;
  const body = toGeminiBody(
    o.messages,
    o.temperature ?? 0.2,
    o.maxOutputTokens ?? 4096,
    o.jsonSchema,
  );
  const resp = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new HttpError(resp.status, `gemini_${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return {
    text: text.trim(),
    inputTokens: data?.usageMetadata?.promptTokenCount,
    outputTokens: data?.usageMetadata?.candidatesTokenCount,
  };
}

async function callAnthropic(
  model: string,
  o: GenerateTextOpts,
  signal: AbortSignal,
): Promise<CallResult> {
  const key = envKey("anthropic")!;
  const body = toAnthropicBody(
    model,
    o.messages,
    o.temperature ?? 0.2,
    o.maxOutputTokens ?? 4096,
    o.jsonSchema,
  );
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new HttpError(resp.status, `anthropic_${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text: string =
    data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "";
  return {
    text: text.trim(),
    inputTokens: data?.usage?.input_tokens,
    outputTokens: data?.usage?.output_tokens,
  };
}

async function callQwen(
  model: string,
  o: GenerateTextOpts,
  signal: AbortSignal,
): Promise<CallResult> {
  const key = envKey("qwen")!;
  const base = Deno.env.get("DASHSCOPE_BASE_URL") ?? DEFAULT_DASHSCOPE_BASE;
  const body = toQwenBody(
    model,
    o.messages,
    o.temperature ?? 0.2,
    o.maxOutputTokens ?? 4096,
    o.jsonSchema,
  );
  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new HttpError(resp.status, `qwen_${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return {
    text: text.trim(),
    inputTokens: data?.usage?.prompt_tokens,
    outputTokens: data?.usage?.completion_tokens,
  };
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

const CALLERS: Record<Provider, (m: string, o: GenerateTextOpts, s: AbortSignal) => Promise<CallResult>> = {
  gemini: callGemini,
  anthropic: callAnthropic,
  qwen: callQwen,
};

// ─────────────────────────────────────────────────────────────────────
// generateText — walk the provider chain until one succeeds
// ─────────────────────────────────────────────────────────────────────
export async function generateText(opts: GenerateTextOpts): Promise<LlmResult> {
  const order = opts.providerOrder ?? DEFAULT_PROVIDER_ORDER;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempts: LlmAttempt[] = [];
  const started = Date.now();

  // Cap total same-provider retry wall-clock so a stuck provider can't hold the
  // request forever; once elapsed, stop retrying this provider and fail over.
  const retryDeadline = started + timeoutMs * 2;

  for (const provider of order) {
    const model = modelFor(provider, opts.messages, opts.modelOverrides);

    if (!envKey(provider)) {
      attempts.push({ provider, model, status: "skipped_no_key" });
      continue;
    }

    // Same-provider retry loop: up to MAX_RETRIES extra attempts on a TRANSIENT
    // fault (429/5xx/network/timeout). A NON-retryable error (4xx other than
    // 429 — e.g. Anthropic no-credits) breaks out immediately to fail over,
    // wasting no retries. Every attempt is recorded in attempts[]. On break the
    // outer for-loop naturally advances to the next provider.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { signal, clear } = await withTimeout(timeoutMs);
      try {
        const res = await CALLERS[provider](model, opts, signal);
        clear();
        attempts.push({ provider, model, status: "ok" });

        let parsed: unknown | undefined;
        if (opts.jsonSchema) {
          parsed = tryParseJson(res.text);
          if (parsed === undefined) {
            // one repair-reparse retry: ask the same provider to fix its JSON
            const repair = await repairJson(provider, model, res.text, opts, timeoutMs);
            attempts.push({ provider, model, status: repair.ok ? "ok" : "error", error: repair.error });
            if (repair.parsed !== undefined) {
              parsed = repair.parsed;
              res.text = repair.text ?? res.text;
            }
          }
        }

        return {
          text: res.text,
          provider,
          model,
          durationMs: Date.now() - started,
          attempts,
          parsed,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
        };
      } catch (e) {
        clear();
        const err = e instanceof Error ? e.message : String(e);
        const status = e instanceof HttpError ? e.status : 0;
        attempts.push({ provider, model, status: "error", error: err });

        // Non-retryable (4xx other than 429) → fail over now, no wasted retries.
        if (!isTransient(e)) break;
        // Transient, but out of same-provider attempts or past the retry
        // deadline → fail over to the next provider.
        if (attempt >= MAX_RETRIES || Date.now() >= retryDeadline) break;
        // Transient with attempts left → back off, then retry SAME provider.
        await sleep(backoffMs(attempt));
      }
    }
  }

  // Whole chain exhausted.
  throw new Error(`llm_all_providers_failed: ${JSON.stringify(attempts)}`);
}

/** One reparse attempt: re-send the model's own output and ask it to emit valid JSON. */
async function repairJson(
  provider: Provider,
  model: string,
  badText: string,
  o: GenerateTextOpts,
  timeoutMs: number,
): Promise<{ ok: boolean; parsed?: unknown; text?: string; error?: string }> {
  const { signal, clear } = await withTimeout(timeoutMs);
  try {
    const repairOpts: GenerateTextOpts = {
      ...o,
      temperature: 0,
      messages: [
        { role: "system", parts: [{ text: "You repair malformed JSON. Return ONLY valid JSON, no prose, no fences." }] },
        {
          role: "user",
          parts: [
            {
              text:
                `The following text was supposed to be valid JSON conforming to this schema:\n` +
                `${JSON.stringify(o.jsonSchema)}\n\n` +
                `Fix it and return only the corrected JSON:\n${badText}`,
            },
          ],
        },
      ],
    };
    const res = await CALLERS[provider](model, repairOpts, signal);
    clear();
    const parsed = tryParseJson(res.text);
    return { ok: parsed !== undefined, parsed, text: res.text };
  } catch (e) {
    clear();
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────
// generateStream — text-delta stream + a meta promise (no jsonSchema)
// Gemini streams via :streamGenerateContent (SSE, native parts).
// Anthropic streams via SSE (content_block_delta). Qwen falls back to a
// single non-streamed emission (whole text at once).
// ─────────────────────────────────────────────────────────────────────
export function generateStream(opts: GenerateStreamOpts): {
  stream: ReadableStream<string>;
  meta: Promise<Omit<LlmResult, "text">>;
} {
  const order = opts.providerOrder ?? DEFAULT_PROVIDER_ORDER;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempts: LlmAttempt[] = [];
  const started = Date.now();

  let resolveMeta!: (m: Omit<LlmResult, "text">) => void;
  let rejectMeta!: (e: unknown) => void;
  const meta = new Promise<Omit<LlmResult, "text">>((res, rej) => {
    resolveMeta = res;
    rejectMeta = rej;
  });

  const retryDeadline = started + timeoutMs * 2;

  const stream = new ReadableStream<string>({
    async start(controller) {
      for (const provider of order) {
        const model = modelFor(provider, opts.messages, opts.modelOverrides);
        if (!envKey(provider)) {
          attempts.push({ provider, model, status: "skipped_no_key" });
          continue;
        }

        // Same-provider retry on transient faults BEFORE the first byte is
        // enqueued. A retry is only safe until we have streamed nothing yet —
        // streamGemini/streamAnthropic throw before enqueuing on a non-ok HTTP
        // response (the failure mode we retry: 429/503), so nothing is emitted
        // when we come back around. Non-retryable errors fail over immediately.
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          const { signal, clear } = await withTimeout(timeoutMs);
          try {
            let inputTokens: number | undefined;
            let outputTokens: number | undefined;

            if (provider === "gemini") {
              ({ inputTokens, outputTokens } = await streamGemini(model, opts, signal, controller));
            } else if (provider === "anthropic") {
              ({ inputTokens, outputTokens } = await streamAnthropic(model, opts, signal, controller));
            } else {
              // qwen fallback: single non-streamed emission
              const res = await callQwen(model, opts, signal);
              if (res.text) controller.enqueue(res.text);
              inputTokens = res.inputTokens;
              outputTokens = res.outputTokens;
            }

            clear();
            attempts.push({ provider, model, status: "ok" });
            controller.close();
            resolveMeta({
              provider,
              model,
              durationMs: Date.now() - started,
              attempts,
              inputTokens,
              outputTokens,
            });
            return;
          } catch (e) {
            clear();
            attempts.push({ provider, model, status: "error", error: e instanceof Error ? e.message : String(e) });
            // Non-retryable → fail over now; transient but exhausted/past
            // deadline → fail over; otherwise back off + retry SAME provider.
            if (!isTransient(e)) break;
            if (attempt >= MAX_RETRIES || Date.now() >= retryDeadline) break;
            await sleep(backoffMs(attempt));
          }
        }
      }
      const err = new Error(`llm_all_providers_failed: ${JSON.stringify(attempts)}`);
      controller.error(err);
      rejectMeta(err);
    },
  });

  return { stream, meta };
}

async function streamGemini(
  model: string,
  o: GenerateStreamOpts,
  signal: AbortSignal,
  controller: ReadableStreamDefaultController<string>,
): Promise<{ inputTokens?: number; outputTokens?: number }> {
  const key = envKey("gemini")!;
  const body = toGeminiBody(o.messages, o.temperature ?? 0.2, o.maxOutputTokens ?? 4096);
  const resp = await fetch(
    `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal },
  );
  if (!resp.ok || !resp.body) {
    const err = await resp.text().catch(() => "");
    throw new HttpError(resp.status, `gemini_${resp.status}: ${err.slice(0, 200)}`);
  }
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  await pumpSse(resp.body, signal, (obj) => {
    const delta: string | undefined = obj?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "").join("");
    if (delta) controller.enqueue(delta);
    if (obj?.usageMetadata) {
      inputTokens = obj.usageMetadata.promptTokenCount;
      outputTokens = obj.usageMetadata.candidatesTokenCount;
    }
  });
  return { inputTokens, outputTokens };
}

async function streamAnthropic(
  model: string,
  o: GenerateStreamOpts,
  signal: AbortSignal,
  controller: ReadableStreamDefaultController<string>,
): Promise<{ inputTokens?: number; outputTokens?: number }> {
  const key = envKey("anthropic")!;
  const body = toAnthropicBody(model, o.messages, o.temperature ?? 0.2, o.maxOutputTokens ?? 4096);
  body.stream = true;
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const err = await resp.text().catch(() => "");
    throw new HttpError(resp.status, `anthropic_${resp.status}: ${err.slice(0, 200)}`);
  }
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  await pumpSse(resp.body, signal, (obj) => {
    if (obj?.type === "content_block_delta" && typeof obj?.delta?.text === "string") {
      controller.enqueue(obj.delta.text);
    } else if (obj?.type === "message_start") {
      inputTokens = obj?.message?.usage?.input_tokens;
    } else if (obj?.type === "message_delta") {
      outputTokens = obj?.usage?.output_tokens;
    }
  });
  return { inputTokens, outputTokens };
}

/** Generic SSE pump: split on \n\n, unwrap `data:` lines, JSON.parse, call onEvent. */
async function pumpSse(
  bodyStream: ReadableStream<Uint8Array>,
  _signal: AbortSignal,
  onEvent: (obj: any) => void,
): Promise<void> {
  const reader = bodyStream.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        if (!frame) continue;
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            onEvent(JSON.parse(payload));
          } catch {
            /* skip malformed chunk */
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* noop */
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// embed — Gemini ONLY (dimension consistency; no cross-provider fallback)
// gemini-embedding-001, outputDimensionality 1536. Uses :batchEmbedContents,
// WINDOW_SIZE texts per call, and fires up to MAX_INFLIGHT windows CONCURRENTLY
// (Promise.all over a bounded pool) instead of awaiting each window in series —
// cutting embed wall-time substantially for many-chunk docs. Output ordering is
// preserved: each window writes into its fixed slice [start .. start+len) of the
// pre-sized embeddings[] via the captured base index, so embeddings[i]⇔texts[i]
// regardless of which window completes first.
// ─────────────────────────────────────────────────────────────────────
export async function embed(
  texts: string[],
  opts?: { timeoutMs?: number },
): Promise<{ embeddings: number[][]; model: string; provider: Provider; durationMs: number }> {
  const key = envKey("gemini");
  if (!key) throw new Error("embed_no_gemini_key: GEMINI_API_KEY is required for embeddings");
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();

  const embeddings: number[][] = new Array(texts.length);
  // Tuned for near-real-time: embed was ~18s for a 350-chunk doc at 8×6. Larger
  // windows + a wider pool cut the wave count ~3× (→ ~6-8s). The embeddings
  // endpoint has a separate, higher quota than generateContent, so this extra
  // concurrency does not compete with the translate agent's rate budget.
  const WINDOW_SIZE = 24; // texts per batchEmbedContents call
  const MAX_INFLIGHT = 8; // windows fired concurrently (bounded pool)

  // One window = one batchEmbedContents call over texts[start .. start+len).
  // Writes results back at their ABSOLUTE index (start + j) so ordering holds
  // no matter the completion order.
  const runWindow = async (start: number, len: number): Promise<void> => {
    const window = texts.slice(start, start + len);
    const body = {
      requests: window.map((t) => ({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: t }] },
        outputDimensionality: GEMINI_EMBED_DIMS,
      })),
    };
    // Same-provider retry on transient faults (429/503) — embed is Gemini-only,
    // so there is no failover; a retry is the only resilience under bulk load.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { signal, clear } = await withTimeout(timeoutMs);
      try {
        const resp = await fetch(
          `${GEMINI_BASE}/models/${GEMINI_EMBED_MODEL}:batchEmbedContents?key=${key}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal },
        );
        clear();
        if (!resp.ok) {
          const err = await resp.text().catch(() => "");
          // Retry transient status; other statuses throw immediately.
          if (isRetryable(resp.status) && attempt < MAX_RETRIES) {
            await sleep(backoffMs(attempt));
            continue;
          }
          throw new Error(`embed_gemini_${resp.status}: ${err.slice(0, 200)}`);
        }
        const data = await resp.json();
        const vecs: Array<{ values: number[] }> = data?.embeddings ?? [];
        if (vecs.length !== window.length) {
          throw new Error(`embed_count_mismatch: expected ${window.length}, got ${vecs.length}`);
        }
        for (let j = 0; j < window.length; j++) {
          embeddings[start + j] = vecs[j].values; // absolute index → ordering preserved
        }
        return;
      } catch (e) {
        clear();
        // Network/abort/timeout with attempts left → back off + retry.
        if (!(e instanceof HttpError) && attempt < MAX_RETRIES &&
            (e instanceof Error && /timeout|abort|network|fetch/i.test(e.message))) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw e instanceof Error ? e : new Error(String(e));
      }
    }
  };

  // Enumerate every window's [start,len], then drain them through a bounded
  // concurrent pool: up to MAX_INFLIGHT batchEmbedContents calls in flight at
  // once (Promise.all per wave). Any window throwing rejects the whole embed
  // (throw-on-failure behaviour preserved).
  const windows: Array<{ start: number; len: number }> = [];
  for (let i = 0; i < texts.length; i += WINDOW_SIZE) {
    windows.push({ start: i, len: Math.min(WINDOW_SIZE, texts.length - i) });
  }
  for (let w = 0; w < windows.length; w += MAX_INFLIGHT) {
    const wave = windows.slice(w, w + MAX_INFLIGHT);
    await Promise.all(wave.map((win) => runWindow(win.start, win.len)));
  }

  return {
    embeddings,
    model: GEMINI_EMBED_MODEL,
    provider: "gemini",
    durationMs: Date.now() - started,
  };
}

// ─────────────────────────────────────────────────────────────────────
// logUsage — best-effort ai_usage_log insert. Never throws.
// Matches the existing shape: { source, action, status, error_message, payload }.
// ─────────────────────────────────────────────────────────────────────
export async function logUsage(
  admin: SupabaseClient | null,
  params: {
    source: string;
    action: string;
    status: "ok" | "error";
    error?: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  try {
    let client = admin;
    if (!client) {
      const url = Deno.env.get("SUPABASE_URL");
      const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !svc) return;
      client = createClient(url, svc, { auth: { persistSession: false } });
    }
    await client.from("ai_usage_log").insert({
      source: params.source,
      action: params.action,
      status: params.status,
      error_message: params.error ?? null,
      payload: params.payload,
    } as never);
  } catch {
    /* audit must never block inference */
  }
}

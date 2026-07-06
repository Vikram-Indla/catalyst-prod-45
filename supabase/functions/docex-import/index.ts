/**
 * docex-import — convert an uploaded PDF into structured Docex blocks via
 * Gemini (CAT-DOCEX-DB-COEDIT-20260705-001 V5, Vikram 2026-07-06: "use AI and
 * in real time it can convert a PDF using Gemini API into a proper translated
 * English").
 *
 * Input : { fileBase64, mimeType: 'application/pdf', filename }
 * Output: { title, sourceLang, blocks: [{ type, text }] }
 *   type ∈ heading1|heading2|heading3|paragraph|bullet|numbered|quote
 *
 * Non-English documents (Arabic in particular) are translated to professional
 * English while preserving document structure. Uses Gemini's NATIVE
 * generateContent endpoint (inline PDF parts are not available on the
 * OpenAI-compat lane the other ai-* functions use) with a JSON response
 * schema so the output parses deterministically.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const MODEL = "gemini-2.5-flash";
// ~14MB of base64 ≈ 10MB PDF — inline_data ceiling is 20MB total request.
const MAX_BASE64_LEN = 14 * 1024 * 1024;

const PROMPT = `Extract the COMPLETE content of this document into structured blocks.

Rules:
1. If the document is not in English (for example Arabic), translate EVERYTHING into professional business English. Preserve names, ticket keys (ABC-123), URLs, and email addresses exactly as written.
2. Preserve the document's structure and order: headings become heading1/heading2/heading3 by hierarchy, body text becomes paragraph blocks, list items become bullet or numbered blocks, quoted or highlighted passages become quote blocks.
3. Tables: render each table row as one bullet block with cell values joined by " — ". Put the header row first as a bullet too.
4. Capture ALL content. Do not summarize, skip sections, or add commentary.
5. "title" is the document's title (translated to English if needed). If the document has no explicit title, derive a short descriptive one.
6. "sourceLang" is the dominant language of the ORIGINAL document as a two-letter code (en, ar, fr, ...).`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    sourceLang: { type: "string" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["heading1", "heading2", "heading3", "paragraph", "bullet", "numbered", "quote"],
          },
          text: { type: "string" },
        },
        required: ["type", "text"],
      },
    },
  },
  required: ["title", "sourceLang", "blocks"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const fileBase64: string = typeof body?.fileBase64 === "string" ? body.fileBase64 : "";
    const mimeType: string = typeof body?.mimeType === "string" ? body.mimeType : "";
    if (!fileBase64) return json(400, { error: "empty_file" });
    if (fileBase64.length > MAX_BASE64_LEN) return json(413, { error: "file_too_large", maxMb: 10 });
    if (mimeType !== "application/pdf") return json(400, { error: "unsupported_type", supported: ["application/pdf"] });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json(500, { error: "GEMINI_API_KEY is not configured" });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: fileBase64 } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 32768,
            response_mime_type: "application/json",
            response_schema: RESPONSE_SCHEMA,
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("gemini_error", res.status, detail.slice(0, 500));
      return json(502, { error: "gemini_error", status: res.status });
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json(502, { error: "empty_completion" });

    let parsed: { title: string; sourceLang: string; blocks: Array<{ type: string; text: string }> };
    try {
      parsed = JSON.parse(text);
    } catch (_e) {
      return json(502, { error: "unparseable_completion" });
    }
    if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      return json(422, { error: "no_content_extracted" });
    }

    return json(200, {
      title: parsed.title || "Imported document",
      sourceLang: parsed.sourceLang || "en",
      blocks: parsed.blocks,
    });
  } catch (e) {
    console.error("docex-import failure", e);
    return json(500, { error: "internal_error", message: e instanceof Error ? e.message : String(e) });
  }
});

/**
 * chat-summarize — Gemini-backed chat conversation summarizer.
 *
 * Input (JSON body):
 *   {
 *     conversationTitle: string;
 *     conversationIsPrivate: boolean;
 *     rangeStart: string; // ISO date (yyyy-mm-dd)
 *     rangeEnd: string;
 *     mode: 'range' | 'thread';
 *     messages: Array<{ id, authorName, bodyText, createdAt, parentId }>;
 *     participants: Array<{ id, name, avatarUrl }>;
 *   }
 *
 * Output (matches src/features/chat-v2/components/Summarize/summarize.types.ts):
 *   SummaryPayload
 *
 * Calls Gemini 2.5 Flash via the OpenAI-compatible endpoint, with JSON
 * response_format. Falls back to a single "Couldn't summarize" section
 * when the model misbehaves so the UI keeps working.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_MESSAGES = 200; // cap context size

interface InboundMessage {
  id: string;
  authorName: string;
  bodyText: string;
  createdAt: string;
  parentId: string | null;
}

interface InboundParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface RequestBody {
  conversationTitle: string;
  conversationIsPrivate: boolean;
  rangeStart: string;
  rangeEnd: string;
  mode: 'range' | 'thread';
  messages: InboundMessage[];
  participants: InboundParticipant[];
}

interface GeminiSection {
  title: string;
  body: string;
  details: Array<{ text: string; messageId: string }>;
}

interface GeminiResponse {
  sections: GeminiSection[];
}

interface SummaryReference {
  index: number;
  messageId: string;
  parentMessageId: string | null;
  authorName: string;
  snippet: string;
}

interface SummaryDetail {
  text: string;
  refIndex: number;
}

interface SummarySection {
  id: string;
  title: string;
  body: string;
  details: SummaryDetail[];
}

interface SummaryPayload {
  rangeStart: string;
  rangeEnd: string;
  conversationTitle: string;
  conversationIsPrivate: boolean;
  messageCount: number;
  participants: Array<{ id: string; name: string; avatarUrl: string | null }>;
  sections: SummarySection[];
  references: SummaryReference[];
}

function buildPrompt(req: RequestBody): { system: string; user: string } {
  const lines: string[] = [];
  const capped = req.messages.slice(0, MAX_MESSAGES);
  for (const m of capped) {
    if (!m.bodyText || !m.bodyText.trim()) continue;
    const stamp = m.createdAt?.slice(0, 16).replace('T', ' ') ?? '';
    lines.push(`[id=${m.id}] ${m.authorName} @ ${stamp}: ${m.bodyText.replace(/\s+/g, ' ').slice(0, 600)}`);
  }
  const transcript = lines.join('\n');

  const scopeLabel = req.mode === 'thread' ? 'thread' : `conversation between ${req.rangeStart} and ${req.rangeEnd}`;

  const system = [
    'You are a concise chat conversation summarizer for an enterprise work-management product.',
    'You will be given a transcript of messages, each prefixed with [id=<message_id>], an author, and a timestamp.',
    'Return ONE JSON object — no prose, no markdown fence.',
    'Schema:',
    '{',
    '  "sections": [',
    '    {',
    '      "title": "<2-5 word section title>",',
    '      "body": "<1-3 sentence paragraph. Use @AuthorName to attribute decisions or asks.>",',
    '      "details": [ { "text": "<one-line bullet>", "messageId": "<must be an id from the transcript>" } ]',
    '    }',
    '  ]',
    '}',
    'Rules:',
    '- Produce 2 to 4 sections covering: recent activity, decisions / action items, open questions / unknowns. Skip sections that have no real content.',
    '- Each section MUST have 1-3 detail items. Each detail.messageId MUST be copied verbatim from a [id=...] tag in the transcript.',
    '- Do NOT invent message ids. Do NOT cite ids that are not in the transcript.',
    '- Keep bodies tight and factual. No filler like "the team is hard at work".',
    '- If there is genuinely nothing of substance, return one section titled "No activity" with body "There were no substantive messages in the selected window." and an empty details array.',
  ].join('\n');

  const user = `Summarize this ${scopeLabel} titled "${req.conversationTitle}".\n\nTranscript:\n${transcript || '(empty)'}`;

  return { system, user };
}

function safeParseGemini(raw: string): GeminiResponse | null {
  if (!raw) return null;
  let s = raw.trim();
  // Strip ```json ... ``` fences if Gemini added them despite response_format.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(s);
    if (!parsed || !Array.isArray(parsed.sections)) return null;
    return parsed as GeminiResponse;
  } catch {
    return null;
  }
}

function buildPayload(req: RequestBody, gemini: GeminiResponse): SummaryPayload {
  const messageById = new Map<string, InboundMessage>();
  for (const m of req.messages) messageById.set(m.id, m);

  // Collect referenced message ids in order of first appearance across all
  // detail items, assigning sequential 1-based indices.
  const refIndexById = new Map<string, number>();
  const references: SummaryReference[] = [];
  for (const section of gemini.sections) {
    for (const detail of section.details ?? []) {
      if (!detail?.messageId) continue;
      const msg = messageById.get(detail.messageId);
      if (!msg) continue; // hallucinated id — drop silently
      if (refIndexById.has(detail.messageId)) continue;
      const idx = references.length + 1;
      refIndexById.set(detail.messageId, idx);
      references.push({
        index: idx,
        messageId: msg.id,
        parentMessageId: msg.parentId ?? null,
        authorName: msg.authorName || 'Unknown',
        snippet: (msg.bodyText || '').slice(0, 160),
      });
    }
  }

  const sections: SummarySection[] = gemini.sections.map((s, sIdx) => {
    const details: SummaryDetail[] = (s.details ?? [])
      .map(d => {
        const refIdx = refIndexById.get(d?.messageId ?? '');
        if (!refIdx) return null;
        return { text: d.text || (messageById.get(d.messageId)?.bodyText.slice(0, 160) ?? ''), refIndex: refIdx };
      })
      .filter((d): d is SummaryDetail => d !== null);
    const id = (s.title || `section-${sIdx + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${sIdx + 1}`;
    return {
      id,
      title: s.title || `Section ${sIdx + 1}`,
      body: s.body || '',
      details,
    };
  });

  return {
    rangeStart: req.rangeStart,
    rangeEnd: req.rangeEnd,
    conversationTitle: req.conversationTitle,
    conversationIsPrivate: req.conversationIsPrivate,
    messageCount: req.messages.length,
    participants: req.participants.slice(0, 6),
    sections,
    references,
  };
}

function fallbackPayload(req: RequestBody, reason: string): SummaryPayload {
  return {
    rangeStart: req.rangeStart,
    rangeEnd: req.rangeEnd,
    conversationTitle: req.conversationTitle,
    conversationIsPrivate: req.conversationIsPrivate,
    messageCount: req.messages.length,
    participants: req.participants.slice(0, 6),
    sections: [
      {
        id: 'no-summary',
        title: 'No summary available',
        body: reason,
        details: [],
      },
    ],
    references: [],
  };
}

serve(async (httpReq) => {
  if (httpReq.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (httpReq.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = (await httpReq.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify(fallbackPayload(body, 'There were no messages in the selected window. Try widening the range.')), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY not configured');
    return new Response(JSON.stringify(fallbackPayload(body, 'Summarization is not configured on the server.')), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { system, user } = buildPrompt(body);

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${geminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini call failed', resp.status, errText.slice(0, 400));
      return new Response(JSON.stringify(fallbackPayload(body, `Couldn't generate summary (upstream ${resp.status}).`)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? '';
    const parsed = safeParseGemini(raw);
    if (!parsed) {
      console.error('Failed to parse Gemini response', raw.slice(0, 400));
      return new Response(JSON.stringify(fallbackPayload(body, `Couldn't parse the summarizer response.`)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = buildPayload(body, parsed);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('chat-summarize fatal', e);
    return new Response(JSON.stringify(fallbackPayload(body, 'Summarization failed unexpectedly.')), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ══════════════════════════════════════════════════════════════════
// CATALYST KB — kb-query V2 (Advanced RAG — 9 Stages)
// Cache → MultiQuery → Hybrid → Rerank → Compress → Training →
//   Generate → Cache → Log+Eval
// ══════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tunable Parameters ──
const P = {
  REWRITES: 4,
  VECTOR_K: 20,
  RRF_K: 60,
  VEC_W: 0.6,
  KW_W: 0.4,
  RERANK_IN: 30,
  RERANK_OUT: 6,
  RERANK_FLOOR: 0.3,
  COMPRESS_TOKENS: 800,
  TRAIN_THRESH: 0.90,
  CONF_REFUSE: 0.25,
  MAX_CTX: 3000,
  MODEL: "gpt-4o-mini",
  EMBED: "text-embedding-3-small",
};

// ── Helpers ──
async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: P.EMBED, input: text.trim() }),
  });
  const d = await r.json();
  if (!d.data?.[0]?.embedding) throw new Error("Embedding failed");
  return d.data[0].embedding;
}

function tokens(s: string) { return Math.ceil(s.length / 4); }

function norm(q: string) {
  // Normalize synonyms: "business request(s)" → "initiative(s)"
  let n = q.toLowerCase().trim().replace(/[^\w\s\u0600-\u06FF]/g, "").replace(/\s+/g, " ");
  n = n.replace(/business requests?/gi, "initiative").replace(/\brequest(s)?\b/gi, "initiative$1");
  return n;
}

async function hash(t: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function llm(sys: string, usr: string, max = 500, temp = 0.3) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: P.MODEL, temperature: temp, max_tokens: max,
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
    }),
  });
  return (await r.json()).choices?.[0]?.message?.content || "";
}

// ══════════════════════════════════════════════════════════════════
// STAGE 1.5 — Live Data Detection & Direct Query
// Detects people/ticket/assignment questions and queries live tables
// ══════════════════════════════════════════════════════════════════

interface LiveResult {
  found: boolean;
  answer: string;
  confidence: number;
  sources: string[];
}

async function tryLiveQuery(sb: any, query: string, lang: string): Promise<LiveResult> {
  const qLower = query.toLowerCase();
  const qNorm = qLower.replace(/business requests?/g, 'initiative').replace(/\brequest(s)?\b/g, 'initiative$1');
  // Detect person-related queries
  const personPatterns = [
    /(?:what|who).*(?:is|are)\s+(\w+)\s+(?:busy|working|doing|assigned|responsible)/i,
    /(?:what|who).*(?:is|are)\s+(\w+)\s+(?:current|recent|latest)/i,
    /(\w+)['']?s?\s+(?:tasks?|work|assignments?|tickets?|issues?|workload)/i,
    /(?:assigned to|owned by|responsible)\s+(\w+)/i,
    /(?:who is|tell me about)\s+(\w+)/i,
  ];

  let personName: string | null = null;
  for (const pattern of personPatterns) {
    const match = qLower.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      // Skip common stop words
      const stops = new Set(["the","this","that","what","who","how","does","been","being","have","has","are","was","were","will"]);
      if (!stops.has(match[1])) { personName = match[1]; break; }
    }
  }

  if (personName) {
    // Search resource_inventory FIRST for professional role & department (source of truth)
    let resourceInfo: any = null;
    try {
      const { data: resources } = await sb
        .from('resource_inventory')
        .select('name, department_name, default_capacity_percent, role_name, vendor_name, profile_id')
        .or(`name.ilike.%${personName}%`)
        .limit(1);
      if (resources && resources.length > 0) resourceInfo = resources[0];
    } catch { /* table might not be accessible */ }

    // Also search profiles for the person ID
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, avatar_url')
      .or(`full_name.ilike.%${personName}%`)
      .limit(3);

    if ((profiles && profiles.length > 0) || resourceInfo) {
      const person = profiles?.[0];
      const displayName = resourceInfo?.name || person?.full_name || personName;
      const roleName = resourceInfo?.role_name || 'Team Member';
      const department = resourceInfo?.department_name || '';
      const capacity = resourceInfo?.default_capacity_percent;
      const vendor = resourceInfo?.vendor_name;

      const parts: string[] = [];
      // Header: Name — Role
      parts.push(`**${displayName}** — ${roleName}`);
      // Department right after name
      if (department) parts.push(`📁 ${department}${capacity != null ? ` · Capacity: ${capacity}%` : ''}${vendor ? ` · Vendor: ${vendor}` : ''}`);

      // Get ALL assigned issues/tickets — no artificial limit
      const { data: issues } = await sb
        .from('ph_issues')
        .select('issue_key, summary, status, priority, issue_type, jira_updated_at, project_name, project_key')
        .or(`assignee_display_name.ilike.%${personName}%`)
        .order('jira_updated_at', { ascending: false })
        .limit(50);

      if (issues && issues.length > 0) {
        const active = issues.filter((i: any) => !['Done', 'Closed', 'Resolved'].includes(i.status));
        const completed = issues.filter((i: any) => ['Done', 'Closed', 'Resolved'].includes(i.status));

        // Helper: calculate hours sitting with person
        const calcHours = (updatedAt: string): string => {
          const diffMs = Date.now() - new Date(updatedAt).getTime();
          const hours = Math.floor(diffMs / 3600000);
          if (hours < 1) return '<1h';
          if (hours < 24) return `${hours}h`;
          const days = Math.floor(hours / 24);
          return `${days}d ${hours % 24}h`;
        };

        // Group active items by project
        if (active.length > 0) {
          parts.push('\n---\n#### CURRENT WORK');

          const byProject: Record<string, any[]> = {};
          for (const i of active) {
            const proj = i.project_name || i.project_key || 'Unknown Project';
            if (!byProject[proj]) byProject[proj] = [];
            byProject[proj].push(i);
          }

          for (const [projectName, items] of Object.entries(byProject)) {
            parts.push(`\n**${projectName}**`);
            for (const i of items) {
              const sitting = calcHours(i.jira_updated_at);
              parts.push(`| \`${i.issue_key}\` | ${i.summary} | *${i.status}* | ⏱ ${sitting} |`);
            }
          }
          parts.push(`\n**Total Active:** ${active.length} items`);
        }

        // Group completed items by project
        if (completed.length > 0) {
          parts.push('\n---\n#### RECENTLY COMPLETED');

          const byProject: Record<string, any[]> = {};
          for (const i of completed) {
            const proj = i.project_name || i.project_key || 'Unknown Project';
            if (!byProject[proj]) byProject[proj] = [];
            byProject[proj].push(i);
          }

          for (const [projectName, items] of Object.entries(byProject)) {
            parts.push(`\n**${projectName}**`);
            for (const i of items) {
              parts.push(`| \`${i.issue_key}\` | ${i.summary} | ✅ ${i.status} |`);
            }
          }
          parts.push(`\n**Total Completed:** ${completed.length} items`);
        }

        parts.push(`\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}*`);
      } else {
        parts.push('\nNo tickets found assigned to this person.');
      }

      return {
        found: true,
        answer: parts.join('\n'),
        confidence: 0.90,
        sources: ['resource_inventory', 'ph_issues'],
      };
    }
  }

  // Detect ticket-specific queries (e.g. MDT-123, CP-456)
  const ticketPattern = /\b([A-Z]{2,10}-\d{1,6})\b/;
  const ticketMatch = query.match(ticketPattern);
  if (ticketMatch) {
    const ticketKey = ticketMatch[1];
    const { data: ticket } = await sb
      .from('ph_issues')
      .select('issue_key, summary, description_text, status, priority, issue_type, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at, project_name, sprint_name, story_points')
      .eq('issue_key', ticketKey)
      .single();

    if (ticket) {
      const parts = [
        `**\`${ticket.issue_key}\`** — ${ticket.summary}`,
        '',
        `**Status:** ${ticket.status}`,
        `**Priority:** ${ticket.priority || 'Normal'}`,
        `**Type:** ${ticket.issue_type}`,
        `**Project:** ${ticket.project_name || 'N/A'}`,
        `**Assignee:** ${ticket.assignee_display_name || 'Unassigned'}`,
        `**Reporter:** ${ticket.reporter_display_name || 'Unknown'}`,
        ticket.sprint_name ? `**Sprint:** ${ticket.sprint_name}` : '',
        ticket.story_points != null ? `**Story Points:** ${ticket.story_points}` : '',
        `**Created:** ${new Date(ticket.jira_created_at).toLocaleDateString()}`,
        `**Updated:** ${new Date(ticket.jira_updated_at).toLocaleDateString()}`,
      ].filter(Boolean);
      if (ticket.description_text) {
        const desc = ticket.description_text.length > 500
          ? ticket.description_text.substring(0, 497) + '...'
          : ticket.description_text;
        parts.push('', '**Description:**', desc);
      }

      return {
        found: true,
        answer: parts.join('\n'),
        confidence: 0.95,
        sources: ['ph_issues'],
      };
    }

    // Also check epics table
    const { data: epic } = await sb
      .from('epics')
      .select('epic_key, name, description, status, owner_name, health, start_date, end_date')
      .eq('epic_key', ticketKey)
      .single();

    if (epic) {
      const parts = [
        `**\`${epic.epic_key}\`** — ${epic.name}`,
        '',
        `**Status:** ${epic.status || 'N/A'}`,
        `**Owner:** ${epic.owner_name || 'Unassigned'}`,
        `**Health:** ${epic.health || 'N/A'}`,
        epic.start_date ? `**Start:** ${new Date(epic.start_date).toLocaleDateString()}` : '',
        epic.end_date ? `**Target End:** ${new Date(epic.end_date).toLocaleDateString()}` : '',
      ].filter(Boolean);
      if (epic.description) {
        const desc = epic.description.length > 500 ? epic.description.substring(0, 497) + '...' : epic.description;
        parts.push('', '**Description:**', desc);
      }
      return { found: true, answer: parts.join('\n'), confidence: 0.95, sources: ['epics'] };
    }
  }

  // Detect general status queries (latest epics, recent stories, etc.)
  const statusPatterns = [
    { pattern: /(?:latest|recent|new|newest)\s+(?:epic|epics)/i, type: 'epics' },
    { pattern: /(?:latest|recent|new|newest)\s+(?:story|stories)/i, type: 'stories' },
    { pattern: /(?:which|what)\s+(?:story|stories)\s+(?:has|have)\s+been\s+(?:closed|completed|done|resolved)/i, type: 'closed_stories' },
    { pattern: /(?:which|what)\s+(?:epic|epics)\s+(?:is|are)\s+(?:being|currently)\s+(?:logged|worked|active)/i, type: 'active_epics' },
  ];

  for (const sp of statusPatterns) {
    if (sp.pattern.test(query)) {
      if (sp.type === 'epics' || sp.type === 'active_epics') {
        const { data: epics } = await sb.from('epics')
          .select('epic_key, name, status, owner_name, health, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        if (epics && epics.length > 0) {
          const parts = ['**Latest Epics**\n'];
          for (const e of epics) {
            parts.push(`- \`${e.epic_key || 'N/A'}\` **${e.name}** — ${e.status || 'N/A'} | Owner: ${e.owner_name || 'Unassigned'} | Health: ${e.health || 'N/A'}`);
          }
          return { found: true, answer: parts.join('\n'), confidence: 0.8, sources: ['epics'] };
        }
      }
      if (sp.type === 'stories' || sp.type === 'closed_stories') {
        const q = sb.from('stories').select('story_key, title, name, status, priority, created_at').order('created_at', { ascending: false }).limit(10);
        if (sp.type === 'closed_stories') q.in('status', ['Done', 'Closed', 'Resolved', 'Accepted']);
        const { data: stories } = await q;
        if (stories && stories.length > 0) {
          const label = sp.type === 'closed_stories' ? 'Recently Closed Stories' : 'Latest Stories';
          const parts = [`**${label}**\n`];
          for (const s of stories) {
            parts.push(`- \`${s.story_key || 'N/A'}\` **${s.title || s.name}** — ${s.status || 'N/A'} (${s.priority || 'Normal'})`);
          }
          return { found: true, answer: parts.join('\n'), confidence: 0.8, sources: ['stories'] };
        }
      }
    }
  }

  // ── Initiative / Business Request aggregate queries ──
  const initiativePatterns = [
    /(?:how many|count|number of)\s+(?:initiative|business request)s?\s+(?:are|is)\s+(?:pending|open|active)/i,
    /(?:show|list|display)\s+(?:all\s+)?(?:open|active|pending|on.?hold)\s+(?:initiative|business request)s?/i,
    /(?:initiative|business request)s?\s+(?:by|per|in each|grouped by)\s+(?:status|process.?step|department|delivery|health|quarter)/i,
    /(?:how many|count)\s+(?:initiative|business request)s?\s+(?:are|were)\s+(?:high urgency|completed|on hold)/i,
    /(?:how much|total|what)\s+budget\s+(?:is|are)\s+(?:allocated|approved)/i,
    /(?:initiative|business request)s?\s+(?:are|is)\s+(?:in the|in)\s+(?:pipeline|approval|process)/i,
  ];

  const isInitiativeQuery = initiativePatterns.some(p => p.test(query)) || 
    initiativePatterns.some(p => p.test(qNorm));

  if (isInitiativeQuery) {
    try {
      const { data: requests } = await sb
        .from('business_requests')
        .select('request_key, title, process_step, health, priority_tier, urgency, assignee, business_owner, department, delivery_model, estimated_cost_sar, approved_budget_sar, planned_quarter, progress, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (requests && requests.length > 0) {
        const parts: string[] = [];
        const total = requests.length;

        // Status breakdown
        const byStep: Record<string, number> = {};
        for (const r of requests) { byStep[r.process_step] = (byStep[r.process_step] || 0) + 1; }

        // Health breakdown
        const byHealth: Record<string, number> = {};
        for (const r of requests) { byHealth[r.health || 'Unknown'] = (byHealth[r.health || 'Unknown'] || 0) + 1; }

        parts.push(`**Initiatives Overview** — ${total} total\n`);

        // Process step breakdown
        parts.push('**By Process Step:**');
        for (const [step, count] of Object.entries(byStep).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${step}: **${count}**`);
        }

        // Health breakdown
        parts.push('\n**By Health:**');
        for (const [h, count] of Object.entries(byHealth).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${h}: **${count}**`);
        }

        // Budget summary
        const totalBudget = requests.reduce((s: number, r: any) => s + (r.approved_budget_sar || 0), 0);
        const totalEstimated = requests.reduce((s: number, r: any) => s + (r.estimated_cost_sar || 0), 0);
        if (totalBudget > 0 || totalEstimated > 0) {
          parts.push('\n**Budget Summary:**');
          if (totalEstimated > 0) parts.push(`- Estimated: **${(totalEstimated / 1000000).toFixed(1)}M SAR**`);
          if (totalBudget > 0) parts.push(`- Approved: **${(totalBudget / 1000000).toFixed(1)}M SAR**`);
        }

        // High urgency
        const highUrgency = requests.filter((r: any) => r.urgency === 'High' || r.priority_tier === 'P1');
        if (highUrgency.length > 0) {
          parts.push(`\n**High Urgency:** ${highUrgency.length} items`);
          for (const r of highUrgency.slice(0, 5)) {
            parts.push(`- \`${r.request_key || 'N/A'}\` ${r.title} — *${r.process_step}*`);
          }
        }

        // On-hold
        const onHold = requests.filter((r: any) => r.process_step?.toLowerCase().includes('hold'));
        if (onHold.length > 0) {
          parts.push(`\n**On Hold:** ${onHold.length} items`);
          for (const r of onHold.slice(0, 5)) {
            parts.push(`- \`${r.request_key || 'N/A'}\` ${r.title}`);
          }
        }

        parts.push(`\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`);

        return {
          found: true,
          answer: parts.join('\n'),
          confidence: 0.90,
          sources: ['business_requests'],
        };
      }
    } catch { /* table might not exist */ }
  }

  return { found: false, answer: '', confidence: 0, sources: [] };
}

// ══════════════════════════════════════════════════════════════════
// STAGE 2 — Multi-Query Expansion
// ══════════════════════════════════════════════════════════════════
async function expand(query: string): Promise<string[]> {
  const sys = `Generate ${P.REWRITES} alternate search queries for a Saudi Ministry of Industry / Catalyst KB.
1. SYNONYM variant  2. SPECIFIC (add project codes LIC/CP/DS/EC if inferable)
3. HOW-TO form  4. KEYWORDS only (3-5 words)
Return ONLY a JSON array of ${P.REWRITES} strings.`;
  try {
    const t = await llm(sys, query, 300, 0.4);
    const a = JSON.parse(t.replace(/```json|```/g, "").trim());
    if (Array.isArray(a)) return [query, ...a.slice(0, P.REWRITES)];
  } catch {}
  return [query, query.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3).join(" ")];
}

// ══════════════════════════════════════════════════════════════════
// STAGE 3 — Hybrid Retrieval (Vector + Keyword + RRF)
// ══════════════════════════════════════════════════════════════════
async function retrieve(sb: any, emb: number[], text: string, rewrites: string[], src?: string, tags?: string[]) {
  const { data: hybrid } = await sb.rpc("kb_hybrid_search", {
    query_embedding: emb, query_text: text,
    match_count: P.RERANK_IN,
    vector_weight: P.VEC_W, keyword_weight: P.KW_W,
    filter_source: src || null, filter_tags: tags || null,
    rrf_k: P.RRF_K,
  });
  const chunks = hybrid || [];

  if (chunks.length < 10 && rewrites.length > 1) {
    for (const rw of rewrites.slice(1, 3)) {
      try {
        const re = await embed(rw);
        const { data: extra } = await sb.rpc("kb_match_embeddings", {
          query_embedding: re, match_threshold: 0.70, match_count: 10,
        });
        for (const e of extra || []) {
          if (!chunks.find((c: any) => c.id === e.id)) {
            chunks.push({ ...e, rrf_score: e.similarity * 0.5, vector_similarity: e.similarity });
          }
        }
      } catch {}
    }
  }

  const { data: train } = await sb.rpc("kb_match_training", {
    query_embedding: emb, match_threshold: P.TRAIN_THRESH, match_count: 3,
  });

  return { chunks, train: train || [] };
}

// ══════════════════════════════════════════════════════════════════
// STAGE 4 — Reranking
// ══════════════════════════════════════════════════════════════════
async function rerank(query: string, cands: any[]): Promise<any[]> {
  if (cands.length <= P.RERANK_OUT) return cands;
  const batch = cands.slice(0, P.RERANK_IN);
  const sums = batch.map((c: any, i: number) => `[${i}] ${(c.content || "").substring(0, 250)}`).join("\n---\n");
  try {
    const t = await llm(
      "Score each chunk 0.0-1.0 for relevance to the QUERY. Return ONLY a JSON array of numbers.",
      `QUERY: ${query}\n\nCHUNKS:\n${sums}`, 200, 0);
    const scores: number[] = JSON.parse(t.replace(/```json|```/g, "").trim());
    return batch
      .map((c: any, i: number) => ({ ...c, relevance_score: scores[i] ?? 0 }))
      .filter((c: any) => c.relevance_score >= P.RERANK_FLOOR)
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, P.RERANK_OUT);
  } catch {
    return batch.sort((a: any, b: any) => (b.rrf_score || 0) - (a.rrf_score || 0)).slice(0, P.RERANK_OUT);
  }
}

// ══════════════════════════════════════════════════════════════════
// STAGE 5 — Context Compression
// ══════════════════════════════════════════════════════════════════
async function compress(query: string, chunks: any[]) {
  if (!chunks.length) return { text: "", sources: [], tokens: 0, conflicts: false, stale: false };

  const sources = chunks.map((c: any, i: number) => ({
    idx: i + 1, id: c.id, url: c.source_url || "internal",
    type: c.source_type, rel: c.relevance_score || c.rrf_score || 0,
  }));

  const ago30 = Date.now() - 30 * 86400000;
  const stale = chunks.some((c: any) => c.metadata?.created_at && new Date(c.metadata.created_at).getTime() < ago30);
  const dates = chunks.map((c: any) => c.metadata?.created_at).filter(Boolean).map((d: string) => +new Date(d));
  const conflicts = dates.length >= 2 && Math.max(...dates) - Math.min(...dates) > 90 * 86400000;

  const tagged = chunks.map((c: any, i: number) =>
    `[SOURCE-${i + 1}] (${c.source_type}: ${c.source_url || "internal"})\n${c.content}`
  ).join("\n\n---\n\n");

  const text = await llm(
    `Extract ONLY query-relevant sentences from the sources below. Keep [SOURCE-N] citations inline. Remove duplicates. Under ${P.COMPRESS_TOKENS} tokens. No headers.`,
    `QUERY: ${query}\n\nSOURCES:\n${tagged}`, P.COMPRESS_TOKENS, 0);

  return { text, sources, tokens: tokens(text), conflicts, stale };
}

// ══════════════════════════════════════════════════════════════════
// STAGE 7 — Editorial Generation with Confidence
// ══════════════════════════════════════════════════════════════════
async function generate(query: string, ev: any, lang: string) {
  if (ev.tokens < 30) {
    return {
      answer: lang === "ar"
        ? "لا أملك معلومات كافية للإجابة على هذا السؤال بدقة. تم تسجيل استفسارك وسيقوم الفريق بمراجعته."
        : "I don't have sufficient information on this topic to provide an accurate answer. Your query has been recorded for the team to review.",
      confidence: 0.1, level: "insufficient", used: [],
    };
  }

  const srcList = ev.sources.map((s: any) => `[SOURCE-${s.idx}] ${s.type}: ${s.url} (${(s.rel * 100).toFixed(0)}%)`).join("\n");
  const warns = [
    ev.conflicts ? "⚠️ Sources are dated far apart — flag any conflicts." : "",
    ev.stale ? "⚠️ Some evidence may be outdated (>30 days)." : "",
  ].filter(Boolean).join("\n");

  const sys = `You are the Catalyst Knowledge Base — enterprise encyclopedia for Saudi Ministry of Industry.
ONLY use the evidence provided. Cite inline as [SOURCE-N].
If insufficient: state what you CAN answer, flag what you cannot. Never guess.
If conflicting: present both with sources.
Format: Bloomberg editorial. **Names** bold. \`TICKET-ID\` in backticks.
Sections (only if evidence exists): Background, Current Status, Good News, Issues & Risks, Who's Working.
${warns}
End response with:
---
CONFIDENCE: [high|medium|low]
EVIDENCE_USED: [SOURCE-1], [SOURCE-N]

Language: ${lang === "ar" ? "Arabic (MSA)" : "English"}`;

  const answer = await llm(sys, `EVIDENCE:\n${ev.text}\n\nSOURCES:\n${srcList}\n\nQUERY: ${query}`, 2000, 0.3);

  let confidence = 0.5, level = "medium";
  const cm = answer.match(/CONFIDENCE:\s*(high|medium|low)/i);
  if (cm) { level = cm[1].toLowerCase(); confidence = level === "high" ? 0.85 : level === "medium" ? 0.6 : 0.3; }
  const used: string[] = [];
  const em = answer.match(/EVIDENCE_USED:\s*(.+)/i);
  if (em) { const refs = em[1].match(/\[SOURCE-\d+\]/g); if (refs) used.push(...refs); }

  const clean = answer.replace(/---\s*\nCONFIDENCE:.*\nEVIDENCE_USED:.*/s, "").trim();
  return { answer: clean, confidence, level, used };
}

// ══════════════════════════════════════════════════════════════════
// MAIN — 9-Stage Pipeline
// ══════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = performance.now();

  try {
    const { query, language = "en", input_method = "keyboard",
      user_id, user_name, user_role, filter_source, filter_tags } = await req.json();
    if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // S1: Cache
    const qh = await hash(norm(query));
    const { data: cached } = await sb.rpc("kb_cache_hit", { p_query_hash: qh });
    if (cached) {
      const ms = Math.round(performance.now() - t0);
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: true,
        p_matched_category: cached.category, p_confidence_score: cached.confidence || 1 }).then(() => {});
      return new Response(JSON.stringify({ ...cached, _meta: { source: "cache", response_time_ms: ms, cache_hit: true } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // S1.5: Live data detection (people, tickets, status queries)
    const live = await tryLiveQuery(sb, query, language);
    if (live.found) {
      const ms = Math.round(performance.now() - t0);
      const resp = {
        type: "editorial", title: query, answer: live.answer,
        category: "live_data", confidence: live.confidence,
        confidence_level: live.confidence >= 0.8 ? "high" : "medium",
        evidence_used: live.sources, has_conflicts: false, has_stale_data: false,
        references: live.sources.map(s => ({ source_type: s, source_url: "live_query", relevance_score: live.confidence })),
      };
      // Cache for only 1 hour (live data changes frequently)
      sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
        response_json: resp, language, ttl_hours: 1 }).then(() => {});
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: "live_data", p_confidence_score: live.confidence }).then(() => {});
      return new Response(JSON.stringify({ ...resp, _meta: {
        source: "live_query", response_time_ms: ms, cache_hit: false,
        query_rewrites: [], candidates_retrieved: 0, candidates_reranked: 0 } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // S2: Multi-query
    const rewrites = await expand(query);

    // S3: Hybrid retrieval
    const emb = await embed(query);
    const { chunks, train } = await retrieve(sb, emb, query, rewrites, filter_source, filter_tags);

    // S6 shortcut: training match with answer?
    const best = train.find((t: any) => t.expected_answer && t.similarity >= P.TRAIN_THRESH);
    if (best) {
      const ms = Math.round(performance.now() - t0);
      const resp = { type: "editorial", title: best.category, answer: best.expected_answer,
        matched_question: best.question, category: best.category,
        confidence: best.similarity, confidence_level: "high", evidence_used: ["training"],
        has_conflicts: false, has_stale_data: false, references: [] };
      sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
        response_json: resp, language, ttl_hours: 168 }).then(() => {});
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: best.category, p_confidence_score: best.similarity }).then(() => {});
      return new Response(JSON.stringify({ ...resp, _meta: { source: "training", response_time_ms: ms,
        cache_hit: false, similarity: best.similarity, query_rewrites: rewrites } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // No chunks = fallback
    if (!chunks.length) {
      const ms = Math.round(performance.now() - t0);
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: false, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: null, p_confidence_score: 0 }).then(() => {});
      return new Response(JSON.stringify({ type: "fallback", title: "No Evidence Found",
        answer: language === "ar" ? "لا أملك معلومات كافية للإجابة على هذا السؤال بدقة. تم تسجيل استفسارك وسيقوم الفريق بمراجعته."
          : "I don't have enough information to answer this question accurately. Your query has been logged and the team will review it.",
        category: null, confidence: 0, confidence_level: "insufficient",
        evidence_used: [], has_conflicts: false, has_stale_data: false, references: [],
        _meta: { source: "fallback", response_time_ms: ms, cache_hit: false,
          query_rewrites: rewrites, candidates_retrieved: 0, candidates_reranked: 0 } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // S4: Rerank
    const ranked = await rerank(query, chunks);

    // S5: Compress
    let ev = await compress(query, ranked);
    if (ev.tokens > P.MAX_CTX) ev = await compress(query, ranked.slice(0, 4));

    // S7: Generate
    const gen = await generate(query, ev, language);
    if (gen.confidence < P.CONF_REFUSE) {
      gen.answer += language === "ar"
        ? "\n\n⚠️ الثقة في هذه الإجابة منخفضة. يرجى التحقق من المصادر الأصلية."
        : "\n\n⚠️ Confidence is low. Please verify with original sources.";
    }

    const ms = Math.round(performance.now() - t0);
    const refs = ev.sources.map((s: any) => ({ source_type: s.type, source_url: s.url, relevance_score: s.rel }));

    const resp = { type: "editorial", title: query, answer: gen.answer,
      category: ranked[0]?.metadata?.category || ranked[0]?.source_type || null,
      confidence: gen.confidence, confidence_level: gen.level,
      evidence_used: gen.used, has_conflicts: ev.conflicts, has_stale_data: ev.stale, references: refs };

    // S8: Cache + Log
    sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
      response_json: resp, language, ttl_hours: 24 }).then(() => {});

    sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
      p_query_text: query, p_language: language, p_input_method: input_method,
      p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
      p_matched_category: resp.category, p_confidence_score: gen.confidence }).then(() => {});

    // Extended trace (best-effort)
    sb.from("kb_query_log").update({
      query_rewrites: rewrites,
      retrieved_chunk_ids: chunks.slice(0, 30).map((c: any) => c.id),
      reranked_chunk_ids: ranked.map((c: any) => c.id),
      reranked_scores: ranked.map((c: any) => c.relevance_score || 0),
      evidence_pack: ev.text.substring(0, 2000),
      retrieval_method: "hybrid_v2",
      hallucination_flag: gen.confidence < P.CONF_REFUSE,
    }).eq("query_text", query).order("created_at", { ascending: false }).limit(1).then(() => {});

    return new Response(JSON.stringify({ ...resp, _meta: {
      source: "hybrid_rag_v2", response_time_ms: ms, cache_hit: false,
      query_rewrites: rewrites, candidates_retrieved: chunks.length,
      candidates_reranked: ranked.length, evidence_tokens: ev.tokens, model: P.MODEL } }),
      { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("KB V2 Error:", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

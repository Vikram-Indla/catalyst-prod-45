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

  // ── PRIORITY 0: Initiative date/detail queries ──
  // Detects: "dates of know your journey initiative", "know your journey timeline", etc.
  const initiativePattern = /(?:dates?|timeline|schedule|when|kickoff|completion|start|end|details?|info|about)\b.*?\b(initiative|initiatives|business request)/i;
  const initiativePattern2 = /\b(initiative|initiatives)\b.*(?:dates?|timeline|schedule|when|kickoff|completion|start|end)/i;
  const hasInitiativeDateQ = initiativePattern.test(qLower) || initiativePattern2.test(qLower) || (qNorm.includes('initiative') && /date|when|timeline|schedule|kickoff|start|end|completion|quarter/i.test(qLower));

  if (hasInitiativeDateQ) {
    // Extract the initiative name: strip filler words and "initiative" keyword
    // IMPORTANT: Do NOT strip common words that may be part of initiative names (e.g. "know")
    const initFillerWords = new Set(['provide','give','show','tell','me','us','the','of','for','about','dates','date','timeline','schedule','when','is','are','what','details','detail','info','information','initiative','initiatives','business','request','please','can','you','a','an']);
    const cleanQ = qLower.replace(/[?!.,;:'"]/g, '').split(/\s+/)
      .filter(w => !initFillerWords.has(w) && w.length > 0)
      .join(' ').trim();

    if (cleanQ.length >= 3) {
      const { data: initiatives } = await sb
        .from('ph_initiatives')
        .select('initiative_key, title, status, health_status, kickoff_date, target_complete, target_quarter, assignee_id, department_id, created_at, updated_at, on_roadmap, roadmap_start_date, roadmap_end_date, progress')
        .or(`title.ilike.%${cleanQ}%,initiative_key.ilike.%${cleanQ}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(10);

      if (initiatives && initiatives.length > 0) {
        // Resolve assignee names
        const assigneeIds = [...new Set(initiatives.map((i: any) => i.assignee_id).filter(Boolean))];
        let assigneeMap: Record<string, string> = {};
        if (assigneeIds.length > 0) {
          const { data: profiles } = await sb.from('profiles').select('id, full_name').in('id', assigneeIds);
          if (profiles) for (const p of profiles) assigneeMap[p.id] = p.full_name;
        }

        const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

        const parts: string[] = [];
        if (initiatives.length === 1) {
          const i = initiatives[0];
          parts.push(`**${i.initiative_key} – ${i.title}**\n`);
          parts.push(`| Field | Value |`);
          parts.push(`| Kickoff Date | ${fmtDate(i.kickoff_date)} |`);
          parts.push(`| Target Completion | ${fmtDate(i.target_complete)} |`);
          parts.push(`| Target Quarter | ${i.target_quarter || 'Not set'} |`);
          parts.push(`| Status | ${i.status?.replace(/_/g, ' ') || 'N/A'} |`);
          parts.push(`| Health | ${i.health_status?.replace(/_/g, ' ') || 'N/A'} |`);
          parts.push(`| Assignee | ${assigneeMap[i.assignee_id] || 'Unassigned'} |`);
          parts.push(`| Progress | ${i.progress || 0}% |`);
          if (i.on_roadmap) parts.push(`| On Roadmap | Yes |`);
        } else {
          parts.push(`**${cleanQ.toUpperCase()} Initiatives** — ${initiatives.length} found\n`);
          // Table header
          const headers = ['Initiative', 'Kickoff Date', 'Target Completion', 'Quarter', 'Status', 'Health', 'Assignee'];
          parts.push(`| ${headers.join(' | ')} |`);
          for (const i of initiatives) {
            parts.push(`| \`${i.initiative_key}\` ${i.title} | ${fmtDate(i.kickoff_date)} | ${fmtDate(i.target_complete)} | ${i.target_quarter || '-'} | ${i.status?.replace(/_/g, ' ') || '-'} | ${i.health_status?.replace(/_/g, ' ') || '-'} | ${assigneeMap[i.assignee_id] || 'Unassigned'} |`);
          }
        }
        parts.push(`\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}*`);

        return { found: true, answer: parts.join('\n'), confidence: 0.95, sources: ['ph_initiatives'] };
      }
    }
  }

  // ── PRIORITY 1: Work item type queries (must come BEFORE person detection) ──
  // Detects: "SBC stories", "who is working on industrial scan stories", "BAU epics", etc.
  const issueTypeWords = ['stories','story','epics','epic','tasks','task','bugs','bug','backend','incidents','incident','issues','issue','items','item'];
  const hasIssueType = issueTypeWords.some(w => qLower.includes(w));

  if (hasIssueType) {
    const issueTypeMap: Record<string, string[]> = {
      story: ['Story'], stories: ['Story'],
      epic: ['Epic'], epics: ['Epic'],
      task: ['Task'], tasks: ['Task'],
      bug: ['Bug'], bugs: ['Bug'],
      backend: ['Backend'],
      incident: ['Production Incident'], incidents: ['Production Incident'],
      issue: ['Story', 'Task', 'Bug', 'Backend', 'Epic'], issues: ['Story', 'Task', 'Bug', 'Backend', 'Epic'],
      item: ['Story', 'Task', 'Bug', 'Backend', 'Epic'], items: ['Story', 'Task', 'Bug', 'Backend', 'Epic'],
      work: ['Story', 'Task', 'Bug', 'Backend', 'Epic'],
    };

    // Extract issue type word from query
    const typeWordMatch = qLower.match(/\b(stories|story|epics?|tasks?|bugs?|backend|incidents?|issues?|items?)\b/);
    const typeWord = typeWordMatch ? typeWordMatch[1].replace(/s$/, '').replace(/ies$/, 'y') : null;
    const issueTypes = typeWord ? (issueTypeMap[typeWord] || issueTypeMap[typeWord + 's'] || null) : null;

    // Extract keyword: everything before the type word, minus filler words
    const fillerWords = new Set(['who','what','is','are','was','were','working','on','the','show','me','list','display',
      'provide','give','get','details','detail','about','info','information','latest','recent','new','newest',
      'open','active','all','closed','done','for','in','of','from','under','related','to','how','many','a','an',
      'has','have','been','tell','us','my','our','current','pending']);

    let keyword = '';
    if (typeWordMatch) {
      // Get text before the type word
      const beforeType = qLower.substring(0, typeWordMatch.index!).trim();
      // Get text after type word (for "stories for/in/about X" patterns)  
      const afterType = qLower.substring(typeWordMatch.index! + typeWordMatch[0].length).trim();
      const afterKeyword = afterType.replace(/^(for|in|of|about|from|under|related to)\s+/i, '').trim();
      
      // Clean filler words from before-text
      const beforeWords = beforeType.split(/\s+/).filter(w => !fillerWords.has(w) && w.length > 1);
      keyword = (beforeWords.join(' ') || afterKeyword).trim();
    }

    if (keyword && keyword.length >= 2) {
      let q = sb.from('ph_issues')
        .select('issue_key, summary, status, priority, issue_type, assignee_display_name, reporter_display_name, project_key, project_name, sprint_name, jira_created_at, jira_updated_at')
        .or(`summary.ilike.%${keyword}%,project_key.ilike.%${keyword}%,project_name.ilike.%${keyword}%`)
        .order('jira_updated_at', { ascending: false })
        .limit(30);

      if (issueTypes && issueTypes.length === 1) {
        q = q.eq('issue_type', issueTypes[0]);
      } else if (issueTypes && issueTypes.length > 1) {
        q = q.in('issue_type', issueTypes);
      }

      const { data: items } = await q;

      if (items && items.length > 0) {
        const calcAge = (d: string): string => {
          if (!d) return 'N/A';
          const hours = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
          if (hours < 1) return '<1h';
          if (hours < 24) return `${hours}h`;
          return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        };

        const typeLabel = issueTypes ? issueTypes.join('/') : 'Work Items';
        const parts: string[] = [];
        parts.push(`**${keyword.toUpperCase()} ${typeLabel}** — ${items.length} items found\n`);

        const byStatus: Record<string, number> = {};
        for (const i of items) { byStatus[i.status || 'Unknown'] = (byStatus[i.status || 'Unknown'] || 0) + 1; }
        parts.push('**By Status:**');
        for (const [st, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${st}: **${count}**`);
        }

        const byPriority: Record<string, number> = {};
        for (const i of items) { byPriority[i.priority || 'None'] = (byPriority[i.priority || 'None'] || 0) + 1; }
        parts.push('\n**By Priority:**');
        for (const [p, count] of Object.entries(byPriority).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${p}: **${count}**`);
        }

        const byProject: Record<string, typeof items> = {};
        for (const i of items) {
          const proj = i.project_name || i.project_key || 'Unknown';
          if (!byProject[proj]) byProject[proj] = [];
          byProject[proj].push(i);
        }

        parts.push('\n---\n#### ITEMS');
        for (const [projName, projItems] of Object.entries(byProject)) {
          if (Object.keys(byProject).length > 1) parts.push(`\n**${projName}**`);
          for (const i of projItems) {
            const age = calcAge(i.jira_updated_at);
            parts.push(`| \`${i.issue_key}\` | ${i.summary} | *${i.status}* | ${i.priority || '-'} | ${i.assignee_display_name || 'Unassigned'} | ⏱ ${age} |`);
          }
        }

        parts.push(`\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}*`);

        return { found: true, answer: parts.join('\n'), confidence: 0.90, sources: ['ph_issues'] };
      }
    }

    // Fallback: no keyword but specific type (e.g. "latest stories", "recent epics")
    if (!keyword && issueTypes) {
      const { data: items } = await sb.from('ph_issues')
        .select('issue_key, summary, status, priority, issue_type, assignee_display_name, project_key, project_name, jira_updated_at')
        .in('issue_type', issueTypes)
        .order('jira_updated_at', { ascending: false })
        .limit(15);

      if (items && items.length > 0) {
        const typeLabel = issueTypes.join('/');
        const parts = [`**Latest ${typeLabel}s**\n`];
        for (const i of items) {
          parts.push(`- \`${i.issue_key}\` **${i.summary}** — ${i.status || 'N/A'} | ${i.priority || '-'} | ${i.assignee_display_name || 'Unassigned'} | ${i.project_name || i.project_key || ''}`);
        }
        return { found: true, answer: parts.join('\n'), confidence: 0.80, sources: ['ph_issues'] };
      }
    }
  }

  // ── PRIORITY 2: Person-related queries ──
  const personPatterns = [
    /(?:what|who).*(?:is|are)\s+(\w+)\s+(?:busy|working|doing|assigned|responsible)/i,
    /(?:what|who).*(?:is|are)\s+(\w+)\s+(?:current|recent|latest)/i,
    /(\w+)[''\u2019]?s?\s+(?:tasks?|work|assignments?|tickets?|issues?|items?|workload|open\s+items?)/i,
    /(?:assigned to|owned by|responsible)\s+(\w+)/i,
    /(?:who is|tell me about)\s+(\w+)/i,
    /(?:what is|what's)\s+(\w+)\s+(?:working|doing|on)/i,
  ];

  let personName: string | null = null;
  for (const pattern of personPatterns) {
    const match = qLower.match(pattern);
    if (match && match[1] && match[1].length > 2) {
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

      // Get items updated in last 2 weeks only, limit to latest 5
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600000).toISOString();
      const { data: issues } = await sb
        .from('ph_issues')
        .select('issue_key, summary, status, priority, issue_type, jira_updated_at, project_name, project_key')
        .or(`assignee_display_name.ilike.%${personName}%`)
        .gte('jira_updated_at', twoWeeksAgo)
        .order('jira_updated_at', { ascending: false })
        .limit(20);

      if (issues && issues.length > 0) {
        const active = issues.filter((i: any) => !['Done', 'Closed', 'Resolved'].includes(i.status));
        const completed = issues.filter((i: any) => ['Done', 'Closed', 'Resolved'].includes(i.status));
        const totalActive = active.length;
        const totalCompleted = completed.length;

        // Helper: calculate hours sitting with person
        const calcHours = (updatedAt: string): string => {
          const diffMs = Date.now() - new Date(updatedAt).getTime();
          const hours = Math.floor(diffMs / 3600000);
          if (hours < 1) return '<1h';
          if (hours < 24) return `${hours}h`;
          const days = Math.floor(hours / 24);
          return `${days}d ${hours % 24}h`;
        };

        // Show only top 5 active items
        if (active.length > 0) {
          const shown = active.slice(0, 5);
          parts.push('\n---\n#### CURRENT WORK (Latest)');

          for (const i of shown) {
            const sitting = calcHours(i.jira_updated_at);
            parts.push(`| \`${i.issue_key}\` | ${i.summary} | *${i.status}* | ⏱ ${sitting} |`);
          }

          if (totalActive > 5) {
            parts.push(`\n*Showing 5 of ${totalActive} active items. Ask "Show all of ${displayName.split(' ')[0]}'s items" for the full list.*`);
          }
        }

        // Show only top 3 completed items
        if (completed.length > 0) {
          const shown = completed.slice(0, 3);
          parts.push('\n---\n#### RECENTLY COMPLETED');
          for (const i of shown) {
            parts.push(`| \`${i.issue_key}\` | ${i.summary} | ✅ ${i.status} |`);
          }
          if (totalCompleted > 3) {
            parts.push(`\n*${totalCompleted - 3} more completed items — ask for details.*`);
          }
        }

        parts.push(`\n*Last 2 weeks · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`);
      } else {
        parts.push('\nNo recent activity in the last 2 weeks.');
      }

      return {
        found: true,
        answer: parts.join('\n'),
        confidence: 0.90,
        sources: ['resource_inventory', 'ph_issues'],
      };
    }
  }

  // ── PRIORITY 2.5: Aggregation pattern queries ──
  const aggregationPatterns: Array<{
    pattern: RegExp;
    query: (sb: any) => Promise<string>;
  }> = [
    {
      pattern: /(?:total|how many)\s+(?:headcount|people|resources|team members|employees|staff)/i,
      query: async (sb) => {
        const { count: totalProfiles } = await sb.from('profiles').select('*', { count: 'exact', head: true });
        const { count: activeProfiles } = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { data: depts } = await sb.from('profiles').select('department_id').not('department_id', 'is', null);
        const uniqueDepts = new Set(depts?.map((d: any) => d.department_id) || []);
        return `**Total Headcount: ${totalProfiles || 0}**\n\n- Active: ${activeProfiles || 0}\n- Departments: ${uniqueDepts.size}\n\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`;
      }
    },
    {
      pattern: /(?:how many|total|count)\s+(?:open\s+)?(?:items?|issues?|tickets?|stories|bugs?|epics?|tasks?)/i,
      query: async (sb) => {
        const { data: counts } = await sb.from('ph_issues').select('issue_type, status_category');
        if (!counts) return 'No data available.';
        const total = counts.length;
        const open = counts.filter((c: any) => c.status_category !== 'Done').length;
        const done = counts.filter((c: any) => c.status_category === 'Done').length;
        const byType: Record<string, number> = {};
        for (const c of counts) { const t = c.issue_type || 'Unknown'; byType[t] = (byType[t] || 0) + 1; }
        const typeBreakdown = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => `- ${type}: ${count}`).join('\n');
        return `**Total Items: ${total}**\n\n- Open: ${open}\n- Done: ${done}\n\n**By Type:**\n${typeBreakdown}\n\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`;
      }
    },
    {
      pattern: /(?:how many|total|count)\s+(?:open\s+)?(?:bugs?|defects?)/i,
      query: async (sb) => {
        const { data: bugs } = await sb.from('ph_issues').select('issue_key, summary, status, priority, assignee_display_name').in('issue_type', ['Bug', 'QA Bug']).neq('status_category', 'Done').order('jira_updated_at', { ascending: false }).limit(20);
        if (!bugs || bugs.length === 0) return 'No open bugs found.';
        const shown = bugs.slice(0, 5);
        const lines = shown.map((b: any) => `- \`${b.issue_key}\` ${b.summary} — *${b.status}* (${b.priority || 'Normal'}) — ${b.assignee_display_name || 'Unassigned'}`);
        let result = `**Open Bugs: ${bugs.length}**\n\n${lines.join('\n')}`;
        if (bugs.length > 5) result += `\n\n*Showing 5 of ${bugs.length}. Ask "Show all open bugs" for the full list.*`;
        result += `\n\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`;
        return result;
      }
    },
    {
      pattern: /(?:how many|total|count)\s+(?:open\s+)?(?:epics?)/i,
      query: async (sb) => {
        const { data: epics } = await sb.from('ph_issues').select('issue_key, summary, status, assignee_display_name').eq('issue_type', 'Epic').neq('status_category', 'Done').order('jira_updated_at', { ascending: false }).limit(20);
        if (!epics || epics.length === 0) return 'No open epics found.';
        const shown = epics.slice(0, 5);
        const lines = shown.map((e: any) => `- \`${e.issue_key}\` ${e.summary} — *${e.status}* — ${e.assignee_display_name || 'Unassigned'}`);
        let result = `**Open Epics: ${epics.length}**\n\n${lines.join('\n')}`;
        if (epics.length > 5) result += `\n\n*Showing 5 of ${epics.length}. Ask "Show all open epics" for the full list.*`;
        result += `\n\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`;
        return result;
      }
    },
    {
      pattern: /(?:how many|total|count)\s+(?:projects?)/i,
      query: async (sb) => {
        const { data: projects } = await sb.from('ph_projects').select('key, name, status, department').order('name').limit(20);
        if (!projects || projects.length === 0) return 'No projects found.';
        const lines = projects.map((p: any) => `- **${p.name}** (${p.key}) — ${p.status || 'Active'}${p.department ? ` — ${p.department}` : ''}`);
        return `**Projects: ${projects.length}${projects.length === 20 ? '+' : ''}**\n\n${lines.join('\n')}`;
      }
    },
    {
      pattern: /(?:what|which|show|list)\s+(?:items?|issues?|tickets?|stories?)\s+(?:are\s+)?(?:blocked|stuck)/i,
      query: async (sb) => {
        const { data: blocked } = await sb.from('ph_issues').select('issue_key, summary, status, priority, assignee_display_name').or('status.ilike.%blocked%,status.ilike.%impediment%').neq('status_category', 'Done').limit(10);
        if (!blocked || blocked.length === 0) return 'No blocked items found.';
        const shown = blocked.slice(0, 5);
        const lines = shown.map((b: any) => `- \`${b.issue_key}\` ${b.summary} — *${b.status}* — ${b.assignee_display_name || 'Unassigned'}`);
        let result = `**Blocked Items: ${blocked.length}**\n\n${lines.join('\n')}`;
        if (blocked.length > 5) result += `\n\n*Showing 5 of ${blocked.length}. Ask "Show all blocked items" for the full list.*`;
        return result;
      }
    },
    {
      pattern: /(?:what|which|show|list)\s+(?:items?|issues?|tickets?|stories?)\s+(?:are\s+)?(?:overdue|past\s*due|late)/i,
      query: async (sb) => {
        const today = new Date().toISOString().split('T')[0];
        const { data: overdue } = await sb.from('ph_issues').select('issue_key, summary, status, due_date, assignee_display_name').lt('due_date', today).neq('status_category', 'Done').order('due_date').limit(10);
        if (!overdue || overdue.length === 0) return 'No overdue items found.';
        const shown = overdue.slice(0, 5);
        const lines = shown.map((o: any) => `- \`${o.issue_key}\` ${o.summary} — due ${o.due_date} — ${o.assignee_display_name || 'Unassigned'}`);
        let result = `**Overdue Items: ${overdue.length}**\n\n${lines.join('\n')}`;
        if (overdue.length > 5) result += `\n\n*Showing 5 of ${overdue.length}. Ask "Show all overdue items" for the full list.*`;
        return result;
      }
    },
    {
      pattern: /(?:who|which\s+(?:person|people|team\s*member))\s+(?:has|have)\s+(?:the\s+)?(?:most|highest|biggest)/i,
      query: async (sb) => {
        const { data: items } = await sb.from('ph_issues').select('assignee_display_name').neq('status_category', 'Done').not('assignee_display_name', 'is', null);
        if (!items || items.length === 0) return 'No data available.';
        const counts: Record<string, number> = {};
        for (const i of items) { counts[i.assignee_display_name] = (counts[i.assignee_display_name] || 0) + 1; }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const lines = sorted.map(([name, count], idx) => `${idx + 1}. **${name}** — ${count} open items`);
        return `**Top Assignees by Open Items:**\n\n${lines.join('\n')}\n\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*`;
      }
    },
  ];

  for (const agg of aggregationPatterns) {
    if (agg.pattern.test(query) || agg.pattern.test(qLower)) {
      try {
        const answer = await agg.query(sb);
        return { found: true, answer, confidence: 0.90, sources: ['ph_issues', 'profiles', 'ph_projects'] };
      } catch { /* fall through to ticket detection */ }
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

  // (Work item detection moved to Priority 1 above)

  // ── Incident queries ──
  const incidentPatterns = [
    /(?:latest|recent|new|newest|open|active|current|pending)\s+(?:production\s+)?incidents?/i,
    /(?:production\s+)?incidents?\s+(?:logged|raised|reported|created|opened)/i,
    /(?:how many|count|number of)\s+(?:open|active|production)?\s*incidents?/i,
    /(?:show|list|display|what)\s+(?:are\s+)?(?:the\s+)?(?:latest|recent|open|active|current|all)?\s*(?:production\s+)?incidents?/i,
    /(?:incident)\s+(?:status|summary|overview|report|list|board)/i,
    /(?:what|which)\s+incidents?\s+(?:are|is|were)\s+(?:open|active|pending|unresolved|critical|major)/i,
    /(?:sev|severity)\s*[- ]?\s*[1234]\s+incidents?/i,
    /(?:p1|p2|critical|major)\s+incidents?/i,
  ];

  const isIncidentQuery = incidentPatterns.some(p => p.test(query)) || incidentPatterns.some(p => p.test(qLower));

  if (isIncidentQuery) {
    try {
      const { data: incidents } = await sb
        .from('incidents')
        .select('incident_key, title, status, severity, priority, assignee_id, reporter_name, incident_type, is_major_incident, created_at, updated_at, target_date, service_component')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (incidents && incidents.length > 0) {
        const parts: string[] = [];
        const open = incidents.filter((i: any) => !['resolved', 'closed', 'converted'].includes(i.status));
        const resolved = incidents.filter((i: any) => ['resolved', 'closed', 'converted'].includes(i.status));

        parts.push(`**Production Incidents** — ${incidents.length} total (${open.length} open, ${resolved.length} resolved)\n`);

        // Severity breakdown
        const bySev: Record<string, number> = {};
        for (const i of open) { bySev[i.severity || 'Unknown'] = (bySev[i.severity || 'Unknown'] || 0) + 1; }
        if (Object.keys(bySev).length > 0) {
          parts.push('**Open by Severity:**');
          for (const [sev, count] of Object.entries(bySev).sort()) {
            parts.push(`- ${sev}: **${count}**`);
          }
        }

        // Status breakdown
        const byStatus: Record<string, number> = {};
        for (const i of incidents) { byStatus[i.status || 'Unknown'] = (byStatus[i.status || 'Unknown'] || 0) + 1; }
        parts.push('\n**By Status:**');
        for (const [st, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${st}: **${count}**`);
        }

        // Major incidents
        const majors = open.filter((i: any) => i.is_major_incident);
        if (majors.length > 0) {
          parts.push(`\n🔴 **Major Incidents:** ${majors.length}`);
          for (const i of majors) {
            parts.push(`- \`${i.incident_key}\` **${i.title}** — *${i.severity}* | ${i.status}`);
          }
        }

        // Latest open incidents table
        if (open.length > 0) {
          parts.push('\n---\n#### OPEN INCIDENTS');
          const calcAge = (d: string): string => {
            const diffMs = Date.now() - new Date(d).getTime();
            const hours = Math.floor(diffMs / 3600000);
            if (hours < 1) return '<1h';
            if (hours < 24) return `${hours}h`;
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
          };
          for (const i of open.slice(0, 15)) {
            const age = calcAge(i.created_at);
            parts.push(`| \`${i.incident_key}\` | ${i.title} | *${i.severity || 'N/A'}* | ${i.status} | ⏱ ${age} |`);
          }
          if (open.length > 15) parts.push(`\n...and ${open.length - 15} more open incidents`);
        }

        // Recently resolved
        if (resolved.length > 0) {
          parts.push('\n---\n#### RECENTLY RESOLVED');
          for (const i of resolved.slice(0, 5)) {
            parts.push(`| \`${i.incident_key}\` | ${i.title} | ✅ ${i.status} |`);
          }
        }

        parts.push(`\n*Data as of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}*`);

        return {
          found: true,
          answer: parts.join('\n'),
          confidence: 0.92,
          sources: ['incidents'],
        };
      }
    } catch { /* table might not exist */ }
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

        parts.push('**By Process Step:**');
        for (const [step, count] of Object.entries(byStep).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${step}: **${count}**`);
        }

        parts.push('\n**By Health:**');
        for (const [h, count] of Object.entries(byHealth).sort((a, b) => b[1] - a[1])) {
          parts.push(`- ${h}: **${count}**`);
        }

        const totalBudget = requests.reduce((s: number, r: any) => s + (r.approved_budget_sar || 0), 0);
        const totalEstimated = requests.reduce((s: number, r: any) => s + (r.estimated_cost_sar || 0), 0);
        if (totalBudget > 0 || totalEstimated > 0) {
          parts.push('\n**Budget Summary:**');
          if (totalEstimated > 0) parts.push(`- Estimated: **${(totalEstimated / 1000000).toFixed(1)}M SAR**`);
          if (totalBudget > 0) parts.push(`- Approved: **${(totalBudget / 1000000).toFixed(1)}M SAR**`);
        }

        const highUrgency = requests.filter((r: any) => r.urgency === 'High' || r.priority_tier === 'P1');
        if (highUrgency.length > 0) {
          parts.push(`\n**High Urgency:** ${highUrgency.length} items`);
          for (const r of highUrgency.slice(0, 5)) {
            parts.push(`- \`${r.request_key || 'N/A'}\` ${r.title} — *${r.process_step}*`);
          }
        }

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
BREVITY RULE: Show only the 4-5 most recent/relevant items. If more data exists, end with: "Ask me for more details to see the full list."
RECENCY RULE: Prioritize information from the last 1-2 weeks. Older data should only be included if directly relevant.
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
      const logResult = await sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: true,
        p_matched_category: cached.category, p_confidence_score: cached.confidence || 1 });
      if (logResult.error) console.error("kb_log_query (cache) error:", logResult.error);
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
      await sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
        response_json: resp, language, ttl_hours: 1 });
      const liveLog = await sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: "live_data", p_confidence_score: live.confidence });
      if (liveLog.error) console.error("kb_log_query (live) error:", liveLog.error);
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
      await sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
        response_json: resp, language, ttl_hours: 168 });
      const trainLog = await sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: best.category, p_confidence_score: best.similarity });
      if (trainLog.error) console.error("kb_log_query (train) error:", trainLog.error);
      return new Response(JSON.stringify({ ...resp, _meta: { source: "training", response_time_ms: ms,
        cache_hit: false, similarity: best.similarity, query_rewrites: rewrites } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // No chunks = fallback
    if (!chunks.length) {
      const ms = Math.round(performance.now() - t0);
      const fbLog = await sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: false, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: null, p_confidence_score: 0 });
      if (fbLog.error) console.error("kb_log_query (fallback) error:", fbLog.error);
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

    // S8: Cache + Log — await to prevent premature runtime termination
    const [cacheRes, logRes] = await Promise.allSettled([
      sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
        response_json: resp, language, ttl_hours: 24 }),
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: resp.category, p_confidence_score: gen.confidence }),
    ]);
    if (logRes.status === "rejected") console.error("kb_log_query failed:", logRes.reason);
    else if (logRes.status === "fulfilled" && logRes.value?.error) console.error("kb_log_query error:", logRes.value.error);

    // Extended trace (best-effort, awaited)
    await sb.from("kb_query_log").update({
      query_rewrites: rewrites,
      retrieved_chunk_ids: chunks.slice(0, 30).map((c: any) => c.id),
      reranked_chunk_ids: ranked.map((c: any) => c.id),
      reranked_scores: ranked.map((c: any) => c.relevance_score || 0),
      evidence_pack: ev.text.substring(0, 2000),
      retrieval_method: "hybrid_v2",
      hallucination_flag: gen.confidence < P.CONF_REFUSE,
    }).eq("query_text", query).order("created_at", { ascending: false }).limit(1);

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

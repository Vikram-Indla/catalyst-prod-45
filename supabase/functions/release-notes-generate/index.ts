// release-notes-generate — compose release notes (markdown) from the release's
// linked changes + completed work items. Caty (Gemini) writes the prose from
// real linked items only; deterministic fallback if the model is unavailable.
// Persists to rh_release_notes (generated_by_ai = true).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { releaseId } = await req.json();
    if (!releaseId) return json({ error: "releaseId is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rel } = await supabase.from("rh_releases")
      .select("id,name,version,target_env,planned_release_date").eq("id", releaseId).maybeSingle();
    if (!rel) return json({ error: "release not found" }, 404);

    const { data: changes } = await supabase.from("rh_changes")
      .select("chg_number,title").eq("release_id", releaseId);
    const { data: links } = await supabase.from("rh_release_work_items")
      .select("work_item_key").eq("release_id", releaseId);
    const keys = (links ?? []).map((l: any) => l.work_item_key).filter(Boolean);
    let items: any[] = [];
    if (keys.length) {
      const { data: rows } = await supabase.from("ph_issues")
        .select("issue_key,summary,status,status_category").in("issue_key", keys);
      items = rows ?? [];
    }
    const done = items.filter((i) => (i.status_category ?? "").toLowerCase() === "done");

    const facts = {
      release: rel.name, version: rel.version, env: rel.target_env, date: rel.planned_release_date,
      changes: (changes ?? []).map((c: any) => `${c.chg_number ?? ""} ${c.title ?? ""}`.trim()),
      completed: done.map((i) => `${i.issue_key} ${i.summary ?? ""}`.trim()),
      remaining: items.length - done.length,
    };

    let content_md = deterministic(facts);
    const key = Deno.env.get("GEMINI_API_KEY");
    if (key && (facts.changes.length || facts.completed.length)) {
      try {
        const prompt = `You are Caty, a release manager. Write concise markdown release notes for "${facts.release} ${facts.version ?? ""}" using ONLY these facts (do not invent items). Sections: ## Highlights, ## Changes, ## Completed work, ## Still in flight (count only). FACTS: ${JSON.stringify(facts)}`;
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: "gemini-2.5-flash", messages: [{ role: "user", content: prompt }], temperature: 0.3 }),
        });
        if (res.ok) {
          const d = await res.json();
          const txt = d?.choices?.[0]?.message?.content?.trim();
          if (txt && txt.length > 20) content_md = txt;
        }
      } catch (_e) { /* keep deterministic */ }
    }

    const now = new Date().toISOString();
    await supabase.from("rh_release_notes").delete().eq("release_id", releaseId).eq("generated_by_ai", true);
    await supabase.from("rh_release_notes").insert({
      release_id: releaseId, content_md, generated_by_ai: true, created_at: now, updated_at: now,
    });

    return json({ content_md }, 200);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function deterministic(f: any): string {
  const lines: string[] = [`# ${f.release}${f.version ? " " + f.version : ""}`];
  if (f.date) lines.push(`_Target: ${f.date}${f.env ? " · " + f.env : ""}_`);
  if (!f.changes.length && !f.completed.length) {
    lines.push("", "No linked changes or completed work items yet. Link work items to this release to generate notes.");
    return lines.join("\n");
  }
  if (f.changes.length) { lines.push("", "## Changes"); f.changes.forEach((c: string) => lines.push(`- ${c}`)); }
  if (f.completed.length) { lines.push("", "## Completed work"); f.completed.forEach((c: string) => lines.push(`- ${c}`)); }
  if (f.remaining > 0) lines.push("", `## Still in flight`, `- ${f.remaining} item(s) not yet done`);
  return lines.join("\n");
}

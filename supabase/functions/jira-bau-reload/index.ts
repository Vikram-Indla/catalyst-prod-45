// Jira BAU project reload — pulls delta since max(jira_updated_at) for BAU,
// upserts ph_issues, downloads non-video attachments to storage, hydrates
// images inside description ADF media nodes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_KEY = "BAU";
const BUCKET = "jira-attachments";
const PAGE_SIZE = 100;

const JIRA_BASE_URL = Deno.env.get("JIRA_BASE_URL")!;
const JIRA_EMAIL = Deno.env.get("JIRA_EMAIL")!;
const JIRA_API_TOKEN = Deno.env.get("JIRA_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const authHeader = `Basic ${btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)}`;
const jiraBase = JIRA_BASE_URL.replace(/\/$/, "");

const isVideo = (mime: string | undefined, name: string) => {
  if (mime?.startsWith("video/")) return true;
  return /\.(mp4|mov|avi|mkv|webm|m4v|wmv|flv)$/i.test(name);
};
const isImage = (mime: string | undefined, name: string) => {
  if (mime?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
};

async function jiraFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${jiraBase}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Jira ${path} -> ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

async function jiraGetIssue(key: string) {
  const params = new URLSearchParams({
    fields: "*all",
    expand: "renderedFields,changelog,attachment",
  });
  return jiraFetch(`/rest/api/3/issue/${encodeURIComponent(key)}?${params}`);
}

async function downloadAttachmentBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Authorization: authHeader } });
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Walk ADF tree, replace media node IDs with public storage URLs we just uploaded
function hydrateAdfMedia(adf: any, idToUrl: Map<string, string>): any {
  if (!adf || typeof adf !== "object") return adf;
  if (Array.isArray(adf)) return adf.map((n) => hydrateAdfMedia(n, idToUrl));
  const node: any = { ...adf };
  if (node.type === "media" && node.attrs?.id) {
    const url = idToUrl.get(String(node.attrs.id));
    if (url) {
      node.attrs = { ...node.attrs, url, type: "external" };
    }
  }
  if (node.content) node.content = hydrateAdfMedia(node.content, idToUrl);
  return node;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Open run record
  const { data: runRow } = await supabase
    .from("jira_bau_reload_runs")
    .insert({ status: "running" })
    .select()
    .single();
  const runId = runRow!.id as string;

  const errors: any[] = [];
  let processed = 0;
  let upserted = 0;
  let attUploaded = 0;
  let videoSkipped = 0;
  let sinceISO: string | null = null;

  try {
    // Find delta start: max jira_updated_at for BAU
    const { data: maxRow } = await supabase
      .from("ph_issues")
      .select("jira_updated_at")
      .eq("project_key", PROJECT_KEY)
      .order("jira_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    sinceISO = maxRow?.jira_updated_at ?? "2026-01-01T00:00:00.000Z";
    await supabase.from("jira_bau_reload_runs").update({ since_timestamp: sinceISO }).eq("id", runId);

    // JQL: BAU updated since
    const jqlSinceMin = sinceISO.slice(0, 16).replace("T", " "); // "yyyy-MM-dd HH:mm"
    const jql = `project = ${PROJECT_KEY} AND updated > "${jqlSinceMin}" ORDER BY updated ASC`;

    let nextPageToken: string | undefined = undefined;
    let pageNum = 0;

    do {
      pageNum++;
      const body: any = {
        jql,
        maxResults: PAGE_SIZE,
        fields: ["summary", "status", "issuetype", "updated"],
      };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const page = await jiraFetch(`/rest/api/3/search/jql`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const liteIssues = page.issues ?? [];
      nextPageToken = page.nextPageToken;
      console.log(`Page ${pageNum} got=${liteIssues.length} nextToken=${nextPageToken ? "yes" : "no"}`);

      for (const lite of liteIssues) {
        try {
          // Fetch full issue (attachments + ADF description + changelog)
          const issue = await jiraGetIssue(lite.key);
          const f = issue.fields ?? {};
          processed++;

          // --- Attachments: download non-video, upload to storage ---
          const idToUrl = new Map<string, string>();
          for (const att of f.attachment ?? []) {
            const mime = att.mimeType as string | undefined;
            const name = att.filename as string;
            if (isVideo(mime, name)) {
              videoSkipped++;
              continue;
            }
            const safe = name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
            const path = `${PROJECT_KEY}/${issue.key}/${att.id}_${safe}`;
            try {
              const bytes = await downloadAttachmentBytes(att.content);
              const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
                contentType: mime ?? "application/octet-stream",
                upsert: true,
              });
              if (upErr) throw upErr;
              const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
              const publicUrl = pub.publicUrl;
              attUploaded++;

              await supabase.from("ph_issue_attachments").upsert(
                {
                  issue_key: issue.key,
                  jira_project_key: PROJECT_KEY,
                  jira_attachment_id: String(att.id),
                  filename: name,
                  mime_type: mime ?? null,
                  size_bytes: att.size ?? null,
                  is_image: isImage(mime, name),
                  storage_path: path,
                  storage_url: publicUrl,
                  jira_author: att.author?.displayName ?? null,
                  jira_created_at: att.created ?? null,
                  synced_at: new Date().toISOString(),
                },
                { onConflict: "issue_key,jira_attachment_id" }
              );

              if (isImage(mime, name)) idToUrl.set(String(att.id), publicUrl);
            } catch (attErr) {
              errors.push({ issueKey: issue.key, attachment: name, error: String(attErr) });
            }
          }

          const descAdf = f.description ? hydrateAdfMedia(f.description, idToUrl) : null;
          const descText =
            typeof f.description === "string"
              ? f.description
              : (issue.renderedFields?.description ?? "")
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();

          const row = {
            issue_key: issue.key,
            project_key: PROJECT_KEY,
            project_name: f.project?.name ?? "Seanei BAU",
            issue_type: f.issuetype?.name ?? null,
            type_icon_url: f.issuetype?.iconUrl ?? null,
            summary: f.summary ?? null,
            status: f.status?.name ?? null,
            status_category: f.status?.statusCategory?.key ?? null,
            assignee_account_id: f.assignee?.accountId ?? null,
            assignee_display_name: f.assignee?.displayName ?? null,
            reporter_account_id: f.reporter?.accountId ?? null,
            reporter_display_name: f.reporter?.displayName ?? null,
            parent_key: f.parent?.key ?? null,
            parent_summary: f.parent?.fields?.summary ?? null,
            priority: f.priority?.name ?? null,
            labels: f.labels ?? [],
            components: (f.components ?? []).map((c: any) => c.name),
            fix_versions: (f.fixVersions ?? []).map((v: any) => ({
              id: v.id, name: v.name, released: v.released,
            })),
            due_date: f.duedate ?? null,
            resolution: f.resolution?.name ?? null,
            jira_created_at: f.created ?? null,
            jira_updated_at: f.updated ?? null,
            description_adf: descAdf,
            description_text: descText,
            comments: f.comment?.comments ?? [],
            changelog: issue.changelog?.histories ?? [],
            raw_json: issue,
            last_synced_at: new Date().toISOString(),
            synced_at: new Date().toISOString(),
            sync_status: "synced",
            source: "jira",
          };

          const { error: upErr } = await supabase
            .from("ph_issues")
            .upsert(row, { onConflict: "issue_key" });
          if (upErr) {
            errors.push({ issueKey: issue.key, error: upErr.message });
          } else {
            upserted++;
          }
        } catch (issueErr) {
          errors.push({ issueKey: lite.key, error: String(issueErr) });
        }
      }

      await supabase
        .from("jira_bau_reload_runs")
        .update({
          issues_processed: processed,
          issues_upserted: upserted,
          attachments_uploaded: attUploaded,
          attachments_skipped_video: videoSkipped,
          errors,
        })
        .eq("id", runId);
    } while (nextPageToken);

    await supabase
      .from("jira_bau_reload_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: errors.length ? "completed_with_errors" : "completed",
        issues_processed: processed,
        issues_upserted: upserted,
        attachments_uploaded: attUploaded,
        attachments_skipped_video: videoSkipped,
        errors,
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        sinceISO,
        processed,
        upserted,
        attachmentsUploaded: attUploaded,
        videosSkipped: videoSkipped,
        errorCount: errors.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    await supabase
      .from("jira_bau_reload_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "failed",
        errors: [...errors, { fatal: String(e) }],
        issues_processed: processed,
        issues_upserted: upserted,
        attachments_uploaded: attUploaded,
        attachments_skipped_video: videoSkipped,
      })
      .eq("id", runId);
    return new Response(JSON.stringify({ success: false, error: String(e), runId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

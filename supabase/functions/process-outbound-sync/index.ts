import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch pending outbound events
    const { data: events, error: fetchErr } = await supabase
      .from("sync_events")
      .select("*")
      .eq("direction", "outbound")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchErr) throw fetchErr;
    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, total: 0, message: "No pending outbound events" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get Jira connection credentials
    const { data: connection } = await supabase
      .from("sync_connections")
      .select("*")
      .eq("provider", "jira")
      .eq("is_active", true)
      .maybeSingle();

    if (!connection) {
      return new Response(
        JSON.stringify({ error: "No active Jira connection found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jiraBaseUrl = connection.base_url;
    const jiraAuth = connection.auth_token;

    let processed = 0;
    let failed = 0;

    // 3. Process each event
    for (const event of events) {
      try {
        // Check cooldown — skip if entity was recently synced inbound
        const { data: cooldown } = await supabase
          .from("sync_cooldowns")
          .select("expires_at")
          .eq("entity_id", event.entity_id)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (cooldown) {
          await supabase
            .from("sync_events")
            .update({
              status: "skipped",
              processed_at: new Date().toISOString(),
              error_message: "Echo cooldown active",
            })
            .eq("id", event.id);
          continue;
        }

        // Get entity mapping to find Jira issue key
        const { data: mapping } = await supabase
          .from("sync_entity_map")
          .select("jira_id, jira_key")
          .eq("catalyst_id", event.entity_id)
          .eq("entity_type", event.entity_type)
          .maybeSingle();

        if (!mapping?.jira_key) {
          await supabase
            .from("sync_events")
            .update({
              status: "failed",
              processed_at: new Date().toISOString(),
              error_message: "No Jira mapping found",
            })
            .eq("id", event.id);
          failed++;
          continue;
        }

        // Build Jira REST API payload from event changes
        const payload = buildJiraPayload(event);

        // Call Jira REST API v3
        const jiraResponse = await fetch(
          `${jiraBaseUrl}/rest/api/3/issue/${mapping.jira_key}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Basic ${jiraAuth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (jiraResponse.ok || jiraResponse.status === 204) {
          // Success — mark completed + set cooldown
          await supabase
            .from("sync_events")
            .update({ status: "completed", processed_at: new Date().toISOString() })
            .eq("id", event.id);

          // Set cooldown to prevent echo (5s TTL)
          await supabase.from("sync_cooldowns").upsert(
            {
              entity_id: event.entity_id,
              entity_type: event.entity_type,
              expires_at: new Date(Date.now() + 5000).toISOString(),
            },
            { onConflict: "entity_id,entity_type" }
          );

          // Update last_synced_at on mapping
          await supabase
            .from("sync_entity_map")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("catalyst_id", event.entity_id);

          processed++;
        } else {
          const errBody = await jiraResponse.text();
          await supabase
            .from("sync_events")
            .update({
              status: "failed",
              processed_at: new Date().toISOString(),
              error_message: `Jira API ${jiraResponse.status}: ${errBody.slice(0, 500)}`,
              retry_count: (event.retry_count || 0) + 1,
            })
            .eq("id", event.id);
          failed++;
        }
      } catch (eventErr) {
        await supabase
          .from("sync_events")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            error_message: String(eventErr).slice(0, 500),
            retry_count: (event.retry_count || 0) + 1,
          })
          .eq("id", event.id);
        failed++;
      }
    }

    // 4. Write health record
    await supabase.from("sync_health").insert({
      status: failed === 0 ? "healthy" : "degraded",
      details: { direction: "outbound", processed, failed, batch_size: events.length },
      checked_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ processed, failed, total: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildJiraPayload(event: Record<string, unknown>) {
  const changes = (event.payload as Record<string, unknown>)?.changes as Record<string, unknown> || {};
  const fields: Record<string, unknown> = {};

  if (changes.summary) fields.summary = changes.summary;
  if (changes.description) {
    fields.description = {
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: changes.description }] },
      ],
    };
  }
  if (changes.priority) fields.priority = { name: changes.priority };
  if (changes.assignee_jira_id) fields.assignee = { accountId: changes.assignee_jira_id };

  return { fields };
}

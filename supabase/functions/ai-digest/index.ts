import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // 2. Check cache
    const { data: cached } = await supabase
      .from("ai_digest_cache")
      .select("digest_json")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({ digest: cached.digest_json, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch recent notifications
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("notification_type, entity_type, entity_title, hub_source, status, tab, created_at")
      .eq("recipient_user_id", userId)
      .eq("is_dismissed", false)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(50);

    if (notifError) {
      console.error("Notification fetch error:", notifError);
      return new Response(
        JSON.stringify({ digest: null, error: "digest_unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Empty state
    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ digest: { summary: "", items: [] }, cached: false, empty: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Build prompt and call Lovable AI Gateway
    const formattedList = notifications
      .map(
        (n, i) =>
          `${i + 1}. [${n.notification_type}] ${n.entity_title} (${n.entity_type}, hub: ${n.hub_source || "unknown"}, status: ${n.status || "unknown"}, at: ${n.created_at})`
      )
      .join("\n");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ digest: null, error: "digest_unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant for Catalyst, an enterprise portfolio management platform for the Saudi Ministry of Industry. Analyse the user's recent notifications and produce a prioritised daily digest. Return ONLY valid JSON, no markdown fences.",
          },
          {
            role: "user",
            content: `Here are my recent notifications from the last 48 hours:\n${formattedList}\n\nReturn ONLY valid JSON with this exact structure, no markdown:\n{\n  "summary": "One sentence overview of what needs attention today.",\n  "items": [\n    { "priority": "HIGH", "title": "...", "detail": "...", "hub": "..." },\n    { "priority": "MED",  "title": "...", "detail": "...", "hub": "..." },\n    { "priority": "LOW",  "title": "...", "detail": "...", "hub": "..." }\n  ]\n}\nLimit to maximum 6 items total. Priority HIGH = needs action today.`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Lovable AI Gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ digest: null, error: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ digest: null, error: "credits_exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ digest: null, error: "digest_unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    let rawText = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    // 5. Parse + cache
    let parsedDigest;
    try {
      parsedDigest = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse AI response as JSON:", rawText);
      return new Response(
        JSON.stringify({ digest: null, error: "digest_unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from("ai_digest_cache").insert({
      user_id: userId,
      digest_json: parsedDigest,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    return new Response(
      JSON.stringify({ digest: parsedDigest, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-digest error:", e);
    return new Response(
      JSON.stringify({ digest: null, error: "digest_unavailable" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

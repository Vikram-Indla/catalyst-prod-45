import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action = "all" } = await req.json().catch(() => ({ action: "all" }));
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const results: Record<string, any> = {};

    // Purge query logs older than 365 days
    if (action === "all" || action === "purge_logs") {
      const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("kb_query_log")
        .delete()
        .lt("created_at", cutoff)
        .select("*", { count: "exact", head: true });

      results.purged_logs = error ? error.message : `${count || 0} old log entries removed`;
    }

    // Clear expired cache entries
    if (action === "all" || action === "clear_cache") {
      const { data: expired } = await supabase
        .from("kb_cache")
        .select("id, ttl_hours, created_at");

      let cleared = 0;
      for (const entry of expired || []) {
        const expiresAt = new Date(entry.created_at).getTime() + (entry.ttl_hours * 60 * 60 * 1000);
        if (Date.now() > expiresAt) {
          await supabase.from("kb_cache").delete().eq("id", entry.id);
          cleared++;
        }
      }
      results.cleared_cache = `${cleared} expired cache entries removed`;
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString(), ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

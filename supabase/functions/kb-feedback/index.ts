import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth-guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth guard ── previously unauthenticated; with --no-verify-jwt this
  // let anyone flip was_helpful on any log row by guessing/enumerating UUIDs.
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { log_id, was_helpful } = await req.json();

    if (!log_id || typeof was_helpful !== "boolean") {
      return new Response(
        JSON.stringify({ error: "log_id (UUID) and was_helpful (boolean) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error } = await supabase.rpc("kb_update_helpful", {
      p_log_id: log_id,
      p_was_helpful: was_helpful,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, log_id, was_helpful }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("kb-feedback error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

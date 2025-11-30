import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, auth_method, credentials } = await req.json();

    console.log("Testing Jira connection:", { url, auth_method });

    // Construct authentication headers based on method
    let authHeaders: Record<string, string> = {};
    
    if (auth_method === "api_token") {
      // Basic auth for Jira Cloud with API token
      const encodedCredentials = btoa(`${credentials.username}:${credentials.api_token}`);
      authHeaders = {
        "Authorization": `Basic ${encodedCredentials}`,
      };
    } else if (auth_method === "pat") {
      // Bearer token for Server/Data Center with PAT
      authHeaders = {
        "Authorization": `Bearer ${credentials.api_token}`,
      };
    }

    // Test connection by fetching server info
    const testUrl = `${url}/rest/api/2/serverInfo`;
    console.log("Calling Jira API:", testUrl);

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        ...authHeaders,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jira API error:", response.status, errorText);
      throw new Error(`Jira API returned ${response.status}: ${errorText}`);
    }

    const serverInfo = await response.json();
    console.log("Jira connection successful:", serverInfo);

    // Update connection test status in database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    return new Response(
      JSON.stringify({
        success: true,
        serverInfo: {
          version: serverInfo.version,
          versionNumbers: serverInfo.versionNumbers,
          deploymentType: serverInfo.deploymentType,
          buildNumber: serverInfo.buildNumber,
          serverTitle: serverInfo.serverTitle,
        },
        message: "Connection successful",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error testing Jira connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
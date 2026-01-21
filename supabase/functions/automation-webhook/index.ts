/**
 * Module 5A-4: CI/CD Pipeline Integration - Webhook Handler
 * Receives automation results from CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins, etc.)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-connector-id",
};

interface AutomationResult {
  external_test_id: string;
  external_test_name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
  run_timestamp?: string;
}

interface WebhookPayload {
  connector_id?: string;
  pipeline_name?: string;
  pipeline_url?: string;
  commit_sha?: string;
  branch?: string;
  results: AutomationResult[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get connector ID from header or body
    const connectorIdHeader = req.headers.get("x-connector-id");
    const signatureHeader = req.headers.get("x-webhook-signature");
    
    const payload: WebhookPayload = await req.json();
    const connectorId = connectorIdHeader || payload.connector_id;

    if (!connectorId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing connector_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch connector and verify
    const { data: connector, error: connectorError } = await supabaseClient
      .from("automation_connectors")
      .select("*")
      .eq("id", connectorId)
      .eq("is_active", true)
      .single();

    if (connectorError || !connector) {
      console.error("Connector not found or inactive:", connectorId);
      return new Response(
        JSON.stringify({ success: false, error: "Connector not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature if secret is configured
    if (connector.webhook_secret && signatureHeader) {
      const bodyText = JSON.stringify(payload);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(connector.webhook_secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signatureHeader !== `sha256=${expectedSignature}`) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate results
    if (!payload.results || !Array.isArray(payload.results) || payload.results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No results provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create import job
    const { data: job, error: jobError } = await supabaseClient
      .from("automation_import_jobs")
      .insert({
        connector_id: connectorId,
        status: 'processing',
        source_file_name: payload.pipeline_name || 'CI/CD Webhook',
        source_format: 'webhook',
        total_count: payload.results.length,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create import job:", jobError);
      throw jobError;
    }

    // Process results
    let imported = 0;
    let mapped = 0;

    for (const result of payload.results) {
      // Check for existing mapping
      const { data: mapping } = await supabaseClient
        .from("automation_test_mappings")
        .select("test_case_id")
        .eq("connector_id", connectorId)
        .eq("external_test_id", result.external_test_id)
        .single();

      const testCaseId = mapping?.test_case_id || null;

      // Insert result
      const { error: insertError } = await supabaseClient
        .from("automation_results")
        .insert({
          connector_id: connectorId,
          test_case_id: testCaseId,
          external_test_id: result.external_test_id,
          external_test_name: result.external_test_name,
          status: result.status,
          duration_ms: result.duration_ms || null,
          error_message: result.error_message || null,
          stack_trace: result.stack_trace || null,
          metadata: {
            ...result.metadata,
            pipeline_name: payload.pipeline_name,
            pipeline_url: payload.pipeline_url,
            commit_sha: payload.commit_sha,
            branch: payload.branch
          },
          run_timestamp: result.run_timestamp || new Date().toISOString()
        });

      if (!insertError) {
        imported++;
        if (testCaseId) mapped++;
      }
    }

    // Update connector status
    await supabaseClient
      .from("automation_connectors")
      .update({
        last_connected_at: new Date().toISOString(),
        connection_status: 'connected'
      })
      .eq("id", connectorId);

    // Complete import job
    await supabaseClient
      .from("automation_import_jobs")
      .update({
        status: 'completed',
        imported_count: imported,
        mapped_count: mapped,
        completed_at: new Date().toISOString()
      })
      .eq("id", job.id);

    const processingTime = Date.now() - startTime;

    console.log(`Webhook processed: ${imported} results imported, ${mapped} mapped in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        imported,
        mapped,
        processing_time_ms: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
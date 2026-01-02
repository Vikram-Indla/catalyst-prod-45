import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportManifest {
  projects?: any[];
  issues?: any[];
  users?: any[];
  statuses?: any[];
  priorities?: any[];
  versions?: any[];
  sprints?: any[];
  components?: any[];
}

interface Discrepancy {
  type: 'missing' | 'mismatch' | 'orphan' | 'duplicate';
  severity: 'error' | 'warning' | 'info';
  entity_type: string;
  source_id?: string;
  target_id?: string;
  field?: string;
  expected?: any;
  actual?: any;
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { import_job_id, manifest } = await req.json();

    if (!import_job_id) {
      throw new Error("import_job_id is required");
    }

    // Get import job
    const { data: job, error: jobError } = await supabase
      .from("injira_import_jobs")
      .select("*")
      .eq("id", import_job_id)
      .single();

    if (jobError || !job) {
      throw new Error("Import job not found");
    }

    // Get manifest from job or request
    const importManifest: ImportManifest = manifest || job.config?.manifest || {};
    
    const discrepancies: Discrepancy[] = [];
    const summary = {
      total_source_issues: importManifest.issues?.length || 0,
      total_target_issues: 0,
      matched_issues: 0,
      missing_in_target: 0,
      orphaned_in_target: 0,
      user_mapping_issues: 0,
      status_mapping_issues: 0,
    };

    // Get current issues from DB
    const { data: existingIssues } = await supabase
      .from("injira_issues")
      .select("id, key, external_id, external_source, summary, status_id, assignee_id")
      .eq("project_id", job.project_id);

    summary.total_target_issues = existingIssues?.length || 0;

    // Check user mappings
    const { data: existingMappings } = await supabase
      .from("injira_import_mappings")
      .select("*")
      .eq("import_job_id", import_job_id);

    const userMappings = existingMappings?.filter(m => m.source_type === 'user') || [];
    const statusMappings = existingMappings?.filter(m => m.source_type === 'status') || [];

    // Analyze user mappings
    for (const sourceUser of (importManifest.users || [])) {
      const mapping = userMappings.find(m => m.source_id === sourceUser.accountId || m.source_id === sourceUser.key);
      
      if (!mapping || mapping.mapping_status === 'pending') {
        discrepancies.push({
          type: 'missing',
          severity: 'warning',
          entity_type: 'user',
          source_id: sourceUser.accountId || sourceUser.key,
          message: `User "${sourceUser.displayName || sourceUser.emailAddress}" has no mapping`,
        });
        summary.user_mapping_issues++;
      }
    }

    // Analyze status mappings
    for (const sourceStatus of (importManifest.statuses || [])) {
      const mapping = statusMappings.find(m => m.source_id === sourceStatus.id);
      
      if (!mapping || mapping.mapping_status === 'pending') {
        discrepancies.push({
          type: 'missing',
          severity: 'warning',
          entity_type: 'status',
          source_id: sourceStatus.id,
          message: `Status "${sourceStatus.name}" has no mapping`,
        });
        summary.status_mapping_issues++;
      }
    }

    // Analyze issues
    const existingExternalIds = new Set(existingIssues?.map(i => i.external_id).filter(Boolean));
    
    for (const sourceIssue of (importManifest.issues || [])) {
      const issueId = sourceIssue.id?.toString() || sourceIssue.key;
      
      if (existingExternalIds.has(issueId)) {
        summary.matched_issues++;
        
        // Check for mismatches
        const existingIssue = existingIssues?.find(i => i.external_id === issueId);
        if (existingIssue && existingIssue.summary !== sourceIssue.fields?.summary) {
          discrepancies.push({
            type: 'mismatch',
            severity: 'info',
            entity_type: 'issue',
            source_id: issueId,
            target_id: existingIssue.id,
            field: 'summary',
            expected: sourceIssue.fields?.summary,
            actual: existingIssue.summary,
            message: `Issue ${sourceIssue.key} summary differs from source`,
          });
        }
      } else {
        summary.missing_in_target++;
        discrepancies.push({
          type: 'missing',
          severity: 'error',
          entity_type: 'issue',
          source_id: issueId,
          message: `Issue ${sourceIssue.key} from source not found in target`,
        });
      }
    }

    // Check for orphaned issues
    const sourceIssueIds = new Set((importManifest.issues || []).map(i => i.id?.toString() || i.key));
    for (const existingIssue of (existingIssues || [])) {
      if (existingIssue.external_id && !sourceIssueIds.has(existingIssue.external_id)) {
        summary.orphaned_in_target++;
        discrepancies.push({
          type: 'orphan',
          severity: 'warning',
          entity_type: 'issue',
          target_id: existingIssue.id,
          message: `Issue ${existingIssue.key} exists in target but not in source manifest`,
        });
      }
    }

    // Generate AI analysis using Lovable AI
    let aiAnalysis = "";
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a Jira import analyst. Analyze the import discrepancy report and provide a brief summary with actionable recommendations. Be concise but thorough."
              },
              {
                role: "user",
                content: `Analyze this import diff report:\n\nSummary: ${JSON.stringify(summary)}\n\nDiscrepancies (top 20): ${JSON.stringify(discrepancies.slice(0, 20))}\n\nProvide:\n1. Overall assessment (1-2 sentences)\n2. Critical issues requiring attention\n3. Recommended actions before proceeding`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiAnalysis = aiData.choices?.[0]?.message?.content || "";
        }
      }
    } catch (aiError) {
      console.error("AI analysis failed:", aiError);
    }

    // Store the diff report
    const { data: report, error: reportError } = await supabase
      .from("injira_import_diff_reports")
      .insert({
        import_job_id,
        report_type: 'full',
        summary,
        discrepancies,
        recommendations: [],
        ai_analysis: aiAnalysis,
        generated_by: aiAnalysis ? 'ai_agent' : 'system',
      })
      .select()
      .single();

    if (reportError) {
      throw reportError;
    }

    // Log the analysis action
    await supabase.from("injira_import_audit_log").insert({
      import_job_id,
      action: 'diff_analysis_completed',
      entity_type: 'diff_report',
      entity_id: report.id,
      new_value: { summary, discrepancy_count: discrepancies.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report.id,
        summary,
        discrepancy_count: discrepancies.length,
        ai_analysis: aiAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Import analyzer error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

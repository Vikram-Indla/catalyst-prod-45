import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SummaryData {
  draftId: string;
  draftKey: string;
  title: string;
  language: string;
  runExecutedAt: string;
  runExecutedBy: string | null;
  canonicalHash: string | null;
  promptPackVersion: string | null;
  sourcesPackVersion: string | null;
  model: string;
  stagesCompleted: string[];
  complianceVerdict: string | null;
  complianceScore: number | null;
  openQuestionsAnswered: number;
  openQuestionsPending: number;
  qualityScore: number | null;
  traceabilityScore: number | null;
  gapsRegister: Array<{ code: string; description: string; severity: string }>;
  linkedBRKey: string | null;
  epicsPublishedCount: number;
  epicsQuarter: string | null;
  auditEvents: Array<{ event_type: string; created_at: string; payload_json: any }>;
}

function generateSummaryHTML(data: SummaryData): string {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const stagesHtml = ['A: Ingest & Evidence Map', 'B: Understand & Diagnose', 'C: Compliance & Clarify', 'D: Produce & Publish']
    .map((stage, idx) => {
      const stageKey = ['ingest', 'understand', 'compliance', 'produce'][idx];
      const completed = data.stagesCompleted.includes(stageKey);
      return `<div class="stage ${completed ? 'completed' : 'pending'}">
        <span class="stage-icon">${completed ? '✓' : '○'}</span>
        <span>${stage}</span>
      </div>`;
    }).join('');

  const verdictClass = data.complianceVerdict === 'COMPLIANT' ? 'success' : 
                       data.complianceVerdict === 'CONDITIONAL' ? 'warning' : 'danger';

  const gapsHtml = data.gapsRegister.length > 0 
    ? data.gapsRegister.map(gap => `
        <tr>
          <td>${gap.code}</td>
          <td>${gap.description}</td>
          <td class="severity-${gap.severity.toLowerCase()}">${gap.severity}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" class="empty">No gaps identified</td></tr>';

  const auditHtml = data.auditEvents.slice(0, 10).map(event => `
    <tr>
      <td>${formatDate(event.created_at)}</td>
      <td>${event.event_type.replace(/_/g, ' ')}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Assist Run Summary - ${data.draftKey}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #fff;
      color: #1a1a1a;
      font-size: 11px;
      line-height: 1.4;
      padding: 24px;
    }
    .header {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #fff;
      padding: 20px 24px;
      margin: -24px -24px 24px -24px;
      border-bottom: 3px solid #c69c6d;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 12px;
      opacity: 0.8;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .meta-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 12px;
    }
    .meta-card h3 {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      margin-bottom: 4px;
    }
    .meta-card .value {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      word-break: break-all;
    }
    .meta-card .value.mono {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 10px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #c69c6d;
    }
    .stages-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .stage {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 11px;
    }
    .stage.completed {
      background: #d4edda;
      color: #155724;
    }
    .stage.pending {
      background: #f8f9fa;
      color: #6c757d;
    }
    .stage-icon {
      font-size: 14px;
    }
    .scores-row {
      display: flex;
      gap: 16px;
    }
    .score-box {
      flex: 1;
      text-align: center;
      padding: 12px;
      border-radius: 6px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
    }
    .score-value {
      font-size: 24px;
      font-weight: 700;
    }
    .score-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #666;
      margin-top: 4px;
    }
    .verdict-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .verdict-chip.success { background: #d4edda; color: #155724; }
    .verdict-chip.warning { background: #fff3cd; color: #856404; }
    .verdict-chip.danger { background: #f8d7da; color: #721c24; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
    }
    .empty {
      text-align: center;
      color: #6c757d;
      font-style: italic;
    }
    .severity-critical { color: #dc3545; font-weight: 600; }
    .severity-high { color: #fd7e14; font-weight: 600; }
    .severity-medium { color: #ffc107; }
    .severity-low { color: #28a745; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      font-size: 9px;
      color: #666;
    }
    .info-row {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
    }
    .info-item {
      flex: 1;
    }
    .info-item label {
      font-size: 9px;
      text-transform: uppercase;
      color: #666;
      display: block;
      margin-bottom: 2px;
    }
    .info-item .value {
      font-size: 11px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>AI Assist Run Summary</h1>
    <div class="subtitle">${data.draftKey} — ${data.title}</div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <h3>Draft ID</h3>
      <div class="value mono">${data.draftId.slice(0, 8)}...</div>
    </div>
    <div class="meta-card">
      <h3>Language</h3>
      <div class="value">${data.language.toUpperCase()}</div>
    </div>
    <div class="meta-card">
      <h3>Executed</h3>
      <div class="value">${formatDate(data.runExecutedAt)}</div>
    </div>
    <div class="meta-card">
      <h3>Model</h3>
      <div class="value">${data.model}</div>
    </div>
    <div class="meta-card">
      <h3>Prompt Pack</h3>
      <div class="value mono">${data.promptPackVersion || 'N/A'}</div>
    </div>
    <div class="meta-card">
      <h3>Sources Pack</h3>
      <div class="value mono">${data.sourcesPackVersion || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Canonical Hash</h2>
    <div class="meta-card">
      <div class="value mono">${data.canonicalHash || 'Not computed'}</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Stages Execution</h2>
    <div class="stages-grid">
      ${stagesHtml}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Compliance & Quality</h2>
    <div class="scores-row">
      <div class="score-box">
        <span class="verdict-chip ${verdictClass}">${data.complianceVerdict || 'N/A'}</span>
        <div class="score-label" style="margin-top: 8px;">Compliance Verdict</div>
      </div>
      <div class="score-box">
        <div class="score-value">${data.complianceScore !== null ? `${data.complianceScore}%` : 'N/A'}</div>
        <div class="score-label">Compliance Score</div>
      </div>
      <div class="score-box">
        <div class="score-value">${data.qualityScore !== null ? `${data.qualityScore}/10` : 'N/A'}</div>
        <div class="score-label">Quality Score</div>
      </div>
      <div class="score-box">
        <div class="score-value">${data.traceabilityScore !== null ? `${data.traceabilityScore}%` : 'N/A'}</div>
        <div class="score-label">Traceability</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Open Questions</h2>
    <div class="info-row">
      <div class="info-item">
        <label>Answered</label>
        <div class="value" style="color: #28a745;">${data.openQuestionsAnswered}</div>
      </div>
      <div class="info-item">
        <label>Pending</label>
        <div class="value" style="color: #dc3545;">${data.openQuestionsPending}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Gaps Register</h2>
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Description</th>
          <th>Severity</th>
        </tr>
      </thead>
      <tbody>
        ${gapsHtml}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Linkage & Publishing</h2>
    <div class="info-row">
      <div class="info-item">
        <label>Linked Business Request</label>
        <div class="value">${data.linkedBRKey || 'Not linked'}</div>
      </div>
      <div class="info-item">
        <label>Epics Published</label>
        <div class="value">${data.epicsPublishedCount} ${data.epicsQuarter ? `(${data.epicsQuarter})` : ''}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Audit Log (Last 10 Events)</h2>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Event</th>
        </tr>
      </thead>
      <tbody>
        ${auditHtml || '<tr><td colspan="2" class="empty">No audit events</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { draftId, runId } = await req.json();

    if (!draftId || !runId) {
      return new Response(
        JSON.stringify({ error: "draftId and runId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch draft
    const { data: draft, error: draftError } = await supabase
      .from("ai_assist_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return new Response(
        JSON.stringify({ error: "Draft not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch run
    const { data: run, error: runError } = await supabase
      .from("ai_assist_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: "Run not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch artifacts for this run
    const { data: artifacts } = await supabase
      .from("ai_assist_artifacts")
      .select("*")
      .eq("run_id", runId);

    // Fetch audit events
    const { data: auditEvents } = await supabase
      .from("ai_assist_audit_events")
      .select("*")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch linked BR
    const { data: links } = await supabase
      .from("ai_assist_links")
      .select("request_key")
      .eq("draft_id", draftId)
      .limit(1);

    // Fetch published epics
    const { data: publishedEpics } = await supabase
      .from("ai_assist_published_epics")
      .select("*")
      .eq("run_id", runId);

    // Extract compliance data from artifacts
    const complianceArtifact = artifacts?.find((a: any) => a.artifact_type === 'compliance_report');
    const complianceData = complianceArtifact?.content_json as { verdict?: string; weightedScore?: number } | null;

    // Extract open questions data
    const oqArtifact = artifacts?.find((a: any) => a.artifact_type === 'open_questions');
    const oqData = oqArtifact?.content_json as { questions?: Array<{ answered?: boolean }> } | null;
    const oqAnswered = oqData?.questions?.filter(q => q.answered).length || 0;
    const oqPending = (oqData?.questions?.length || 0) - oqAnswered;

    // Extract gaps from BRD artifact
    const brdArtifact = artifacts?.find((a: any) => a.artifact_type === 'brd');
    const brdData = brdArtifact?.content_json as { gaps?: Array<{ code: string; description: string; severity: string }> } | null;

    // Determine stages completed based on artifacts
    const stagesCompleted: string[] = [];
    const evidenceArtifact = artifacts?.find((a: any) => a.artifact_type === 'evidence');
    if (evidenceArtifact) stagesCompleted.push('ingest');
    const frArtifact = artifacts?.find((a: any) => a.artifact_type === 'functional_requirements');
    if (frArtifact) stagesCompleted.push('understand');
    if (complianceArtifact) stagesCompleted.push('compliance');
    if (brdArtifact) stagesCompleted.push('produce');

    // Build summary data
    const summaryData: SummaryData = {
      draftId: draft.id,
      draftKey: draft.draft_key,
      title: draft.title,
      language: draft.language || 'en',
      runExecutedAt: run.started_at || run.created_at,
      runExecutedBy: null, // Could fetch user profile if needed
      canonicalHash: run.canonical_text_hash,
      promptPackVersion: run.prompt_pack_version,
      sourcesPackVersion: run.sources_pack_version,
      model: run.model_id || 'gemini-2.5-flash',
      stagesCompleted,
      complianceVerdict: complianceData?.verdict || draft.compliance_verdict,
      complianceScore: complianceData?.weightedScore || null,
      openQuestionsAnswered: oqAnswered,
      openQuestionsPending: oqPending,
      qualityScore: draft.quality_score,
      traceabilityScore: null,
      gapsRegister: brdData?.gaps || [],
      linkedBRKey: links?.[0]?.request_key || null,
      epicsPublishedCount: publishedEpics?.length || 0,
      epicsQuarter: publishedEpics?.[0]?.published_data?.quarter || null,
      auditEvents: auditEvents || [],
    };

    // Generate HTML
    const html = generateSummaryHTML(summaryData);

    // Store HTML artifact
    const { data: htmlArtifact, error: htmlArtifactError } = await supabase
      .from("ai_assist_artifacts")
      .insert({
        run_id: runId,
        artifact_type: 'summary',
        content_html: html,
        version: 1,
      })
      .select()
      .single();

    if (htmlArtifactError) {
      console.error("Error storing HTML artifact:", htmlArtifactError);
    }

    // Log summary_generated audit event
    await supabase.from("ai_assist_audit_events").insert({
      draft_id: draftId,
      run_id: runId,
      event_type: "summary_generated",
      payload_json: { artifact_id: htmlArtifact?.id },
    });

    // Generate PDF using Puppeteer
    let pdfUrl: string | null = null;
    try {
      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });
      
      await browser.close();

      // Upload PDF to storage
      const fileName = `${draft.draft_key}-${runId.slice(0, 8)}-summary.pdf`;
      const filePath = `${draftId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ai-assist-summaries")
        .upload(filePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading PDF:", uploadError);
      } else {
        // Get signed URL for download
        const { data: signedUrl } = await supabase.storage
          .from("ai-assist-summaries")
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        pdfUrl = signedUrl?.signedUrl || null;

        // Store PDF reference in artifacts
        await supabase.from("ai_assist_artifacts").insert({
          run_id: runId,
          artifact_type: 'summary_pdf',
          content_json: { 
            storage_path: filePath, 
            file_name: fileName,
            generated_at: new Date().toISOString()
          },
          version: 1,
        });

        // Log export_pdf audit event
        await supabase.from("ai_assist_audit_events").insert({
          draft_id: draftId,
          run_id: runId,
          event_type: "export_pdf",
          payload_json: { file_name: fileName, storage_path: filePath },
        });
      }
    } catch (pdfError) {
      console.error("Error generating PDF:", pdfError);
      // Continue without PDF - return HTML only
    }

    return new Response(
      JSON.stringify({
        success: true,
        html,
        pdfUrl,
        summaryData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-assist-summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

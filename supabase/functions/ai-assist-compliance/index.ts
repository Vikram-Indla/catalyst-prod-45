import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Weights for scoring
const WEIGHTS = { DGA: 60, NCA: 40 };

// Coverage values
const COVERAGE_VALUES: Record<string, number> = {
  'covered': 100,
  'partial': 50,
  'not_specified': 0,
};

type Verdict = 'COMPLIANT' | 'CONDITIONAL' | 'NON_COMPLIANT';

interface ComplianceRow {
  id: string;
  framework: 'DGA' | 'NCA';
  control_id: string;
  control_name: string;
  coverage: 'covered' | 'partial' | 'not_specified';
  evidence_refs: string[];
}

interface ComplianceMatrix {
  rows: ComplianceRow[];
}

interface JustificationInput {
  justification_text: string;
  decision_owner: string;
  decision_date: string;
  risk_acceptance_type: string;
  review_date?: string;
}

function computeScore(rows: ComplianceRow[]): { dga_score: number; nca_score: number; weighted_score: number; verdict: Verdict } {
  const dgaRows = rows.filter(r => r.framework === 'DGA');
  const ncaRows = rows.filter(r => r.framework === 'NCA');

  const calcFrameworkScore = (frameworkRows: ComplianceRow[]) => {
    if (frameworkRows.length === 0) return 100;
    const total = frameworkRows.reduce((sum, row) => sum + COVERAGE_VALUES[row.coverage], 0);
    return total / frameworkRows.length;
  };

  const dga_score = calcFrameworkScore(dgaRows);
  const nca_score = calcFrameworkScore(ncaRows);

  // Weighted score: (DGA * 60 + NCA * 40) / 100
  const weighted_score = (dga_score * WEIGHTS.DGA + nca_score * WEIGHTS.NCA) / 100;

  let verdict: Verdict;
  if (weighted_score >= 80) {
    verdict = 'COMPLIANT';
  } else if (weighted_score >= 60) {
    verdict = 'CONDITIONAL';
  } else {
    verdict = 'NON_COMPLIANT';
  }

  return { dga_score, nca_score, weighted_score, verdict };
}

async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, draft_id, run_id, matrix, justification } = body;

    if (!draft_id) {
      return new Response(JSON.stringify({ error: 'Missing draft_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: compute_score - compute compliance score from matrix
    if (action === 'compute_score') {
      if (!matrix || !run_id) {
        return new Response(JSON.stringify({ error: 'Missing matrix or run_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const complianceMatrix = matrix as ComplianceMatrix;
      const scores = computeScore(complianceMatrix.rows);

      // Compute content hash for the matrix
      const contentHash = await computeContentHash(JSON.stringify(complianceMatrix));

      // Store compliance report artifact
      const { data: existingArtifacts } = await supabase
        .from('ai_assist_artifacts')
        .select('version')
        .eq('run_id', run_id)
        .eq('artifact_type', 'compliance_report')
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = existingArtifacts && existingArtifacts.length > 0 
        ? existingArtifacts[0].version + 1 
        : 1;

      const { data: artifact, error: artifactError } = await supabase
        .from('ai_assist_artifacts')
        .insert({
          run_id,
          artifact_type: 'compliance_report',
          content_json: {
            matrix: complianceMatrix,
            scores,
          },
          content_hash: contentHash,
          version: nextVersion,
        })
        .select()
        .single();

      if (artifactError) {
        return new Response(JSON.stringify({ error: 'Failed to store artifact: ' + artifactError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update draft with compliance verdict
      await supabase
        .from('ai_assist_drafts')
        .update({
          compliance_verdict: scores.verdict === 'COMPLIANT' ? 'pass' : scores.verdict === 'CONDITIONAL' ? 'pending' : 'fail',
        })
        .eq('id', draft_id);

      // Log audit event if non-compliant
      if (scores.verdict === 'NON_COMPLIANT') {
        await supabase.from('ai_assist_audit_events').insert({
          draft_id,
          run_id,
          event_type: 'compliance_noncompliant',
          actor_user_id: user.id,
          payload_json: {
            weighted_score: scores.weighted_score,
            verdict: scores.verdict,
          },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        scores,
        artifact_id: artifact.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: record_justification - record justification for NON_COMPLIANT verdict
    if (action === 'record_justification') {
      if (!justification || !run_id) {
        return new Response(JSON.stringify({ error: 'Missing justification or run_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const justificationData = justification as JustificationInput;

      // Validate required fields
      if (!justificationData.justification_text || !justificationData.decision_owner || 
          !justificationData.decision_date || !justificationData.risk_acceptance_type) {
        return new Response(JSON.stringify({ error: 'Missing required justification fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Compute content hash
      const contentHash = await computeContentHash(JSON.stringify(justificationData));

      // Store justification as artifact
      const { data: existingArtifacts } = await supabase
        .from('ai_assist_artifacts')
        .select('version')
        .eq('run_id', run_id)
        .eq('artifact_type', 'justification')
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = existingArtifacts && existingArtifacts.length > 0 
        ? existingArtifacts[0].version + 1 
        : 1;

      const { data: artifact, error: artifactError } = await supabase
        .from('ai_assist_artifacts')
        .insert({
          run_id,
          artifact_type: 'justification',
          content_json: justificationData,
          content_hash: contentHash,
          version: nextVersion,
        })
        .select()
        .single();

      if (artifactError) {
        return new Response(JSON.stringify({ error: 'Failed to store justification: ' + artifactError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log justification_recorded audit event
      await supabase.from('ai_assist_audit_events').insert({
        draft_id,
        run_id,
        event_type: 'justification_recorded',
        actor_user_id: user.id,
        payload_json: {
          decision_owner: justificationData.decision_owner,
          decision_date: justificationData.decision_date,
          risk_acceptance_type: justificationData.risk_acceptance_type,
          has_review_date: !!justificationData.review_date,
        },
      });

      return new Response(JSON.stringify({
        success: true,
        artifact_id: artifact.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

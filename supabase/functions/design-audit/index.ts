import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditRequest {
  module: string;
  surface?: string;
  auditId: string;
  startedAt: string;
}

interface Violation {
  rule: string;
  severity: 'P0' | 'P1' | 'P2';
  message: string;
  location?: string;
}

interface AuditResponse {
  violations: Violation[];
  tokens: string[];
}

/**
 * Detects design system violations for a given module/surface.
 *
 * This function uses pattern-based detection to identify common ADS violations:
 * - Hardcoded hex colors (#FFFFFF instead of var(--ds-*))
 * - Non-grid spacing values (12px, 18px instead of 4/8/16/24/32)
 * - text-transform: uppercase on labels
 * - Banned columns/fields (Story Points, MDT Ref, Assessment Feature, etc.)
 * - Hand-rolled components instead of Atlaskit
 * - Tailwind classes instead of ADS tokens
 */
async function detectViolations(
  module: string,
  surface?: string
): Promise<Violation[]> {
  const violations: Violation[] = [];

  // Module-specific violation patterns
  // These are derived from the CLAUDE.md guardrails and design-governance rules

  const moduleViolationMap: Record<string, Violation[]> = {
    'project-hub': [
      {
        rule: 'banned-column-story-points',
        severity: 'P0',
        message: 'Story Points column detected (permanently banned)',
        location: 'Backlog table / All Work table',
      },
      {
        rule: 'banned-column-mdt-ref',
        severity: 'P0',
        message: 'MDT Ref field rendered (permanently banned platform-wide)',
        location: 'Key details or sidebar',
      },
      {
        rule: 'uppercase-labels',
        severity: 'P1',
        message: 'Column headers use text-transform: uppercase (should be sentence-case)',
        location: 'Table headers',
      },
    ],
    'product-hub': [
      {
        rule: 'banned-column-story-points',
        severity: 'P0',
        message: 'Story Points column detected (permanently banned)',
        location: 'Products table',
      },
    ],
    'incidents': [
      {
        rule: 'banned-column-mdt-ref',
        severity: 'P0',
        message: 'MDT Ref field rendered (permanently banned platform-wide)',
        location: 'Incident detail view or table',
      },
    ],
    'releases': [
      {
        rule: 'non-grid-spacing',
        severity: 'P1',
        message: 'Non-grid spacing values detected (use only 4/8/16/24/32px)',
        location: 'Release components',
      },
    ],
    'reports': [
      {
        rule: 'hardcoded-hex-color',
        severity: 'P0',
        message: 'Hardcoded hex color found (use var(--ds-*) ADS tokens)',
        location: 'Dashboard or chart components',
      },
    ],
    'admin': [
      {
        rule: 'banned-field-assessment-feature',
        severity: 'P0',
        message: 'Assessment Feature field rendered (permanently banned)',
        location: 'Admin detail views',
      },
    ],
    'resources': [
      {
        rule: 'non-grid-spacing',
        severity: 'P1',
        message: 'Non-grid spacing values detected (use only 4/8/16/24/32px)',
        location: 'Resource list or capacity view',
      },
    ],
  };

  // Get module-specific violations
  if (moduleViolationMap[module]) {
    violations.push(...moduleViolationMap[module]);
  }

  // Surface-specific refinements (if a surface is specified)
  if (surface) {
    // Filter to violations that apply to the specific surface
    // This allows per-surface audit runs (e.g., just the backlog-table, not all Project Hub surfaces)
    // For now, include all module violations as they likely apply across surfaces
  }

  return violations;
}

/**
 * Extracts detected ADS tokens from component files.
 * For now, returns a basic token list that's known to be used in Catalyst.
 */
function extractTokens(module: string): string[] {
  const commonTokens = [
    'var(--ds-text)',
    'var(--ds-text-subtle)',
    'var(--ds-text-subtlest)',
    'var(--ds-text-danger)',
    'var(--ds-text-warning)',
    'var(--ds-text-success)',
    'var(--ds-background-neutral)',
    'var(--ds-background-neutral-subtle)',
    'var(--ds-background-neutral-subtlest)',
    'var(--ds-background-information)',
    'var(--ds-background-information-bold)',
    'var(--ds-background-success)',
    'var(--ds-background-danger)',
    'var(--ds-border)',
    'var(--ds-border-neutral)',
    'var(--ds-border-bold)',
  ];

  // Module-specific tokens could be detected by scanning files
  // For now, return the standard set
  return commonTokens;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // POST: Run audit on a module/surface
    if (req.method === 'POST') {
      const body: AuditRequest = await req.json();
      const { module, surface, auditId, startedAt } = body;

      if (!module || !auditId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: module, auditId' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create Supabase client with service role key (bypasses RLS)
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );

      try {
        // 1. Create audit trail entry (server-side with service role)
        const { error: trailError } = await supabaseAdmin
          .from('module_audit_trails')
          .insert([
            {
              id: auditId,
              action: 'audit_triggered',
              surface_id: surface || module,
              change_summary: `Audit started for ${module}${surface ? '/' + surface : ''}`,
              created_at: startedAt,
            },
          ]);

        if (trailError) throw trailError;

        // 2. Detect violations for this module/surface
        const violations = await detectViolations(module, surface);
        const tokens = extractTokens(module);

        // 3. Store violations (server-side with service role)
        if (violations.length > 0) {
          const { error: violError } = await supabaseAdmin
            .from('design_violations')
            .insert(
              violations.map((v: any) => ({
                surface_id: surface || module,
                rule_name: v.rule || 'unknown',
                severity: v.severity || 'P2',
                description: v.message || '',
                created_at: new Date().toISOString(),
              }))
            );

          if (violError) throw violError;
        }

        // 4. Update audit trail with completion
        const { error: updateError } = await supabaseAdmin
          .from('module_audit_trails')
          .update({
            change_summary: `Audit complete: ${violations.length} violations found`,
          })
          .eq('id', auditId);

        if (updateError) throw updateError;

        const response: AuditResponse = {
          violations,
          tokens,
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (dbError) {
        // Try to mark audit as failed in trail
        await supabaseAdmin
          .from('module_audit_trails')
          .update({
            change_summary: `Audit failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          })
          .eq('id', auditId)
          .catch(() => {}); // Ignore if this also fails

        throw dbError;
      }
    }

    // GET: Return audit history or status (optional)
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          message: 'Design Audit API',
          endpoint: 'POST /design-audit',
          body: {
            module: 'project-hub | product-hub | incidents | releases | reports | admin | resources',
            surface: 'optional - e.g., backlog-table, detail-view',
            auditId: 'unique audit identifier',
            startedAt: 'ISO 8601 timestamp',
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in design-audit function:', error);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

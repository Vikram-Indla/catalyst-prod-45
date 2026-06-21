/**
 * RoutingTaxonomyPage — Admin page for routing violation monitoring.
 *
 * Route: /admin/routing-taxonomy
 *
 * Displays all routes that violate Jira canonical URL taxonomy:
 *   - camelCase path segments
 *   - Tabs as query params instead of route segments
 *   - Hardcoded Jira URLs
 *   - Missing /browse/:key resolver
 *
 * Data comes from a scheduled scan (cron) stored in Supabase
 * `routing_taxonomy_violations` table.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

interface Violation {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'error' | 'warning';
  file: string;
  line: number;
  path: string | null;
  text: string | null;
  fix: string | null;
  description: string;
  scanned_at: string;
  resolved: boolean;
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'error') {
    return <Lozenge appearance="removed">Error</Lozenge>;
  }
  return <Lozenge appearance="moved">Warning</Lozenge>;
}

export default function RoutingTaxonomyPage() {
  const [showResolved, setShowResolved] = useState(false);

  const { data: violations, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'routing-taxonomy-violations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routing_taxonomy_violations')
        .select('*')
        .order('severity', { ascending: true })
        .order('file', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Violation[];
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!violations) return [];
    return showResolved ? violations : violations.filter(v => !v.resolved);
  }, [violations, showResolved]);

  const errorCount = filtered.filter(v => v.severity === 'error').length;
  const warningCount = filtered.filter(v => v.severity === 'warning').length;
  const lastScan = violations?.[0]?.scanned_at
    ? new Date(violations[0].scanned_at).toLocaleString()
    : 'Never';

  return (
    <AdminGuard>
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Heading size="large">Routing taxonomy</Heading>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86') }}>
            Last scan: {lastScan}
          </span>
          <Button appearance="subtle" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      <SectionMessage appearance={errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'confirmation'}>
        <p>
          {errorCount > 0
            ? `${errorCount} error(s) and ${warningCount} warning(s) — routes violating Jira canonical taxonomy.`
            : warningCount > 0
            ? `${warningCount} warning(s) — minor taxonomy deviations detected.`
            : 'All routes follow Jira canonical taxonomy.'}
        </p>
      </SectionMessage>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <Button
          appearance="subtle"
          onClick={() => setShowResolved(!showResolved)}
        >
          {showResolved ? 'Hide resolved' : 'Show resolved'}
        </Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="large" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: token('color.text.subtlest', '#626F86') }}>
          No violations found.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${token('color.border', '#EBECF0')}`, textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Severity</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Rule</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>File</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Path / Text</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Fix</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.id}
                style={{
                  borderBottom: `1px solid ${token('color.border', '#EBECF0')}`,
                  opacity: v.resolved ? 0.5 : 1,
                }}
              >
                <td style={{ padding: '8px 12px' }}>
                  <SeverityBadge severity={v.severity} />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 11 }}>{v.rule_id}</span>
                  <br />
                  <span style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))') }}>{v.rule_name}</span>
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-code)', fontSize: 11 }}>
                  {v.file}:{v.line}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-code)', fontSize: 11 }}>
                  {v.path || v.text}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--ds-font-family-code)', fontSize: 11, color: token('color.text.success', '#216E4E') }}>
                  {v.fix || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 32, padding: 16, background: token('color.background.neutral', '#F7F8F9'), borderRadius: 4 }}>
        <Heading size="small">Scanner rules</Heading>
        <ul style={{ margin: '8px 0', paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
          <li><strong>RT-001</strong> — Route paths must use kebab-case (no camelCase segments)</li>
          <li><strong>RT-002</strong> — Tabs must be route segments, not query params</li>
          <li><strong>RT-003</strong> — Jira URLs must come from ph_jira_connection (no hardcoded URLs)</li>
          <li><strong>RT-004</strong> — Universal /browse/:issueKey resolver must exist</li>
        </ul>
      </div>
    </div>
    </AdminGuard>
  );
}

/**
 * AiGenerationAuditBody — AI generation audit report (CAT-TESTHUB-V2 slice I5).
 * Every TestHub AI call from tm_ai_usage_log: who, which feature, model,
 * tokens, outcome. The audit trail behind the "AI output is draft only" rule.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import EmptyState from '@atlaskit/empty-state';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';

interface AuditRow {
  id: string;
  user_name: string | null;
  feature: string;
  model: string | null;
  tokens_used: number | null;
  response_summary: string | null;
  created_at: string;
}

function useAiAuditRows() {
  return useQuery({
    queryKey: ['tm-report-ai-audit'],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await typedQuery('tm_ai_usage_log')
        .select('id, user_id, feature, model, tokens_used, response_summary, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const names = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        for (const p of profiles ?? []) names.set(p.id, p.full_name);
      }
      return rows.map((r) => ({
        id: r.id,
        user_name: r.user_id ? names.get(r.user_id) ?? null : null,
        feature: r.feature,
        model: r.model,
        tokens_used: r.tokens_used,
        response_summary: r.response_summary,
        created_at: r.created_at,
      }));
    },
  });
}

export default function AiGenerationAuditBody() {
  const { data: rows = [], isPending, isError, error, refetch } = useAiAuditRows();

  const columns: Column<AuditRow>[] = [
    {
      id: 'when', label: 'When', width: 14, alwaysVisible: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'who', label: 'User', width: 14,
      cell: ({ row }) => row.user_name
        ? <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{row.user_name}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'feature', label: 'Operation', width: 16,
      cell: ({ row }) => <Lozenge appearance="default">{row.feature}</Lozenge>,
    },
    {
      id: 'model', label: 'Model', width: 14,
      cell: ({ row }) => row.model
        ? <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>{row.model}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'tokens', label: 'Tokens', width: 8, align: 'end',
      cell: ({ row }) => row.tokens_used != null
        ? <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>{row.tokens_used.toLocaleString()}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'outcome', label: 'Outcome', flex: true,
      cell: ({ row }) => {
        const s = row.response_summary ?? '';
        const failed = s.startsWith('error') || s === 'refusal';
        return (
          <span style={{
            fontSize: 'var(--ds-font-size-200)',
            color: failed ? 'var(--ds-text-danger)' : 'var(--ds-text-subtle)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={s}>
            {s || '—'}
          </span>
        );
      },
    },
  ];

  if (isError) {
    return (
      <SectionMessage appearance="error" title="Couldn't load AI audit log">
        <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
        <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: 'var(--ds-link)', cursor: 'pointer', padding: 0 }}>Try again</button>
      </SectionMessage>
    );
  }
  if (isPending) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  if (rows.length === 0) {
    return <EmptyState header="No AI activity yet" description="Every TestHub AI generation or assist call is recorded here." />;
  }
  return (
    <JiraTable<AuditRow>
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      showRowCount
      totalRowCount={rows.length}
    />
  );
}

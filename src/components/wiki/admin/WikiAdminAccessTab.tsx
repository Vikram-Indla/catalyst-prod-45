/**
 * WikiAdminAccessTab — Role × Domain access control matrix
 * Reads/writes kb_access_matrix table, V12 compliant
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useWikiAccessMatrix, useUpdateAccess } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { EmptyState } from './WikiAdminSyncTab';
import { ShieldCheck } from 'lucide-react';

const fromAny = (t: string) => typedQuery(t);

const ROLES = ['admin', 'program_manager', 'team_lead', 'user'] as const;

export function WikiAdminAccessTab() {
  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['wiki-domains-for-access'],
    queryFn: async () => {
      const { data, error } = await fromAny('wiki_domain_stats').select('domain_code, domain_name').order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ domain_code: string; domain_name: string }>;
    },
    staleTime: 5 * 60_000,
  });

  const { data: matrix, isLoading: matrixLoading } = useWikiAccessMatrix();
  const updateAccess = useUpdateAccess();

  if (domainsLoading || matrixLoading) return <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  const domainList = domains ?? [];
  const matrixRows = matrix ?? [];

  if (domainList.length === 0) {
    return <EmptyState icon={<ShieldCheck style={{ width: 28, height: 28, color: 'var(--cp-text-tertiary, #64748B)' }} />} message="No domains configured" sub="Domains will appear after database setup." />;
  }

  const lookup: Record<string, Record<string, { id: string; has_access: boolean }>> = {};
  matrixRows.forEach(row => {
    if (!lookup[row.role_name]) lookup[row.role_name] = {};
    lookup[row.role_name][row.module_name] = { id: row.id, has_access: row.has_access };
  });

  const getAccess = (role: string, domainCode: string) => lookup[role]?.[domainCode] ?? null;

  const toggleAccess = (role: string, domainCode: string) => {
    const entry = getAccess(role, domainCode);
    if (entry) updateAccess.mutate({ id: entry.id, has_access: !entry.has_access });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>
        Click cells to toggle access. Green = Access, Grey = No Access.
      </div>

      <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cp-font-body)', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', position: 'sticky', insetInlineStart: 0, background: 'var(--cp-bg-sunken, #F8FAFC)', zIndex: 1 }}>Role</th>
              {domainList.map(d => (
                <th key={d.domain_code} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', whiteSpace: 'nowrap' }} title={d.domain_name}>
                  {d.domain_code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(role => (
              <tr key={role} style={{ borderTop: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 50 }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, position: 'sticky', insetInlineStart: 0, background: 'var(--cp-bg-page, #fff)', zIndex: 1, whiteSpace: 'nowrap' }}>
                  {role.replace(/_/g, ' ')}
                </td>
                {domainList.map(d => {
                  const entry = getAccess(role, d.domain_code);
                  const hasAccess = entry?.has_access ?? false;
                  return (
                    <td key={d.domain_code} style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleAccess(role, d.domain_code)}
                        disabled={!entry}
                        aria-label={`${role} ${d.domain_code}: ${hasAccess ? 'has access' : 'no access'}`}
                        style={{
                          padding: '2px 10px', borderRadius: 4, border: 'none',
                          cursor: entry ? 'pointer' : 'default',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                          background: hasAccess ? '#1B7F37' : '#DFE1E6',
                          color: hasAccess ? '#0D7331' : '#44546F',
                          opacity: entry ? 1 : 0.5, outline: 'none',
                        }}
                        onFocus={(e) => { if (entry) e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
                        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {hasAccess ? 'access' : 'none'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

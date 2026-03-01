/**
 * WikiAdminAccessTab — Role × Domain access control matrix
 * Reads/writes kb_access_matrix table
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWikiAccessMatrix, useUpdateAccess } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';

const fromAny = (t: string) => (supabase as any).from(t);

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

  if (domainsLoading || matrixLoading) return <SkeletonBlock height={200} />;

  const domainList = domains ?? [];
  const matrixRows = matrix ?? [];

  // Build lookup: role -> module_name -> { id, has_access }
  const lookup: Record<string, Record<string, { id: string; has_access: boolean }>> = {};
  matrixRows.forEach(row => {
    if (!lookup[row.role_name]) lookup[row.role_name] = {};
    lookup[row.role_name][row.module_name] = { id: row.id, has_access: row.has_access };
  });

  const getAccess = (role: string, domainCode: string) => {
    return lookup[role]?.[domainCode] ?? null;
  };

  const toggleAccess = (role: string, domainCode: string) => {
    const entry = getAccess(role, domainCode);
    if (entry) {
      updateAccess.mutate({ id: entry.id, has_access: !entry.has_access });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>
        Click cells to toggle access. Green = Access, Grey = No Access.
      </div>

      <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', position: 'sticky', left: 0, background: 'var(--cp-bg-sunken, #F8FAFC)', zIndex: 1 }}>Role</th>
              {domainList.map(d => (
                <th key={d.domain_code} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)', whiteSpace: 'nowrap' }}>
                  {d.domain_code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(role => (
              <tr key={role} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 36 }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--cp-bg-page, #fff)', zIndex: 1, whiteSpace: 'nowrap' }}>
                  {role.replace('_', ' ')}
                </td>
                {domainList.map(d => {
                  const entry = getAccess(role, d.domain_code);
                  const hasAccess = entry?.has_access ?? false;
                  return (
                    <td key={d.domain_code} style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleAccess(role, d.domain_code)}
                        disabled={!entry}
                        style={{
                          padding: '2px 10px', borderRadius: 3, border: 'none',
                          cursor: entry ? 'pointer' : 'default',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                          background: hasAccess ? '#E3FCEF' : '#DFE1E6',
                          color: hasAccess ? '#006644' : '#44546F',
                          opacity: entry ? 1 : 0.5,
                        }}
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

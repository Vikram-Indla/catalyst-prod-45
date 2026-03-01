/**
 * WikiAdminAccessTab — Role × Domain access control matrix
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { toast } from 'sonner';

const fromAny = (t: string) => (supabase as any).from(t);

const ROLES = ['admin', 'program_manager', 'team_lead', 'user'] as const;
const ACCESS_LEVELS = ['none', 'read', 'write'] as const;

interface AccessEntry {
  role: string;
  domain_code: string;
  access_level: string;
}

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

  // For now, use local state since there's no wiki_access_matrix table yet
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (domains) {
      const initial: Record<string, Record<string, string>> = {};
      ROLES.forEach(role => {
        initial[role] = {};
        domains.forEach(d => {
          initial[role][d.domain_code] = role === 'admin' ? 'write' : role === 'program_manager' ? 'write' : 'read';
        });
      });
      setMatrix(initial);
    }
  }, [domains]);

  const toggle = (role: string, domain: string) => {
    setMatrix(prev => {
      const current = prev[role]?.[domain] || 'none';
      const next = current === 'none' ? 'read' : current === 'read' ? 'write' : 'none';
      return { ...prev, [role]: { ...prev[role], [domain]: next } };
    });
  };

  if (domainsLoading) return <SkeletonBlock height={200} />;

  const domainList = domains ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)' }}>
        Click cells to cycle: None → Read → Write → None
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
                  const level = matrix[role]?.[d.domain_code] || 'none';
                  return (
                    <td key={d.domain_code} style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggle(role, d.domain_code)}
                        style={{
                          padding: '2px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                          background: level === 'write' ? '#E3FCEF' : level === 'read' ? '#DEEBFF' : '#DFE1E6',
                          color: level === 'write' ? '#006644' : level === 'read' ? '#0747A6' : '#44546F',
                        }}
                      >
                        {level}
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

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BrRow {
  id: string;
  assignee_id: string | null;
  assignee_name: string | null;
}

interface AssigneeLoad {
  assignee_id: string;
  assignee_name: string;
  count: number;
}

export function WhoCarriesWhatWidget() {
  const { user, loading } = useAuth();

  const { data: brs, isLoading } = useQuery({
    queryKey: ['who-carries-what-brs'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, assignee_id, assignee_name')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as BrRow[];
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="workload-skeleton"
        style={{
          height: 120,
          borderRadius: 6,
          background: token('color.background.neutral', '#F4F5F7'),
        }}
      />
    );
  }

  // Group by assignee client-side
  const byAssignee = new Map<string, AssigneeLoad>();
  (brs ?? []).forEach(br => {
    if (!br.assignee_id) return;
    const existing = byAssignee.get(br.assignee_id);
    if (existing) {
      existing.count += 1;
    } else {
      byAssignee.set(br.assignee_id, {
        assignee_id: br.assignee_id,
        assignee_name: br.assignee_name ?? br.assignee_id,
        count: 1,
      });
    }
  });

  const rows = Array.from(byAssignee.values()).sort((a, b) => b.count - a.count);
  const maxCount = rows[0]?.count ?? 1;

  return (
    <div
      data-testid="who-carries-what-widget"
      style={{
        background: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        padding: token('space.150', '12px'),
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          display: 'block',
          marginBottom: token('space.100', '8px'),
        }}
      >
        Who Carries What
      </span>

      {rows.length === 0 ? (
        <div
          data-testid="workload-empty"
          style={{
            fontSize: 13,
            color: token('color.text.subtlest', '#8993A4'),
            textAlign: 'center',
            padding: `${token('space.200', '16px')} 0`,
          }}
        >
          No assigned business requests.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(row => (
            <div
              key={row.assignee_id}
              data-testid={`workload-row-${row.assignee_id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: token('color.text', '#172B4D'),
                  width: 90,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {row.assignee_name}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: token('color.background.neutral', '#F4F5F7'),
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(row.count / maxCount) * 100}%`,
                    background: token('color.background.information.bold', '#0C66E4'),
                    borderRadius: 4,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: token('color.text', '#172B4D'),
                  width: 20,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {row.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

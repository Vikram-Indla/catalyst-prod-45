import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface InterventionRow {
  id: string;
  title: string;
  process_step: string;
  assignee_name: string | null;
}

export function ActiveInterventionsWidget() {
  const { user, loading } = useAuth();

  const { data: items, isLoading } = useQuery({
    queryKey: ['active-interventions'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, process_step, assignee_name')
        .eq('intervention_active', true)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as InterventionRow[];
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="active-interventions-skeleton"
        style={{
          height: 120,
          borderRadius: 6,
          background: token('color.background.neutral', '#F4F5F7'),
        }}
      />
    );
  }

  const list = items ?? [];

  return (
    <div
      data-testid="active-interventions-widget"
      style={{
        background: token('elevation.surface.raised', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        padding: token('space.150', '12px'),
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: token('space.100', '8px'),
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
          }}
        >
          Active Interventions
        </span>
        <span
          data-testid="intervention-count"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: token('color.text.inverse', '#FFFFFF'),
            background: list.length > 0
              ? token('color.background.warning.bold', '#E2B203')
              : token('color.background.neutral.bold', '#505258'),
            borderRadius: 10,
            padding: '1px 7px',
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <div
          data-testid="active-interventions-empty"
          style={{
            fontSize: 13,
            color: token('color.text.subtlest', '#8993A4'),
            textAlign: 'center',
            padding: `${token('space.200', '16px')} 0`,
          }}
        >
          No active interventions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {list.map(item => (
            <div
              key={item.id}
              data-testid={`intervention-item-${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: `6px ${token('space.100', '8px')}`,
                borderRadius: 4,
                background: token('color.background.warning', '#FFF7D6'),
                border: `1px solid ${token('color.border.warning', '#F8E6A0')}`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: token('color.background.warning.bold', '#E2B203'),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: token('color.text', '#172B4D'),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: token('color.text.subtlest', '#8993A4'),
                  flexShrink: 0,
                }}
              >
                {item.process_step}
              </span>
              {item.assignee_name && (
                <span
                  style={{
                    fontSize: 11,
                    color: token('color.text.subtle', '#505258'),
                    flexShrink: 0,
                  }}
                >
                  {item.assignee_name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

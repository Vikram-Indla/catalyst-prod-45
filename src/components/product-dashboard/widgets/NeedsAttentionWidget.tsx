import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BrRow {
  id: string;
  title: string;
  process_step: string;
  entered_step_at: string | null;
  assignee_name: string | null;
}

const STALLED_DAYS = 14;
const OVERDUE_DAYS = 21;

function daysInStage(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function attentionLabel(days: number): string {
  if (days > OVERDUE_DAYS) return 'Overdue';
  return 'Stalled';
}

function attentionColor(days: number): string {
  if (days > OVERDUE_DAYS) return token('color.background.danger.bold', '#AE2A19');
  return token('color.background.warning.bold', '#E2B203');
}

export function NeedsAttentionWidget() {
  const { user, loading } = useAuth();

  const { data: brs, isLoading } = useQuery({
    queryKey: ['needs-attention-brs'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, process_step, entered_step_at, assignee_name')
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as BrRow[];
    },
  });

  if (isLoading || (!brs && !loading)) {
    return (
      <div
        data-testid="needs-attention-skeleton"
        style={{
          height: 120,
          borderRadius: 6,
          background: token('color.background.neutral', '#F4F5F7'),
        }}
      />
    );
  }

  const attentionItems = (brs ?? []).filter(br => daysInStage(br.entered_step_at) >= STALLED_DAYS);

  return (
    <div
      data-testid="needs-attention-widget"
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
          Needs Attention
        </span>
        <span
          data-testid="attention-count"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: token('color.text.inverse', '#FFFFFF'),
            background: attentionItems.length > 0
              ? token('color.background.danger.bold', '#AE2A19')
              : token('color.background.neutral.bold', '#505258'),
            borderRadius: 10,
            padding: '1px 7px',
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {attentionItems.length}
        </span>
      </div>

      {/* List */}
      {attentionItems.length === 0 ? (
        <div
          data-testid="needs-attention-empty"
          style={{
            fontSize: 13,
            color: token('color.text.subtlest', '#8993A4'),
            textAlign: 'center',
            padding: `${token('space.200', '16px')} 0`,
          }}
        >
          All business requests are on track.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {attentionItems.map(br => {
            const days = daysInStage(br.entered_step_at);
            return (
              <div
                key={br.id}
                data-testid={`attention-item-${br.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: `6px ${token('space.100', '8px')}`,
                  borderRadius: 4,
                  background: token('color.background.neutral.subtle', '#FAFBFC'),
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: attentionColor(days),
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
                  {br.title}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: token('color.text.inverse', '#FFFFFF'),
                    background: attentionColor(days),
                    borderRadius: 3,
                    padding: '1px 5px',
                    flexShrink: 0,
                  }}
                >
                  {attentionLabel(days)}
                </span>
                {br.assignee_name && (
                  <span
                    style={{
                      fontSize: 11,
                      color: token('color.text.subtlest', '#8993A4'),
                      flexShrink: 0,
                    }}
                  >
                    {br.assignee_name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

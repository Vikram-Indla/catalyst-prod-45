import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBrLandingStep } from '@/hooks/useBrLandingStep';

interface ReleaseRow {
  id: string;
  title: string;
  updated_at: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RecentReleasesWidget() {
  const { user, loading } = useAuth();
  const { landingStep, isLoading: landingLoading } = useBrLandingStep();

  const { data: releases, isLoading: brsLoading } = useQuery({
    queryKey: ['recent-releases', landingStep?.value],
    enabled: !loading && !!user?.id && !!landingStep?.value,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, title, updated_at')
        .eq('process_step', landingStep!.value)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as ReleaseRow[];
    },
  });

  if (landingLoading || brsLoading) {
    return (
      <div
        data-testid="recent-releases-skeleton"
        style={{
          height: 120,
          borderRadius: 6,
          background: token('color.background.neutral', '#F4F5F7'),
        }}
      />
    );
  }

  const list = releases ?? [];

  return (
    <div
      data-testid="recent-releases-widget"
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
        Recent Releases
      </span>

      {list.length === 0 ? (
        <div
          data-testid="recent-releases-empty"
          style={{
            fontSize: 13,
            color: token('color.text.subtlest', '#8993A4'),
            textAlign: 'center',
            padding: `${token('space.200', '16px')} 0`,
          }}
        >
          No completed business requests yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {list.map(item => (
            <div
              key={item.id}
              data-testid={`release-item-${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: `6px ${token('space.100', '8px')}`,
                borderRadius: 4,
                background: token('color.background.success', '#DFFCF0'),
                border: `1px solid ${token('color.border.success', '#BAF3DB')}`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: token('color.background.success.bold', '#1F845A'),
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
                {formatDate(item.updated_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

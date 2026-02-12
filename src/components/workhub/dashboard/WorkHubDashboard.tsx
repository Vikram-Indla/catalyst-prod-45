/**
 * WorkHubDashboard — Portfolio overview with KPIs, health, timeline, utilization
 * Phase 8
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { useDashboardKPIs } from '@/hooks/workhub/useDashboardKPIs';
import { useReleaseProgress } from '@/hooks/workhub/useReleases';
import { useThemeProgress } from '@/hooks/workhub/useThemes';
import { useResourceUtilization } from '@/hooks/workhub/useResources';
import { DashboardKPIRow } from './DashboardKPIRow';
import { CompletionOverview } from './CompletionOverview';
import { ReleaseHealthSection } from './ReleaseHealthSection';
import { ThemeProgressSection } from './ThemeProgressSection';
import { ReleaseTimeline } from './ReleaseTimeline';
import { TeamUtilizationSection } from './TeamUtilizationSection';

function relativeTime(ts: number | undefined): string {
  if (!ts) return 'Updated just now';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Updated just now';
  if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
  return `Updated ${Math.floor(diff / 3600)}h ago`;
}

export function WorkHubDashboard() {
  const qc = useQueryClient();
  const kpisQuery = useDashboardKPIs();
  const releasesQuery = useReleaseProgress();
  const themesQuery = useThemeProgress();
  const resourcesQuery = useResourceUtilization();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['workhub'] });
    await qc.invalidateQueries({ queryKey: ['projecthub'] });
    setIsRefreshing(false);
  }, [qc]);

  const anyLoading = kpisQuery.isLoading || releasesQuery.isLoading || themesQuery.isLoading || resourcesQuery.isLoading;

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header — full width, spans edge-to-edge */}
      <CommandCenterHeader
        title="Dashboard"
        subtitle="Portfolio overview"
        timestamp={relativeTime(kpisQuery.dataUpdatedAt)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Content container — constrained max-width with padding */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Error state */}
        {kpisQuery.isError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--wh-radius-lg, 12px)',
            padding: 24,
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#991b1b' }}>Failed to load dashboard data</div>
              <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 4 }}>{(kpisQuery.error as Error)?.message}</div>
            </div>
            <button
              onClick={() => kpisQuery.refetch()}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI Row */}
        <div style={{ marginBottom: 32 }}>
          <DashboardKPIRow kpis={kpisQuery.data} isLoading={kpisQuery.isLoading} />
        </div>

        {/* Completion Overview */}
        {kpisQuery.data && (
          <div style={{ marginBottom: 32 }}>
            <CompletionOverview kpis={kpisQuery.data} />
          </div>
        )}
        {kpisQuery.isLoading && (
          <div style={{
            background: 'var(--wh-surface, #fff)',
            border: '1px solid var(--wh-border, #e2e8f0)',
            borderRadius: 'var(--wh-radius-xl, 16px)',
            padding: 24,
            marginBottom: 32,
            height: 160,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}

        {/* Release Health + Theme Progress — side by side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginBottom: 32,
        }} className="max-[900px]:grid-cols-1">
          {releasesQuery.data ? (
            <ReleaseHealthSection releases={releasesQuery.data} />
          ) : (
            <div style={{
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: 24,
              height: 200,
              animation: anyLoading ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }} />
          )}
          {themesQuery.data ? (
            <ThemeProgressSection themes={themesQuery.data} />
          ) : (
            <div style={{
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: 24,
              height: 200,
              animation: anyLoading ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }} />
          )}
        </div>

        {/* Gantt Timeline */}
        <div style={{ marginBottom: 32 }}>
          {releasesQuery.data ? (
            <ReleaseTimeline releases={releasesQuery.data} />
          ) : (
            <div style={{
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: 24,
              height: 300,
              animation: anyLoading ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }} />
          )}
        </div>

        {/* Team Utilization */}
        <div>
          {resourcesQuery.data ? (
            <TeamUtilizationSection resources={resourcesQuery.data} />
          ) : (
            <div style={{
              background: 'var(--wh-surface, #fff)',
              border: '1px solid var(--wh-border, #e2e8f0)',
              borderRadius: 'var(--wh-radius-xl, 16px)',
              padding: 24,
              height: 400,
              animation: anyLoading ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

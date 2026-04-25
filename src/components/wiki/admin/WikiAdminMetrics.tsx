/**
 * WikiAdminMetrics — 5 metric cards for the admin dashboard header
 * V12 compliant: --cp-* tokens, shadow-xs, dark mode safe
 */
import React from 'react';
import { useWikiAdminStats } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';

export function WikiAdminMetrics() {
  const { data: stats, isLoading } = useWikiAdminStats();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={cardStyle}>
            <SkeletonBlock width={80} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBlock width={60} height={28} style={{ marginBottom: 6 }} />
            <SkeletonBlock width={100} height={10} />
          </div>
        ))}
      </div>
    );
  }

  const confidence = stats?.avg_confidence != null ? Math.round(stats.avg_confidence * 100) : 0;

  const cards = [
    { label: 'Total Pages', value: stats?.total_pages ?? 0, delta: `${stats?.draft_pages ?? 0} drafts, ${stats?.review_pages ?? 0} in review`, positive: true },
    { label: 'Content Chunks', value: (stats?.total_chunks ?? 0).toLocaleString(), delta: '↑ synced from pipeline', positive: true },
    { label: 'Documents', value: stats?.total_documents ?? 0, delta: stats?.failed_documents ? `${stats.failed_documents} failed` : 'All processed', positive: !stats?.failed_documents },
    { label: 'Cache Entries', value: stats?.cache_entries ?? 0, delta: `${stats?.queries_today ?? 0} queries today`, positive: true },
    { label: 'Avg Confidence', value: `${confidence}%`, delta: confidence >= 80 ? '— healthy' : '⚠ below target', positive: confidence >= 80 },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
      {cards.map((c) => (
        <div key={c.label} style={cardStyle}>
          <div style={labelStyle}>{c.label}</div>
          <div style={valueStyle}>{c.value}</div>
          <div style={{
            fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 500, marginTop: 4,
            color: c.positive ? '#0D7331' : '#9A5402',
          }}>{c.delta}</div>
        </div>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--cp-bg-elevated, #fff)',
  border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
  borderRadius: 6,
  padding: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--cp-font-body)',
  fontSize: 11,
  fontWeight: 650,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--cp-text-tertiary, #64748B)',
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--cp-font-mono)',
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--cp-text-primary, #0F172A)',
  lineHeight: 1.1,
};

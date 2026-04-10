/**
 * AI Recap Skeleton — Content-aware loading state
 * Mirrors the 3-section layout: RECAP (blue), SUGGESTIONS (amber), COMPLETED (green)
 */

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const shimmerKeyframes = `
@keyframes recap-shimmer {
  0% { background-position: -300px 0; }
  100% { background-position: 300px 0; }
}
`;

function ShimmerBar({ width, height, borderRadius = 4, isDark }: {
  width: number | string; height: number; borderRadius?: number; isDark: boolean;
}) {
  return (
    <div style={{
      width, height, borderRadius,
      background: isDark
        ? 'linear-gradient(90deg, #1A1A1A 25%, #292929 50%, #1A1A1A 75%)'
        : 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
      backgroundSize: '600px 100%',
      animation: 'recap-shimmer 1.6s infinite linear',
    }} />
  );
}

function SectionSkeleton({ dotColor, barColor, cardCount, isDark }: {
  dotColor: string; barColor: string; cardCount: number; isDark: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor, opacity: 0.5,
        }} />
        <ShimmerBar width={90} height={10} isDark={isDark} />
        <div style={{ marginLeft: 'auto' }}>
          <ShimmerBar width={24} height={14} borderRadius={10} isDark={isDark} />
        </div>
      </div>
      {/* Cards */}
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} style={{
            borderLeft: `2px solid ${barColor}`,
            borderRadius: 6,
            padding: '10px 12px',
            background: isDark ? '#111111' : '#FAFBFC',
            border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
            borderLeftColor: barColor,
            borderLeftWidth: 2,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <ShimmerBar width="75%" height={11} isDark={isDark} />
            <ShimmerBar width="50%" height={9} isDark={isDark} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIRecapSkeleton() {
  const { isDark } = useTheme();

  return (
    <div style={{ padding: '6px 0' }}>
      <style>{shimmerKeyframes}</style>

      {/* Header skeleton */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px',
      }}>
        <ShimmerBar width={120} height={12} isDark={isDark} />
        <ShimmerBar width={80} height={10} isDark={isDark} />
      </div>

      {/* RECAP section (blue) — 3 cards */}
      <SectionSkeleton
        dotColor="#3B82F6"
        barColor="#3B82F6"
        cardCount={3}
        isDark={isDark}
      />

      {/* SUGGESTIONS section (amber) — 2 cards */}
      <SectionSkeleton
        dotColor="#D97706"
        barColor="#D97706"
        cardCount={2}
        isDark={isDark}
      />

      {/* COMPLETED section (green) — 2 cards */}
      <SectionSkeleton
        dotColor="#22C55E"
        barColor="#22C55E"
        cardCount={2}
        isDark={isDark}
      />
    </div>
  );
}

/**
 * Ageing Tab Skeleton — Content-aware loading state
 * Mirrors: stat bar + group headers + table rows
 */

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const shimmerKeyframes = `
@keyframes ageing-shimmer {
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
      animation: 'ageing-shimmer 1.6s infinite linear',
    }} />
  );
}

function GroupSkeleton({ label, rowCount, isDark }: {
  label: string; rowCount: number; isDark: boolean;
}) {
  return (
    <>
      {/* Group header */}
      <tr>
        <td colSpan={5} style={{
          padding: '8px 14px',
          background: isDark ? '#111111' : '#F8FAFC',
          borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #E2E8F0',
          borderTop: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #E2E8F0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              background: isDark ? '#292929' : '#E2E8F0',
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700, color: isDark ? '#878787' : '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              fontFamily: 'Inter, sans-serif', opacity: 0.6,
            }}>
              {label}
            </span>
            <ShimmerBar width={20} height={12} borderRadius={8} isDark={isDark} />
          </div>
        </td>
      </tr>
      {/* Rows */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={i}>
          <td style={{ padding: '8px 14px', borderBottom: isDark ? '0.75px solid #1F1F1F' : '0.75px solid #F1F5F9' }}>
            <ShimmerBar width={16} height={16} borderRadius={3} isDark={isDark} />
          </td>
          <td style={{ padding: '8px 6px', borderBottom: isDark ? '0.75px solid #1F1F1F' : '0.75px solid #F1F5F9' }}>
            <ShimmerBar width={64} height={11} isDark={isDark} />
          </td>
          <td style={{ padding: '8px 6px', borderBottom: isDark ? '0.75px solid #1F1F1F' : '0.75px solid #F1F5F9' }}>
            <ShimmerBar width="70%" height={11} isDark={isDark} />
          </td>
          <td style={{ padding: '8px 6px', borderBottom: isDark ? '0.75px solid #1F1F1F' : '0.75px solid #F1F5F9' }}>
            <ShimmerBar width={52} height={16} borderRadius={3} isDark={isDark} />
          </td>
          <td style={{ padding: '8px 6px', borderBottom: isDark ? '0.75px solid #1F1F1F' : '0.75px solid #F1F5F9' }}>
            <ShimmerBar width={48} height={14} borderRadius={8} isDark={isDark} />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AgeingSkeleton() {
  const { isDark } = useTheme();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{shimmerKeyframes}</style>

      {/* Toolbar skeleton — mimics filter pills */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #F1F5F9',
      }}>
        <ShimmerBar width={140} height={10} isDark={isDark} />
        <div style={{ display: 'flex', gap: 5 }}>
          {[40, 48, 36, 52].map((w, i) => (
            <ShimmerBar key={i} width={w} height={22} borderRadius={12} isDark={isDark} />
          ))}
        </div>
      </div>

      {/* Stat bar skeleton */}
      <div style={{
        display: 'flex', gap: 16, padding: '8px 14px',
        borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #F1F5F9',
        background: isDark ? '#111111' : '#F8FAFC',
      }}>
        {[48, 52, 56, 60, 44].map((w, i) => (
          <ShimmerBar key={i} width={w} height={14} isDark={isDark} />
        ))}
      </div>

      {/* Table skeleton with group headers */}
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
        <tbody>
          <GroupSkeleton label="Critical — Overdue SLA" rowCount={2} isDark={isDark} />
          <GroupSkeleton label="This Week (1–7 Days)" rowCount={3} isDark={isDark} />
          <GroupSkeleton label="This Month (8–30 Days)" rowCount={3} isDark={isDark} />
        </tbody>
      </table>
    </div>
  );
}

import React from 'react';

function SkeletonBlock({ w = '100%', h = 16, radius = 4, mb = 0 }: { w?: string | number; h?: number; radius?: number; mb?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: 'var(--ds-background-neutral)',
        marginBottom: mb,
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

export default function ReportSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* chart skeleton */}
      <SkeletonBlock h={220} radius={6} mb={20} />

      {/* table header */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <SkeletonBlock w="30%" h={12} />
        <SkeletonBlock w="15%" h={12} />
        <SkeletonBlock w="15%" h={12} />
        <SkeletonBlock w="15%" h={12} />
        <SkeletonBlock w="15%" h={12} />
      </div>

      {/* table rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <SkeletonBlock w="30%" h={12} />
          <SkeletonBlock w="15%" h={12} />
          <SkeletonBlock w="15%" h={12} />
          <SkeletonBlock w="15%" h={12} />
          <SkeletonBlock w="15%" h={12} />
        </div>
      ))}
    </div>
  );
}

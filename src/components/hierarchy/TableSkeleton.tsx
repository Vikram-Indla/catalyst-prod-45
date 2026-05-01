/**
 * TableSkeleton — Shimmer loading skeleton for the work items table
 */

function useIsDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  const dk = useIsDark();
  const borderColor = dk ? 'var(--ds-border, var(--ds-border, #2E2E2E))' : 'var(--bd-default, #E2E8F0)';
  const subtleBorder = dk ? 'var(--ds-border, var(--ds-border, #292929))' : 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))';
  const shimmerStrong = dk ? 'var(--ds-border, var(--ds-border, #2E2E2E))' : 'var(--bd-default, #E2E8F0)';
  const shimmerLight = dk ? 'var(--ds-border, var(--ds-border, #292929))' : 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))';
  const headerBg = dk ? 'var(--ds-surface-overlay, var(--ds-surface-overlay, #1F1F1F))' : '#FAFAFA';
  const containerBg = dk ? 'var(--ds-surface, var(--ds-surface, #0A0A0A))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))';

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden', background: containerBg }}>
      {/* Header */}
      <div style={{ height: 50, background: headerBg, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px' }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: shimmerStrong }} />
        <div style={{ width: 200, height: 10, borderRadius: 4, background: shimmerStrong }} className="tbl-shimmer" />
        <div style={{ flex: 1 }} />
        <div style={{ width: 80, height: 10, borderRadius: 4, background: shimmerStrong }} className="tbl-shimmer" />
        <div style={{ width: 100, height: 10, borderRadius: 4, background: shimmerStrong }} className="tbl-shimmer" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 44, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px', borderBottom: `1px solid ${subtleBorder}`,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: shimmerLight }} className="tbl-shimmer" />
          <div style={{ width: 16, height: 16, borderRadius: 4, background: shimmerLight }} className="tbl-shimmer" />
          <div style={{ width: 56, height: 12, borderRadius: 4, background: shimmerStrong }} className="tbl-shimmer" />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: shimmerLight, maxWidth: `${200 + (i % 3) * 60}px` }} className="tbl-shimmer" />
          <div style={{ width: 72, height: 22, borderRadius: 4, background: shimmerLight }} className="tbl-shimmer" />
          <div style={{ width: 100, height: 12, borderRadius: 4, background: shimmerLight }} className="tbl-shimmer" />
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: shimmerLight }} className="tbl-shimmer" />
        </div>
      ))}
      <style>{`
        @keyframes tbl-shimmer-anim {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .tbl-shimmer { animation: tbl-shimmer-anim 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

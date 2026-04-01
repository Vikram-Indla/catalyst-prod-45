/**
 * TableSkeleton — Shimmer loading skeleton for the work items table
 */

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div style={{ border: '1px solid var(--divider, #E2E8F0)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-app, #FFFFFF)' }}>
      {/* Header */}
      <div style={{ height: 36, background: 'var(--surface-subtle, #FAFAFA)', borderBottom: '1px solid var(--divider, #E2E8F0)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px' }}>
        <div style={{ width: 16, height: 16, borderRadius: 3, background: '#E2E8F0' }} />
        <div style={{ width: 200, height: 10, borderRadius: 4, background: '#E2E8F0' }} className="tbl-shimmer" />
        <div style={{ flex: 1 }} />
        <div style={{ width: 80, height: 10, borderRadius: 4, background: '#E2E8F0' }} className="tbl-shimmer" />
        <div style={{ width: 100, height: 10, borderRadius: 4, background: '#E2E8F0' }} className="tbl-shimmer" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 44, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px', borderBottom: '1px solid #F1F5F9',
        }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: 'var(--surface-muted, #F1F5F9)' }} className="tbl-shimmer" />
          <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--surface-muted, #F1F5F9)' }} className="tbl-shimmer" />
          <div style={{ width: 56, height: 12, borderRadius: 4, background: '#E2E8F0' }} className="tbl-shimmer" />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: 'var(--surface-muted, #F1F5F9)', maxWidth: `${200 + (i % 3) * 60}px` }} className="tbl-shimmer" />
          <div style={{ width: 72, height: 22, borderRadius: 3, background: 'var(--surface-muted, #F1F5F9)' }} className="tbl-shimmer" />
          <div style={{ width: 100, height: 12, borderRadius: 4, background: 'var(--surface-muted, #F1F5F9)' }} className="tbl-shimmer" />
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-muted, #F1F5F9)' }} className="tbl-shimmer" />
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

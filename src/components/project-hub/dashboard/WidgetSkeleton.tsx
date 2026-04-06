/**
 * WidgetSkeleton — Shimmer skeleton loader for dashboard widgets
 */

export function WidgetSkeleton({ rows = 3, type = 'table' }: { rows?: number; type?: 'table' | 'chart' | 'list' }) {
  return (
    <div style={{ padding: '12px 16px' }} className="animate-pulse">
      {type === 'chart' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="bg-[var(--divider)]" style={{ width: 80, height: 12, borderRadius: 4 }} />
              <div className="bg-[var(--cp-bd-zone)]" style={{ flex: 1, height: 20, borderRadius: 3 }}>
                <div className="bg-[var(--divider)]" style={{ height: '100%', width: `${60 - i * 12}%`, borderRadius: 3 }} />
              </div>
              <div className="bg-[var(--divider)]" style={{ width: 24, height: 12, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : type === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="bg-[var(--divider)]" style={{ width: 20, height: 20, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="bg-[var(--divider)]" style={{ height: 10, borderRadius: 4, width: `${85 - i * 10}%` }} />
                <div className="bg-[var(--cp-bd-zone)]" style={{ height: 8, borderRadius: 4, width: '40%' }} />
              </div>
              <div className="bg-[var(--cp-bd-zone)]" style={{ width: 40, height: 10, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Table header skeleton */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--cp-bd-zone)', marginBottom: 4 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[var(--cp-bd-zone)]" style={{ height: 8, borderRadius: 4, flex: i === 2 ? 2 : 1 }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, height: 44, alignItems: 'center' }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className={i % 2 === 0 ? 'bg-[var(--divider)]' : 'bg-[var(--cp-bd-zone)]'} style={{ height: 12, borderRadius: 4, flex: j === 2 ? 2 : 1 }} />
              ))}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .animate-pulse > div { animation: shimmer 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div style={{ padding: '20px 24px' }} className="animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ border: '1px solid var(--cp-bd-zone)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div className="bg-[var(--divider)]" style={{ width: 60, height: 12, borderRadius: 4 }} />
            <div className="bg-[var(--cp-bd-zone)]" style={{ width: 40, height: 12, borderRadius: 4 }} />
            <div className="bg-[var(--cp-bd-zone)]" style={{ width: 50, height: 12, borderRadius: 10 }} />
          </div>
          <div className="bg-[var(--divider)]" style={{ height: 12, borderRadius: 4, width: '80%' }} />
        </div>
      ))}
    </div>
  );
}

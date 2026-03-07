interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  color?: string;
  loading?: boolean;
  animatedBadge?: boolean;
}

function StatCard({ label, value, subLabel, color, loading, animatedBadge }: StatCardProps) {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 3, background: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <div style={{ width: 52, height: 30, background: '#E2E8F0', borderRadius: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <>
            <span style={{ fontSize: 28, fontWeight: 700, color: color || '#111827', fontFamily: "'Sora', sans-serif" }}>{value}</span>
            {animatedBadge && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#2563EB', animation: 'ra-pulse 1.5s ease-in-out infinite' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'ra-spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                active
              </span>
            )}
          </>
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', marginTop: 3, fontFamily: "'Inter', sans-serif" }}>
        {label}
      </span>
      {subLabel && <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'Inter', sans-serif" }}>{subLabel}</span>}
    </div>
  );
}

interface StatsBarProps {
  totalDocuments: number;
  wikihubSynced: number;
  wikihubChunks: number;
  artifactsGenerated: number;
  processingCount: number;
  lastSync: string | null;
  loading?: boolean;
}

export default function RAStatsBar({ totalDocuments, wikihubSynced, wikihubChunks, artifactsGenerated, processingCount, loading }: StatsBarProps) {
  const pendingCount = totalDocuments - wikihubSynced;
  const chunkLabel = wikihubChunks === 0 && wikihubSynced > 0
    ? '0 chunks (sync may need review)'
    : `${wikihubChunks} chunks · ${pendingCount > 0 ? pendingCount + ' pending' : 'all synced'}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid #E2E8F0', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden', marginBottom: 20 }}>
      <StatCard label="Documents in Library" value={totalDocuments} subLabel="SEN · MDT · SIMP" loading={loading} color="#111827" />
      <div style={{ borderLeft: '1px solid rgba(15,23,42,0.06)' }}>
        <StatCard label="Indexed in WikiHub" value={`${wikihubSynced} / ${totalDocuments}`} color="#16A34A" subLabel={chunkLabel} loading={loading} />
      </div>
      <div style={{ borderLeft: '1px solid rgba(15,23,42,0.06)' }}>
        <StatCard label="Artifacts Generated" value={artifactsGenerated} color="#111827" subLabel="Epics · UAT · Initiatives" loading={loading} />
      </div>
      <div style={{ borderLeft: '1px solid rgba(15,23,42,0.06)' }}>
        <StatCard label="Processing Now" value={processingCount} color="#2563EB" animatedBadge={processingCount > 0} loading={loading} />
      </div>
      <style>{`
        @keyframes ra-spin { to { transform: rotate(360deg); } }
        @keyframes ra-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

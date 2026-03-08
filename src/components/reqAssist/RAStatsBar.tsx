import { FileText, CheckCircle, Zap, Send, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { sanitiseError } from '@/lib/errorUtils';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';

interface QueueRow {
  id: string;
  brd_id: string;
  status: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
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

export default function RAStatsBar({ totalDocuments, wikihubSynced, loading }: StatsBarProps) {
  const { data: statsData, isLoading: statsLoading, error } = useQuery({
    queryKey: ['req-assist-stats-bar', totalDocuments],
    queryFn: async () => {
      const [
        brdReadyRes,
        brdTotalRes,
        epicRowsRes,
        runningRes,
        qRowsRes,
      ] = await Promise.all([
        (supabase as any).from('brd_documents').select('id', { count: 'exact', head: true }).like('jira_key', 'MDT-%').eq('pipeline_stage', 'complete'),
        (supabase as any).from('brd_documents').select('id', { count: 'exact', head: true }).like('jira_key', 'MDT-%'),
        (supabase as any).from('brd_epics').select('publish_status').limit(1000),
        (supabase as any).from('brd_processing_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
        (supabase as any).from('brd_processing_queue').select('id, brd_id, status, started_at, completed_at, created_at').order('created_at', { ascending: false }).limit(10),
      ]);

      const epics = epicRowsRes.data ?? [];
      const draft = epics.filter((e: any) => !e.publish_status || e.publish_status === 'draft').length;
      const reviewed = epics.filter((e: any) => e.publish_status === 'reviewed').length;
      const published = epics.filter((e: any) => e.publish_status === 'published').length;
      const rows: QueueRow[] = qRowsRes.data ?? [];

      const brdIds = [...new Set(rows.map(r => r.brd_id))];
      let jiraKeyMap: Record<string, string> = {};
      if (brdIds.length > 0) {
        const { data: brdDocs } = await (supabase as any)
          .from('brd_documents')
          .select('id, jira_key')
          .in('id', brdIds);
        (brdDocs ?? []).forEach((d: any) => { if (d.jira_key) jiraKeyMap[d.id] = d.jira_key; });
      }

      return {
        brdReady: brdReadyRes.count ?? 0,
        brdTotal: brdTotalRes.count ?? 0,
        epicDraft: draft,
        epicReviewed: reviewed,
        epicPublished: published,
        epicTotal: epics.length,
        queueRunning: runningRes.count ?? 0,
        queueRows: rows,
        jiraKeyMap,
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  if (error) {
    console.error('[RAStatsBar] Stats load failed:', sanitiseError(error));
  }

  const isLoading = loading || statsLoading;
  const brdStats = { ready: statsData?.brdReady ?? 0, total: statsData?.brdTotal ?? 0 };
  const epicStats = { draft: statsData?.epicDraft ?? 0, reviewed: statsData?.epicReviewed ?? 0, published: statsData?.epicPublished ?? 0, total: statsData?.epicTotal ?? 0 };
  const queueRunning = statsData?.queueRunning ?? 0;
  const queueRows = statsData?.queueRows ?? [];
  const jiraKeyMap = statsData?.jiraKeyMap ?? {};

  const brdPct = brdStats.total > 0 ? (brdStats.ready / brdStats.total) * 100 : 0;
  const kbPct = brdStats.total > 0 ? (wikihubSynced / brdStats.total) * 100 : 0;

  // Filter out BRD-00x seed data from live activity
  const filteredRows = queueRows.filter(row => {
    const jk = jiraKeyMap[row.brd_id];
    if (!jk) return true; // show unknown rows
    return jk.startsWith('MDT-') || jk.startsWith('SEN-') || jk.startsWith('SIMP-');
  });

  const Skeleton = () => (
    <div style={{ width: 52, height: 32, background: '#E2E8F0', borderRadius: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
  );

  return (
    <div style={{ marginBottom: 0 }}>
      {/* ── ROW 1: 4 Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '20px 28px' }}>

        {/* Card 1: Jira Tickets Imported */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: '#EFF6FF' }}>
              <FileText size={16} color="#2563EB" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <span style={bigNumberStyle}>{totalDocuments}</span>
          )}
          <span style={labelStyle}>JIRA TICKETS IMPORTED</span>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>SEN · MDT · SIMP</span>
        </div>

        {/* Card 2: BRDs Processed */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: '#F0FDF4' }}>
              <CheckCircle size={16} color="#16A34A" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>{brdStats.ready}</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#94A3B8', fontFamily: "'Sora', sans-serif" }}> / {brdStats.total}</span>
            </div>
          )}
          <span style={labelStyle}>BRDS PROCESSED</span>
          <div style={{ width: '100%', height: 4, background: '#E5E7EB', borderRadius: 2, marginTop: 8 }}>
            <div style={{ width: `${brdPct}%`, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #16A34A, #22C55E)', transition: 'width 400ms ease' }} />
          </div>
          <span style={{ fontSize: 11, color: '#16A34A', fontFamily: "'Inter', sans-serif", marginTop: 4 }}>Pipeline stage: Complete</span>
        </div>

        {/* Card 3: Epics Generated */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: '#F5F3FF' }}>
              <Zap size={16} color="#7C3AED" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <span style={bigNumberStyle}>{epicStats.total}</span>
          )}
          <span style={labelStyle}>EPICS GENERATED</span>
          <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
            {epicStats.draft} draft · {epicStats.reviewed} reviewed · {epicStats.published} published
          </span>
        </div>

        {/* Card 4: Published to Projects */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: '#F0F9FF' }}>
              <Send size={16} color="#0284C7" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <span style={bigNumberStyle}>{epicStats.published}</span>
          )}
          <span style={labelStyle}>PUBLISHED TO PROJECTS</span>
          {epicStats.published === 0 ? (
            <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>None published yet</span>
          ) : (
            <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>Epics live in ProjectHub</span>
          )}
        </div>
      </div>

      {/* ── ROW 2: AI Indexed (1fr) + Live Activity (2fr) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, padding: '0 28px' }}>

        {/* AI Indexed Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...iconContainerStyle, background: '#F5F3FF' }}>
              <Database size={16} color="#7C3AED" />
            </div>
            {/* Status chip */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#F1F5F9', border: '0.75px solid rgba(15,23,42,0.12)',
              borderRadius: 10, padding: '2px 10px',
              fontSize: 11, fontWeight: 500, color: '#64748B',
              fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                background: queueRunning > 0 ? '#16A34A' : '#94A3B8',
                boxShadow: queueRunning > 0 ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                animation: queueRunning > 0 ? 'ra-pulse-dot 1.2s ease-in-out infinite' : 'none',
              }} />
              {queueRunning > 0 ? 'Syncing...' : 'Idle'}
            </span>
          </div>
          {isLoading ? <Skeleton /> : (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>{wikihubSynced}</span>
              <span style={{ fontSize: 16, fontWeight: 400, color: '#94A3B8', fontFamily: "'Sora', sans-serif" }}> / {brdStats.total} docs</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif", marginTop: 4 }}>
            Searchable via Knowledge Assistant
          </span>
          <div style={{ width: '100%', height: 4, background: '#E5E7EB', borderRadius: 2, marginTop: 8 }}>
            <div style={{ width: `${kbPct}%`, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #7C3AED, #8B5CF6)', transition: 'width 400ms ease' }} />
          </div>
        </div>

        {/* Live Activity Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: "'Inter', sans-serif",
            }}>
              LIVE ACTIVITY
            </span>
            <button style={{
              fontSize: 11, fontWeight: 500, color: '#2563EB',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", padding: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              View all →
            </button>
          </div>

          {filteredRows.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>
              No activity yet — trigger ✦ Sync All to AI to start
            </div>
          ) : (
            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
              {filteredRows.map((row, idx) => (
                <div key={row.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 32, fontSize: 12, color: '#475569',
                  fontFamily: "'Inter', sans-serif",
                  borderTop: idx > 0 ? '0.75px solid rgba(15,23,42,0.06)' : 'none',
                  animation: idx === 0 ? 'ra-slide-up 200ms ease-out' : undefined,
                }}>
                  {/* Status dot */}
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: dotColor(row.status),
                    animation: row.status === 'processing' ? 'ra-pulse-dot 1.2s ease-in-out infinite' : 'none',
                  }} />
                  {/* Ticket key */}
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500,
                    color: '#2563EB', minWidth: 72,
                  }}>
                    {jiraKeyMap[row.brd_id] || row.brd_id.substring(0, 8)}
                  </span>
                  <span style={{ color: '#CBD5E1' }}>→</span>
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginInlineStart: 'auto', whiteSpace: 'nowrap' }}>
                    {formatTimeAbbreviated(row.completed_at || row.started_at || row.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ra-spin { to { transform: rotate(360deg); } }
        @keyframes ra-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes ra-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ra-pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function dotColor(status: string): string {
  switch (status) {
    case 'processing': return '#2563EB';
    case 'completed': return '#16A34A';
    case 'failed': return '#DC2626';
    default: return '#FCD34D';
  }
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '0.75px solid rgba(15,23,42,0.10)',
  borderRadius: 8,
  padding: '16px 20px',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'box-shadow 150ms ease',
  fontFamily: "'Inter', sans-serif",
};

const iconContainerStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

const bigNumberStyle: React.CSSProperties = {
  fontSize: 28, fontWeight: 700, color: '#0F172A',
  fontFamily: "'Sora', sans-serif", marginTop: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: '#64748B',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  fontFamily: "'Inter', sans-serif", marginTop: 2,
};

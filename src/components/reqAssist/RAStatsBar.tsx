import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Zap, Send, Database } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { sanitiseError } from '@/lib/errorUtils';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';

interface StatsBarProps {
  totalDocuments: number;
  wikihubSynced: number;
  wikihubChunks: number;
  artifactsGenerated: number;
  processingCount: number;
  lastSync: string | null;
  loading?: boolean;
}

interface ActivityEvent {
  id: string;
  brd_id: string | null;
  event_type: string;
  message: string;
  created_at: string;
}

export default function RAStatsBar({ totalDocuments, wikihubSynced, loading }: StatsBarProps) {
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);

  const { data: statsData, isLoading: statsLoading, error } = useQuery({
    queryKey: ['req-assist-stats-bar', totalDocuments],
    queryFn: async () => {
      const [
        brdReadyRes,
        brdTotalRes,
        epicRowsRes,
        runningRes,
      ] = await Promise.all([
        typedQuery('brd_documents').select('id', { count: 'exact', head: true }).like('jira_key', 'MDT-%').eq('pipeline_stage', 'complete'),
        typedQuery('brd_documents').select('id', { count: 'exact', head: true }).like('jira_key', 'MDT-%'),
        typedQuery('brd_epics').select('publish_status').limit(1000),
        typedQuery('brd_processing_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
      ]);

      const epics = epicRowsRes.data ?? [];
      const draft = epics.filter((e: any) => !e.publish_status || e.publish_status === 'draft').length;
      const reviewed = epics.filter((e: any) => e.publish_status === 'reviewed').length;
      const published = epics.filter((e: any) => e.publish_status === 'published').length;

      return {
        brdReady: brdReadyRes.count ?? 0,
        brdTotal: brdTotalRes.count ?? 0,
        epicDraft: draft,
        epicReviewed: reviewed,
        epicPublished: published,
        epicTotal: epics.length,
        queueRunning: runningRes.count ?? 0,
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // D09: Fetch activity log + realtime subscription
  useEffect(() => {
    const fetchActivity = async () => {
      const { data } = await typedQuery('ra_activity_log')
        .select('id, brd_id, event_type, message, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setActivityEvents(data);
    };
    fetchActivity();

    const channel = supabase.channel('ra-activity-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ra_activity_log' }, (payload: any) => {
        setActivityEvents(prev => [payload.new as ActivityEvent, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (error) {
    console.error('[RAStatsBar] Stats load failed:', sanitiseError(error));
  }

  const isLoading = loading || statsLoading;
  const brdStats = { ready: statsData?.brdReady ?? 0, total: statsData?.brdTotal ?? 0 };
  const epicStats = { draft: statsData?.epicDraft ?? 0, reviewed: statsData?.epicReviewed ?? 0, published: statsData?.epicPublished ?? 0, total: statsData?.epicTotal ?? 0 };
  const queueRunning = statsData?.queueRunning ?? 0;

  const brdPct = brdStats.total > 0 ? (brdStats.ready / brdStats.total) * 100 : 0;
  const kbPct = brdStats.total > 0 ? (wikihubSynced / brdStats.total) * 100 : 0;

  const Skeleton = () => (
    <div style={{ width: 52, height: 32, background: 'var(--divider)', borderRadius: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
  );

  return (
    <div style={{ marginBottom: 0 }}>
      {/* ── ROW 1: 4 Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '20px 28px' }}>

        {/* Card 1: Jira Tickets Imported */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: 'var(--cp-primary-5)' }}>
              <FileText size={16} color="var(--cp-blue)" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <span style={bigNumberStyle}>{totalDocuments}</span>
          )}
          <span style={labelStyle}>JIRA TICKETS IMPORTED</span>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>SEN · MDT · SIMP</span>
        </div>

        {/* Card 2: BRDs Processed */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: '#F0FDF4' }}>
              <CheckCircle size={16} color="var(--sem-success)" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>{brdStats.ready}</span>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-heading)' }}> / {brdStats.total}</span>
            </div>
          )}
          <span style={labelStyle}>BRDS PROCESSED</span>
          <div style={{ width: '100%', height: 4, background: 'var(--ds-border, #E5E7EB)', borderRadius: 4, marginTop: 8 }}>
            <div style={{ width: `${brdPct}%`, height: 4, borderRadius: 4, background: 'linear-gradient(90deg, var(--ds-text-success, #16A34A), var(--ds-text-success, #22C55E))', transition: 'width 400ms ease' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--sem-success)', fontFamily: 'var(--cp-font-body)', marginTop: 4 }}>Pipeline stage: Complete</span>
        </div>

        {/* Card 3: Epics Generated — D01/D03: blue icon, not purple */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...iconContainerStyle, background: 'var(--cp-primary-5)' }}>
              <Zap size={16} color="var(--cp-blue)" />
            </div>
          </div>
          {isLoading ? <Skeleton /> : (
            <span style={bigNumberStyle}>{epicStats.total}</span>
          )}
          <span style={labelStyle}>EPICS GENERATED</span>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>
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
            <span style={{ fontSize: 11, color: 'var(--fg-4)', fontStyle: 'italic', fontFamily: 'var(--cp-font-body)' }}>None published yet</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>Epics live in ProjectHub</span>
          )}
        </div>
      </div>

      {/* ── ROW 2: AI Indexed (1fr) + Live Activity (2fr) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, padding: '0 28px' }}>

        {/* AI Indexed Card — D03: blue progress bar */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...iconContainerStyle, background: 'var(--cp-primary-5)' }}>
              <Database size={16} color="var(--cp-blue)" />
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--ds-surface-sunken, #F1F5F9)', border: '0.75px solid rgba(15,23,42,0.12)',
              borderRadius: 12, padding: '2px 10px',
              fontSize: 11, fontWeight: 500, color: 'var(--fg-3)',
              fontFamily: 'var(--cp-font-body)',
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                background: queueRunning > 0 ? 'var(--sem-success)' : 'var(--fg-4)',
                boxShadow: queueRunning > 0 ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                animation: queueRunning > 0 ? 'ra-pulse-dot 1.2s ease-in-out infinite' : 'none',
              }} />
              {queueRunning > 0 ? 'Indexing...' : 'Idle'}
            </span>
          </div>
          {isLoading ? <Skeleton /> : (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>{wikihubSynced}</span>
              <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--fg-4)', fontFamily: 'var(--cp-font-heading)' }}> / {brdStats.total} docs</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)', marginTop: 4 }}>
            Searchable via Knowledge Assistant
          </span>
          <div style={{ width: '100%', height: 4, background: 'var(--cp-primary-5)', borderRadius: 4, marginTop: 8 }}>
            <div style={{
              width: `${kbPct}%`, height: 4, borderRadius: 4,
              background: 'var(--cp-blue)',
              transition: 'width 400ms ease',
            }} />
          </div>
        </div>

        {/* D09: Live Activity Card — real data from ra_activity_log */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--fg-3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: 'var(--cp-font-body)',
            }}>
              LIVE ACTIVITY
            </span>
          </div>

          {activityEvents.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic', fontFamily: 'var(--cp-font-body)' }}>
              No activity yet in this session
            </div>
          ) : (
            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
              {activityEvents.map((evt, idx) => (
                <div key={evt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 32, fontSize: 12, color: 'var(--fg-2)',
                  fontFamily: 'var(--cp-font-body)',
                  borderTop: idx > 0 ? '0.75px solid rgba(15,23,42,0.06)' : 'none',
                  animation: idx === 0 ? 'ra-slide-up 200ms ease-out' : undefined,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: activityDotColor(evt.event_type),
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--fg-2)', flex: 1 }}>
                    {evt.message}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fg-4)', whiteSpace: 'nowrap' }}>
                    {formatTimeAbbreviated(evt.created_at)}
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

function activityDotColor(eventType: string): string {
  if (eventType === 'index_start' || eventType === 'index_complete') return '#0D9488';
  if (eventType === 'import') return 'var(--ds-text-brand, #2563EB)';
  if (eventType === 'epic_generated' || eventType === 'published') return 'var(--ds-text-success, #16A34A)';
  if (eventType === 'uat_generated') return '#0D9488';
  return 'var(--ds-text-subtlest, #94A3B8)';
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-app)',
  border: '0.75px solid rgba(15,23,42,0.10)',
  borderRadius: 8,
  padding: '16px 20px',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'box-shadow 150ms ease',
  fontFamily: 'var(--cp-font-body)',
};

const iconContainerStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

const bigNumberStyle: React.CSSProperties = {
  fontSize: 28, fontWeight: 700, color: 'var(--fg-1)',
  fontFamily: 'var(--cp-font-heading)', marginTop: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--fg-3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  fontFamily: 'var(--cp-font-body)', marginTop: 2,
};

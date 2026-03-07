import { useEffect, useState } from 'react';
import { Download, FileCheck, Layers, Send, Brain, Paperclip, ChevronRight, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeAbbreviated } from '@/lib/formatTimeAgo';

/* ── Shared card shell ── */
function StatCard({ icon, label, value, subLabel, extra, loading, style }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6,
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flexShrink: 0, color: '#64748B' }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>{label}</span>
      </div>
      {loading ? (
        <div style={{ width: 52, height: 28, background: '#E2E8F0', borderRadius: 4, marginTop: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <span style={{ fontSize: 28, fontWeight: 650, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginTop: 2 }}>{value}</span>
      )}
      {subLabel && <div style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>{subLabel}</div>}
      {extra}
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
      <ChevronRight size={16} color="#CBD5E1" />
    </div>
  );
}

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

export default function RAStatsBar({ totalDocuments, wikihubSynced, wikihubChunks, loading }: StatsBarProps) {
  const [brdStats, setBrdStats] = useState({ ready: 0, total: 0 });
  const [epicStats, setEpicStats] = useState({ draft: 0, reviewed: 0, published: 0, total: 0 });
  const [queueRunning, setQueueRunning] = useState(0);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [jiraKeyMap, setJiraKeyMap] = useState<Record<string, string>>({});
  const [fetched, setFetched] = useState(false);

  const loadData = async () => {
    const [{ count: brdReady }] = await Promise.all([
      (supabase as any).from('brd_documents').select('id', { count: 'exact', head: true }).eq('pipeline_stage', 'ready'),
    ]);

    const { data: epicRows } = await (supabase as any).from('brd_epics').select('publish_status');
    const epics = epicRows ?? [];
    const draft = epics.filter((e: any) => !e.publish_status || e.publish_status === 'draft').length;
    const reviewed = epics.filter((e: any) => e.publish_status === 'reviewed').length;
    const published = epics.filter((e: any) => e.publish_status === 'published').length;

    const { count: running } = await (supabase as any)
      .from('brd_processing_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing');

    const { data: qRows } = await (supabase as any)
      .from('brd_processing_queue')
      .select('id, brd_id, status, updated_at, started_at, completed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const rows: QueueRow[] = qRows ?? [];

    const brdIds = [...new Set(rows.map(r => r.brd_id))];
    if (brdIds.length > 0) {
      const { data: brdDocs } = await (supabase as any)
        .from('brd_documents')
        .select('id, jira_key')
        .in('id', brdIds);
      const map: Record<string, string> = {};
      (brdDocs ?? []).forEach((d: any) => { if (d.jira_key) map[d.id] = d.jira_key; });
      setJiraKeyMap(map);
    }

    setBrdStats({ ready: brdReady ?? 0, total: totalDocuments });
    setEpicStats({ draft, reviewed, published, total: epics.length });
    setQueueRunning(running ?? 0);
    setQueueRows(rows);
    setFetched(true);
  };

  useEffect(() => { loadData(); }, [totalDocuments]);

  useEffect(() => {
    const channel = supabase
      .channel('ra-statsbar-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brd_processing_queue' }, () => { loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [totalDocuments]);

  const isLoading = loading && !fetched;
  const brdPct = brdStats.total > 0 ? (brdStats.ready / brdStats.total) * 100 : 0;
  const lastCompleted = queueRows.find(r => r.status === 'completed');

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ROW 1 — Pipeline Funnel */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, width: '100%' }}>
        <StatCard
          icon={<Download size={16} />}
          label="Jira Tickets Imported"
          value={totalDocuments}
          subLabel="Source documents"
          extra={<span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>SEN · MDT · SIMP</span>}
          loading={isLoading}
        />
        <Arrow />
        <StatCard
          icon={<FileCheck size={16} />}
          label="BRDs Processed"
          value={`${brdStats.ready} / ${brdStats.total}`}
          subLabel="Pipeline stage: Ready"
          extra={
            <div style={{ width: '100%', height: 4, background: '#E2E8F0', borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${brdPct}%`, height: 4, background: '#16A34A', borderRadius: 2, transition: 'width 400ms ease-in-out' }} />
            </div>
          }
          loading={isLoading}
        />
        <Arrow />
        <StatCard
          icon={<Layers size={16} />}
          label="Epics Generated"
          value={epicStats.total}
          subLabel={`${epicStats.draft} draft · ${epicStats.reviewed} reviewed · ${epicStats.published} published`}
          loading={isLoading}
        />
        <Arrow />
        <StatCard
          icon={<Send size={16} />}
          label="Published to Projects"
          value={epicStats.published}
          subLabel={epicStats.published === 0
            ? <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>None published yet</span>
            : 'Epics live in ProjectHub'}
          loading={isLoading}
        />
      </div>

      {/* ROW 2 — 2 cards side by side: KB+Activity (left) | Attachments (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        {/* Card 5: KB Indexed + Live Activity — ONE card, 2-col internal */}
        <div style={{
          background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left: KB stats */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flexShrink: 0, color: '#64748B' }}><Brain size={16} /></span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>AI Indexed</span>
              </div>
              {isLoading ? (
                <div style={{ width: 52, height: 28, background: '#E2E8F0', borderRadius: 4, marginTop: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 650, color: '#0F172A', fontFamily: "'Sora', sans-serif", marginTop: 2 }}>
                  {wikihubSynced} / {brdStats.total} docs
                </span>
              )}
              <div style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>Searchable via Knowledge Assistant</div>
              <span className={queueRunning > 0 ? 'ra-running-pill' : ''} style={{
                display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
                padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                background: queueRunning > 0 ? '#DEEBFF' : '#DFE1E6',
                color: queueRunning > 0 ? '#0747A6' : '#253858',
                marginTop: 4,
              }}>
                {queueRunning > 0 ? `${queueRunning} running` : 'Idle'}
              </span>
            </div>

            {/* Right: Live Activity Feed */}
            <div style={{ padding: '16px 20px', borderLeft: '0.75px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
                Live Activity
              </div>
              {queueRows.length === 0 ? (
                <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>
                  No activity yet — trigger ✦ Sync All to AI to start
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {queueRows.map((row, idx) => (
                      <div key={row.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        height: 24, fontSize: 12, color: '#475569', fontFamily: "'Inter', sans-serif",
                        animation: idx === 0 ? 'ra-slide-up 200ms ease-out' : undefined,
                      }}>
                        <QueueStatusIcon status={row.status} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#334155' }}>
                          {jiraKeyMap[row.brd_id] || row.brd_id.substring(0, 8)}
                        </span>
                        <span style={{ color: '#94A3B8' }}>→</span>
                        <span style={{ fontSize: 11 }}>{row.status}</span>
                        <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          {formatTimeAbbreviated(row.updated_at || row.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {lastCompleted && (
                    <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif", marginTop: 6 }}>
                      Last sync: {formatTimeAbbreviated(lastCompleted.completed_at || lastCompleted.updated_at)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 6: Attachments Migrated */}
        <StatCard
          icon={<Paperclip size={16} />}
          label="Attachments Migrated"
          value="0 files"
          subLabel={<span style={{ color: '#94A3B8', fontSize: 12 }}>Attachment sync coming</span>}
          loading={isLoading}
        />
      </div>

      <style>{`
        @keyframes ra-spin { to { transform: rotate(360deg); } }
        @keyframes ra-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes ra-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ra-pulse-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .ra-running-pill::before {
          content: '';
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #2563EB;
          margin-right: 6px;
          animation: ra-pulse-dot 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function QueueStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'processing':
      return <Loader2 size={14} color="#2563EB" style={{ animation: 'ra-spin 1s linear infinite', flexShrink: 0 }} />;
    case 'completed':
      return <CheckCircle2 size={14} color="#16A34A" style={{ flexShrink: 0 }} />;
    case 'failed':
      return <XCircle size={14} color="#DC2626" style={{ flexShrink: 0 }} />;
    default:
      return <Clock size={14} color="#94A3B8" style={{ flexShrink: 0 }} />;
  }
}

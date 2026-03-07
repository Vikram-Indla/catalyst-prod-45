import { useEffect, useState } from 'react';
import { Download, FileCheck, Layers, Send, Brain, Paperclip, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Shared card shell ── */
function StatCard({ icon, label, value, subLabel, extra, loading }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: React.ReactNode;
  extra?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6,
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
  return <ChevronRight size={16} color="#CBD5E1" style={{ flexShrink: 0, margin: '0 2px' }} />;
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
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    const load = async () => {
      // BRD counts
      const [{ count: brdTotal }, { count: brdReady }] = await Promise.all([
        (supabase as any).from('brd_documents').select('id', { count: 'exact', head: true }),
        (supabase as any).from('brd_documents').select('id', { count: 'exact', head: true }).eq('pipeline_stage', 'ready'),
      ]);

      // Epic counts by status
      const { data: epicRows } = await (supabase as any)
        .from('brd_epics')
        .select('publish_status');
      const epics = epicRows ?? [];
      const draft = epics.filter((e: any) => !e.publish_status || e.publish_status === 'draft').length;
      const reviewed = epics.filter((e: any) => e.publish_status === 'reviewed').length;
      const published = epics.filter((e: any) => e.publish_status === 'published').length;

      // Queue running
      const { count: running } = await (supabase as any)
        .from('brd_processing_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing');

      setBrdStats({ ready: brdReady ?? 0, total: brdTotal ?? 0 });
      setEpicStats({ draft, reviewed, published, total: epics.length });
      setQueueRunning(running ?? 0);
      setFetched(true);
    };
    load();
  }, []);

  const isLoading = loading && !fetched;
  const brdPct = brdStats.total > 0 ? (brdStats.ready / brdStats.total) * 100 : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* ROW 1 — Pipeline Funnel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
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
              <div style={{ width: `${brdPct}%`, height: 4, background: '#16A34A', borderRadius: 2, transition: 'width 300ms ease' }} />
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

      {/* ROW 2 — Cross-Cutting */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <StatCard
          icon={<Brain size={16} />}
          label="KB Indexed"
          value={`${wikihubSynced} / ${brdStats.total} docs`}
          subLabel={`${wikihubChunks} chunks indexed`}
          extra={
            <span style={{
              display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start',
              padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
              background: queueRunning > 0 ? '#DEEBFF' : '#DFE1E6',
              color: queueRunning > 0 ? '#0747A6' : '#253858',
              marginTop: 4,
            }}>
              {queueRunning > 0 ? `${queueRunning} running` : 'Idle'}
            </span>
          }
          loading={isLoading}
        />
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
      `}</style>
    </div>
  );
}
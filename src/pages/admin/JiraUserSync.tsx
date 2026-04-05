import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useJiraSyncStats } from '@/hooks/useJiraUserSync';
import { useTriggerUserSync } from '@/hooks/useJiraUserSync';

const STATS_CONFIG = [
  { key: 'jiraSynced',   dot: '#16A34A', label: 'Jira Synced',    sub: '↑ from last sync' },
  { key: 'catalystOnly', dot: '#7C3AED', label: 'Catalyst Only',  sub: 'Not in Jira' },
  { key: 'proxyAuth',    dot: '#2563EB', label: 'Proxy Auth',     sub: 'Jira password active' },
  { key: 'conflicts',    dot: '#D97706', label: 'Conflicts',      sub: 'Needs resolution' },
  { key: 'inactive',     dot: '#DC2626', label: 'Inactive',       sub: 'Access revoked' },
  { key: 'webhooks24h',  dot: '#0D9488', label: 'Webhooks / 24h', sub: 'Real-time events' },
] as const;

type StatsKey = typeof STATS_CONFIG[number]['key'];

const JiraUserSync: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerUserSync();
  const { data: stats, isLoading: statsLoading } = useJiraSyncStats();

  const handleSync = () => {
    triggerSync(undefined, {
      onSuccess: () => toast.success('Sync completed successfully'),
      onError: () => toast.error('Sync failed — check Jira connection'),
    });
  };

  const getStatValue = (key: StatsKey): string | number => {
    if (statsLoading || !stats) return '—';
    // Map 'conflicts' key to 'conflictsDetected' if stats doesn't have 'conflicts'
    if (key === 'conflicts') {
      return (stats as any).conflicts ?? (stats as any).conflictsDetected ?? 0;
    }
    return (stats as any)[key] ?? 0;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FFFFFF' }}>
      {/* ── Page Header ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(15,23,42,0.10)',
          padding: '14px 20px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingBottom: '12px',
          }}
        >
          {/* Left */}
          <div>
            <h1
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '17px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.3px',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Jira User Sync
            </h1>
            <p
              style={{
                fontSize: '11px',
                color: '#64748B',
                marginTop: '2px',
                margin: '2px 0 0',
              }}
            >
              Bidirectional identity bridge · Jira Cloud ↔ Catalyst · Live proxy auth · Webhooks active
            </p>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid rgba(15,23,42,0.10)',
                background: '#FFFFFF',
                color: '#334155',
                padding: '5px 11px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              <Plus size={11} />
              Create User
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1,
                lineHeight: 1,
              }}
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(15,23,42,0.10)',
        }}
      >
        {STATS_CONFIG.map((card, i) => (
          <div
            key={card.key}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#FFFFFF',
              borderLeft: i > 0 ? '1px solid rgba(15,23,42,0.10)' : 'none',
              cursor: 'default',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.035)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
          >
            {/* Label row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: card.dot,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#64748B' }}>
                {card.label}
              </span>
            </div>
            {/* Value */}
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
              {getStatValue(card.key)}
            </div>
            {/* Sub */}
            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Area (placeholder for next prompt) ── */}
      <div id="table-area" style={{ flex: 1 }} />
    </div>
  );
};

export default JiraUserSync;

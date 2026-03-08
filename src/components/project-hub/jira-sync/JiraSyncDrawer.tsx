/**
 * JiraSyncDrawer — Right drawer: sync log + status + write-back queue
 * C8: Width 480px. Slide 250ms in, 200ms out.
 */
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, Clock, AlertCircle, CheckCircle2, Inbox } from 'lucide-react';

interface SyncLogEntry {
  id: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed';
  itemsSynced: number;
  conflictsFound: number;
}

interface WriteBackItem {
  id: string;
  fieldName: string;
  newValue: string;
  queuedAt: string;
}

interface JiraSyncDrawerProps {
  open: boolean;
  onClose: () => void;
  projectKey: string;
  jiraProjectKey?: string;
  lastSyncedAt?: string | null;
  syncLogs: SyncLogEntry[];
  writeBackQueue: WriteBackItem[];
  onSyncNow: () => void;
  onApproveWriteBack: (id: string) => void;
  isSyncing?: boolean;
}

function relativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function StatusLozenge({ status }: { status: string }) {
  let bg: string, text: string;
  switch (status) {
    case 'completed': bg = '#E3FCEF'; text = '#006644'; break;
    case 'running': bg = '#DEEBFF'; text = '#0747A6'; break;
    case 'failed': bg = '#FFEBE6'; text = '#BF2600'; break;
    default: bg = '#DFE1E6'; text = '#253858';
  }
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px',
      padding: '0 6px', borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
      background: bg, color: text,
      fontFamily: 'Inter, sans-serif',
    }}>
      {status}
    </span>
  );
}

export function JiraSyncDrawer({
  open, onClose, projectKey, jiraProjectKey, lastSyncedAt,
  syncLogs, writeBackQueue, onSyncNow, onApproveWriteBack, isSyncing,
}: JiraSyncDrawerProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else if (visible) {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(15,23,42,0.30)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
        width: 480, background: '#FFFFFF',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        transform: animating ? 'translateX(0)' : 'translateX(100%)',
        transition: animating ? 'transform 250ms ease-out' : 'transform 200ms ease-in',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: 'Sora, sans-serif', margin: 0 }}>
            Jira Sync Log
          </h2>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Current Status */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Current Status
            </div>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>
                Connected to {jiraProjectKey || projectKey}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Last sync: {relativeTime(lastSyncedAt)}
            </div>
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5"
              style={{
                height: 32, padding: '0 14px', borderRadius: 4,
                background: isSyncing ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF', border: 'none',
                fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync Now'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--cp-border-subtle, rgba(15,23,42,0.07))', margin: '0 24px' }} />

          {/* Recent Sync Runs */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Recent Sync Runs
            </div>
            {syncLogs.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <Inbox size={24} style={{ color: '#CBD5E1', marginBottom: 6 }} />
                <span style={{ fontSize: 12, color: '#94A3B8' }}>No sync runs yet</span>
              </div>
            ) : (
              syncLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center gap-3"
                  style={{ height: 36, borderBottom: '0.75px solid var(--cp-border-subtle, rgba(15,23,42,0.07))' }}
                >
                  {log.status === 'completed' ? <CheckCircle2 size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
                    : log.status === 'failed' ? <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                    : <Clock size={14} style={{ color: '#2563EB', flexShrink: 0 }} />}
                  <span style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', minWidth: 90 }}>
                    {formatDate(log.startedAt)}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748B', flex: 1 }}>
                    {log.itemsSynced} items synced
                    {log.conflictsFound > 0 && <span style={{ color: '#DC2626' }}> · {log.conflictsFound} conflicts</span>}
                  </span>
                  <StatusLozenge status={log.status} />
                </div>
              ))
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--cp-border-subtle, rgba(15,23,42,0.07))', margin: '0 24px' }} />

          {/* Write-back Queue */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Write-back Queue ({writeBackQueue.length})
            </div>
            {writeBackQueue.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <Inbox size={24} style={{ color: '#CBD5E1', marginBottom: 6 }} />
                <span style={{ fontSize: 12, color: '#94A3B8' }}>No pending write-backs</span>
              </div>
            ) : (
              writeBackQueue.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                  style={{ height: 36, borderBottom: '0.75px solid var(--cp-border-subtle, rgba(15,23,42,0.07))' }}
                >
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{item.fieldName}</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}> → {item.newValue}</span>
                  </div>
                  <button
                    onClick={() => onApproveWriteBack(item.id)}
                    className="inline-flex items-center gap-1"
                    style={{
                      height: 24, padding: '0 8px', borderRadius: 3,
                      border: '0.75px solid #E2E8F0', background: 'none',
                      fontSize: 10, fontWeight: 600, color: '#253858',
                      fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                    }}
                  >
                    <Check size={10} /> Approve
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

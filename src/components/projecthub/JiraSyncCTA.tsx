/**
 * JiraSyncCTA — Jira Sync status button + popover for All Projects page.
 * Reads from ph_jira_connection (the authoritative singleton connection table).
 * Uses existing useJiraConnection() hook and useForceSync() for triggering syncs.
 */
import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Link2, Loader2, ChevronDown, AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useJiraConnection } from '@/modules/workhub/admin/hooks/useJiraConnection';
import { useSyncHealth, useForceSync, useIsSyncRunning } from '@/modules/workhub/admin/hooks/useSyncEngine';
import { useQueryClient } from '@tanstack/react-query';

type PanelView = 'status' | 'webhook';

export function JiraSyncCTA() {
  const { isDark } = useTheme();
  const { data: conn, isLoading: connLoading, error: connError } = useJiraConnection();
  const { data: health } = useSyncHealth();
  const { data: isSyncRunning } = useIsSyncRunning();
  const forceSync = useForceSync();
  const queryClient = useQueryClient();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>('status');
  const [syncing, setSyncing] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  // Combine manual syncing with background sync detection
  const isAnySyncActive = syncing || (isSyncRunning === true);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  const isConnected = conn?.status === 'connected';
  const webhookActive = conn?.last_test_result?.checks?.every((c: any) => c.pass) ?? false;

  // Dot color derived from actual connection state
  const dotColor = connLoading ? '#94A3B8'
    : isConnected ? (webhookActive ? '#16A34A' : '#F59E0B')
    : '#94A3B8';

  const statusLabel = connLoading ? 'Loading...'
    : isAnySyncActive ? 'Syncing…'
    : isConnected ? 'Connected'
    : connError ? 'Error'
    : 'Not connected';

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await forceSync.mutateAsync({ sync_type: 'full' });
      toast.success('Sync completed successfully');
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['wh', 'sync-health'] });
      queryClient.invalidateQueries({ queryKey: ['wh', 'sync-running'] });
    } catch (err: any) {
      toast.error('Sync failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const formatAge = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wh-jira-webhook`;

  return (
    <div ref={popRef} style={{ position: 'relative' }}>
      {/* CTA Button */}
      <button
        onClick={() => {
          setPopoverOpen(!popoverOpen);
          setPanelView('status');
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 32, padding: '8px 12px',
          fontSize: 13, fontWeight: 500,
          color: 'var(--catalyst-text-secondary, #64748B)',
          background: 'var(--catalyst-bg-surface, #FFF)',
          border: '1px solid var(--catalyst-border, #E2E8F0)',
          borderRadius: 6, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          opacity: isAnySyncActive ? 1 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {isAnySyncActive ? (
          <RefreshCw size={13} className="animate-spin" style={{ color: '#2563EB' }} />
        ) : (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor,
            boxShadow: isConnected && webhookActive ? `0 0 6px ${dotColor}` : 'none',
          }} />
        )}
        ↔ Jira Sync
        <span style={{
          fontSize: 11,
          color: isAnySyncActive ? '#2563EB' : '#94A3B8',
          marginLeft: 2,
          fontWeight: isAnySyncActive ? 600 : 400,
        }}>
          {isAnySyncActive
            ? 'Syncing…'
            : `${statusLabel} · Synced ${formatAge(health?.lastSync?.completed_at)}`}
        </span>
        <ChevronDown size={12} style={{ marginLeft: 2, opacity: 0.5 }} />
      </button>

      {/* Popover */}
      {popoverOpen && (
        <div style={{
          position: 'absolute', top: 38, right: 0, zIndex: 50,
          width: 380, background: isDark ? '#1A1A1A' : '#FFF', borderRadius: 12,
          border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden',
        }}>
          {/* Loading */}
          {connLoading && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto', color: '#94A3B8' }} />
            </div>
          )}

          {/* Not connected */}
          {!connLoading && !isConnected && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', marginBottom: 8 }}>No Jira Connection</div>
              <p style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', marginBottom: 16, lineHeight: 1.5 }}>
                Configure your Jira connection in the WorkHub admin to enable bidirectional sync.
              </p>
              <button
                onClick={() => window.open('/workhub/admin', '_blank')}
                style={{
                  height: 34, padding: '0 20px', fontSize: 13, fontWeight: 600,
                  color: '#FFF', background: '#2563EB',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  margin: '0 auto',
                }}
              >
                <Settings size={14} /> Open WorkHub Admin
              </button>
            </div>
          )}

          {/* Connected: Status panel */}
          {!connLoading && isConnected && conn && panelView === 'status' && (
            <div>
              <div style={{ padding: '16px 20px 12px', borderBottom: isDark ? '1px solid #292929' : '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>Jira Sync Status</span>
                  <span style={{ fontSize: 11, color: isDark ? '#878787' : '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatAge(health?.lastSync?.completed_at)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: isDark ? '#878787' : '#64748B', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {conn.site_url?.replace('https://', '').replace(/\/$/, '')}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: isDark ? '#292929' : '#F1F5F9' }}>
                {[
                  { label: 'Projects', value: conn.project_count || 0 },
                  { label: 'Issues cached', value: health?.issueCachedCount ?? 0 },
                  { label: 'Versions', value: health?.versionCachedCount ?? 0 },
                ].map((s, i) => (
                  <div key={i} style={{ background: isDark ? '#1A1A1A' : '#FFF', padding: '14px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', fontFamily: "'Sora', sans-serif" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: isDark ? '#878787' : '#64748B', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Connection details */}
              <div style={{ padding: '12px 20px', borderTop: isDark ? '1px solid #292929' : '1px solid #F1F5F9', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: isDark ? '#878787' : '#64748B' }}>Direction</span>
                  <span style={{ fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>↔ Bi-directional</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: isDark ? '#878787' : '#64748B' }}>Auth method</span>
                  <span style={{ fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>{conn.auth_method === 'api_token' ? 'API Token' : 'OAuth'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: isDark ? '#878787' : '#64748B' }}>Permissions</span>
                  <span style={{ fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>{conn.permissions_level || 'read_write'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: isDark ? '#878787' : '#64748B' }}>Webhook status</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: webhookActive ? '#16A34A' : '#EF4444',
                    }} />
                    <span style={{ fontWeight: 600, color: webhookActive ? '#16A34A' : '#EF4444', fontSize: 12 }}>
                      {webhookActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '12px 20px', borderTop: isDark ? '1px solid #292929' : '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={handleSyncNow}
                  disabled={isAnySyncActive}
                  style={{
                    width: '100%', height: 50, fontSize: 13, fontWeight: 600,
                    color: '#FFF', background: isAnySyncActive ? '#93C5FD' : '#2563EB',
                    border: 'none', borderRadius: 8, cursor: isAnySyncActive ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {isAnySyncActive ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {isAnySyncActive ? 'Syncing...' : 'Sync Now'}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPanelView('webhook')}
                    style={{
                      flex: 1, height: 32, fontSize: 12, fontWeight: 500,
                      color: isDark ? '#A1A1A1' : '#64748B', background: isDark ? '#1A1A1A' : '#F8FAFC',
                      border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <Link2 size={12} /> Webhook
                  </button>
                  <button
                    onClick={() => window.open('/workhub/admin', '_blank')}
                    style={{
                      flex: 1, height: 32, fontSize: 12, fontWeight: 500,
                      color: isDark ? '#A1A1A1' : '#64748B', background: isDark ? '#1A1A1A' : '#F8FAFC',
                      border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <Settings size={12} /> Admin Config
                  </button>
                  <a
                    href={conn.site_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1, height: 32, fontSize: 12, fontWeight: 500,
                      color: isDark ? '#A1A1A1' : '#64748B', background: isDark ? '#1A1A1A' : '#F8FAFC',
                      border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} /> Jira
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Webhook Details panel */}
          {!connLoading && isConnected && panelView === 'webhook' && (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>Webhook Configuration</span>
                <button
                  onClick={() => setPanelView('status')}
                  style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  ← Back
                </button>
              </div>

              <div style={{
                padding: 12, background: isDark ? '#1A1A1A' : '#F8FAFC', borderRadius: 8,
                border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#A1A1A1' : '#374151', marginBottom: 6 }}>Webhook URL (for Jira → Catalyst)</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', background: isDark ? '#0A0A0A' : '#FFF', borderRadius: 6,
                  border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace", color: isDark ? '#A1A1A1' : '#374151',
                  wordBreak: 'break-all',
                }}>
                  {webhookUrl}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success('Webhook URL copied');
                    }}
                    style={{
                      flexShrink: 0, background: 'none', border: 'none',
                      cursor: 'pointer', color: '#2563EB', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div style={{
                padding: 12, background: '#FFFBEB', borderRadius: 8,
                border: '1px solid #FDE68A', fontSize: 12, color: '#92400E',
                lineHeight: 1.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 6 }}>
                  <AlertTriangle size={14} /> Steps to configure in Jira
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
                  <li>Go to Jira → Settings → System → WebHooks</li>
                  <li>Click "Create a WebHook"</li>
                  <li>Paste the webhook URL above</li>
                  <li>Select events: Issue created, updated, deleted</li>
                  <li>For HMAC verification, add the webhook secret as a shared secret</li>
                  <li>Save the webhook</li>
                </ol>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Edge function</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#16A34A', fontWeight: 600 }}>
                    wh-jira-sync (deployed)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>HMAC-SHA256 verification</span>
                  <span style={{ fontWeight: 600, color: '#16A34A' }}>Enabled</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Write-back processor</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#16A34A', fontWeight: 600 }}>
                    jira-write-back-processor (deployed)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

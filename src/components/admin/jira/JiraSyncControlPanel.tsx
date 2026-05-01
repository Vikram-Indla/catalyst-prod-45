import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FolderSync,
  Lock,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useJiraSyncConfig } from '@/hooks/admin/useJiraSyncConfig';

/* ─── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  colour,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  colour: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--cp-border-default)', background: 'var(--cp-bg-surface)' }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0"
        style={{ background: colour + '18' }}
      >
        <Icon style={{ width: 16, height: 16, color: colour }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--cp-text-muted)' }}>
          {label}
        </p>
        <p className="text-lg font-semibold leading-tight" style={{ color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-mono)' }}>
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

/* ─── Status badge ──────────────────────────────────────────────────────── */
function SyncStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
      style={
        enabled
          ? { background: '#E3FCEF', color: '#006644' }   // StatusLozenge green
          : { background: 'var(--ds-border, var(--ds-border, #DFE1E6))', color: 'var(--ds-text, var(--ds-text, #253858))' }   // StatusLozenge grey
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: enabled ? '#006644' : 'var(--ds-text, var(--ds-text, #253858))' }}
      />
      {enabled ? 'LIVE' : 'FROZEN'}
    </span>
  );
}

/* ─── Main panel ────────────────────────────────────────────────────────── */
export function JiraSyncControlPanel() {
  const { config, isLoading, isSyncEnabled, isFrozen, disableSync, enableSync } = useJiraSyncConfig();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingState, setPendingState] = useState<'enable' | 'disable' | null>(null);
  const [freezeNote, setFreezeNote] = useState('');

  const isPending = disableSync.isPending || enableSync.isPending;

  function handleToggleClick(checked: boolean) {
    setPendingState(checked ? 'enable' : 'disable');
    setFreezeNote('');
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (pendingState === 'disable') {
      await disableSync.mutateAsync(freezeNote || undefined);
    } else if (pendingState === 'enable') {
      await enableSync.mutateAsync();
    }
    setConfirmOpen(false);
    setPendingState(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40" style={{ color: 'var(--cp-text-muted)' }}>
        <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── Top banner ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-lg border p-5 mb-6"
        style={{
          borderColor: isFrozen ? 'var(--ds-border, var(--ds-border, #DFE1E6))' : '#DEEBFF',
          background: isFrozen ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))' : '#DEEBFF22',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: isFrozen ? 'var(--ds-border, var(--ds-border, #DFE1E6))' : '#DEEBFF' }}
            >
              {isFrozen ? (
                <Lock style={{ width: 18, height: 18, color: 'var(--ds-text, var(--ds-text, #253858))' }} />
              ) : (
                <Zap style={{ width: 18, height: 18, color: '#0747A6' }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--cp-text-primary)' }}>
                  Jira Sync
                </span>
                <SyncStatusBadge enabled={isSyncEnabled} />
              </div>
              {isFrozen && config?.frozen_at && (
                <p className="text-xs" style={{ color: 'var(--cp-text-secondary)' }}>
                  Frozen{' '}
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(config.frozen_at), { addSuffix: true })}
                  </span>
                  {' '}· {format(new Date(config.frozen_at), 'dd MMM yyyy, HH:mm')}
                </p>
              )}
              {isFrozen && config?.freeze_note && (
                <p className="text-xs mt-1 max-w-md" style={{ color: 'var(--cp-text-muted)' }}>
                  {config.freeze_note}
                </p>
              )}
              {isSyncEnabled && config?.last_sync_at && (
                <p className="text-xs" style={{ color: 'var(--cp-text-secondary)' }}>
                  Last sync:{' '}
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: 'var(--cp-text-secondary)' }}>
              {isSyncEnabled ? 'Sync ON' : 'Sync OFF'}
            </span>
            <Switch
              checked={isSyncEnabled}
              onCheckedChange={handleToggleClick}
              disabled={isPending}
              aria-label="Toggle Jira sync"
            />
          </div>
        </div>
      </div>

      {/* ── Preserved-data stats ─────────────────────────────────────────── */}
      {isFrozen && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck style={{ width: 14, height: 14, color: '#006644' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cp-text-muted)' }}>
              Data Preserved in Catalyst (cutoff: {config?.data_cutoff_year ?? 2026})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <StatCard icon={Database}    label="Work Items"  value={config?.preserved_work_items} colour="var(--ds-text-brand, var(--ds-text-brand, #2563EB))" />
            <StatCard icon={FolderSync}  label="Projects"    value={config?.preserved_projects}    colour="var(--ds-text-brand, var(--ds-text-brand, #2563EB))" />
            <StatCard icon={Users}       label="Users Mapped" value={config?.preserved_users}      colour="var(--ds-text-brand, var(--ds-text-brand, #2563EB))" />
          </div>
        </>
      )}

      {/* ── What's dormant ──────────────────────────────────────────────── */}
      <div className="rounded-lg border" style={{ borderColor: 'var(--cp-border-default)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--cp-border-default)' }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cp-text-muted)' }}>
            {isFrozen ? 'Tables dormant (Jira OFF)' : 'Tables active (Jira ON)'}
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--cp-border-default)' }}>
          {[
            { name: 'jira_identity_map',    role: 'User identity bridge',       dormant: isFrozen },
            { name: 'jira_connections',     role: 'Auth credentials',           dormant: isFrozen },
            { name: 'jira_field_mappings',  role: 'Field-level sync config',    dormant: isFrozen },
            { name: 'jira_project_mappings',role: 'Project sync mappings',      dormant: isFrozen },
            { name: 'ph_jira_connection',   role: 'WorkHub connection config',  dormant: isFrozen },
            { name: 'ph_jira_sync_log',     role: 'Sync audit log',             dormant: isFrozen },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between px-4 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <Database style={{ width: 13, height: 13, color: 'var(--cp-text-muted)' }} />
                <code style={{ color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-mono)' }}>
                  {row.name}
                </code>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--cp-text-secondary)' }}>{row.role}</span>
                {row.dormant ? (
                  <span
                    className="rounded-full px-2 py-0.5 font-bold uppercase tracking-widest"
                    style={{ fontSize: 10, background: 'var(--ds-border, var(--ds-border, #DFE1E6))', color: 'var(--ds-text, var(--ds-text, #253858))' }}
                  >
                    DORMANT
                  </span>
                ) : (
                  <CheckCircle2 style={{ width: 13, height: 13, color: '#006644' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dropped tables notice ─────────────────────────────────────────── */}
      <div
        className="mt-4 flex items-start gap-3 rounded-lg px-4 py-3"
        style={{ background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))', border: '1px solid var(--cp-border-default)' }}
      >
        <CheckCircle2 style={{ width: 15, height: 15, color: '#006644', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--cp-text-secondary)' }}>
          <strong style={{ color: 'var(--cp-text-primary)' }}>69 Jira-only tables permanently removed</strong>
          {' '}— all <code style={{ fontFamily: 'var(--cp-font-mono)' }}>injira_*</code> mirrors,
          sync queues, webhook event logs, and generic sync infrastructure have been dropped.
          No Catalyst business data was in those tables — it was already propagated to native tables during sync.
        </p>
      </div>

      {/* ── Confirmation dialog ──────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          {pendingState === 'disable' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock style={{ width: 16, height: 16, color: 'var(--ds-text, var(--ds-text, #253858))' }} />
                  Freeze Jira Sync
                </DialogTitle>
                <DialogDescription>
                  Sync will stop immediately. All cron jobs and webhook processing will be
                  disabled. Your existing Catalyst data is{' '}
                  <strong>fully preserved</strong> — Catalyst will operate entirely on its
                  native tables.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="rounded-md border px-4 py-3 space-y-1"
                  style={{ borderColor: 'var(--ds-border, var(--ds-border, #DFE1E6))', background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle style={{ width: 13, height: 13, color: '#FF8B00' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--cp-text-primary)' }}>
                      What stops
                    </span>
                  </div>
                  <ul className="text-xs space-y-0.5 mt-1 pl-4 list-disc" style={{ color: 'var(--cp-text-secondary)' }}>
                    <li>Live Jira webhook ingestion</li>
                    <li>Scheduled sync cron jobs</li>
                    <li>Write-back queue to Jira</li>
                    <li>User roster refresh from Jira</li>
                  </ul>
                </div>
                <div>
                  <Label htmlFor="freeze-note" className="text-xs">
                    Optional freeze note
                  </Label>
                  <Textarea
                    id="freeze-note"
                    placeholder="e.g. Testing Catalyst-native mode for Q2 sprint..."
                    value={freezeNote}
                    onChange={(e) => setFreezeNote(e.target.value)}
                    className="mt-1 text-xs resize-none h-20"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isPending}
                  style={{ background: 'var(--ds-text, var(--ds-text, #253858))', color: 'var(--ds-text-inverse, #FFFFFF)' }}
                >
                  {isPending ? 'Freezing…' : 'Freeze sync'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap style={{ width: 16, height: 16, color: '#0747A6' }} />
                  Re-enable Jira Sync
                </DialogTitle>
                <DialogDescription>
                  This will re-activate cron jobs and unfreeze the Jira bridge tables. Run a
                  full sync after enabling to pull any changes made in Jira during the freeze.
                </DialogDescription>
              </DialogHeader>
              <div
                className="rounded-md border px-4 py-3"
                style={{ borderColor: '#DEEBFF', background: '#DEEBFF22' }}
              >
                <p className="text-xs" style={{ color: '#0747A6' }}>
                  Jira will become the authoritative source again for work items, projects, and
                  user data. Any Catalyst-only edits made during the freeze may be overwritten
                  by the next Jira sync.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isPending}
                  style={{ background: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', color: 'var(--ds-text-inverse, #FFFFFF)' }}
                >
                  {isPending ? 'Enabling…' : 'Enable sync'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

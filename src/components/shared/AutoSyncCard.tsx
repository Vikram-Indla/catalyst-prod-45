import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle2, AlertTriangle, Timer, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncSchedule {
  id: string;
  schedule_key: string;
  schedule_label: string;
  cron_expression: string;
  timezone_label: string;
  is_enabled: boolean;
  target_function: string;
  last_triggered_at: string | null;
  updated_at: string;
}

interface AutoSyncCardProps {
  /** Filter to only show schedules for these keys */
  scheduleKeys: string[];
  /** Optional: table to check last sync from */
  lastSyncTable?: string;
  lastSyncColumn?: string;
  /** Card title */
  title?: string;
}

/** Parse cron hour to display time */
function cronToTime(cron: string): { hour: number; minute: number } {
  const parts = cron.split(' ');
  return { minute: parseInt(parts[0]) || 0, hour: parseInt(parts[1]) || 0 };
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function hoursAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return (Date.now() - new Date(dateStr).getTime()) / 3600000;
}

export function AutoSyncCard({ scheduleKeys, lastSyncTable, lastSyncColumn, title = 'Automated Sync' }: AutoSyncCardProps) {
  const queryClient = useQueryClient();

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['sync-schedules', scheduleKeys],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .in('schedule_key', scheduleKeys)
        .order('schedule_key');
      if (error) throw error;
      return (data || []) as SyncSchedule[];
    },
  });

  // Fetch last sync timestamp
  const { data: lastSyncTime } = useQuery({
    queryKey: ['last-sync-time', lastSyncTable, lastSyncColumn],
    queryFn: async () => {
      if (!lastSyncTable || !lastSyncColumn) return null;
      const { data, error } = await supabase
        .from(lastSyncTable as any)
        .select(lastSyncColumn)
        .order(lastSyncColumn, { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return null;
      return (data as any)[lastSyncColumn] as string;
    },
    enabled: !!lastSyncTable && !!lastSyncColumn,
  });

  // Local state for time editing
  const [localEdits, setLocalEdits] = useState<Record<string, { hour: number; minute: number; enabled: boolean }>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (schedules.length > 0 && Object.keys(localEdits).length === 0) {
      const edits: typeof localEdits = {};
      schedules.forEach(s => {
        const { hour, minute } = cronToTime(s.cron_expression);
        edits[s.schedule_key] = { hour, minute, enabled: s.is_enabled };
      });
      setLocalEdits(edits);
    }
  }, [schedules]);

  const updateMutation = useMutation({
    mutationFn: async (updates: { key: string; cron: string; enabled: boolean }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from('sync_schedules')
          .update({
            cron_expression: u.cron,
            is_enabled: u.enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('schedule_key', u.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-schedules'] });
      setHasChanges(false);
      toast.success('Schedule updated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const handleToggle = (key: string) => {
    setLocalEdits(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (key: string, field: 'hour' | 'minute', value: number) => {
    setLocalEdits(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const updates = Object.entries(localEdits).map(([key, val]) => ({
      key,
      cron: `${val.minute} ${val.hour} * * *`,
      enabled: val.enabled,
    }));
    updateMutation.mutate(updates);
  };

  const staleHours = hoursAgo(lastSyncTime);
  const isStale = staleHours !== null && staleHours > 24;
  const isFresh = staleHours !== null && staleHours <= 24;
  const statusBackground = isStale ? 'var(--wh-warn-bg)' : isFresh ? 'var(--wh-suc-bg)' : 'var(--wh-sf2)';
  const statusBorder = isStale ? 'var(--wh-warn)' : isFresh ? 'var(--wh-suc)' : 'var(--wh-bdr)';
  const statusText = isStale ? 'var(--wh-warn)' : isFresh ? 'var(--wh-suc)' : 'var(--wh-tx2)';

  if (isLoading) return null;

  return (
    <div style={{
      background: 'var(--wh-bg)',
      borderRadius: 'var(--wh-rad2, 8px)',
      border: '1px solid var(--wh-bdr)',
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Timer size={15} style={{ color: 'var(--wh-tx3)' }} />
          <span style={{
            fontFamily: "var(--cp-font-body)",
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--wh-tx)',
          }}>
            {title}
          </span>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'var(--wh-pri)', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', border: 'none', cursor: 'pointer',
            }}
          >
            <Save size={12} />
            {updateMutation.isPending ? 'Saving...' : 'Save Schedule'}
          </button>
        )}
      </div>

      {/* Last Sync Status */}
      {lastSyncTable && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 8, marginBottom: 16,
          background: statusBackground,
          border: `1px solid ${statusBorder}`,
        }}>
          {isStale ? (
            <AlertTriangle size={14} style={{ color: 'var(--wh-warn)', flexShrink: 0 }} />
          ) : isFresh ? (
            <CheckCircle2 size={14} style={{ color: 'var(--wh-suc)', flexShrink: 0 }} />
          ) : (
            <Clock size={14} style={{ color: 'var(--wh-tx3)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: statusText,
            }}>
              {lastSyncTime
                ? `Last synced: ${new Date(lastSyncTime).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })} at ${new Date(lastSyncTime).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit',
                  })}`
                : 'No sync data found'}
            </span>
            {staleHours !== null && (
              <span style={{
                fontSize: 11, marginLeft: 8,
                color: isStale ? 'var(--wh-warn)' : 'var(--wh-tx3)',
              }}>
                ({Math.round(staleHours)}h ago)
              </span>
            )}
          </div>
          {isStale && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--wh-warn)',
              background: 'var(--wh-bg)', padding: '2px 8px', borderRadius: 12,
              textTransform: 'uppercase', letterSpacing: '.4px',
            }}>
              ⚠️ May be stale
            </span>
          )}
          {isFresh && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--wh-suc)',
              background: 'var(--wh-bg)', padding: '2px 8px', borderRadius: 12,
              textTransform: 'uppercase', letterSpacing: '.4px',
            }}>
              Up to date
            </span>
          )}
        </div>
      )}

      {/* Schedule rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schedules.map(s => {
          const edit = localEdits[s.schedule_key];
          if (!edit) return null;

          return (
            <div key={s.schedule_key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 8,
              background: edit.enabled ? 'var(--wh-pri-bg)' : 'var(--wh-sf2)',
              border: `1px solid ${edit.enabled ? 'var(--wh-pri-bdr)' : 'var(--wh-bdr)'}`,
              transition: 'all 0.2s',
            }}>
              {/* Toggle */}
              <button
                onClick={() => handleToggle(s.schedule_key)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
              >
                {edit.enabled ? (
                  <ToggleRight size={24} style={{ color: 'var(--wh-pri)' }} />
                ) : (
                  <ToggleLeft size={24} style={{ color: 'var(--wh-tx4)' }} />
                )}
              </button>

              {/* Label */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: edit.enabled ? 'var(--wh-tx)' : 'var(--wh-tx4)',
                  fontFamily: "var(--cp-font-body)",
                }}>
                  {s.schedule_label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: "var(--cp-font-body)", marginTop: 1 }}>
                  {s.timezone_label}
                  {s.last_triggered_at && ` · Last run: ${formatTimeAgo(s.last_triggered_at)}`}
                </div>
              </div>

              {/* Time picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <select
                  value={edit.hour}
                  onChange={(e) => handleTimeChange(s.schedule_key, 'hour', parseInt(e.target.value))}
                  disabled={!edit.enabled}
                  style={{
                    width: 56, padding: '4px 4px', borderRadius: 6, fontSize: 12,
                    border: '1px solid var(--wh-bdr)', fontFamily: "var(--wh-mo, monospace)",
                    fontWeight: 600, background: 'var(--wh-bg)', color: edit.enabled ? 'var(--wh-tx)' : 'var(--wh-tx4)',
                    cursor: edit.enabled ? 'pointer' : 'default',
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--wh-tx4)' }}>:</span>
                <select
                  value={edit.minute}
                  onChange={(e) => handleTimeChange(s.schedule_key, 'minute', parseInt(e.target.value))}
                  disabled={!edit.enabled}
                  style={{
                    width: 56, padding: '4px 4px', borderRadius: 6, fontSize: 12,
                    border: '1px solid var(--wh-bdr)', fontFamily: "var(--wh-mo, monospace)",
                    fontWeight: 600, background: 'var(--wh-bg)', color: edit.enabled ? 'var(--wh-tx)' : 'var(--wh-tx4)',
                    cursor: edit.enabled ? 'pointer' : 'default',
                  }}
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <span style={{ fontSize: 10, color: 'var(--wh-tx4)', fontFamily: "var(--cp-font-body)", marginLeft: 4 }}>
                  UTC
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div style={{
        marginTop: 14, fontSize: 10, color: 'var(--wh-tx4)',
        fontFamily: "var(--cp-font-body)", lineHeight: 1.5,
      }}>
        Enable a schedule and set the time (UTC). Saudi Arabia is UTC+3.
        For example, 23:00 UTC = 2:00 AM Saudi time.
      </div>
    </div>
  );
}

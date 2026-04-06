/**
 * EntityHistoryPanel — Reusable change history timeline for detail pages
 */
import { useState, useEffect } from 'react';
import { 
  History, ChevronDown, ChevronUp, Plus, Edit2, Trash2,
  ArrowRight, User, Clock, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoryEntry {
  id: string;
  action: string;
  user_name: string | null;
  changed_fields: string[] | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  notes: string | null;
  created_at: string;
}

interface EntityHistoryPanelProps {
  entityType: string;
  entityId: string;
  maxEntries?: number;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: 'Created', color: 'var(--sem-success)', icon: Plus },
  update: { label: 'Updated', color: 'var(--cp-blue)', icon: Edit2 },
  delete: { label: 'Deleted', color: 'var(--sem-danger)', icon: Trash2 },
  status_change: { label: 'Status Changed', color: 'var(--sem-warning)', icon: ArrowRight },
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  priority: 'Priority',
  status: 'Status',
  severity: 'Severity',
  preconditions: 'Preconditions',
  expected_result: 'Expected Result',
  assignee_id: 'Assignee',
  assignee: 'Assignee',
  start_date: 'Start Date',
  end_date: 'End Date',
  name: 'Name',
};

export function EntityHistoryPanel({ entityType, entityId, maxEntries = 20 }: EntityHistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_entity_audit_history', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_limit: maxEntries,
      });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) fetchHistory();
  }, [entityId, entityType]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const displayedHistory = showAll ? history : history.slice(0, 5);

  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-4)' }}>
        <History size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
        <p style={{ margin: 0, fontSize: 13 }}>No history available</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} style={{ color: '#2563EB' }} />
          History ({history.length})
        </h4>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--divider)' }} />

          {displayedHistory.map((entry) => {
            const action = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;
            const ActionIcon = action.icon;
            const isExpanded = expandedEntries.has(entry.id);
            const hasChanges = entry.changed_fields && entry.changed_fields.length > 0;

            return (
              <div key={entry.id} style={{ position: 'relative', paddingLeft: 40, marginBottom: 20 }}>
                {/* Timeline dot */}
                <div style={{ position: 'absolute', left: 8, top: 4, width: 16, height: 16, borderRadius: '50%', backgroundColor: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <ActionIcon size={10} style={{ color: '#FFFFFF' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: action.color }}>{action.label}</span>
                    {hasChanges && (
                      <button onClick={() => toggleExpanded(entry.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 6px', fontSize: 11, border: '1px solid var(--divider)', borderRadius: 4, backgroundColor: 'var(--bg-1)', color: 'var(--fg-3)', cursor: 'pointer' }}>
                        {entry.changed_fields?.length} field{entry.changed_fields?.length !== 1 ? 's' : ''}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--fg-3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={12} /> {entry.user_name || 'System'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {formatTime(entry.created_at)}
                    </span>
                  </div>

                  {isExpanded && hasChanges && (
                    <div style={{ marginTop: 12, padding: 12, backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                      {entry.changed_fields?.map((field) => {
                        const oldVal = entry.old_values?.[field];
                        const newVal = entry.new_values?.[field];
                        const label = FIELD_LABELS[field] || field;

                        return (
                          <div key={field} style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', margin: '0 0 4px', textTransform: 'uppercase' }}>{label}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                              <span style={{ padding: '2px 8px', backgroundColor: 'rgba(248,113,113,0.10)', borderRadius: 4, color: '#F87171', textDecoration: 'line-through', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {formatValue(oldVal)}
                              </span>
                              <ArrowRight size={14} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                              <span style={{ padding: '2px 8px', backgroundColor: '#DCFCE7', borderRadius: 4, color: '#166534', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {formatValue(newVal)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {history.length > 5 && (
          <button onClick={() => setShowAll(!showAll)}
            style={{ width: '100%', padding: 12, border: '1px dashed var(--divider)', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-3)', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
            {showAll ? 'Show less' : `Show ${history.length - 5} more`}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

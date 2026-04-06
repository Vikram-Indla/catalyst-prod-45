/**
 * BulkOpsHistory — Audit trail panel for bulk operations
 * Phase 9
 */
import { Clock, X } from 'lucide-react';
import { useBulkOpsLog } from '@/hooks/workhub/useBulkOpsLog';

const OP_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  assign_release: { label: 'Assign Release', bg: '#dbeafe', color: '#1d4ed8' },
  assign_theme: { label: 'Assign Theme', bg: '#ccfbf1', color: '#0d9488' },
  change_status: { label: 'Change Status', bg: 'rgba(59,130,246,0.06)', color: '#3B82F6' },
  change_release_id: { label: 'Assign Release', bg: '#dbeafe', color: '#1d4ed8' },
  change_theme_id: { label: 'Assign Theme', bg: '#ccfbf1', color: '#0d9488' },
};

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface BulkOpsHistoryProps {
  onClose: () => void;
}

export function BulkOpsHistory({ onClose }: BulkOpsHistoryProps) {
  const { data: entries = [], isLoading } = useBulkOpsLog();

  const opConfig = (op: string) => OP_CONFIG[op] || { label: op, bg: '#f1f5f9', color: '#475569' };

  return (
    <div
      className="animate-in slide-in-from-top-2 duration-200 mb-4"
      style={{
        background: 'var(--wh-surface, #fff)',
        border: '1px solid var(--wh-border, #e2e8f0)',
        borderRadius: 'var(--wh-radius-lg, 12px)',
        maxHeight: 400,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--wh-border-light, #f1f5f9)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--wh-text-primary, #0f172a)', fontFamily: 'Inter, system-ui, sans-serif' }}>
          Bulk Operations History
        </span>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
        </button>
      </div>

      {/* Entries */}
      <div className="overflow-y-auto flex-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {isLoading ? (
          <div className="p-4 text-center text-xs" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-xs" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
            No bulk operations recorded yet.
          </div>
        ) : (
          entries.map(entry => {
            const cfg = opConfig(entry.operation);
            const count = entry.item_count || entry.affected_item_ids?.length || 0;
            const newVals = entry.new_values || {};
            const fieldChanged = entry.field_changed || Object.keys(newVals)[0] || '';
            const newValue = newVals[fieldChanged] || JSON.stringify(newVals);
            const itemIds = entry.affected_item_ids || [];
            const displayIds = itemIds.slice(0, 5).join(', ');
            const moreCount = itemIds.length - 5;

            return (
              <div key={entry.id} className="px-4 py-3" style={{ borderBottom: '1px solid var(--wh-border-light, #f1f5f9)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
                    {relativeTime(entry.performed_at)}
                  </span>
                  <span
                    className="text-[11px] font-medium rounded-full px-2 py-0.5"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>
                  Changed {count} item{count !== 1 ? 's' : ''} → {fieldChanged}: {String(newValue)}
                </div>
                {itemIds.length > 0 && (
                  <div className="text-[11px]" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
                    Items: {displayIds}{moreCount > 0 ? ` +${moreCount} more` : ''}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

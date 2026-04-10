/**
 * Detail Tab — Activity (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Filter chips + audit feed from ph_initiative_audit_log
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import type { LucideIcon } from 'lucide-react';
import {
  Pencil, CheckCircle2, AlertTriangle, Wallet, Paperclip, BarChart3,
  Copy, Archive, Trash2, PlusCircle,
} from 'lucide-react';

interface DetailTabActivityProps {
  initiativeId: string;
}

const FILTER_CHIPS: { key: string; label: string; Icon: LucideIcon | null }[] = [
  { key: 'all', label: 'All', Icon: null },
  { key: 'edit', label: 'Edits', Icon: Pencil },
  { key: 'milestone', label: 'Milestones', Icon: CheckCircle2 },
  { key: 'risk', label: 'Risks', Icon: AlertTriangle },
  { key: 'budget', label: 'Budget', Icon: Wallet },
  { key: 'attachment', label: 'Files', Icon: Paperclip },
  { key: 'score', label: 'Score', Icon: BarChart3 },
];

const ENTITY_ICON_MAP: Record<string, LucideIcon> = {
  initiative: Pencil, field: Pencil, milestone: CheckCircle2, risk: AlertTriangle,
  budget: Wallet, budget_item: Wallet, attachment: Paperclip, score: BarChart3,
  clone: Copy, archive: Archive, delete: Trash2, create: PlusCircle,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function avatarColor(name: string) {
  const PALETTE = ["#6b7a8d", "#7a8b6b", "#8b7a6b", "#6b6b8b", "#6b8b8b", "#8b6b7a", "#7a6b8b", "#6b8b7a"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatAction(entry: any): string {
  const { action, entity_type, field_name, old_value, new_value } = entry;
  if (entity_type === 'initiative' && field_name) {
    const label = field_name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    if (old_value && new_value) return `Changed ${label} from "${old_value}" to "${new_value}"`;
    if (new_value) return `Set ${label} to "${new_value}"`;
    return `Updated ${label}`;
  }
  const entityLabel = (entity_type || '').replace(/_/g, ' ');
  if (action === 'created') return `Added ${entityLabel}: ${new_value || ''}`;
  if (action === 'updated') return `Updated ${entityLabel}: ${new_value || ''}`;
  if (action === 'deleted') return `Deleted ${entityLabel}: ${new_value || ''}`;
  if (action === 'completed') return `Completed ${entityLabel}: ${new_value || ''}`;
  if (action === 'reopened') return `Reopened ${entityLabel}: ${new_value || ''}`;
  if (action === 'uploaded') return `Uploaded ${new_value || 'file'}`;
  if (action === 'pinned') return `Pinned ${new_value || 'file'}`;
  if (action === 'unpinned') return `Unpinned ${new_value || 'file'}`;
  return `${action} ${entityLabel} ${new_value || ''}`.trim();
}

function getIconComponent(entry: any): LucideIcon {
  return ENTITY_ICON_MAP[entry.entity_type] || ENTITY_ICON_MAP[entry.action] || Pencil;
}

function matchesFilter(entry: any, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'edit') return entry.entity_type === 'initiative' || entry.entity_type === 'field';
  return entry.entity_type === filter;
}

export const DetailTabActivity: React.FC<DetailTabActivityProps> = ({ initiativeId }) => {
  const [filter, setFilter] = useState('all');

  const { data: entries = [] } = useQuery({
    queryKey: ['idp-activity', initiativeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_initiative_audit_log')
        .select('*, user:profiles!user_id(full_name)')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10_000,
  });

  const filtered = useMemo(() =>
    entries.filter((e: any) => matchesFilter(e, filter)),
    [entries, filter]
  );

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* A1 — Filter Chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTER_CHIPS.map(chip => {
          const active = filter === chip.key;
          return (
            <button key={chip.key} onClick={() => setFilter(chip.key)}
              style={{
                padding: '4px 12px', borderRadius: 9999, fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--idp-font-body)',
                fontWeight: active ? 600 : 500,
                border: active ? '1px solid var(--idp-primary)' : '1px solid var(--idp-border)',
                background: active ? 'var(--idp-primary-bg)' : 'var(--idp-surface)',
                color: active ? 'var(--idp-primary)' : 'var(--idp-ink-muted)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {chip.Icon && <chip.Icon size={12} />}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* A2 — Activity Feed */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--idp-ink-muted)' }}>No activity matching filter</div>
        </div>
      ) : filtered.map((entry: any, idx: number) => {
        const name = entry.user?.full_name || 'System';
        const EntryIcon = getIconComponent(entry);
        return (
          <div key={entry.id} style={{
            display: 'flex', gap: 12, padding: '14px 0',
            borderBottom: idx < filtered.length - 1 ? '1px solid var(--idp-border)' : undefined,
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              color: '#fff', background: avatarColor(name),
            }}>{initials(name)}</div>
            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--idp-ink)' }}>{name}</span>
                <span style={{ fontSize: 11, color: 'var(--idp-ink-muted)' }}>{timeAgo(entry.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--idp-ink-secondary)', lineHeight: 1.5, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <EntryIcon size={13} />
                <span>{formatAction(entry)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DetailTabActivity;

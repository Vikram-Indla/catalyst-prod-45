/**
 * IdeationDrivesView — Innovation Drives with progress tracking (Supabase-wired)
 * V12: Lucide icons only (no emoji), proper progress bars
 */
import React, { useState } from 'react';
import { Plus, Building2, Bot, Leaf, Target, Zap, Globe, TrendingUp, Lightbulb } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CreateDriveModal from './CreateDriveModal';

const MONO = "'JetBrains Mono', monospace";

interface Drive {
  id: string;
  title: string;
  status: string;
  description: string;
  deadline: string | null;
  target_count: number;
  ideas: { idea_key: string }[];
}

function useDrives() {
  return useQuery({
    queryKey: ['ph-innovation-drives'],
    queryFn: async () => {
      const { data: drives, error } = await supabase
        .from('ph_innovation_drives')
        .select('id, title, description, status, deadline, target_count')
        .order('created_at');
      if (error) throw error;

      const driveIds = (drives ?? []).map(d => d.id);
      const { data: ideas } = await supabase
        .from('ph_ideas')
        .select('idea_key, innovation_drive_id')
        .in('innovation_drive_id', driveIds.length ? driveIds : ['__none__']);

      return (drives ?? []).map(d => ({
        ...d,
        ideas: (ideas ?? []).filter(i => i.innovation_drive_id === d.id),
      }));
    },
  });
}

// V12: Lucide icons instead of emoji
const DRIVE_ICON_MAP: Record<string, React.ElementType> = {
  'v2030': Building2,
  'government': Building2,
  'ai': Bot,
  'automation': Bot,
  'sustainability': Leaf,
  'green': Leaf,
  'innovation': Zap,
  'global': Globe,
  'growth': TrendingUp,
  'digital': Target,
};

function getDriveIcon(title: string): React.ElementType {
  const lower = title.toLowerCase();
  for (const [key, Icon] of Object.entries(DRIVE_ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return Lightbulb;
}

export default function IdeationDrivesView() {
  const { data: drives = [], isLoading, error } = useDrives();
  const [createOpen, setCreateOpen] = useState(false);
  const { isDark } = useTheme();

  return (
    <div style={{ padding: '16px 28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 800, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1)))', letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Themes</h2>
            <span style={{
              background: 'var(--ds-surface-sunken)', border: '1px solid var(--cp-border, var(--cp-bg-sunken))', borderRadius: '12px',
              padding: '0px 7px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
              fontFamily: MONO, color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
            }}>{drives.length}</span>
          </div>
          <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', margin: 0 }}>
            Themed innovation campaigns to focus idea generation around strategic priorities
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            height: 50, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: 'none', borderRadius: '6px',
            padding: '0 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 650, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}
        >
          <Plus size={14} /> New Drive
        </button>
      </div>

      <CreateDriveModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {isLoading && (
        <div style={{ color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontSize: 'var(--ds-font-size-300)', padding: 16 }}>Loading drives...</div>
      )}

      {error && (
        <div style={{ color: 'var(--ds-text-danger)', fontSize: 'var(--ds-font-size-300)', padding: 16 }}>Failed to load drives.</div>
      )}

      {/* Drive Cards */}
      {drives.map(drive => {
        const submitted = drive.ideas.length;
        const pct = drive.target_count > 0 ? Math.round((submitted / drive.target_count) * 100) : 0;
        const isActive = drive.status === 'active';
        const IconComponent = getDriveIcon(drive.title);
        return (
          <div key={drive.id} style={{
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--cp-border, var(--cp-bg-sunken))', borderRadius: '6px',
            padding: '16px', marginBottom: '16px',
          }}>
            {/* Title + Icon + Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              {/* V12: Lucide icon container */}
              <div style={{
                width: 36, height: 50, borderRadius: 8,
                background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', border: isDark ? '1px solid var(--ds-text)' : '1px solid var(--cp-border, var(--cp-bg-sunken))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: 'var(--cp-text-secondary)',
              }}>
                <IconComponent size={18} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1)))', flex: 1 }}>{drive.title}</span>
              {/* V12 3-color lozenge for status */}
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                background: isActive
                  ? ('var(--cp-primary-light)')
                  : ('var(--cp-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))'),
                color: isActive
                  ? ('var(--cp-text-link)')
                  : ('var(--cp-text-secondary)'),
                height: 20, padding: '0 6px', borderRadius: 3, fontSize: 'var(--ds-font-size-100)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.03em',
              }}>
                {isActive ? 'ACTIVE' : 'DRAFT'}
              </span>
            </div>

            {/* Description */}
            <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', margin: '0 0 12px', lineHeight: 1.5 }}>{drive.description}</p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '24px', fontSize: 'var(--ds-font-size-200)', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', fontWeight: 500, marginBottom: '8px' }}>
              <span><strong>{submitted}</strong> {submitted === 1 ? 'idea' : 'ideas'} submitted</span>
              <span>Deadline: <strong>{drive.deadline ? new Date(drive.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}</strong></span>
              <span>Target: <strong>{drive.target_count}</strong> ideas</span>
            </div>

            {/* V12 Progress bar — always show structure */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                flex: 1, height: 6, borderRadius: 4,
                background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', overflow: 'hidden',
                border: '1px solid var(--cp-border, var(--cp-bg-sunken))',
              }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: '100%',
                  background: pct >= 100 ? 'var(--ds-text-success, var(--cp-success))' : 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                  minWidth: pct > 0 ? 4 : 0,
                }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', minWidth: 32, textAlign: 'right' }}>
                {submitted}/{drive.target_count}
              </span>
            </div>

            {/* Linked ideas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontWeight: 600, marginRight: '4px' }}>Ideas:</span>
              {drive.ideas.length === 0 && (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-disabled)', fontStyle: 'italic' }}>No ideas linked yet</span>
              )}
              {drive.ideas.map(idea => (
                <span key={idea.idea_key} style={{
                  fontFamily: MONO, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
                  background: 'var(--ds-background-selected)', border: '1px solid var(--ds-background-information)', borderRadius: '4px', padding: '0px 6px',
                }}>{idea.idea_key}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

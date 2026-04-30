/**
 * IdeationDrivesView — Innovation Drives with progress tracking (Supabase-wired)
 * V12: Lucide icons only (no emoji), proper progress bars
 */
import React, { useState } from 'react';
import { Plus, Building2, Bot, Leaf, Target, Zap, Globe, TrendingUp, Lightbulb } from 'lucide-react';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--cp-text-primary, #0F172A)', letterSpacing: '-0.5px', margin: 0, fontFamily: 'var(--cp-font-heading)' }}>Ideas Themes</h2>
            <span style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px',
              padding: '1px 7px', fontSize: '11px', fontWeight: 600,
              fontFamily: MONO, color: '#94A3B8',
            }}>{drives.length}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Themed innovation campaigns to focus idea generation around strategic priorities
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            height: 50, background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px',
            padding: '0 16px', fontSize: '13px', fontWeight: 650, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Plus size={14} /> New Drive
        </button>
      </div>

      <CreateDriveModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {isLoading && (
        <div style={{ color: '#94A3B8', fontSize: 13, padding: 20 }}>Loading drives...</div>
      )}

      {error && (
        <div style={{ color: '#EF4444', fontSize: 13, padding: 20 }}>Failed to load drives.</div>
      )}

      {/* Drive Cards */}
      {drives.map(drive => {
        const submitted = drive.ideas.length;
        const pct = drive.target_count > 0 ? Math.round((submitted / drive.target_count) * 100) : 0;
        const isActive = drive.status === 'active';
        const IconComponent = getDriveIcon(drive.title);
        return (
          <div key={drive.id} style={{
            background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', borderRadius: '6px',
            padding: '20px', marginBottom: '16px',
          }}>
            {/* Title + Icon + Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              {/* V12: Lucide icon container */}
              <div style={{
                width: 36, height: 50, borderRadius: 8,
                background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: 'var(--cp-text-secondary, #475569)',
              }}>
                <IconComponent size={18} strokeWidth={2} />
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', flex: 1 }}>{drive.title}</span>
              {/* V12 3-color lozenge for status */}
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                background: isActive
                  ? (isDark ? 'rgba(59,130,246,0.10)' : '#DEEBFF')
                  : ('var(--cp-border, #DFE1E6)'),
                color: isActive
                  ? ('var(--cp-text-link, #0747A6)')
                  : (isDark ? '#A1A1A1' : '#253858'),
                height: 20, padding: '0 6px', borderRadius: 3, fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.03em',
              }}>
                {isActive ? 'ACTIVE' : 'DRAFT'}
              </span>
            </div>

            {/* Description */}
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>{drive.description}</p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#334155', fontWeight: 500, marginBottom: '10px' }}>
              <span><strong>{submitted}</strong> {submitted === 1 ? 'idea' : 'ideas'} submitted</span>
              <span>Deadline: <strong>{drive.deadline ? new Date(drive.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}</strong></span>
              <span>Target: <strong>{drive.target_count}</strong> ideas</span>
            </div>

            {/* V12 Progress bar — always show structure */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                flex: 1, height: 6, borderRadius: 4,
                background: '#F1F5F9', overflow: 'hidden',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: '100%',
                  background: pct >= 100 ? '#16A34A' : '#2563EB',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                  minWidth: pct > 0 ? 4 : 0,
                }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: '#64748B', minWidth: 32, textAlign: 'right' }}>
                {submitted}/{drive.target_count}
              </span>
            </div>

            {/* Linked ideas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginRight: '4px' }}>Ideas:</span>
              {drive.ideas.length === 0 && (
                <span style={{ fontSize: '11px', color: '#CBD5E1', fontStyle: 'italic' }}>No ideas linked yet</span>
              )}
              {drive.ideas.map(idea => (
                <span key={idea.idea_key} style={{
                  fontFamily: MONO, fontSize: '11px', fontWeight: 600, color: '#2563EB',
                  background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '4px', padding: '1px 6px',
                }}>{idea.idea_key}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

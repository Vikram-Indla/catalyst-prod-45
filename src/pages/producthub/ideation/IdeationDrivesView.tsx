/**
 * IdeationDrivesView — Innovation Drives with progress tracking (Supabase-wired)
 */
import React from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

      // Fetch linked ideas per drive
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

const EMOJI_MAP: Record<string, string> = {
  'V2030': '🏛️',
  'AI': '🤖',
  'Sustainability': '🌱',
};

function getEmoji(title: string): string {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (title.includes(key)) return emoji;
  }
  return '💡';
}

export default function IdeationDrivesView() {
  const { data: drives = [], isLoading, error } = useDrives();

  return (
    <div style={{ padding: '16px 28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>Innovation Drives</h2>
            <span style={{
              background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
              padding: '1px 7px', fontSize: '11px', fontWeight: 600,
              fontFamily: MONO, color: '#94A3B8',
            }}>{drives.length}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Themed innovation campaigns to focus idea generation around strategic priorities
          </p>
        </div>
        <button style={{
          background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px',
          padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}>
          <Plus size={14} /> New Drive
        </button>
      </div>

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
        return (
          <div key={drive.id} style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px',
            padding: '20px', marginBottom: '16px',
          }}>
            {/* Title + Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>{getEmoji(drive.title)}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', flex: 1 }}>{drive.title}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: isActive ? '#DCFCE7' : '#F4F4F5',
                color: isActive ? '#15803D' : '#71717A',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#16A34A' : '#A1A1AA' }} />
                {isActive ? 'Active' : 'Draft'}
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

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '8px', background: '#CBD5E1', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: '100%',
                  background: isActive ? '#16A34A' : '#94A3B8', borderRadius: '4px',
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: '#334155' }}>
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

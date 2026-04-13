/**
 * ProjectJiraLayout — Project header + tab bar + view content
 * Stage C: Full pixel-perfect UI with V12 tokens
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, MoreHorizontal, Share2, Zap, MessageSquare, Maximize2 } from 'lucide-react';
import ProjectListView from './ProjectListView';
import ProjectAllWorkView from './ProjectAllWorkView';

type ProjectView = 'list' | 'allwork';

export default function ProjectJiraLayout() {
  const { key } = useParams<{ key: string }>();
  const [activeView, setActiveView] = useState<ProjectView>('list');

  const { data: project } = useQuery({
    queryKey: ['project-info', key],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        .from('projects')
        .select('id, name, key, color')
        .eq('key', key!)
        .maybeSingle();
      return data as { id: string; name: string; key: string; color: string } | null;
    },
    enabled: !!key,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cp-bg-page)' }} data-testid="project-jira-layout">
      {/* ── Project Header Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 16px', borderBottom: '0.75px solid var(--cp-border-default)',
        background: 'var(--cp-bg-page)', flexShrink: 0,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 4,
          background: project?.color || '#2563EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {project?.key?.[0] ?? 'P'}
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary)', fontFamily: 'Sora, sans-serif' }}>
          {project?.name ?? 'Loading...'}
        </span>
        <button className="ph-icon-btn"><Users size={14} /></button>
        <button className="ph-icon-btn"><MoreHorizontal size={14} /></button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button className="ph-icon-btn"><Share2 size={14} /></button>
          <button className="ph-icon-btn"><Zap size={14} /></button>
          <button className="ph-icon-btn"><MessageSquare size={14} /></button>
          <button className="ph-icon-btn"><Maximize2 size={14} /></button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 0,
        background: 'var(--cp-bg-page)',
        borderBottom: '2px solid var(--cp-border-default)',
        padding: '0 16px', flexShrink: 0,
      }}>
        {[
          { key: 'list' as const, label: 'List' },
          { key: 'allwork' as const, label: 'All work' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            data-testid={`tab-${tab.key}`}
            style={{
              height: 'var(--ph-tab-height, 40px)',
              padding: '0 12px',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              fontWeight: activeView === tab.key ? 500 : 400,
              color: activeView === tab.key ? 'var(--cp-primary)' : 'var(--cp-text-secondary)',
              border: 'none',
              borderBottom: activeView === tab.key ? '2px solid var(--cp-primary)' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
        <button style={{
          width: 32, height: 'var(--ph-tab-height, 40px)', border: 'none',
          background: 'transparent', cursor: 'pointer', fontSize: 18,
          color: 'var(--cp-text-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
      </div>

      {/* ── View Content ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeView === 'list' && <ProjectListView projectKey={key!} />}
        {activeView === 'allwork' && <ProjectAllWorkView projectKey={key!} />}
      </div>
    </div>
  );
}

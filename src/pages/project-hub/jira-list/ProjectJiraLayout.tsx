/**
 * ProjectJiraLayout — Project header + tab bar + view content
 * Stage E: Tab memory via sessionStorage, project-not-found guard
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

  // Cycle 1 §1.10: tab memory via sessionStorage
  const [activeView, setActiveView] = useState<ProjectView>(() => {
    const stored = sessionStorage.getItem(`ph-view-${key}`);
    return (stored === 'allwork' ? 'allwork' : 'list');
  });
  const handleViewChange = (view: ProjectView) => {
    setActiveView(view);
    sessionStorage.setItem(`ph-view-${key}`, view);
  };

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project-info', key],
    queryFn: async () => {
      // @ts-ignore
      const { data, error: qErr } = await supabase
        .from('projects')
        .select('id, name, key, color')
        .eq('key', key!)
        .maybeSingle();
      if (qErr) throw qErr;
      return data as { id: string; name: string; key: string; color: string } | null;
    },
    enabled: !!key,
  });

  // Cycle 1 §1.8: project not found
  if (error) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--cp-text-tertiary)', fontFamily: 'Inter, sans-serif' }}>
      Project not found. <a href="/project-hub/projects" style={{ color: 'var(--cp-text-link)' }}>← Back to projects</a>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--cp-bg-page)' }} data-testid="project-jira-layout">
      {/* ── Project Header Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 16px', borderBottom: '0.75px solid rgba(15, 23, 42, 0.08)',
        background: 'var(--cp-bg-page)', flexShrink: 0,
      }}>
        {isLoading ? (
          <div style={{ height: 24, width: 160, borderRadius: 4, background: '#F1F5F9', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)' }} />
        ) : (
          <>
            <div style={{
              width: 24, height: 24, borderRadius: 4,
              background: project?.color || '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {project?.key?.[0] ?? 'P'}
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary)', fontFamily: 'Sora, sans-serif' }}>
              {project?.name ?? 'Untitled Project'}
            </span>
          </>
        )}
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
            onClick={() => handleViewChange(tab.key)}
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
        {activeView === 'list' && <ProjectListView projectKey={key!} projectId={project?.id} />}
        {activeView === 'allwork' && <ProjectAllWorkView projectKey={key!} />}
      </div>
    </div>
  );
}

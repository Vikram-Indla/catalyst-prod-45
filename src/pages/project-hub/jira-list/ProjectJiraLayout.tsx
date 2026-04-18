/**
 * ProjectJiraLayout — Project header + All Work view
 *
 * 2026-04-18: List tab deprecated per Vikram directive. The List view was a
 * legacy table-only surface that duplicated functionality now owned by the
 * unified All Work view (which itself offers both table and split-panel
 * modes). Keeping two tabs that did almost the same thing caused confusion
 * and sessionStorage tab-memory bugs. Single surface now — route
 * /project-hub/:key/allwork renders ProjectAllWorkView directly, no tab bar.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, MoreHorizontal, Share2, Zap, MessageSquare, Maximize2 } from 'lucide-react';
import ProjectAllWorkView from './ProjectAllWorkView';

export default function ProjectJiraLayout() {
  const { key } = useParams<{ key: string }>();

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

      {/* ── View Content ── All Work only; List tab deprecated 2026-04-18 ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ProjectAllWorkView projectKey={key!} projectId={project?.id} />
      </div>
    </div>
  );
}

/**
 * ProjectJiraLayout — Thin wrapper that resolves projectId from URL :key
 * and delegates rendering to ProjectAllWorkView.
 *
 * 2026-04-18 history:
 *   - List tab deprecated (was redundant with All Work).
 *   - "Senaei BAU" project header bar removed per Vikram — the top nav and
 *     left sidebar already communicate project context, matching how
 *     /project-hub/:key/backlog (the reference surface) is laid out.
 *     All header chrome now lives inside ProjectAllWorkView's own header
 *     card (h1 title + toolbar).
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProjectAllWorkView from './ProjectAllWorkView';

export default function ProjectJiraLayout() {
  const { key } = useParams<{ key: string }>();

  const { data: project, error } = useQuery({
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

  if (error) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--cp-text-tertiary)', fontFamily: 'Inter, sans-serif' }}>
      Project not found. <a href="/project-hub/projects" style={{ color: 'var(--cp-text-link)' }}>← Back to projects</a>
    </div>
  );

  return (
    // 2026-04-18: explicit height cap so child regions (left list cards,
    // center body, right sidebar) can each own their own scroll — matches
    // Jira's 3-region scroll model. The app shell's <main> has
    // overflow-y: auto, but its intermediate wrappers have no height
    // constraint → without an explicit cap here, our inner content grows
    // to ~95,000px and the whole page scrolls instead of the inner regions.
    // 52px = measured top-nav height (i=4 y=52 on 2026-04-18).
    <div
      data-testid="project-jira-layout"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 52px)',
        maxHeight: 'calc(100vh - 52px)',
        minHeight: 0, overflow: 'hidden',
        background: 'var(--cp-bg-page)',
      }}
    >
      <ProjectAllWorkView projectKey={key!} projectId={project?.id} />
    </div>
  );
}

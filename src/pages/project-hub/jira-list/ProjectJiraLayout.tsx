/**
 * ProjectJiraLayout — Project header + tab bar wrapper
 * Stage A: Shell structure only, zero UI polish
 * Route: /project-hub/:key/jira-list  (List tab, default)
 *        /project-hub/:key/jira-allwork (All work tab)
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProjectListView from './ProjectListView';
import ProjectAllWorkView from './ProjectAllWorkView';

type ProjectView = 'list' | 'allwork';

export default function ProjectJiraLayout() {
  const { key } = useParams<{ key: string }>();
  const [activeView, setActiveView] = useState<ProjectView>('list');

  // Fetch project info
  const { data: project } = useQuery({
    queryKey: ['project-info', key],
    queryFn: async () => {
      // @ts-ignore - deep type instantiation
      const { data } = await supabase
        .from('projects')
        .select('id, name, key, color')
        .eq('key', key!)
        .maybeSingle();
      return data;
    },
    enabled: !!key,
  });

  return (
    <div className="flex flex-col h-full" data-testid="project-jira-layout">
      {/* Project Header — shell */}
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--cp-border-default, rgba(15,23,42,0.12))' }}>
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: (project as any)?.color || '#2563EB' }}
        >
          {(project as any)?.key?.[0] ?? 'P'}
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--cp-text-primary, #0F172A)' }}>
          {(project as any)?.name ?? 'Loading...'}
        </span>
      </div>

      {/* Tab Bar — shell */}
      <div className="flex items-center gap-1 px-4 border-b" style={{ height: 40, borderColor: 'var(--cp-border-default, rgba(15,23,42,0.12))' }}>
        <button
          onClick={() => setActiveView('list')}
          data-active={activeView === 'list'}
          data-testid="tab-list"
          className="relative px-3 py-2 text-sm transition-colors"
          style={{
            fontWeight: activeView === 'list' ? 500 : 400,
            color: activeView === 'list' ? '#2563EB' : 'rgb(80, 82, 88)',
          }}
        >
          List
          {activeView === 'list' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#2563EB' }} />
          )}
        </button>
        <button
          onClick={() => setActiveView('allwork')}
          data-active={activeView === 'allwork'}
          data-testid="tab-allwork"
          className="relative px-3 py-2 text-sm transition-colors"
          style={{
            fontWeight: activeView === 'allwork' ? 500 : 400,
            color: activeView === 'allwork' ? '#2563EB' : 'rgb(80, 82, 88)',
          }}
        >
          All work
          {activeView === 'allwork' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#2563EB' }} />
          )}
        </button>
        <button className="px-2 py-1 text-sm rounded hover:bg-muted" style={{ color: 'rgb(80, 82, 88)' }}>
          +
        </button>
      </div>

      {/* View Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeView === 'list' && <ProjectListView projectKey={key!} />}
        {activeView === 'allwork' && <ProjectAllWorkView projectKey={key!} />}
      </div>
    </div>
  );
}

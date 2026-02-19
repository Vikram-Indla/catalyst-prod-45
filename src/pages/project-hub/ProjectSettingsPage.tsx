import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Settings } from 'lucide-react';
import { SettingsTabs, type SettingsTab } from '@/components/project-hub/settings/SettingsTabs';
import { GeneralTab } from '@/components/project-hub/settings/GeneralTab';
import { MembersTab } from '@/components/project-hub/settings/MembersTab';
import { WorkflowTab } from '@/components/project-hub/settings/WorkflowTab';
import { TypesTab } from '@/components/project-hub/settings/TypesTab';
import { LabelsTab } from '@/components/project-hub/settings/LabelsTab';
import { ComponentsTab } from '@/components/project-hub/settings/ComponentsTab';
import { IntegrationTab } from '@/components/project-hub/settings/IntegrationTab';
import { NotificationsTab } from '@/components/project-hub/settings/NotificationsTab';

export default function ProjectSettingsPageNew() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const { data: project, isLoading } = useQuery({
    queryKey: ['ph-project-settings', key],
    queryFn: async () => {
      if (!key) return null;
      const { data, error } = await supabase
        .from('ph_projects')
        .select('*')
        .eq('key', key.toUpperCase())
        .maybeSingle();
      if (error) { console.warn(error.message); return null; }
      return data;
    },
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '32px 40px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center gap-1.5 mb-5">
        <span className="cursor-pointer hover:underline" style={{ fontSize: 13, color: '#64748B' }} onClick={() => navigate('/project-hub/projects')}>ProjectHub</span>
        <ChevronRight size={12} color="#94A3B8" />
        <span className="cursor-pointer hover:underline" style={{ fontSize: 13, color: '#64748B' }} onClick={() => navigate(`/project-hub/${key}/dashboard`)}>{key?.toUpperCase()}</span>
        <ChevronRight size={12} color="#94A3B8" />
        <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>Settings</span>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <Settings size={20} color="#2563EB" strokeWidth={1.75} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>Project Settings</h1>
      </div>

      <SettingsTabs active={activeTab} onChange={setActiveTab} />

      <div className="mt-5" style={{ maxWidth: 680 }}>
        {activeTab === 'General' && project && (
          <GeneralTab
            project={{
              id: project.id, key: project.key, name: project.name,
              description: (project as any).description ?? null,
              department: (project as any).department ?? '',
              status: (project as any).status ?? 'active',
              start_date: (project as any).start_date ?? null,
              end_date: (project as any).end_date ?? null,
              feature_layer: (project as any).feature_layer ?? false,
              ai_assist: (project as any).ai_assist ?? true,
            }}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['ph-project-settings', key] })}
          />
        )}

        {activeTab === 'Members' && project && (
          <MembersTab projectId={project.id} currentUserId={currentUserId} />
        )}

        {activeTab === 'Workflow' && project && (
          <WorkflowTab projectId={project.id} />
        )}

        {activeTab === 'Types' && project && (
          <TypesTab projectId={project.id} featureLayer={(project as any).feature_layer ?? false} />
        )}

        {activeTab === 'Labels' && project && (
          <LabelsTab projectId={project.id} />
        )}

        {activeTab === 'Components' && project && (
          <ComponentsTab projectId={project.id} />
        )}

        {activeTab === 'Integration' && <IntegrationTab />}

        {activeTab === 'Notifications' && <NotificationsTab />}

        {!project && !isLoading && (
          <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '40px 0' }}>Project not found.</div>
        )}
      </div>
    </div>
  );
}

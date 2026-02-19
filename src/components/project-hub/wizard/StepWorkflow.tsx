import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

const DEFAULT_WORKFLOW = [
  { name: 'To Do', color: '#A3A3A3' },
  { name: 'In Progress', color: '#2563EB' },
  { name: 'In Review', color: '#D97706' },
  { name: 'Done', color: '#0D9488' },
  { name: 'Cancelled', color: '#D4D4D4' },
];

export interface StepWorkflowData {
  useDefault: boolean;
  copyFromProject: string | null;
  featureLayer: boolean;
}

interface StepWorkflowProps {
  data: StepWorkflowData;
  onChange: (data: StepWorkflowData) => void;
}

export function StepWorkflow({ data, onChange }: StepWorkflowProps) {
  // Fetch existing projects for "copy from"
  const { data: projects = [] } = useQuery({
    queryKey: ['ph-projects-for-copy'],
    queryFn: async () => {
      const { data: d, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('is_archived', false)
        .order('name');
      if (error) return [];
      return d || [];
    },
  });

  // Fetch statuses of selected project
  const { data: copiedStatuses = [] } = useQuery({
    queryKey: ['ph-statuses-copy', data.copyFromProject],
    queryFn: async () => {
      if (!data.copyFromProject) return [];
      const { data: d, error } = await supabase
        .from('ph_workflow_statuses')
        .select('name, color')
        .eq('project_id', data.copyFromProject)
        .order('position');
      if (error) return [];
      return d || [];
    },
    enabled: !!data.copyFromProject,
  });

  const workflowToShow = data.useDefault ? DEFAULT_WORKFLOW : copiedStatuses;

  return (
    <div className="space-y-5">
      {/* Radio A: Default */}
      <label
        className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
        style={{
          border: data.useDefault ? '2px solid #2563EB' : '1px solid #E2E8F0',
          background: data.useDefault ? '#F8FAFC' : '#FFFFFF',
        }}
      >
        <input
          type="radio"
          checked={data.useDefault}
          onChange={() => onChange({ ...data, useDefault: true, copyFromProject: null })}
          style={{ accentColor: '#2563EB', marginTop: 2 }}
        />
        <div className="flex-1">
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Use default workflow</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Standard project workflow with common statuses</div>
        </div>
      </label>

      {/* Radio B: Copy from */}
      <label
        className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
        style={{
          border: !data.useDefault ? '2px solid #2563EB' : '1px solid #E2E8F0',
          background: !data.useDefault ? '#F8FAFC' : '#FFFFFF',
        }}
      >
        <input
          type="radio"
          checked={!data.useDefault}
          onChange={() => onChange({ ...data, useDefault: false })}
          style={{ accentColor: '#2563EB', marginTop: 2 }}
        />
        <div className="flex-1">
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Copy from existing project</div>
          {!data.useDefault && projects.length > 0 && (
            <select
              value={data.copyFromProject || ''}
              onChange={e => onChange({ ...data, copyFromProject: e.target.value || null })}
              className="mt-2"
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                fontSize: 13,
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                background: '#FFFFFF',
                color: '#0F172A',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <option value="">Select a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.key} — {p.name}</option>
              ))}
            </select>
          )}
          {!data.useDefault && projects.length === 0 && (
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>No other projects available</div>
          )}
        </div>
      </label>

      {/* Workflow preview */}
      {workflowToShow.length > 0 && (
        <div className="p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
            Workflow Preview
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {workflowToShow.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1">
                <span
                  className="inline-flex items-center rounded-full"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 10px',
                    background: '#FFFFFF',
                    border: `1px solid ${s.color}`,
                    color: s.color,
                  }}
                >
                  <span className="rounded-full mr-1.5" style={{ width: 6, height: 6, background: s.color, display: 'inline-block' }} />
                  {s.name}
                </span>
                {i < workflowToShow.length - 1 && <ArrowRight size={12} color="#CBD5E1" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature layer checkbox */}
      <label className="flex items-start gap-3 cursor-pointer" style={{ paddingTop: 4 }}>
        <input
          type="checkbox"
          checked={data.featureLayer}
          onChange={e => onChange({ ...data, featureLayer: e.target.checked })}
          style={{ accentColor: '#2563EB', marginTop: 3 }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Enable Feature Layer</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
            Adds Feature as an intermediate level between Epic and Story/Bug/Task
          </div>
        </div>
      </label>
    </div>
  );
}

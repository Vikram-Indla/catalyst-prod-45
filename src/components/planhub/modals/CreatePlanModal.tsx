import React, { useState } from 'react';
import { X, FileText, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateRow, TemplatePhase } from '@/types/planhub.types';

interface Props {
  onClose: () => void;
  onCreated: (planId: string) => void;
}

export default function CreatePlanModal({ onClose, onCreated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['planhub', 'templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planhub_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw new Error(error.message);
      return data as unknown as TemplateRow[];
    },
  });

  // Create mutation
  const createPlan = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const template = templates?.find(t => t.id === selectedTemplate);
      
      const { data, error } = await supabase
        .from('planhub_plans')
        .insert({
          name,
          description: description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // If template selected, create phases as tasks
      if (template && template.phases) {
        const phases = template.phases as TemplatePhase[];
        let position = 0;
        
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          await supabase.from('planhub_tasks').insert({
            plan_id: data.id,
            wbs: `${i + 1}`,
            name: phase.name,
            type: 'phase',
            days: phase.duration_days,
            position: position++,
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planhub', 'plans'] });
      toast({ title: 'Plan created successfully' });
      onCreated(data.id);
    },
    onError: (error) => {
      toast({ title: 'Failed to create plan', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createPlan.mutate();
  };

  return (
    <div className="ph-modal-backdrop" onClick={onClose}>
      <div className="ph-modal" onClick={e => e.stopPropagation()}>
        <div className="ph-modal-header">
          <h2 className="ph-modal-title">Create New Plan</h2>
          <button onClick={onClose} className="ph-btn ph-btn-ghost ph-btn-sm">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ph-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ph-space-5)' }}>
            {/* Plan Name */}
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 'var(--ph-text-sm)' }}>
                Plan Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Q1 Product Launch"
                className="ph-form-input"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 'var(--ph-text-sm)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of this plan..."
                className="ph-form-input"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Template Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 'var(--ph-text-sm)' }}>
                Start from Template
              </label>
              <div className="ph-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--ph-space-3)' }}>
                {/* Blank option */}
                <div
                  onClick={() => setSelectedTemplate(null)}
                  className="ph-card"
                  style={{ 
                    padding: 'var(--ph-space-4)', cursor: 'pointer',
                    border: selectedTemplate === null ? '2px solid var(--ph-primary)' : '1px solid var(--ph-border)',
                    background: selectedTemplate === null ? 'var(--ph-primary-light)' : 'var(--ph-surface)'
                  }}
                >
                  <FileText size={20} style={{ marginBottom: 8, color: 'var(--ph-gray-500)' }} />
                  <div style={{ fontWeight: 600 }}>Blank Plan</div>
                  <div className="ph-text-sm ph-text-gray-500">Start from scratch</div>
                </div>

                {/* Templates */}
                {templates?.map(template => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className="ph-card"
                    style={{ 
                      padding: 'var(--ph-space-4)', cursor: 'pointer',
                      border: selectedTemplate === template.id ? '2px solid var(--ph-primary)' : '1px solid var(--ph-border)',
                      background: selectedTemplate === template.id ? 'var(--ph-primary-light)' : 'var(--ph-surface)'
                    }}
                  >
                    <Sparkles size={20} style={{ marginBottom: 8, color: 'var(--ph-primary)' }} />
                    <div style={{ fontWeight: 600 }}>{template.name}</div>
                    <div className="ph-text-sm ph-text-gray-500">{template.duration_days} days</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ph-modal-footer">
            <button type="button" onClick={onClose} className="ph-btn ph-btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="ph-btn ph-btn-primary"
              disabled={!name.trim() || createPlan.isPending}
            >
              {createPlan.isPending ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

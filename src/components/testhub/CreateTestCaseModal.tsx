/**
 * Create Test Case Modal for TestHub
 * Ring-fenced CATALYST V10 design with th-* classes
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId?: string | null;
}

interface TestStep {
  action: string;
  expected_result: string;
}

export function CreateTestCaseModal({
  open,
  onOpenChange,
  projectId,
  folderId,
}: CreateTestCaseModalProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preconditions: '',
    priority: 'medium',
    type: 'functional',
    status: 'draft',
    automation_status: 'manual',
  });
  
  const [steps, setSteps] = useState<TestStep[]>([
    { action: '', expected_result: '' }
  ]);

  const generateCaseKey = async (): Promise<string> => {
    const { data } = await supabase
      .from('tm_test_cases')
      .select('case_key')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0 && data[0].case_key) {
      const match = data[0].case_key.match(/TC-(\d+)/);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        return `TC-${String(lastNum + 1).padStart(4, '0')}`;
      }
    }
    return 'TC-0001';
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const case_key = await generateCaseKey();
      
      const { data: priorities } = await supabase
        .from('tm_case_priorities')
        .select('id')
        .eq('project_id', projectId)
        .ilike('name', formData.priority)
        .limit(1);
      
      const { data: types } = await supabase
        .from('tm_case_types')
        .select('id')
        .eq('project_id', projectId)
        .ilike('name', formData.type)
        .limit(1);

      const insertData = {
        project_id: projectId,
        case_key,
        title: formData.title,
        description: formData.description || null,
        preconditions: formData.preconditions || null,
        status: formData.status,
        automation_status: formData.automation_status,
        priority_id: priorities?.[0]?.id || null,
        case_type_id: types?.[0]?.id || null,
        folder_id: folderId || null,
        created_by: user.id,
        version: 1,
      };

      const { data: testCase, error: tcError } = await supabase
        .from('tm_test_cases')
        .insert(insertData as any)
        .select()
        .single();
      
      if (tcError) throw tcError;
      
      const stepsToInsert = steps
        .filter(s => s.action.trim())
        .map((step, index) => ({
          test_case_id: testCase.id,
          step_number: index + 1,
          action: step.action,
          expected_result: step.expected_result || '',
        }));
      
      if (stepsToInsert.length > 0) {
        const { error: stepsError } = await supabase
          .from('tm_test_steps')
          .insert(stepsToInsert);
        
        if (stepsError) throw stepsError;
      }
      
      return testCase;
    },
    onSuccess: (testCase) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['tm-folders-with-counts'] });
      toast.success(`Test case ${testCase.case_key} created`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Failed to create test case:', error);
      toast.error(`Failed to create test case: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      preconditions: '',
      priority: 'medium',
      type: 'functional',
      status: 'draft',
      automation_status: 'manual',
    });
    setSteps([{ action: '', expected_result: '' }]);
  };

  const addStep = () => {
    setSteps([...steps, { action: '', expected_result: '' }]);
  };

  const updateStep = (index: number, field: keyof TestStep, value: string) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    createMutation.mutate();
  };

  if (!open) return null;

  return (
    <div className={cn('th-modal-overlay', open && 'open')} onClick={() => onOpenChange(false)}>
      <div className="th-modal th-modal-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="th-modal-header">
          <div>
            <h2 className="th-modal-title">Create Test Case</h2>
            <p className="th-modal-subtitle">Add a new test case to the repository</p>
          </div>
          <button className="th-modal-close" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="th-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              {/* Left Column - Main Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Title */}
                <div>
                  <label className="th-label th-label-required">Title</label>
                  <input
                    type="text"
                    className="th-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter a descriptive title..."
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="th-label">Description / Objective</label>
                  <textarea
                    className="th-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does this test verify?"
                    rows={3}
                  />
                </div>

                {/* Preconditions */}
                <div>
                  <label className="th-label">Preconditions</label>
                  <textarea
                    className="th-textarea"
                    value={formData.preconditions}
                    onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                    placeholder="List conditions that must be met..."
                    rows={2}
                  />
                </div>

                {/* Test Steps */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="th-label" style={{ marginBottom: 0 }}>Test Steps</label>
                    <span style={{ fontSize: 'var(--th-text-sm)', color: 'var(--th-text-faint)' }}>
                      {steps.length} step(s)
                    </span>
                  </div>
                  <div className="th-steps-editor">
                    <div className="th-steps-list">
                      {steps.map((step, index) => (
                        <div key={index} className="th-step-row">
                          <div className="th-step-drag">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="th-step-num">
                            <div className="th-step-num-badge">{index + 1}</div>
                          </div>
                          <div className="th-step-content">
                            <div className="th-step-field">
                              <div className="th-step-field-label">Action</div>
                              <textarea
                                className="th-textarea"
                                value={step.action}
                                onChange={(e) => updateStep(index, 'action', e.target.value)}
                                placeholder="Describe the action to perform..."
                                style={{ minHeight: '60px' }}
                              />
                            </div>
                            <div className="th-step-field">
                              <div className="th-step-field-label">Expected Result</div>
                              <textarea
                                className="th-textarea"
                                value={step.expected_result}
                                onChange={(e) => updateStep(index, 'expected_result', e.target.value)}
                                placeholder="Describe the expected outcome..."
                                style={{ minHeight: '60px' }}
                              />
                            </div>
                          </div>
                          <div className="th-step-actions">
                            <button
                              type="button"
                              className={cn('th-step-action-btn', 'danger')}
                              onClick={() => removeStep(index)}
                              disabled={steps.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="th-add-step">
                      <button type="button" className="th-add-step-btn" onClick={addStep}>
                        <Plus className="h-4 w-4" />
                        Add Step
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Priority */}
                <div>
                  <label className="th-label">Priority</label>
                  <select
                    className="th-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="th-label">Type</label>
                  <select
                    className="th-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="functional">Functional</option>
                    <option value="regression">Regression</option>
                    <option value="security">Security</option>
                    <option value="integration">Integration</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="th-label">Status</label>
                  <select
                    className="th-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                    <option value="approved">Approved</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>

                {/* Automation */}
                <div>
                  <label className="th-label">Automation</label>
                  <select
                    className="th-select"
                    value={formData.automation_status}
                    onChange={(e) => setFormData({ ...formData, automation_status: e.target.value })}
                  >
                    <option value="manual">Manual</option>
                    <option value="automated">Automated</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="th-modal-footer">
            <button type="button" className="th-btn-secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button type="submit" className="th-btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Test Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

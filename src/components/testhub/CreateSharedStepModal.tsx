/**
 * CreateSharedStepModal — Full create modal with variable management
 * G2-05: Variables auto-detected from {{var}} in action text
 */

import { useState, useEffect, Fragment } from 'react';
import { X, Plus, Trash2, Variable, AlertCircle } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface StepVariable {
  name: string;
  default: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface SharedStepInput {
  id: string;
  name: string;
  description: string | null;
  action: string;
  expected_result: string | null;
  category_id: string | null;
  variables: any;
  usage_count: number;
}

interface CreateSharedStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  mode?: 'create' | 'edit';
  sharedStep?: SharedStepInput | null;
}

export function CreateSharedStepModal({ isOpen, onClose, onSuccess, categories, mode = 'create', sharedStep }: CreateSharedStepModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [action, setAction] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [variables, setVariables] = useState<StepVariable[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset/prefill on open
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && sharedStep) {
        setName(sharedStep.name || '');
        setDescription(sharedStep.description || '');
        setCategoryId(sharedStep.category_id || '');
        setAction(sharedStep.action || '');
        setExpectedResult(sharedStep.expected_result || '');
        const vars = Array.isArray(sharedStep.variables) ? sharedStep.variables : [];
        setVariables(vars.map((v: any) => ({ name: v.name || '', default: v.default || '' })));
      } else {
        setName(''); setDescription(''); setCategoryId(''); setAction('');
        setExpectedResult(''); setVariables([]);
      }
      setErrors({});
    }
  }, [isOpen, mode, sharedStep]);

  // Auto-detect variables from action text
  useEffect(() => {
    const matches = action.match(/\{\{([^}]+)\}\}/g) || [];
    const detected = matches.map(m => m.replace(/\{\{|\}\}/g, '').trim());
    const existing = variables.map(v => v.name);
    detected.forEach(varName => {
      if (!existing.includes(varName)) {
        setVariables(prev => [...prev, { name: varName, default: '' }]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const addVariable = () => setVariables(prev => [...prev, { name: '', default: '' }]);
  const removeVariable = (i: number) => setVariables(prev => prev.filter((_, idx) => idx !== i));
  const updateVariable = (i: number, field: 'name' | 'default', value: string) =>
    setVariables(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!action.trim()) e.action = 'Action is required';
    const names = variables.map(v => v.name.trim().toLowerCase());
    if (variables.some(v => !v.name.trim())) e.variables = 'All variables must have a name';
    else if (names.length !== new Set(names).size) e.variables = 'Variable names must be unique';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const cleanVars = variables.filter(v => v.name.trim()).map(v => ({ name: v.name.trim(), default: v.default.trim() }));
      const stepData = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        action: action.trim(),
        expected_result: expectedResult.trim() || null,
        variables: cleanVars as any,
      };

      if (mode === 'edit' && sharedStep) {
        const { error } = await typedQuery('tm_shared_steps')
          .update({ ...stepData, updated_at: new Date().toISOString() })
          .eq('id', sharedStep.id);
        if (error) { catalystToast.error(error.message || 'Failed to update', { title: 'Update Failed' }); return; }

        // Propagate updated content to all referencing tm_test_steps rows (C-05 / H-12)
        try {
          await supabase
            .from('tm_test_steps' as any)
            .update({
              action: stepData.action,
              expected_result: stepData.expected_result,
            })
            .eq('shared_step_id', sharedStep.id)
            .eq('is_shared', true);
        } catch (propErr) {
          console.warn('Propagation to test steps failed:', propErr);
        }

        catalystToast.success('Shared step updated successfully', { title: 'Updated' });
      } else {
        const { error } = await typedQuery('tm_shared_steps')
          .insert({ ...stepData, usage_count: 0, is_active: true, project_id: '00000000-0000-0000-0000-000000000001' });
        if (error) { catalystToast.error(error.message || 'Failed to create', { title: 'Creation Failed' }); return; }
        catalystToast.success('Shared step created successfully', { title: 'Created' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to save shared step', { title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const highlightPreview = (text: string) => {
    if (!text) return null;
    return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={i} style={{
            display: 'inline', padding: '1px 6px', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)',
            color: 'var(--cp-blue)', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, fontWeight: 600,
          }}>{part}</span>
        );
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
  };

  if (!isOpen) return null;

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', height: 40, padding: '8px 12px',
    border: `1.5px solid ${hasError ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8,
    fontSize: 14, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)',
  });

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 600, maxHeight: '90vh', backgroundColor: 'var(--cp-float)', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              {mode === 'edit' ? 'Edit Shared Step' : 'Create Shared Step'}
            </h2>
            <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>
              {mode === 'edit' ? 'Update this shared step' : 'Create a reusable test step for your test cases'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: 'none', borderRadius: 6,
            backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Login with valid credentials" style={inputStyle(!!errors.name)} />
            {errors.name && <ErrorText text={errors.name} />}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this step does" style={inputStyle()} />
          </div>

          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              style={{ ...inputStyle(), backgroundColor: 'var(--cp-float)' }}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Action */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Action *
              <span style={{ fontWeight: 400, color: 'var(--fg-4)', marginLeft: 8 }}>
                Use {'{{variable}}'} for dynamic values
              </span>
            </label>
            <textarea value={action} onChange={(e) => setAction(e.target.value)}
              placeholder='Describe the action to perform. Use {{username}} for variables.'
              style={{
                width: '100%', minHeight: 100, padding: '10px 12px',
                border: `1.5px solid ${errors.action ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8,
                fontSize: 14, color: 'var(--fg-1)', resize: 'vertical', fontFamily: 'var(--cp-font-body)',
              }} />
            {errors.action && <ErrorText text={errors.action} />}
            {action && (
              <div style={{
                marginTop: 8, padding: 12, backgroundColor: 'var(--bg-1)', borderRadius: 8,
                fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>
                  PREVIEW:
                </span>
                {highlightPreview(action)}
              </div>
            )}
          </div>

          {/* Expected Result */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Expected Result</label>
            <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="Describe the expected outcome"
              style={{
                width: '100%', minHeight: 80, padding: '10px 12px',
                border: '1.5px solid var(--divider)', borderRadius: 8,
                fontSize: 14, color: 'var(--fg-1)', resize: 'vertical', fontFamily: 'var(--cp-font-body)',
              }} />
          </div>

          {/* Variables */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
                <Variable size={16} style={{ color: 'var(--cp-blue)' }} />
                Variables
                <span style={{
                  fontSize: 11, fontWeight: 500, color: 'var(--fg-3)',
                  backgroundColor: 'var(--cp-bd-zone)', padding: '2px 6px', borderRadius: 4,
                }}>{variables.length}</span>
              </label>
              <button type="button" onClick={addVariable} style={{
                height: 32, padding: '8px 12px', border: '1px solid var(--divider)', borderRadius: 6,
                backgroundColor: 'var(--cp-float)', color: 'var(--cp-blue)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--cp-font-body)',
              }}>
                <Plus size={14} /> Add Variable
              </button>
            </div>

            {errors.variables && <ErrorText text={errors.variables} />}

            {variables.length === 0 ? (
              <div style={{
                padding: 16, backgroundColor: 'var(--bg-1)', borderRadius: 8,
                textAlign: 'center', color: 'var(--fg-4)', fontSize: 13, fontFamily: 'var(--cp-font-body)',
              }}>
                No variables defined. Variables are auto-detected from {'{{variable}}'} in action text.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {variables.map((v, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: 12, backgroundColor: 'var(--bg-1)', borderRadius: 8,
                  }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 4, fontFamily: 'var(--cp-font-body)' }}>
                        Variable Name
                      </label>
                      <input type="text" value={v.name} onChange={(e) => updateVariable(i, 'name', e.target.value)}
                        placeholder="e.g., username"
                        style={{
                          width: '100%', height: 50, padding: '0 10px',
                          border: '1.5px solid var(--divider)', borderRadius: 6,
                          fontSize: 13, fontFamily: 'monospace',
                        }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 4, fontFamily: 'var(--cp-font-body)' }}>
                        Default Value
                      </label>
                      <input type="text" value={v.default} onChange={(e) => updateVariable(i, 'default', e.target.value)}
                        placeholder="Optional default"
                        style={{
                          width: '100%', height: 50, padding: '0 10px',
                          border: '1.5px solid var(--divider)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--cp-font-body)',
                        }} />
                    </div>
                    <button type="button" onClick={() => removeVariable(i)} style={{
                      width: 36, height: 50, padding: 0, border: 'none', borderRadius: 6,
                      backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 18,
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0,
        }}>
          <button onClick={onClose} disabled={isSubmitting} style={{
            height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)',
            border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500,
            color: 'var(--fg-2)', cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{
            height: 40, padding: '0 20px',
            background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            color: '#FFFFFF', cursor: isSubmitting ? 'wait' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1, fontFamily: 'var(--cp-font-body)',
          }}>
            {isSubmitting ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Shared Step')}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6, fontFamily: 'var(--cp-font-body)',
};

function ErrorText({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--cp-font-body)' }}>
      <AlertCircle size={12} /> {text}
    </p>
  );
}

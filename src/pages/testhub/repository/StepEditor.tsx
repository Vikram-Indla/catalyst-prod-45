import React from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import { Plus, Trash2, ArrowUp, ArrowDown } from '@/lib/atlaskit-icons';

export interface StepInput {
  action: string;
  expected_result: string;
  test_data: string;
}

interface StepEditorProps {
  steps: StepInput[];
  onChange: (steps: StepInput[]) => void;
}

export function StepEditor({ steps, onChange }: StepEditorProps) {
  const addStep = () => {
    onChange([...steps, { action: '', expected_result: '', test_data: '' }]);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepInput, value: string) => {
    const next = steps.map((s, i) => i === index ? { ...s, [field]: value } : s);
    onChange(next);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...steps];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const next = [...steps];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const taStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--ds-border)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 'var(--ds-font-size-300)',
    fontFamily: 'var(--ds-font-family-body)',
    color: 'var(--ds-text)',
    background: 'var(--ds-surface)',
    resize: 'vertical',
    minHeight: 56,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div>
      {steps.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', margin: '0 0 12px' }}>No steps yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              border: '1px solid var(--ds-border)',
              borderRadius: 6,
              padding: 12,
              background: 'var(--ds-surface-raised)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)' }}>Step {i + 1}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <IconButton icon={ArrowUp} label="Move up" appearance="subtle" spacing="compact" isDisabled={i === 0} onClick={() => moveUp(i)} />
                  <IconButton icon={ArrowDown} label="Move down" appearance="subtle" spacing="compact" isDisabled={i === steps.length - 1} onClick={() => moveDown(i)} />
                  <IconButton icon={Trash2} label="Delete step" appearance="subtle" spacing="compact" onClick={() => removeStep(i)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Action</label>
                  <textarea value={step.action} onChange={e => updateStep(i, 'action', e.target.value)} style={taStyle} placeholder="Describe the action to perform" />
                </div>
                <div>
                  <label style={labelStyle}>Expected result</label>
                  <textarea value={step.expected_result} onChange={e => updateStep(i, 'expected_result', e.target.value)} style={taStyle} placeholder="What should happen" />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>Test data (optional)</label>
                <input
                  type="text"
                  value={step.test_data}
                  onChange={e => updateStep(i, 'test_data', e.target.value)}
                  style={{ ...taStyle, minHeight: 'unset', height: 32, resize: 'none' }}
                  placeholder="e.g. username=admin"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button onClick={addStep} iconBefore={Plus} appearance="subtle" shouldFitContainer>
        Add step
      </Button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--ds-font-size-100)',
  fontWeight: 600,
  color: 'var(--ds-text-subtle)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

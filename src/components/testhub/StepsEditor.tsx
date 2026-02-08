import { GripVertical, Paperclip, Copy, ArrowUp, Trash2, Plus } from 'lucide-react';

interface Step {
  id: string;
  action: string;
  expectedResult: string;
}

interface StepsEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

export function StepsEditor({ steps, onChange }: StepsEditorProps) {
  const addStep = () => {
    onChange([...steps, { id: Date.now().toString(), action: '', expectedResult: '' }]);
  };

  const updateStep = (id: string, field: 'action' | 'expectedResult', value: string) => {
    onChange(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteStep = (id: string) => {
    if (steps.length > 1) {
      onChange(steps.filter(s => s.id !== id));
    }
  };

  const cloneStep = (id: string) => {
    const index = steps.findIndex(s => s.id === id);
    if (index !== -1) {
      const step = steps[index];
      const newStep = { id: Date.now().toString(), action: step.action, expectedResult: step.expectedResult };
      const newSteps = [...steps];
      newSteps.splice(index + 1, 0, newStep);
      onChange(newSteps);
    }
  };

  const insertAbove = (id: string) => {
    const index = steps.findIndex(s => s.id === id);
    if (index !== -1) {
      const newStep = { id: Date.now().toString(), action: '', expectedResult: '' };
      const newSteps = [...steps];
      newSteps.splice(index, 0, newStep);
      onChange(newSteps);
    }
  };

  return (
    <div style={{
      border: '1px solid #E2E8F0',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        padding: '0 16px',
        backgroundColor: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Steps</span>
        <span style={{ fontSize: 13, color: '#64748B' }}>{steps.length} step(s)</span>
      </div>

      {/* Steps List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              borderBottom: index < steps.length - 1 ? '1px solid #E2E8F0' : 'none',
              backgroundColor: '#FFFFFF',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFBFC'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            {/* Drag Handle */}
            <div style={{
              width: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #E2E8F0',
              cursor: 'grab',
              color: '#CBD5E1',
              transition: 'all 0.15s',
            }}>
              <GripVertical style={{ width: 16, height: 16 }} />
            </div>

            {/* Number Badge */}
            <div style={{
              width: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {index + 1}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: 16, minWidth: 0 }}>
              {/* Action Field */}
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748B',
                  marginBottom: 6,
                }}>Action</label>
                <textarea
                  value={step.action}
                  onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                  placeholder="Describe the action to perform..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '10px 12px',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 8,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Expected Result Field */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748B',
                  marginBottom: 6,
                }}>Expected Result</label>
                <textarea
                  value={step.expectedResult}
                  onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                  placeholder="Describe the expected outcome..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '10px 12px',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 8,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Actions Column */}
            <div style={{
              width: 80,
              borderLeft: '1px solid #E2E8F0',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              <ActionButton icon={Paperclip} title="Attach file" onClick={() => {}} />
              <ActionButton icon={Copy} title="Clone step" onClick={() => cloneStep(step.id)} />
              <ActionButton icon={ArrowUp} title="Insert above" onClick={() => insertAbove(step.id)} />
              <ActionButton 
                icon={Trash2} 
                title="Delete step" 
                onClick={() => deleteStep(step.id)}
                danger
                disabled={steps.length === 1}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Step */}
      <div style={{ padding: 16, borderTop: '1px solid #E2E8F0' }}>
        <button
          onClick={addStep}
          style={{
            width: '100%',
            height: 48,
            padding: 0,
            backgroundColor: 'transparent',
            border: '2px dashed #E2E8F0',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563EB';
            e.currentTarget.style.color = '#2563EB';
            e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus style={{ width: 18, height: 18 }} />
          Add Step
        </button>
      </div>
    </div>
  );
}

function ActionButton({ 
  icon: Icon, 
  title, 
  onClick, 
  danger = false,
  disabled = false,
}: { 
  icon: any; 
  title: string; 
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32,
        height: 32,
        padding: 0,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        color: '#94A3B8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (danger) {
            e.currentTarget.style.backgroundColor = '#FEF2F2';
            e.currentTarget.style.borderColor = '#FECACA';
            e.currentTarget.style.color = '#DC2626';
          } else {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.color = '#475569';
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#FFFFFF';
        e.currentTarget.style.borderColor = '#E2E8F0';
        e.currentTarget.style.color = '#94A3B8';
      }}
    >
      <Icon style={{ width: 14, height: 14 }} />
    </button>
  );
}

export default StepsEditor;

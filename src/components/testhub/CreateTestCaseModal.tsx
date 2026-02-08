import { useState } from 'react';
import { X, Plus, GripVertical, Paperclip, Copy, ArrowUp, Trash2, ChevronDown } from 'lucide-react';

interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
}

interface CreateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTestCaseData) => void;
  folders: { id: string; name: string }[];
  selectedFolderId?: string;
}

interface CreateTestCaseData {
  title: string;
  objective: string;
  preconditions: string;
  folderId: string;
  priority: string;
  type: string;
  status: string;
  automation: string;
  steps: { action: string; expectedResult: string }[];
}

export function CreateTestCaseModal({
  isOpen,
  onClose,
  onSave,
  folders,
  selectedFolderId,
}: CreateTestCaseModalProps) {
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [folderId, setFolderId] = useState(selectedFolderId || '');
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('functional');
  const [status, setStatus] = useState('draft');
  const [automation, setAutomation] = useState('manual');
  const [steps, setSteps] = useState<TestStep[]>([
    { id: '1', action: '', expectedResult: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addStep = () => {
    setSteps([...steps, { id: Date.now().toString(), action: '', expectedResult: '' }]);
  };

  const updateStep = (id: string, field: 'action' | 'expectedResult', value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter(s => s.id !== id));
    }
  };

  const cloneStep = (id: string) => {
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex !== -1) {
      const step = steps[stepIndex];
      const newStep = { id: Date.now().toString(), action: step.action, expectedResult: step.expectedResult };
      const newSteps = [...steps];
      newSteps.splice(stepIndex + 1, 0, newStep);
      setSteps(newSteps);
    }
  };

  const insertStepAbove = (id: string) => {
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex !== -1) {
      const newStep = { id: Date.now().toString(), action: '', expectedResult: '' };
      const newSteps = [...steps];
      newSteps.splice(stepIndex, 0, newStep);
      setSteps(newSteps);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        title,
        objective,
        preconditions,
        folderId,
        priority,
        type,
        status,
        automation,
        steps: steps.filter(s => s.action.trim()).map(s => ({
          action: s.action,
          expectedResult: s.expectedResult,
        })),
      });
      setTitle('');
      setObjective('');
      setPreconditions('');
      setSteps([{ id: '1', action: '', expectedResult: '' }]);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    height: 40,
    width: '100%',
    padding: '0 12px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: '#0F172A',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    height: 'auto',
    minHeight: 80,
    padding: '10px 12px',
    resize: 'vertical' as const,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394A3B8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 40,
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: '#0F172A',
    marginBottom: 6,
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 800,
          maxWidth: '95vw',
          maxHeight: '85vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
            }}>Create Test Case</h2>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: '#64748B',
              margin: '4px 0 0 0',
            }}>Add a new test case to the repository</p>
          </div>
          <button 
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              border: 'none',
              borderRadius: 8,
              backgroundColor: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: 24,
          overflowY: 'auto',
          flex: 1,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: 24,
          }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>
                  Title <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter a descriptive title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle}
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

              <div>
                <label style={labelStyle}>Description / Objective</label>
                <textarea
                  placeholder="What does this test verify?"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 100 }}
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

              <div>
                <label style={labelStyle}>Preconditions</label>
                <textarea
                  placeholder="List conditions that must be met..."
                  value={preconditions}
                  onChange={(e) => setPreconditions(e.target.value)}
                  style={textareaStyle}
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

              <div>
                <label style={labelStyle}>
                  Test Steps <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  {/* Steps Header */}
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                      Steps ({steps.length})
                    </span>
                  </div>

                  {/* Steps List */}
                  <div style={{ padding: 12 }}>
                    {steps.map((step, index) => (
                      <div 
                        key={step.id}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: 12,
                          backgroundColor: '#FAFAFA',
                          borderRadius: 8,
                          marginBottom: index < steps.length - 1 ? 12 : 0,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          paddingTop: 4,
                        }}>
                          <GripVertical style={{ width: 16, height: 16, color: '#CBD5E1', cursor: 'grab' }} />
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: '#E2E8F0',
                            color: '#64748B',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>{index + 1}</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginBottom: 4, display: 'block' }}>Action</label>
                            <textarea
                              placeholder="Describe the action to perform..."
                              value={step.action}
                              onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: 60,
                                padding: '8px 12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: 6,
                                fontSize: 13,
                                resize: 'vertical',
                                outline: 'none',
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                              onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 500, color: '#64748B', marginBottom: 4, display: 'block' }}>Expected Result</label>
                            <textarea
                              placeholder="Describe the expected outcome..."
                              value={step.expectedResult}
                              onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: 60,
                                padding: '8px 12px',
                                border: '1px solid #E2E8F0',
                                borderRadius: 6,
                                fontSize: 13,
                                resize: 'vertical',
                                outline: 'none',
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                              onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {[
                            { icon: Copy, title: 'Clone', action: () => cloneStep(step.id) },
                            { icon: ArrowUp, title: 'Insert above', action: () => insertStepAbove(step.id) },
                            { icon: Trash2, title: 'Delete', action: () => removeStep(step.id), danger: true, disabled: steps.length === 1 },
                          ].map(({ icon: Icon, title, action, danger, disabled }) => (
                            <button
                              key={title}
                              onClick={action}
                              disabled={disabled}
                              title={title}
                              style={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                border: 'none',
                                borderRadius: 6,
                                backgroundColor: 'transparent',
                                color: disabled ? '#CBD5E1' : danger ? '#EF4444' : '#94A3B8',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icon style={{ width: 14, height: 14 }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Step */}
                  <div style={{ padding: '0 12px 12px' }}>
                    <button
                      onClick={addStep}
                      style={{
                        width: '100%',
                        height: 36,
                        padding: 0,
                        border: '1.5px dashed #CBD5E1',
                        borderRadius: 8,
                        backgroundColor: 'transparent',
                        color: '#64748B',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2563EB';
                        e.currentTarget.style.color = '#2563EB';
                        e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.color = '#64748B';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Plus style={{ width: 16, height: 16 }} />
                      Add Step
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Folder', value: folderId, onChange: setFolderId, options: [{ value: '', label: 'No folder' }, ...folders.map(f => ({ value: f.id, label: f.name }))] },
                { label: 'Priority', value: priority, onChange: setPriority, options: [{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
                { label: 'Type', value: type, onChange: setType, options: [{ value: 'functional', label: 'Functional' }, { value: 'regression', label: 'Regression' }, { value: 'security', label: 'Security' }, { value: 'integration', label: 'Integration' }, { value: 'performance', label: 'Performance' }] },
                { label: 'Status', value: status, onChange: setStatus, options: [{ value: 'draft', label: 'Draft' }, { value: 'ready', label: 'Ready' }, { value: 'approved', label: 'Approved' }, { value: 'deprecated', label: 'Deprecated' }] },
                { label: 'Automation', value: automation, onChange: setAutomation, options: [{ value: 'manual', label: 'Manual' }, { value: 'automated', label: 'Automated' }, { value: 'planned', label: 'Planned' }] },
              ].map(({ label, value, onChange, options }) => (
                <div key={label}>
                  <label style={labelStyle}>{label}</label>
                  <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={selectStyle}
                  >
                    {options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 40,
              padding: '0 20px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            style={{
              height: 40,
              padding: '0 20px',
              background: !title.trim() || isSaving ? '#94A3B8' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: !title.trim() || isSaving ? 'not-allowed' : 'pointer',
              boxShadow: !title.trim() || isSaving ? 'none' : '0 2px 8px rgba(37,99,235,0.18)',
              transition: 'all 0.15s',
            }}
          >
            {isSaving ? 'Creating...' : 'Create Test Case'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTestCaseModal;

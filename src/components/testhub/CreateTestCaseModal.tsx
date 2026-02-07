// ═══════════════════════════════════════════════════════════════════════════
// CREATE TEST CASE MODAL COMPONENT
// Copy this ENTIRE file to: src/components/testhub/CreateTestCaseModal.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Plus, GripVertical, Paperclip, Copy, ArrowUp, Trash2 } from 'lucide-react';

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

  return (
    <div className={`th-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="th-modal th-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="th-modal-header">
          <div className="th-modal-header-content">
            <h2 className="th-modal-title">Create Test Case</h2>
            <p className="th-modal-subtitle">Add a new test case to the repository</p>
          </div>
          <button className="th-modal-close" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="th-modal-body">
          <div className="th-modal-two-col">
            <div className="th-modal-main-col">
              <div className="th-form-row">
                <label className="th-label required">Title</label>
                <input
                  type="text"
                  className="th-input"
                  placeholder="Enter a descriptive title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="th-form-row">
                <label className="th-label">Description / Objective</label>
                <textarea
                  className="th-textarea"
                  placeholder="What does this test verify?"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div className="th-form-row">
                <label className="th-label">Preconditions</label>
                <textarea
                  className="th-textarea"
                  placeholder="List conditions that must be met..."
                  value={preconditions}
                  onChange={(e) => setPreconditions(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div className="th-form-row">
                <label className="th-label required">Test Steps</label>
                <div className="th-steps-editor">
                  <div className="th-steps-header">
                    <div className="th-steps-header-left">
                      <span className="th-steps-title">Steps</span>
                      <span className="th-steps-count">{steps.length} step(s)</span>
                    </div>
                  </div>

                  <div className="th-steps-list">
                    {steps.map((step, index) => (
                      <div key={step.id} className="th-step-row">
                        <div className="th-step-drag">
                          <GripVertical />
                        </div>
                        <div className="th-step-num">
                          <div className="th-step-num-badge">{index + 1}</div>
                        </div>
                        <div className="th-step-content">
                          <div className="th-step-field">
                            <label className="th-step-field-label">Action</label>
                            <textarea
                              className="th-step-textarea"
                              placeholder="Describe the action to perform..."
                              value={step.action}
                              onChange={(e) => updateStep(step.id, 'action', e.target.value)}
                            />
                          </div>
                          <div className="th-step-field">
                            <label className="th-step-field-label">Expected Result</label>
                            <textarea
                              className="th-step-textarea"
                              placeholder="Describe the expected outcome..."
                              value={step.expectedResult}
                              onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="th-step-actions">
                          <button className="th-step-action-btn" title="Attach file">
                            <Paperclip />
                          </button>
                          <button className="th-step-action-btn" title="Clone" onClick={() => cloneStep(step.id)}>
                            <Copy />
                          </button>
                          <button className="th-step-action-btn" title="Insert above" onClick={() => insertStepAbove(step.id)}>
                            <ArrowUp />
                          </button>
                          <button className="th-step-action-btn danger" title="Delete" onClick={() => removeStep(step.id)} disabled={steps.length === 1}>
                            <Trash2 />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="th-add-step">
                    <button className="th-add-step-btn" onClick={addStep}>
                      <Plus />
                      Add Step
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="th-modal-side-col">
              <div className="th-form-row">
                <label className="th-label">Folder</label>
                <select className="th-select" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                  <option value="">No folder</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="th-form-row">
                <label className="th-label">Priority</label>
                <select className="th-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="th-form-row">
                <label className="th-label">Type</label>
                <select className="th-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="functional">Functional</option>
                  <option value="regression">Regression</option>
                  <option value="security">Security</option>
                  <option value="integration">Integration</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              <div className="th-form-row">
                <label className="th-label">Status</label>
                <select className="th-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="approved">Approved</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>

              <div className="th-form-row">
                <label className="th-label">Automation</label>
                <select className="th-select" value={automation} onChange={(e) => setAutomation(e.target.value)}>
                  <option value="manual">Manual</option>
                  <option value="automated">Automated</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="th-modal-footer">
          <button className="th-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="th-btn-primary" onClick={handleSave} disabled={!title.trim() || isSaving}>
            {isSaving ? 'Creating...' : 'Create Test Case'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTestCaseModal;

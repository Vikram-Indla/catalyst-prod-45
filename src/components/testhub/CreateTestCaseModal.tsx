import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StepsEditor } from './StepsEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
}

interface Folder {
  id: string;
  name: string;
}

interface TestCaseForEdit {
  id: string;
  case_key: string;
  title: string;
  objective: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority: string;
  type: string;
  status: string;
  automation: string;
  version: number;
}

interface CreateTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folders: Folder[];
  selectedFolderId?: string;
  editMode?: boolean;
  testCase?: TestCaseForEdit;
  existingSteps?: TestStep[];
}

export function CreateTestCaseModal({
  isOpen,
  onClose,
  onSuccess,
  folders,
  selectedFolderId,
  editMode = false,
  testCase,
  existingSteps,
}: CreateTestCaseModalProps) {
  const { toast } = useToast();
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
  const [titleError, setTitleError] = useState('');

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editMode && testCase) {
        setTitle(testCase.title);
        setObjective(testCase.objective || '');
        setPreconditions(testCase.preconditions || '');
        setFolderId(testCase.folder_id || '');
        setPriority(testCase.priority);
        setType(testCase.type);
        setStatus(testCase.status);
        setAutomation(testCase.automation);
        if (existingSteps && existingSteps.length > 0) {
          setSteps(existingSteps);
        } else {
          setSteps([{ id: '1', action: '', expectedResult: '' }]);
        }
      } else {
        // Reset for create mode
        setTitle('');
        setObjective('');
        setPreconditions('');
        setFolderId(selectedFolderId || '');
        setPriority('medium');
        setType('functional');
        setStatus('draft');
        setAutomation('manual');
        setSteps([{ id: '1', action: '', expectedResult: '' }]);
      }
      setTitleError('');
    }
  }, [isOpen, editMode, testCase, existingSteps, selectedFolderId]);

  const validateForm = () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return false;
    }
    const hasValidStep = steps.some(s => s.action.trim());
    if (!hasValidStep) {
      toast({
        title: 'Validation Error',
        description: 'At least one step with action text is required',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (editMode && testCase) {
        await handleUpdate();
      } else {
        await handleCreate();
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        title: 'Error',
        description: 'Failed to save test case. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    // 1. Generate case_key
    const { data: lastCase } = await supabase
      .from('th_test_cases')
      .select('case_key')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (lastCase && lastCase.length > 0) {
      const match = lastCase[0].case_key.match(/TC-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const caseKey = `TC-${String(nextNum).padStart(3, '0')}`;

    // 2. Insert test case
    const { data: newCase, error } = await supabase
      .from('th_test_cases')
      .insert({
        case_key: caseKey,
        title: title.trim(),
        objective: objective.trim() || null,
        preconditions: preconditions.trim() || null,
        folder_id: folderId || null,
        priority,
        type,
        status,
        automation,
        version: 1,
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Insert steps
    const stepsToInsert = steps
      .filter(s => s.action.trim())
      .map((s, i) => ({
        test_case_id: newCase.id,
        step_number: i + 1,
        action: s.action.trim(),
        expected_result: s.expectedResult.trim() || null,
      }));

    if (stepsToInsert.length > 0) {
      const { error: stepsError } = await supabase
        .from('th_test_steps')
        .insert(stepsToInsert);
      if (stepsError) throw stepsError;
    }

    toast({
      title: 'Success',
      description: `Test case ${caseKey} created successfully`,
    });

    onSuccess();
    onClose();
  };

  const handleUpdate = async () => {
    if (!testCase) return;

    const newVersion = (testCase.version || 1) + 1;

    // 1. Update test case
    const { error: tcError } = await supabase
      .from('th_test_cases')
      .update({
        title: title.trim(),
        objective: objective.trim() || null,
        preconditions: preconditions.trim() || null,
        folder_id: folderId || null,
        priority,
        type,
        status,
        automation,
        version: newVersion,
      })
      .eq('id', testCase.id);

    if (tcError) throw tcError;

    // 2. Delete existing steps
    await supabase
      .from('th_test_steps')
      .delete()
      .eq('test_case_id', testCase.id);

    // 3. Insert new steps
    const stepsToInsert = steps
      .filter(s => s.action.trim())
      .map((s, i) => ({
        test_case_id: testCase.id,
        step_number: i + 1,
        action: s.action.trim(),
        expected_result: s.expectedResult.trim() || null,
      }));

    if (stepsToInsert.length > 0) {
      const { error: stepsError } = await supabase
        .from('th_test_steps')
        .insert(stepsToInsert);
      if (stepsError) throw stepsError;
    }

    // 4. Create version history entry
    await supabase.from('th_test_case_versions').insert({
      test_case_id: testCase.id,
      version: newVersion,
      changes: JSON.stringify({ updated: 'Test case updated' }),
    });

    toast({
      title: 'Success',
      description: `Test case ${testCase.case_key} updated to version ${newVersion}`,
    });

    onSuccess();
    onClose();
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

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#EF4444',
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

  const modalTitle = editMode ? 'Edit Test Case' : 'Create Test Case';
  const modalSubtitle = editMode 
    ? `Modify test case ${testCase?.case_key}` 
    : 'Add a new test case to the repository';
  const submitText = editMode 
    ? (isSaving ? 'Saving...' : 'Save Changes')
    : (isSaving ? 'Creating...' : 'Create Test Case');

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
            }}>{modalTitle}</h2>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: '#64748B',
              margin: '4px 0 0 0',
            }}>{modalSubtitle}</p>
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
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError('');
                  }}
                  style={titleError ? inputErrorStyle : inputStyle}
                  onFocus={(e) => {
                    if (!titleError) {
                      e.target.style.borderColor = '#2563EB';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!titleError) {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                {titleError && (
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    color: '#EF4444',
                    marginTop: 4,
                  }}>{titleError}</p>
                )}
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
                <StepsEditor steps={steps} onChange={setSteps} />
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Folder', value: folderId, onChange: setFolderId, options: [{ value: '', label: 'No folder' }, ...folders.map(f => ({ value: f.id, label: f.name }))] },
                { label: 'Priority', value: priority, onChange: setPriority, options: [{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
                { label: 'Type', value: type, onChange: setType, options: [{ value: 'functional', label: 'Functional' }, { value: 'regression', label: 'Regression' }, { value: 'security', label: 'Security' }, { value: 'integration', label: 'Integration' }, { value: 'performance', label: 'Performance' }, { value: 'api', label: 'API' }] },
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
            disabled={isSaving}
            style={{
              height: 40,
              padding: '0 20px',
              background: isSaving ? '#94A3B8' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: isSaving ? 'none' : '0 2px 8px rgba(37,99,235,0.18)',
              transition: 'all 0.15s',
            }}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTestCaseModal;

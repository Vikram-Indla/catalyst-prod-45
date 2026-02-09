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
  const [assignedTo, setAssignedTo] = useState('');
  const [steps, setSteps] = useState<TestStep[]>([
    { id: '1', action: '', expectedResult: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; folder?: string }>({});
  
  // Users from profiles table
  const [users, setUsers] = useState<Array<{ id: string; full_name: string | null; avatar_url?: string | null }>>([]);

  // Fetch users from profiles table
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      
      if (data && !error) {
        setUsers(data);
      }
    };
    fetchUsers();
  }, []);

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
        setAssignedTo('');
      }
      setErrors({});
    }
  }, [isOpen, editMode, testCase, existingSteps, selectedFolderId]);

  const validateForm = () => {
    const newErrors: { title?: string; folder?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!folderId) {
      newErrors.folder = 'Please select a folder';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
        owner_id: assignedTo || null,
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
        owner_id: assignedTo || null,
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

  const selectedFolder = folders.find(f => f.id === folderId);
  const folderPath = selectedFolder 
    ? `${selectedFolder.name}` 
    : 'the repository';
  
  const modalTitle = editMode ? 'Edit Test Case' : 'Create Test Case';
  const modalSubtitle = editMode 
    ? `Modify test case ${testCase?.case_key}` 
    : `Add a new test case to ${folderPath}`;
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
          width: 880,
          maxWidth: '95vw',
          maxHeight: '90vh',
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
          flexShrink: 0,
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

        {/* Body - Scrollable */}
        <div style={{
          padding: 24,
          overflowY: 'auto',
          flex: 1,
        }}>
          {/* TOP SECTION: Two column layout for main fields and metadata */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: 24,
            marginBottom: 24,
          }}>
            {/* Left column - main fields */}
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
                    if (errors.title) setErrors({ ...errors, title: undefined });
                  }}
                  style={errors.title ? inputErrorStyle : inputStyle}
                  onFocus={(e) => {
                    if (!errors.title) {
                      e.target.style.borderColor = '#2563EB';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.title) {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                {errors.title && (
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    color: '#EF4444',
                    marginTop: 4,
                  }}>{errors.title}</p>
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
            </div>

            {/* Right column - metadata dropdowns - 2x2 GRID */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 16,
              backgroundColor: '#F8FAFC',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              height: 'fit-content',
            }}>
              {/* Folder - Full width with validation */}
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>
                  Folder <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={folderId}
                  onChange={(e) => {
                    setFolderId(e.target.value);
                    if (errors.folder) setErrors({ ...errors, folder: undefined });
                  }}
                  style={{ 
                    ...selectStyle, 
                    backgroundColor: '#FFFFFF',
                    borderColor: errors.folder ? '#EF4444' : '#E2E8F0',
                  }}
                >
                  <option value="">Select a folder...</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {errors.folder && (
                  <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                    {errors.folder}
                  </p>
                )}
              </div>
              
              {/* Priority + Type - 2 column grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 13 }}>
                    Priority <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ ...selectStyle, backgroundColor: '#FFFFFF' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 13 }}>
                    Type <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ ...selectStyle, backgroundColor: '#FFFFFF' }}
                  >
                    <option value="functional">Functional</option>
                    <option value="regression">Regression</option>
                    <option value="security">Security</option>
                    <option value="integration">Integration</option>
                    <option value="performance">Performance</option>
                    <option value="api">API</option>
                  </select>
                </div>
              </div>
              
              {/* Status + Automation - 2 column grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 13 }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ ...selectStyle, backgroundColor: '#FFFFFF' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                    <option value="approved">Approved</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 13 }}>Automation</label>
                  <select
                    value={automation}
                    onChange={(e) => setAutomation(e.target.value)}
                    style={{ ...selectStyle, backgroundColor: '#FFFFFF' }}
                  >
                    <option value="manual">Manual</option>
                    <option value="automated">Automated</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
              </div>
              
              {/* Assigned To - Full width with profiles data */}
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>Assigned To</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  style={{ ...selectStyle, backgroundColor: '#FFFFFF' }}
                >
                  <option value="">Unassigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || 'Unknown User'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Steps editor - FULL WIDTH */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Test Steps <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ fontSize: 14 }}>📚</span>
                Insert from Library
              </button>
            </div>
            <StepsEditor steps={steps} onChange={setSteps} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              height: 40,
              padding: '0 16px',
              background: 'none',
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748B';
            }}
          >Cancel</button>
          <button
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
          >Save Draft</button>
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

import { useState, useEffect } from 'react';
import { X, Library } from 'lucide-react';
import { StepsEditor, Step, StepAttachment } from './StepsEditor';
import { SharedStepsModal } from './SharedStepsModal';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTestHubProject } from '@/hooks/useTestHubProject';

interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
  sharedStepId?: string;
  attachments?: StepAttachment[];
}

interface Folder {
  id: string;
  name: string;
}

interface TestCaseForEdit {
  id: string;
  case_key: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority_id: string | null;
  case_type_id: string | null;
  status: string;
  version: number;
  owner_id?: string | null;
  created_by?: string | null;
  automation_status?: string | null;
  test_format?: string | null;
  gherkin_feature?: string | null;
  gherkin_scenario?: string | null;
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
  const projectId = useTestHubProject();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [folderId, setFolderId] = useState(selectedFolderId || '');
  const [priorityId, setPriorityId] = useState('');
  const [caseTypeId, setCaseTypeId] = useState('');
  const [status, setStatus] = useState('draft');
  const [automation, setAutomation] = useState('manual');
  const [testFormat, setTestFormat] = useState<'steps' | 'gherkin' | 'free_text'>('steps');
  const [gherkinFeature, setGherkinFeature] = useState('');
  const [gherkinScenario, setGherkinScenario] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [steps, setSteps] = useState<TestStep[]>([
    { id: '1', action: '', expectedResult: '', attachments: [] }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; folder?: string }>({});
  const [isSharedStepsModalOpen, setIsSharedStepsModalOpen] = useState(false);
  
  // Users from profiles table
  const [users, setUsers] = useState<Array<{ id: string; full_name: string | null; avatar_url?: string | null }>>([]);
  // Priority & Type lookups
  const [priorities, setPriorities] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [caseTypes, setCaseTypes] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch users, priorities, case types
  useEffect(() => {
    const fetchLookups = async () => {
      const [usersRes, prioritiesRes, caseTypesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').order('full_name'),
        typedQuery('tm_case_priorities').select('id, name, color').order('sort_order'),
        typedQuery('tm_case_types').select('id, name').order('name'),
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (prioritiesRes.data) setPriorities(prioritiesRes.data);
      if (caseTypesRes.data) setCaseTypes(caseTypesRes.data);
    };
    fetchLookups();
  }, []);

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editMode && testCase) {
        setTitle(testCase.title);
        setDescription(testCase.description || '');
        setPreconditions(testCase.preconditions || '');
        setFolderId(testCase.folder_id || '');
        setPriorityId(testCase.priority_id || '');
        setCaseTypeId(testCase.case_type_id || '');
        setStatus(testCase.status);
        setAutomation(testCase.automation_status || 'manual');
        setAssignedTo(testCase.owner_id || '');
        setTestFormat((testCase as any).test_format || 'steps');
        setGherkinFeature((testCase as any).gherkin_feature || '');
        setGherkinScenario((testCase as any).gherkin_scenario || '');
        if (existingSteps && existingSteps.length > 0) {
          setSteps(existingSteps.map(s => ({ ...s, attachments: [] })));
        } else {
          setSteps([{ id: '1', action: '', expectedResult: '', attachments: [] }]);
        }
      } else {
        // Reset for create mode
        setTitle('');
        setDescription('');
        setPreconditions('');
        setFolderId(selectedFolderId || '');
        setPriorityId('');
        setCaseTypeId('');
        setStatus('draft');
        setAutomation('manual');
        setTestFormat('steps');
        setGherkinFeature('');
        setGherkinScenario('');
        setSteps([{ id: '1', action: '', expectedResult: '', attachments: [] }]);
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
    
    if (testFormat === 'steps') {
      const hasValidStep = steps.some(s => s.action.trim());
      if (!hasValidStep) {
        toast({
          title: 'Validation Error',
          description: 'At least one step with action text is required',
          variant: 'destructive',
        });
        return false;
      }
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
    // 1. Generate case_key - get ALL keys and find the MAX number to avoid duplicates
    const { data: allCases } = await typedQuery('tm_test_cases')
      .select('case_key');

    let maxNum = 0;
    if (allCases && allCases.length > 0) {
      for (const tc of allCases) {
        const match = tc.case_key?.match(/TC-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const caseKey = `TC-${String(maxNum + 1).padStart(3, '0')}`;

    // 2. Insert test case
    const { data: newCase, error } = await typedQuery('tm_test_cases')
      .insert({
        case_key: caseKey,
        title: title.trim(),
        description: description.trim() || null,
        preconditions: preconditions.trim() || null,
        folder_id: folderId || null,
        priority_id: priorityId || null,
        case_type_id: caseTypeId || null,
        status,
        automation_status: automation,
        test_format: testFormat,
        gherkin_feature: testFormat === 'gherkin' ? gherkinFeature.trim() || null : null,
        gherkin_scenario: testFormat === 'gherkin' ? gherkinScenario.trim() || null : null,
        owner_id: assignedTo || null,
        version: 1,
        project_id: projectId,
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Insert steps (including shared steps)
    const validSteps = steps.filter(s => s.action.trim() || s.sharedStepId);
    const stepsToInsert = validSteps.map((s, i) => ({
      test_case_id: newCase.id,
      step_number: i + 1,
      action: s.action.trim(),
      expected_result: s.expectedResult?.trim() || null,
      is_shared: !!s.sharedStepId,
      shared_step_id: s.sharedStepId || null,
    }));

    if (stepsToInsert.length > 0) {
      const { error: stepsError } = await supabase
        .from('tm_test_steps')
        .insert(stepsToInsert);
      if (stepsError) throw stepsError;
    }

    // 4. Upload attachments for each step
    for (let i = 0; i < validSteps.length; i++) {
      const step = validSteps[i];
      if (step.attachments && step.attachments.length > 0) {
        for (const attachment of step.attachments) {
          if (!attachment.file) continue;
          
          try {
            const filePath = `test-cases/${newCase.id}/step-${i + 1}/${Date.now()}-${attachment.name}`;
            const { error: uploadError } = await supabase.storage
              .from('testhub-attachments')
              .upload(filePath, attachment.file);
            
            if (uploadError) {
              console.error('Upload error:', uploadError);
              continue;
            }
            
            await typedQuery('th_step_attachments').insert({
              test_case_id: newCase.id,
              step_number: i + 1,
              file_name: attachment.name,
              file_path: filePath,
              file_size: attachment.size,
              file_type: attachment.type,
            });
          } catch (err) {
            console.error('Attachment error:', err);
          }
        }
      }
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
    const { error: tcError } = await typedQuery('tm_test_cases')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        preconditions: preconditions.trim() || null,
        folder_id: folderId || null,
        priority_id: priorityId || null,
        case_type_id: caseTypeId || null,
        status,
        automation_status: automation,
        test_format: testFormat,
        gherkin_feature: testFormat === 'gherkin' ? gherkinFeature.trim() || null : null,
        gherkin_scenario: testFormat === 'gherkin' ? gherkinScenario.trim() || null : null,
        owner_id: assignedTo || null,
        version: newVersion,
      })
      .eq('id', testCase.id);

    if (tcError) throw tcError;

    // 2. Delete existing steps
    await supabase
      .from('tm_test_steps')
      .delete()
      .eq('test_case_id', testCase.id);

    // 3. Insert new steps (including shared steps)
    const stepsToInsert = steps
      .filter(s => s.action.trim() || s.sharedStepId)
      .map((s, i) => ({
        test_case_id: testCase.id,
        step_number: i + 1,
        action: s.action.trim(),
        expected_result: s.expectedResult?.trim() || null,
        is_shared: !!s.sharedStepId,
        shared_step_id: s.sharedStepId || null,
      }));

    if (stepsToInsert.length > 0) {
      const { error: stepsError } = await supabase
        .from('tm_test_steps')
        .insert(stepsToInsert);
      if (stepsError) throw stepsError;
    }

    // 4. Create version history entry (non-fatal)
    try {
      await typedQuery('tm_test_case_versions').insert({
        test_case_id: testCase.id,
        version: newVersion,
        changes: JSON.stringify({ updated: 'Test case updated' }),
      });
    } catch (versionErr) {
      console.warn('Version history not saved:', versionErr);
    }

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
    padding: '8px 12px',
    border: '1.5px solid var(--divider)',
    borderRadius: 8,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: 'var(--fg-1)',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: 'var(--sem-danger)',
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
    color: 'var(--fg-1)',
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
          backgroundColor: 'var(--cp-float)',
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
          borderBottom: '1px solid var(--divider)',
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
              color: 'var(--fg-1)',
              margin: 0,
            }}>{modalTitle}</h2>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: 'var(--fg-3)',
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
              color: 'var(--fg-4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cp-bd-zone)';
              e.currentTarget.style.color = 'var(--fg-1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--fg-4)';
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
                  Title <span style={{ color: 'var(--sem-danger)' }}>*</span>
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
                      e.target.style.borderColor = 'var(--cp-blue)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.title) {
                      e.target.style.borderColor = 'var(--divider)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                />
                {errors.title && (
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    color: 'var(--sem-danger)',
                    marginTop: 4,
                  }}>{errors.title}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  placeholder="What does this test verify?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 100 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--cp-blue)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--divider)';
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
                    e.target.style.borderColor = 'var(--cp-blue)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--divider)';
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
              backgroundColor: 'var(--bg-1)',
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--divider)',
              height: 'fit-content',
            }}>
              {/* Folder - Full width with validation */}
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>
                  Folder <span style={{ color: 'var(--sem-danger)' }}>*</span>
                </label>
                <select
                  value={folderId}
                  onChange={(e) => {
                    setFolderId(e.target.value);
                    if (errors.folder) setErrors({ ...errors, folder: undefined });
                  }}
                  style={{ 
                    ...selectStyle, 
                    backgroundColor: 'var(--cp-float)',
                    borderColor: errors.folder ? 'var(--sem-danger)' : 'var(--divider)',
                  }}
                >
                  <option value="">Select a folder...</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {errors.folder && (
                  <p style={{ fontSize: 12, color: 'var(--sem-danger)', marginTop: 4 }}>
                    {errors.folder}
                  </p>
                )}
              </div>
              
              {/* Priority + Type - 2 column grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 13 }}>
                    Priority <span style={{ color: 'var(--sem-danger)' }}>*</span>
                  </label>
                  <select
                    value={priorityId}
                    onChange={(e) => setPriorityId(e.target.value)}
                    style={{ ...selectStyle, backgroundColor: 'var(--cp-float)' }}
                  >
                    <option value="">Select...</option>
                    {priorities.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 13 }}>
                    Type <span style={{ color: 'var(--sem-danger)' }}>*</span>
                  </label>
                  <select
                    value={caseTypeId}
                    onChange={(e) => setCaseTypeId(e.target.value)}
                    style={{ ...selectStyle, backgroundColor: 'var(--cp-float)' }}
                  >
                    <option value="">Select...</option>
                    {caseTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Status - Full width */}
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ ...selectStyle, backgroundColor: 'var(--cp-float)' }}
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="approved">Approved</option>
                  <option value="deprecated">Deprecated</option>
                </select>
              </div>

              {/* Automation Status */}
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>Automation Status</label>
                <select
                  value={automation}
                  onChange={(e) => setAutomation(e.target.value)}
                  style={{ ...selectStyle, backgroundColor: 'var(--cp-float)' }}
                >
                  <option value="manual">Manual</option>
                  <option value="automated">Automated</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              
              {/* Assigned To - Full width with profiles data */}
              <div>
                <label style={{ ...labelStyle, fontSize: 13 }}>Assigned To</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  style={{ ...selectStyle, backgroundColor: 'var(--cp-float)' }}
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

          {/* TEST FORMAT TOGGLE */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Test Format</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {([
                { key: 'steps' as const, label: 'Steps' },
                { key: 'gherkin' as const, label: 'Gherkin / BDD' },
                { key: 'free_text' as const, label: 'Free Text' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTestFormat(opt.key)}
                  style={{
                    height: 32, padding: '0 14px', border: 'none', borderRadius: 6,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    backgroundColor: testFormat === opt.key ? '#2563EB' : '#F1F5F9',
                    color: testFormat === opt.key ? '#FFF' : '#475569',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* BOTTOM SECTION: Steps / Gherkin / Free Text - FULL WIDTH */}
          {testFormat === 'steps' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Test Steps <span style={{ color: 'var(--sem-danger)' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsSharedStepsModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--cp-blue)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Library size={14} />
                  Insert from Library
                </button>
              </div>
              <StepsEditor steps={steps} onChange={setSteps} />
            </div>
          )}

          {testFormat === 'gherkin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Feature</label>
                <textarea
                  placeholder="Feature: Invoice Validation"
                  value={gherkinFeature}
                  onChange={(e) => setGherkinFeature(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 60, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--cp-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--divider)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Scenario</label>
                <textarea
                  placeholder={"Scenario: Valid invoice is processed\n  Given an invoice with amount 100 SAR\n  When the invoice is submitted\n  Then the status should be 'Approved'"}
                  value={gherkinScenario}
                  onChange={(e) => setGherkinScenario(e.target.value)}
                  style={{ ...textareaStyle, minHeight: 160, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--cp-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--divider)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          {testFormat === 'free_text' && (
            <div>
              <label style={labelStyle}>Test Description</label>
              <textarea
                placeholder="Describe the test procedure in free-form text..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...textareaStyle, minHeight: 200 }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--cp-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--divider)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Shared Steps Modal */}
        <SharedStepsModal
          isOpen={isSharedStepsModalOpen}
          onClose={() => setIsSharedStepsModalOpen(false)}
          onInsert={(sharedStep) => {
            setSteps(prev => [...prev, {
              id: Date.now().toString(),
              action: sharedStep.action,
              expectedResult: sharedStep.expectedResult,
              sharedStepId: sharedStep.sharedStepId,
              attachments: [],
            }]);
            setIsSharedStepsModalOpen(false);
            toast({
              title: 'Shared step inserted',
              description: 'The step has been added to your test case',
            });
          }}
        />

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--divider)',
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
              color: 'var(--fg-3)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--fg-1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--fg-3)';
            }}
          >Cancel</button>
          <button
            onClick={() => {
              setStatus('draft');
              handleSave();
            }}
            disabled={isSaving}
            style={{
              height: 40,
              padding: '0 20px',
              backgroundColor: 'var(--cp-float)',
              border: '1.5px solid var(--divider)',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--fg-2)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-1)';
              e.currentTarget.style.borderColor = 'var(--divider)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cp-float)';
              e.currentTarget.style.borderColor = 'var(--divider)';
            }}
          >Save Draft</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              height: 40,
              padding: '0 20px',
              background: isSaving ? 'var(--fg-4)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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

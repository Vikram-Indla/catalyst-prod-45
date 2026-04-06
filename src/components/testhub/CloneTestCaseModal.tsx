import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority_id: string | null;
  case_type_id: string | null;
}

interface CloneTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testCase: TestCase | null;
}

export function CloneTestCaseModal({
  isOpen,
  onClose,
  onSuccess,
  testCase,
}: CloneTestCaseModalProps) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState('');
  const [includeSteps, setIncludeSteps] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize title when modal opens or testCase changes
  useEffect(() => {
    if (isOpen && testCase) {
      setNewTitle(`${testCase.title} (Copy)`);
      setIncludeSteps(true);
      setIncludeAttachments(false);
    }
  }, [isOpen, testCase]);

  const handleClone = async () => {
    if (!testCase || !newTitle.trim()) return;

    setIsSaving(true);
    try {
      // 1. Generate new case_key
      const { data: lastCase } = await supabase
        .from('tm_test_cases')
        .select('case_key')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (lastCase && lastCase.length > 0) {
        const match = lastCase[0].case_key.match(/TC-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const newCaseKey = `TC-${String(nextNum).padStart(3, '0')}`;

      // 2. Insert cloned test case
      const { data: newCase, error } = await (supabase as any)
        .from('tm_test_cases')
        .insert([{
          case_key: newCaseKey,
          title: newTitle.trim(),
          description: (testCase as any).objective || (testCase as any).description || '',
          preconditions: testCase.preconditions,
          folder_id: testCase.folder_id,
          priority_id: (testCase as any).priority_id || null,
          case_type_id: (testCase as any).case_type_id || null,
          status: 'draft',
          automation_status: 'manual',
          version: 1,
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Clone steps if checked
      if (includeSteps) {
        const { data: originalSteps } = await supabase
          .from('tm_test_steps')
          .select('*')
          .eq('test_case_id', testCase.id)
          .order('step_number');

        if (originalSteps && originalSteps.length > 0) {
          const clonedSteps = originalSteps.map((s) => ({
            test_case_id: newCase.id,
            step_number: s.step_number,
            action: s.action,
            expected_result: s.expected_result,
          }));
          await supabase.from('tm_test_steps').insert(clonedSteps);
        }
      }

      // 4. Clone attachments if checked
      if (includeAttachments) {
        const { data: originalAttachments } = await supabase
          .from('th_test_case_attachments')
          .select('*')
          .eq('test_case_id', testCase.id);

        if (originalAttachments && originalAttachments.length > 0) {
          const clonedAttachments = originalAttachments.map((a) => ({
            test_case_id: newCase.id,
            file_name: a.file_name,
            file_url: a.file_url,
            file_size: a.file_size,
            file_type: a.file_type,
          }));
          await supabase.from('th_test_case_attachments').insert(clonedAttachments);
        }
      }

      toast({
        title: 'Success',
        description: `Test case cloned as ${newCaseKey}`,
      });

      setNewTitle('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to clone:', error);
      toast({
        title: 'Error',
        description: 'Failed to clone test case. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setNewTitle('');
    setIncludeSteps(true);
    setIncludeAttachments(false);
    onClose();
  };

  if (!isOpen || !testCase) return null;

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

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  };

  const checkboxStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: '1.5px solid var(--divider)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--cp-float)',
    transition: 'all 0.15s',
  };

  return (
    <div 
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '95vw',
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
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--fg-1)',
              margin: 0,
            }}>Clone Test Case</h2>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: 'var(--fg-3)',
              margin: '4px 0 0 0',
            }}>Create a copy of {testCase.case_key}</p>
          </div>
          <button 
            onClick={handleClose}
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
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{
              display: 'block',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg-1)',
              marginBottom: 6,
            }}>New Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={inputStyle}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label 
              style={checkboxContainerStyle}
              onClick={() => setIncludeSteps(!includeSteps)}
            >
              <div style={{
                ...checkboxStyle,
                backgroundColor: includeSteps ? 'var(--cp-blue)' : 'var(--cp-float)',
                borderColor: includeSteps ? 'var(--cp-blue)' : 'var(--divider)',
              }}>
                {includeSteps && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)' }}>Include test steps</span>
            </label>

            <label 
              style={checkboxContainerStyle}
              onClick={() => setIncludeAttachments(!includeAttachments)}
            >
              <div style={{
                ...checkboxStyle,
                backgroundColor: includeAttachments ? 'var(--cp-blue)' : 'var(--cp-float)',
                borderColor: includeAttachments ? 'var(--cp-blue)' : 'var(--divider)',
              }}>
                {includeAttachments && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)' }}>Include attachments</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--divider)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          <button
            onClick={handleClose}
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
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleClone}
            disabled={!newTitle.trim() || isSaving}
            style={{
              height: 40,
              padding: '0 20px',
              background: !newTitle.trim() || isSaving ? 'var(--fg-4)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: !newTitle.trim() || isSaving ? 'not-allowed' : 'pointer',
              boxShadow: !newTitle.trim() || isSaving ? 'none' : '0 2px 8px rgba(37,99,235,0.18)',
            }}
          >
            {isSaving ? 'Cloning...' : 'Clone'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CloneTestCaseModal;

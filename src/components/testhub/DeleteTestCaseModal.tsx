import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestCaseToDelete {
  id: string;
  case_key: string;
  title: string;
}

interface DeleteTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testCases: TestCaseToDelete[];
}

export function DeleteTestCaseModal({
  isOpen,
  onClose,
  onSuccess,
  testCases,
}: DeleteTestCaseModalProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const isBulk = testCases.length > 1;
  const caseKeys = testCases.map(tc => tc.case_key).join(', ');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const ids = testCases.map(tc => tc.id);
      
      // Delete from th_test_cases (cascade will handle related data)
      const { error } = await supabase
        .from('tm_test_cases')
        .delete()
        .in('id', ids);

      if (error) throw new Error(error.message);

      toast({
        title: 'Success',
        description: isBulk 
          ? `${testCases.length} test cases deleted`
          : `Test case ${testCases[0].case_key} deleted`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete test case(s). Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || testCases.length === 0) return null;

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
          alignItems: 'center',
        }}>
          <h2 style={{
            fontFamily: 'var(--ds-font-family-body)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--fg-1)',
            margin: 0,
          }}>
            {isBulk ? 'Delete Test Cases' : 'Delete Test Case'}
          </h2>
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
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle style={{ width: 24, height: 24, color: 'var(--sem-warning)' }} />
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--ds-font-family-body)',
                fontSize: 14,
                color: 'var(--fg-1)',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Are you sure you want to delete{' '}
                <span style={{ fontWeight: 600 }}>
                  {isBulk ? `${testCases.length} test cases` : testCases[0].case_key}
                </span>
                ?
              </p>
              
              <div style={{ marginTop: 16 }}>
                <p style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 13,
                  color: 'var(--fg-3)',
                  margin: '0 0 8px 0',
                }}>
                  This will permanently delete:
                </p>
                <ul style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 13,
                  color: 'var(--fg-3)',
                  margin: 0,
                  paddingLeft: 20,
                  lineHeight: 1.8,
                }}>
                  <li>The test case{isBulk ? 's' : ''} and all {isBulk ? 'their' : 'its'} steps</li>
                  <li>All attachments</li>
                  <li>All execution history</li>
                </ul>
              </div>

              <p style={{
                fontFamily: 'var(--ds-font-family-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--sem-danger)',
                margin: '16px 0 0 0',
              }}>
                This action cannot be undone.
              </p>
            </div>
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
            onClick={onClose}
            disabled={isDeleting}
            style={{
              height: 40,
              padding: '0 20px',
              backgroundColor: 'var(--cp-float)',
              border: '1.5px solid var(--divider)',
              borderRadius: 8,
              fontFamily: 'var(--ds-font-family-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--fg-2)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >Cancel</button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              height: 40,
              padding: '0 20px',
              background: isDeleting ? 'var(--fg-4)' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              border: 'none',
              borderRadius: 8,
              fontFamily: 'var(--ds-font-family-body)',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: isDeleting ? 'none' : '0 2px 8px rgba(239,68,68,0.25)',
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteTestCaseModal;

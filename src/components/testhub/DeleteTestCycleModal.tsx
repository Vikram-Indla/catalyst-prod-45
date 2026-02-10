import { useState } from 'react';
import { X, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  total_cases: number;
  status: string;
}

interface DeleteTestCycleModalProps {
  isOpen: boolean;
  cycle: TestCycle | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteTestCycleModal({
  isOpen,
  cycle,
  onClose,
  onSuccess,
}: DeleteTestCycleModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!cycle) return;

    if (cycle.total_cases > 0 && confirmText !== cycle.cycle_key) {
      catalystToast.warning(`Please type "${cycle.cycle_key}" to confirm deletion`);
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('th_test_cycles')
        .delete()
        .eq('id', cycle.id);

      if (error) {
        catalystToast.error(error.message || 'Failed to delete cycle', {
          title: 'Delete Failed',
        });
        return;
      }

      catalystToast.success(`Test cycle "${cycle.name}" deleted`, {
        title: 'Cycle Deleted',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to delete cycle');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) {
    if (confirmText) setConfirmText('');
    return null;
  }

  if (!cycle) return null;

  const hasTestCases = cycle.total_cases > 0;
  const isActive = cycle.status === 'active';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: 480,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Trash2 size={20} style={{ color: '#DC2626' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Delete Test Cycle
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
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
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Warning Box */}
          <div style={{
            padding: 16,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            gap: 12,
          }}>
            <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>
                This action cannot be undone
              </p>
              <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>
                The test cycle and all associated test execution data will be permanently deleted.
              </p>
            </div>
          </div>

          {/* Cycle Info */}
          <p style={{ fontSize: 14, color: '#334155', margin: '0 0 12px' }}>
            Are you sure you want to delete this test cycle?
          </p>
          
          <div style={{
            padding: 16,
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '3px 8px',
                borderRadius: 4,
              }}>
                {cycle.cycle_key}
              </span>
              <Calendar size={14} style={{ color: '#64748B' }} />
            </div>
            <p style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#0F172A',
              margin: 0,
            }}>
              {cycle.name}
            </p>
          </div>

          {/* Active Cycle Warning */}
          {isActive && (
            <div style={{
              padding: 12,
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: '0 0 2px' }}>
                  This cycle is currently active
                </p>
                <p style={{ fontSize: 12, color: '#A16207', margin: 0 }}>
                  Consider completing or archiving it instead of deleting.
                </p>
              </div>
            </div>
          )}

          {/* Test Cases Warning */}
          {hasTestCases && (
            <div style={{
              padding: 12,
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', margin: '0 0 2px' }}>
                  This cycle contains {cycle.total_cases} test case{cycle.total_cases !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 12, color: '#B91C1C', margin: 0 }}>
                  All test execution records for these test cases will be deleted.
                </p>
              </div>
            </div>
          )}

          {/* Confirmation Input (for cycles with test cases) */}
          {hasTestCases && (
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#0F172A',
                marginBottom: 6,
              }}>
                Type <code style={{ 
                  backgroundColor: '#F1F5F9', 
                  padding: '2px 6px', 
                  borderRadius: 4,
                  color: '#DC2626',
                }}>{cycle.cycle_key}</code> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={cycle.cycle_key}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#0F172A',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          )}
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
            disabled={isDeleting}
            style={{
              height: 40,
              padding: '0 20px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || (hasTestCases && confirmText !== cycle.cycle_key)}
            style={{
              height: 40,
              padding: '0 20px',
              background: (!hasTestCases || confirmText === cycle.cycle_key)
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : '#94A3B8',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: (!hasTestCases || confirmText === cycle.cycle_key) ? 'pointer' : 'not-allowed',
              opacity: isDeleting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}

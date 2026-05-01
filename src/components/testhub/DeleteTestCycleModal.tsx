import { useState } from 'react';
import { X, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
      const { error } = await typedQuery('tm_test_cycles')
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
        backgroundColor: 'var(--cp-float)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--divider)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'var(--ds-background-danger, #FEF2F2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Trash2 size={20} style={{ color: 'var(--sem-danger)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
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
              color: 'var(--fg-4)',
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
            backgroundColor: 'var(--ds-background-danger, #FEF2F2)',
            border: '1px solid color-mix(in srgb, var(--sem-danger) 20%, transparent)',
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            gap: 12,
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--sem-danger)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-danger, #991B1B)', margin: '0 0 4px' }}>
                This action cannot be undone
              </p>
              <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>
                The test cycle and all associated test execution data will be permanently deleted.
              </p>
            </div>
          </div>

          {/* Cycle Info */}
          <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: '0 0 12px' }}>
            Are you sure you want to delete this test cycle?
          </p>
          
          <div style={{
            padding: 16,
            backgroundColor: 'var(--bg-1)',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--cp-blue)',
                backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)',
                padding: '3px 8px',
                borderRadius: 4,
              }}>
                {cycle.cycle_key}
              </span>
              <Calendar size={14} style={{ color: 'var(--fg-3)' }} />
            </div>
            <p style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--fg-1)',
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
              border: '1px solid color-mix(in srgb, var(--sem-warning) 30%, transparent)',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <AlertTriangle size={16} style={{ color: 'var(--sem-warning)', flexShrink: 0, marginTop: 2 }} />
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
              backgroundColor: 'var(--ds-background-danger, #FEF2F2)',
              border: '1px solid color-mix(in srgb, var(--sem-danger) 20%, transparent)',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <AlertTriangle size={16} style={{ color: 'var(--sem-danger)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-danger, #991B1B)', margin: '0 0 2px' }}>
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
                color: 'var(--fg-1)',
                marginBottom: 6,
              }}>
                Type <code style={{ 
                  backgroundColor: 'var(--cp-bd-zone)', 
                  padding: '2px 6px', 
                  borderRadius: 4,
                  color: 'var(--sem-danger)',
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
                  padding: '8px 12px',
                  border: '1.5px solid var(--divider)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--fg-1)',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          )}
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
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--fg-2)',
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
                ? 'linear-gradient(135deg, var(--ds-text-danger, #EF4444) 0%, var(--ds-text-danger, #DC2626) 100%)'
                : 'var(--fg-4)',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ds-text-inverse, #FFFFFF)',
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

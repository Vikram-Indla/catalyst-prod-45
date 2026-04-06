import { useState, useEffect } from 'react';
import { X, Copy, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface TestCycle {
  id: string;
  cycle_key: string;
  name: string;
  description: string | null;
  planned_start: string | null;
  planned_end: string | null;
  total_cases: number;
}

interface CloneTestCycleModalProps {
  isOpen: boolean;
  cycle: TestCycle | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CloneTestCycleModal({
  isOpen,
  cycle,
  onClose,
  onSuccess,
}: CloneTestCycleModalProps) {
  const [newName, setNewName] = useState('');
  const [includeTestCases, setIncludeTestCases] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && cycle) {
      setNewName(`${cycle.name} (Copy)`);
      setIncludeTestCases(true);
    }
  }, [isOpen, cycle]);

  const generateCycleKey = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_cycle_key');
    if (error) {
      const { data: lastCycle } = await (supabase as any)
        .from('tm_test_cycles')
        .select('cycle_key')
        .order('created_at', { ascending: false })
        .limit(1);
      if (lastCycle && lastCycle.length > 0) {
        const lastNum = parseInt(lastCycle[0].cycle_key.replace('CYCLE-', ''));
        return `CYCLE-${String(lastNum + 1).padStart(3, '0')}`;
      }
      return 'CYCLE-001';
    }
    return data;
  };

  const handleClone = async () => {
    if (!cycle || !newName.trim()) return;

    setIsSubmitting(true);

    try {
      const newCycleKey = await generateCycleKey();

      const newCycleData = {
        cycle_key: newCycleKey,
        name: newName.trim(),
        description: cycle.description,
        planned_start: cycle.planned_start,
        planned_end: cycle.planned_end,
        status: 'draft',
        total_cases: 0,
        passed_count: 0,
        failed_count: 0,
        blocked_count: 0,
        skipped_count: 0,
        not_run_count: 0,
        project_id: '00000000-0000-0000-0000-000000000001',
      };

      const { data: newCycle, error: cycleError } = await (supabase as any)
        .from('tm_test_cycles')
        .insert(newCycleData)
        .select()
        .single();

      if (cycleError) {
        catalystToast.error(cycleError.message || 'Failed to clone cycle', {
          title: 'Clone Failed',
        });
        return;
      }

      if (includeTestCases && cycle.total_cases > 0) {
        const { data: originalTestCases, error: fetchError } = await (supabase as any)
          .from('tm_cycle_scope')
          .select('test_case_id, assigned_to')
          .eq('cycle_id', cycle.id);

        if (!fetchError && originalTestCases && originalTestCases.length > 0) {
          const newTestCaseRecords = originalTestCases.map(tc => ({
            cycle_id: newCycle.id,
            test_case_id: tc.test_case_id,
            assigned_to: tc.assigned_to,
            current_status: 'not_run',
          }));

          const { error: testCasesError } = await (supabase as any)
            .from('tm_cycle_scope')
            .insert(newTestCaseRecords);

          if (testCasesError) {
            catalystToast.warning('Cycle cloned but some test cases could not be copied', {
              title: 'Partial Clone',
            });
          }
        }
      }

      const message = includeTestCases && cycle.total_cases > 0
        ? `Cloned "${cycle.name}" with ${cycle.total_cases} test cases`
        : `Cloned "${cycle.name}"`;

      catalystToast.success(message, { title: 'Cycle Cloned' });

      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to clone cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !cycle) return null;

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
        width: 500,
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
              backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Copy size={20} style={{ color: 'var(--cp-blue)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              Clone Test Cycle
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8,
              backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Source Cycle Info */}
          <div style={{
            padding: 16,
            backgroundColor: 'var(--bg-1)',
            borderRadius: 8,
            marginBottom: 20,
          }}>
            <p style={{ 
              fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase',
              letterSpacing: '0.05em', margin: '0 0 8px',
            }}>
              Cloning from
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)',
                backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '3px 8px', borderRadius: 4,
              }}>
                {cycle.cycle_key}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>
                {cycle.name}
              </span>
            </div>
            {cycle.total_cases > 0 && (
              <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: '8px 0 0' }}>
                Contains {cycle.total_cases} test case{cycle.total_cases !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* New Name Field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 6,
            }}>
              New Cycle Name <span style={{ color: 'var(--sem-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name for the cloned cycle"
              style={{
                width: '100%', height: 40, padding: '8px 12px',
                border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, color: 'var(--fg-1)',
              }}
            />
          </div>

          {/* Include Test Cases Option */}
          {cycle.total_cases > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setIncludeTestCases(!includeTestCases)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, width: '100%',
                  backgroundColor: includeTestCases ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'var(--bg-1)',
                  border: `1.5px solid ${includeTestCases ? 'color-mix(in srgb, var(--cp-blue) 25%, transparent)' : 'var(--divider)'}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ marginTop: 2 }}>
                  {includeTestCases ? (
                    <CheckSquare size={20} style={{ color: 'var(--cp-blue)' }} />
                  ) : (
                    <Square size={20} style={{ color: 'var(--fg-4)' }} />
                  )}
                </div>
                <div>
                  <p style={{ 
                    fontSize: 14, fontWeight: 600, 
                    color: includeTestCases ? 'var(--cp-primary-70)' : 'var(--fg-2)', margin: 0,
                  }}>
                    Include test cases
                  </p>
                  <p style={{ 
                    fontSize: 13, color: includeTestCases ? 'var(--cp-blue)' : 'var(--fg-3)', margin: '4px 0 0',
                  }}>
                    Copy all {cycle.total_cases} test cases to the new cycle. 
                    Execution status will be reset to "Not Run".
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Info Box */}
          <div style={{
            padding: 12, backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--cp-blue) 25%, transparent)', borderRadius: 8,
          }}>
            <p style={{ fontSize: 13, color: 'var(--cp-primary-70)', margin: 0 }}>
              The cloned cycle will be created in <strong>Draft</strong> status with a new cycle key.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)',
              border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14,
              fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={isSubmitting || !newName.trim()}
            style={{
              height: 40, padding: '0 20px',
              background: newName.trim()
                ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                : 'var(--fg-4)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              color: '#FFFFFF',
              cursor: newName.trim() ? 'pointer' : 'not-allowed',
              opacity: isSubmitting ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Copy size={16} />
            {isSubmitting ? 'Cloning...' : 'Clone Cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}

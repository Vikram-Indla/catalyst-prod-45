/**
 * Shared Steps Library Modal
 * Allows users to browse and insert reusable test steps
 */

import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { CreateSharedStepModal } from './CreateSharedStepModal';

interface SharedStep {
  id: string;
  name: string;
  action: string;
  expected_result: string;
  usage_count: number;
}

interface SharedStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (step: { action: string; expectedResult: string; sharedStepId: string }) => void;
}

// --- MAIN MODAL ---
export function SharedStepsModal({ isOpen, onClose, onInsert }: SharedStepsModalProps) {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; icon: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSharedSteps();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const result = await typedQuery('th_shared_step_categories')
        .select('id, name, color, icon')
        .eq('is_active', true)
        .order('sort_order');
      if (result.data) setCategories(result.data);
    } catch {}
  };

  const fetchSharedSteps = async () => {
    setLoading(true);
    const { data, error } = await typedQuery('tm_shared_steps')
      .select('*')
      .order('usage_count', { ascending: false });

    if (!error && data) {
      setSharedSteps(data);
    }
    setLoading(false);
  };

  const handleInsert = async (step: SharedStep) => {
    // Call onInsert FIRST — must always succeed
    onInsert({
      action: step.action,
      expectedResult: step.expected_result || '',
      sharedStepId: step.id,
    });
    onClose();

    // Increment usage count after — non-blocking, best effort
    try {
      await typedQuery('tm_shared_steps')
        .update({ usage_count: (step.usage_count || 0) + 1 })
        .eq('id', step.id);
    } catch (err) {
      console.warn('Usage count not updated:', err);
    }

    // NOTE: Propagation to tm_test_steps happens in CreateSharedStepModal (edit handler),
    // NOT here. Inserting a shared step into a test case does not change existing references.
  };


  const filteredSteps = sharedSteps.filter(step =>
    step.name.toLowerCase().includes(search.toLowerCase()) ||
    step.action.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
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
            width: 640,
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'var(--cp-float)',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>
                Shared Steps Library
              </h3>
              <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <p style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 14, color: 'var(--fg-3)', margin: 0 }}>
              Insert reusable test steps
            </p>
          </div>

          {/* Search */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--fg-4)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shared steps..."
                style={{
                  width: '100%',
                  height: 44,
                  paddingLeft: 40,
                  paddingRight: 12,
                  fontSize: 14,
                  fontFamily: 'var(--ds-font-family-body)',
                  border: '1.5px solid var(--divider)',
                  borderRadius: 8,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Steps List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <div style={{ width: 32, height: 32, border: '3px solid var(--divider)', borderTopColor: 'var(--cp-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredSteps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>
                {search ? 'No matching steps found' : 'No shared steps yet'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredSteps.map(step => (
                  <div
                    key={step.id}
                    style={{
                      padding: 16,
                      backgroundColor: 'var(--cp-float)',
                      border: '1px solid var(--divider)',
                      borderRadius: 8,
                      transition: 'border-color 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cp-blue)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--divider)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h4 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>
                        {step.name}
                      </h4>
                      <span style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 12, color: 'var(--fg-4)', whiteSpace: 'nowrap' }}>
                        Used {step.usage_count}x
                      </span>
                    </div>
                    <p style={{
                      fontFamily: 'var(--ds-font-family-body)',
                      fontSize: 13,
                      color: 'var(--fg-3)',
                      margin: '0 0 12px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {step.action}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleInsert(step)}
                        style={{
                          height: 32,
                          padding: '0 16px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--cp-blue)',
                          cursor: 'pointer',
                        }}
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--divider)' }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-3)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                height: 40,
                padding: '0 20px',
                background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Create New Shared
            </button>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <CreateSharedStepModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => { fetchSharedSteps(); }}
        categories={categories}
      />
    </>
  );
}

export default SharedStepsModal;

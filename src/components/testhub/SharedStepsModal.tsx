/**
 * Shared Steps Library Modal
 * Allows users to browse and insert reusable test steps
 */

import { useState, useEffect } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

// --- CREATE SHARED STEP MODAL ---
function CreateSharedStepModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (step: SharedStep) => void;
}) {
  const [name, setName] = useState('');
  const [action, setAction] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim() || !action.trim()) return;

    setSaving(true);
    const { data, error } = await supabase.from('th_shared_steps').insert({
      name: name.trim(),
      action: action.trim(),
      expected_result: expectedResult.trim() || null,
      usage_count: 0,
      project_id: null,
    }).select().single();

    setSaving(false);

    if (!error && data) {
      onCreate(data);
      setName('');
      setAction('');
      setExpectedResult('');
      onClose();
    }
  };

  const isValid = name.trim() && action.trim();

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
        zIndex: 1200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Create Shared Step
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Login to Application"
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>
              Action *
            </label>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Describe the action to perform..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>
              Expected Result
            </label>
            <textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="Describe the expected outcome..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#64748B', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!isValid || saving}
            style={{
              height: 40,
              padding: '0 20px',
              background: isValid && !saving ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#E2E8F0',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: isValid && !saving ? '#FFFFFF' : '#94A3B8',
              cursor: isValid && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Creating...' : 'Create Step'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN MODAL ---
export function SharedStepsModal({ isOpen, onClose, onInsert }: SharedStepsModalProps) {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSharedSteps();
    }
  }, [isOpen]);

  const fetchSharedSteps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('th_shared_steps')
      .select('*')
      .order('usage_count', { ascending: false });

    if (!error && data) {
      setSharedSteps(data);
    }
    setLoading(false);
  };

  const handleInsert = async (step: SharedStep) => {
    // Increment usage count
    await supabase
      .from('th_shared_steps')
      .update({ usage_count: step.usage_count + 1 })
      .eq('id', step.id);

    onInsert({
      action: step.action,
      expectedResult: step.expected_result || '',
      sharedStepId: step.id,
    });
    onClose();
  };

  const handleStepCreated = (newStep: SharedStep) => {
    setSharedSteps([newStep, ...sharedSteps]);
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
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Shared Steps Library
              </h3>
              <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B', margin: 0 }}>
              Insert reusable test steps
            </p>
          </div>

          {/* Search */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#94A3B8' }} />
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
                  fontFamily: 'Inter, sans-serif',
                  border: '1.5px solid #E2E8F0',
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
                <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredSteps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                {search ? 'No matching steps found' : 'No shared steps yet'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredSteps.map(step => (
                  <div
                    key={step.id}
                    style={{
                      padding: 16,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      transition: 'border-color 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563EB')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                        {step.name}
                      </h4>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                        Used {step.usage_count}x
                      </span>
                    </div>
                    <p style={{
                      fontFamily: 'Inter',
                      fontSize: 13,
                      color: '#64748B',
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
                          color: '#2563EB',
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #E2E8F0' }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#64748B', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                height: 40,
                padding: '0 20px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
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
        onCreate={handleStepCreated}
      />
    </>
  );
}

export default SharedStepsModal;

/**
 * Shared Steps Page — TestHub Module
 * Route: /testhub/shared-steps
 * 
 * Full-featured Shared Steps library with CRUD operations
 */

import { useState, useEffect } from 'react';
import { Library, Plus, Search, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SharedStep {
  id: string;
  name: string;
  action: string;
  expected_result: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export default function SharedStepsPage() {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedStep | null>(null);

  useEffect(() => {
    fetchSharedSteps();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shared step?')) return;
    await supabase.from('th_shared_steps').delete().eq('id', id);
    setSharedSteps(sharedSteps.filter(s => s.id !== id));
  };

  const filteredSteps = sharedSteps.filter(step =>
    step.name.toLowerCase().includes(search.toLowerCase()) ||
    step.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Library className="h-6 w-6 text-primary" />
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Shared Steps
          </h1>
          <span style={{
            height: 24,
            padding: '0 10px',
            backgroundColor: '#F1F5F9',
            borderRadius: 12,
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
          }}>
            {sharedSteps.length}
          </span>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            height: 40,
            padding: '0 20px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            border: 'none',
            borderRadius: 8,
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus style={{ width: 18, height: 18 }} />
          Create Shared Step
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        height: 56,
        padding: '0 16px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
      }}>
        <div style={{ position: 'relative', width: 280 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shared steps..."
            style={{
              width: '100%',
              height: 40,
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

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredSteps.length === 0 ? (
        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
        }}>
          <Library style={{ width: 48, height: 48, color: '#CBD5E1', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 600, color: '#64748B', margin: '0 0 8px 0' }}>
            {search ? 'No matching steps found' : 'No shared steps yet'}
          </h3>
          <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#94A3B8', margin: 0 }}>
            Create reusable test steps to speed up test case creation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filteredSteps.map(step => (
            <div
              key={step.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: 20,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  {step.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setEditingStep(step)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                    }}
                  >
                    <Edit2 style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => handleDelete(step.id)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                    }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                  Action
                </span>
                <p style={{
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: '#334155',
                  margin: '4px 0 0 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {step.action}
                </p>
              </div>

              {step.expected_result && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                    Expected Result
                  </span>
                  <p style={{
                    fontFamily: 'Inter',
                    fontSize: 13,
                    color: '#334155',
                    margin: '4px 0 0 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {step.expected_result}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: 12,
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2563EB',
                }}>
                  Used {step.usage_count}x
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <CreateEditModal
          onClose={() => setCreateModalOpen(false)}
          onSave={(step) => {
            setSharedSteps([step, ...sharedSteps]);
            setCreateModalOpen(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingStep && (
        <CreateEditModal
          step={editingStep}
          onClose={() => setEditingStep(null)}
          onSave={(step) => {
            setSharedSteps(sharedSteps.map(s => s.id === step.id ? step : s));
            setEditingStep(null);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// --- CREATE/EDIT MODAL ---
function CreateEditModal({
  step,
  onClose,
  onSave,
}: {
  step?: SharedStep;
  onClose: () => void;
  onSave: (step: SharedStep) => void;
}) {
  const [name, setName] = useState(step?.name || '');
  const [action, setAction] = useState(step?.action || '');
  const [expectedResult, setExpectedResult] = useState(step?.expected_result || '');
  const [saving, setSaving] = useState(false);

  const isEdit = !!step;
  const isValid = name.trim() && action.trim();

  const handleSave = async () => {
    if (!isValid) return;

    setSaving(true);

    if (isEdit) {
      const { data, error } = await supabase
        .from('th_shared_steps')
        .update({
          name: name.trim(),
          action: action.trim(),
          expected_result: expectedResult.trim() || null,
        })
        .eq('id', step.id)
        .select()
        .single();

      if (!error && data) {
        onSave(data);
      }
    } else {
      const { data, error } = await supabase
        .from('th_shared_steps')
        .insert({
          name: name.trim(),
          action: action.trim(),
          expected_result: expectedResult.trim() || null,
          usage_count: 0,
          project_id: '00000000-0000-0000-0000-000000000001',
        })
        .select()
        .single();

      if (!error && data) {
        onSave(data);
      }
    }

    setSaving(false);
  };

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
          width: 520,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            {isEdit ? 'Edit Shared Step' : 'Create Shared Step'}
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer' }}>
            ×
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
                height: 44,
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
              rows={4}
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
              rows={4}
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
            onClick={handleSave}
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Step'}
          </button>
        </div>
      </div>
    </div>
  );
}

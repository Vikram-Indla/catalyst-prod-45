/**
 * Shared Steps Library Page — TestHub Module
 * Route: /testhub/shared-steps
 * G2-02: Page Shell with header, category sidebar, toolbar, and list
 */

import { useState, useEffect } from 'react';
import { Library, Plus, Search, Filter, ArrowUpDown, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharedStep {
  id: string;
  name: string;
  description: string | null;
  action: string;
  expected_result: string | null;
  category_id: string | null;
  variables: any;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
}

export default function SharedStepsPage() {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedStep | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [stepsRes, catsRes] = await Promise.all([
      supabase.from('th_shared_steps').select('*').order('usage_count', { ascending: false }),
      supabase.from('th_shared_step_categories').select('*').order('sort_order', { ascending: true }),
    ]);
    if (stepsRes.data) setSharedSteps(stepsRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Refreshed');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shared step?')) return;
    await supabase.from('th_shared_steps').delete().eq('id', id);
    setSharedSteps(sharedSteps.filter(s => s.id !== id));
    toast.success('Shared step deleted');
  };

  const filteredSteps = sharedSteps.filter(step => {
    const matchesSearch = !searchQuery ||
      step.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryId || step.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  const getCategoryStepCount = (catId: string) =>
    sharedSteps.filter(s => s.category_id === catId).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0,
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: 'Sora, sans-serif',
            }}>
              <Library size={28} style={{ color: '#2563EB' }} />
              Shared Steps Library
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: '8px 0 0', fontFamily: 'Inter, sans-serif' }}>
              Reusable test steps for consistency across test cases
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleRefresh}
              title="Refresh"
              style={{
                width: 40, height: 40, padding: 0,
                border: '1.5px solid #E2E8F0', borderRadius: 8,
                backgroundColor: '#FFFFFF', color: '#64748B',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: '#FFFFFF',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Plus size={18} />
              Create Shared Step
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Category Sidebar */}
        <div style={{
          width: 260, backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0', padding: '20px 0',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <h2 style={{
              fontSize: 11, fontWeight: 600, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
              fontFamily: 'Inter, sans-serif',
            }}>
              Categories
            </h2>
          </div>

          {/* All Steps */}
          <button
            onClick={() => setSelectedCategoryId(null)}
            style={{
              width: '100%', padding: '10px 16px',
              border: 'none', textAlign: 'left', cursor: 'pointer',
              backgroundColor: !selectedCategoryId ? 'rgba(37,99,235,0.08)' : 'transparent',
              borderLeft: !selectedCategoryId ? '3px solid #2563EB' : '3px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
              color: !selectedCategoryId ? '#2563EB' : '#334155',
              transition: 'all 0.15s',
            }}
          >
            <span>All Steps</span>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: !selectedCategoryId ? '#2563EB' : '#94A3B8',
            }}>
              {sharedSteps.length}
            </span>
          </button>

          {/* Category Items */}
          {categories.map(cat => {
            const isSelected = selectedCategoryId === cat.id;
            const count = getCategoryStepCount(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                style={{
                  width: '100%', padding: '10px 16px',
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
                  borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                  color: isSelected ? '#2563EB' : '#334155',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: cat.color, flexShrink: 0,
                  }} />
                  {cat.name}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isSelected ? '#2563EB' : '#94A3B8',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            padding: '16px 24px', backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search size={16} style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: '#94A3B8',
              }} />
              <input
                type="text"
                placeholder="Search shared steps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: 40, paddingLeft: 40, paddingRight: 12,
                  border: '1.5px solid #E2E8F0', borderRadius: 8,
                  fontSize: 14, color: '#0F172A', backgroundColor: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
            <button
              onClick={() => toast.info('Filters coming soon')}
              style={{
                height: 40, padding: '0 16px',
                border: '1.5px solid #E2E8F0', borderRadius: 8,
                backgroundColor: '#FFFFFF', color: '#334155',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Filter size={16} />
              Filter
            </button>
            <button
              onClick={() => toast.info('Sort options coming soon')}
              style={{
                height: 40, padding: '0 16px',
                border: '1.5px solid #E2E8F0', borderRadius: 8,
                backgroundColor: '#FFFFFF', color: '#334155',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <ArrowUpDown size={16} />
              Sort
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {filteredSteps.length} shared step{filteredSteps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Steps List */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{
                  width: 40, height: 40,
                  border: '3px solid #E2E8F0', borderTopColor: '#2563EB',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
              </div>
            ) : filteredSteps.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100%', color: '#94A3B8',
              }}>
                <Library size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', fontFamily: 'Inter, sans-serif' }}>
                  {searchQuery || selectedCategoryId ? 'No matching steps found' : 'No shared steps yet'}
                </p>
                <p style={{ fontSize: 14, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  Create your first shared step to get started
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {filteredSteps.map(step => {
                  const cat = categories.find(c => c.id === step.category_id);
                  return (
                    <div
                      key={step.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12, padding: 20,
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
                        <div>
                          <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                            {step.name}
                          </h3>
                          {cat && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, color: cat.color, fontWeight: 600, marginTop: 4,
                              fontFamily: 'Inter, sans-serif',
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cat.color }} />
                              {cat.name}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => setEditingStep(step)}
                            style={{
                              width: 28, height: 28, padding: 0,
                              backgroundColor: 'transparent', border: 'none',
                              color: '#94A3B8', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 4,
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(step.id)}
                            style={{
                              width: 28, height: 28, padding: 0,
                              backgroundColor: 'transparent', border: 'none',
                              color: '#94A3B8', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 4,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                          Action
                        </span>
                        <p style={{
                          fontFamily: 'Inter', fontSize: 13, color: '#334155',
                          margin: '4px 0 0 0',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
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
                            fontFamily: 'Inter', fontSize: 13, color: '#334155',
                            margin: '4px 0 0 0',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {step.expected_result}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                        <span style={{
                          padding: '4px 10px', backgroundColor: '#EFF6FF',
                          borderRadius: 12, fontFamily: 'Inter',
                          fontSize: 12, fontWeight: 600, color: '#2563EB',
                        }}>
                          Used {step.usage_count}x
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
        .update({ name: name.trim(), action: action.trim(), expected_result: expectedResult.trim() || null })
        .eq('id', step.id)
        .select()
        .single();
      if (!error && data) onSave(data);
    } else {
      const { data, error } = await supabase
        .from('th_shared_steps')
        .insert({ name: name.trim(), action: action.trim(), expected_result: expectedResult.trim() || null, usage_count: 0 })
        .select()
        .single();
      if (!error && data) onSave(data);
    }
    setSaving(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 520, backgroundColor: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            {isEdit ? 'Edit Shared Step' : 'Create Shared Step'}
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', fontSize: 20 }}>
            ×
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6, fontFamily: 'Inter' }}>
              Name *
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Login to Application"
              style={{ width: '100%', height: 44, padding: '0 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6, fontFamily: 'Inter' }}>
              Action *
            </label>
            <textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="Describe the action to perform..." rows={4}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6, fontFamily: 'Inter' }}>
              Expected Result
            </label>
            <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} placeholder="Describe the expected outcome..." rows={4}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#64748B', cursor: 'pointer', fontFamily: 'Inter' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!isValid || saving}
            style={{
              height: 40, padding: '0 20px',
              background: isValid && !saving ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#E2E8F0',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              color: isValid && !saving ? '#FFFFFF' : '#94A3B8',
              cursor: isValid && !saving ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter',
            }}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Step'}
          </button>
        </div>
      </div>
    </div>
  );
}

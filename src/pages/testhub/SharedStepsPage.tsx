/**
 * Shared Steps Library Page — TestHub Module
 * Route: /testhub/shared-steps
 * G2-03: Data Fetching & List Display with category join, variable highlighting, kebab menu
 */

import { useState, useEffect, useRef, Fragment } from 'react';
import {
  Library, Plus, Search, Filter, ArrowUpDown, RefreshCw,
  MoreVertical, Pencil, Copy, Trash2, Eye, Tag,
  Shield, Navigation, FormInput, Plug, CheckCircle,
  Database, Gauge,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- Types ---

interface SharedStepVariable {
  name: string;
  default?: string;
}

interface SharedStepCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

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
  category?: SharedStepCategory | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
}

// --- Helpers ---

/** Highlight {{variable}} placeholders in text */
function highlightVariables(text: string) {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.match(/^\{\{[^}]+\}\}$/)) {
      return (
        <span
          key={i}
          style={{
            display: 'inline',
            padding: '1px 6px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {part}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// --- Main Page ---

export default function SharedStepsPage() {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedStep | null>(null);

  // Fetch categories once on mount
  useEffect(() => {
    supabase
      .from('th_shared_step_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  // Fetch steps when filters change
  useEffect(() => {
    fetchSharedSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, searchQuery]);

  const fetchSharedSteps = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('th_shared_steps')
        .select(`
          *,
          category:th_shared_step_categories (
            id, name, color, icon
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId);
      }
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('Fetch error:', error);
        toast.error('Failed to load shared steps');
        return;
      }
      setSharedSteps((data || []) as any);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load shared steps');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSharedSteps();
    toast.success('Refreshed');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shared step?')) return;
    const { error } = await supabase.from('th_shared_steps').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setSharedSteps(prev => prev.filter(s => s.id !== id));
    setTotalCount(prev => prev - 1);
    toast.success('Shared step deleted');
  };

  const handleDuplicate = async (step: SharedStep) => {
    const { data, error } = await supabase
      .from('th_shared_steps')
      .insert({
        name: `${step.name} (Copy)`,
        description: step.description,
        action: step.action,
        expected_result: step.expected_result,
        category_id: step.category_id,
        variables: step.variables as any,
        usage_count: 0,
      })
      .select(`*, category:th_shared_step_categories ( id, name, color, icon )`)
      .single();
    if (error) { toast.error('Failed to duplicate'); return; }
    if (data) {
      setSharedSteps(prev => [data as any, ...prev]);
      setTotalCount(prev => prev + 1);
      toast.success('Step duplicated');
    }
  };

  const getCategoryStepCount = (catId: string) =>
    sharedSteps.filter(s => s.category_id === catId).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
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
            <button onClick={handleRefresh} title="Refresh" style={{
              width: 40, height: 40, padding: 0, border: '1.5px solid #E2E8F0', borderRadius: 8,
              backgroundColor: '#FFFFFF', color: '#64748B', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={18} />
            </button>
            <button onClick={() => setCreateModalOpen(true)} style={{
              height: 40, padding: '0 20px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)', fontFamily: 'Inter, sans-serif',
            }}>
              <Plus size={18} />
              Create Shared Step
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Category Sidebar */}
        <div style={{
          width: 260, backgroundColor: '#FFFFFF', borderRight: '1px solid #E2E8F0',
          padding: '20px 0', display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <h2 style={{
              fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase',
              letterSpacing: '0.05em', margin: 0, fontFamily: 'Inter, sans-serif',
            }}>
              Categories
            </h2>
          </div>
          <SidebarItem label="All Steps" count={totalCount} isSelected={!selectedCategoryId} onClick={() => setSelectedCategoryId(null)} />
          {categories.map(cat => (
            <SidebarItem
              key={cat.id}
              label={cat.name}
              count={getCategoryStepCount(cat.id)}
              color={cat.color}
              isSelected={selectedCategoryId === cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            padding: '16px 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text" placeholder="Search shared steps..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: 40, paddingLeft: 40, paddingRight: 12,
                  border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14,
                  color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
            <ToolbarButton icon={<Filter size={16} />} label="Filter" onClick={() => toast.info('Filters coming soon')} />
            <ToolbarButton icon={<ArrowUpDown size={16} />} label="Sort" onClick={() => toast.info('Sort options coming soon')} />
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
              {totalCount} shared step{totalCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Steps List */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{
                  width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#2563EB',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
              </div>
            ) : sharedSteps.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: '#94A3B8',
              }}>
                <Library size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', fontFamily: 'Inter' }}>
                  {searchQuery || selectedCategoryId ? 'No matching shared steps' : 'No shared steps yet'}
                </p>
                <p style={{ fontSize: 14, margin: 0, fontFamily: 'Inter' }}>
                  {searchQuery ? 'Try a different search term' : 'Create your first shared step to get started'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {sharedSteps.map(step => (
                  <SharedStepCard
                    key={step.id}
                    step={step}
                    onView={() => toast.info('View modal coming in G2-06')}
                    onEdit={() => setEditingStep(step)}
                    onDuplicate={() => handleDuplicate(step)}
                    onDelete={() => handleDelete(step.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {createModalOpen && (
        <CreateEditModal
          categories={categories}
          onClose={() => setCreateModalOpen(false)}
          onSave={(step) => {
            setSharedSteps(prev => [step, ...prev]);
            setTotalCount(prev => prev + 1);
            setCreateModalOpen(false);
          }}
        />
      )}
      {editingStep && (
        <CreateEditModal
          step={editingStep}
          categories={categories}
          onClose={() => setEditingStep(null)}
          onSave={(step) => {
            setSharedSteps(prev => prev.map(s => s.id === step.id ? step : s));
            setEditingStep(null);
          }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- Sidebar Item ---
function SidebarItem({ label, count, color, isSelected, onClick }: {
  label: string; count: number; color?: string; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
      backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
      borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
      color: isSelected ? '#2563EB' : '#334155', transition: 'all 0.15s',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {color && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />}
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#2563EB' : '#94A3B8' }}>
        {count}
      </span>
    </button>
  );
}

// --- Toolbar Button ---
function ToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      height: 40, padding: '0 16px', border: '1.5px solid #E2E8F0', borderRadius: 8,
      backgroundColor: '#FFFFFF', color: '#334155', fontSize: 14, fontWeight: 500,
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'Inter',
    }}>
      {icon}
      {label}
    </button>
  );
}

// --- Shared Step Card ---
function SharedStepCard({ step, onView, onEdit, onDuplicate, onDelete }: {
  step: SharedStep; onView: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const cat = step.category;
  const variables = Array.isArray(step.variables) ? step.variables : [];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: 20, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
      onClick={onView}
    >
      {/* Top row: category badge + usage + kebab */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cat && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
              backgroundColor: `${cat.color}15`, borderRadius: 12, fontSize: 11,
              fontWeight: 600, color: cat.color, fontFamily: 'Inter',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cat.color }} />
              {cat.name}
            </span>
          )}
          <span style={{
            padding: '3px 10px', backgroundColor: '#EFF6FF', borderRadius: 12,
            fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: 'Inter',
          }}>
            Used {step.usage_count}x
          </span>
        </div>

        {/* Kebab menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{
              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
              backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, top: 36, width: 160, backgroundColor: '#FFFFFF',
                borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: 4, zIndex: 50,
              }}
            >
              <MenuButton icon={<Eye size={14} />} label="View" onClick={() => { onView(); setMenuOpen(false); }} />
              <MenuButton icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(); setMenuOpen(false); }} />
              <MenuButton icon={<Copy size={14} />} label="Duplicate" onClick={() => { onDuplicate(); setMenuOpen(false); }} />
              <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '4px 0' }} />
              <MenuButton icon={<Trash2 size={14} />} label="Delete" onClick={() => { onDelete(); setMenuOpen(false); }} danger />
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>
        {step.name}
      </h3>

      {/* Description */}
      {step.description && (
        <p style={{
          fontFamily: 'Inter', fontSize: 13, color: '#64748B', margin: '0 0 12px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {step.description}
        </p>
      )}

      {/* Action */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
          Action
        </span>
        <p style={{
          fontFamily: 'Inter', fontSize: 13, color: '#334155', margin: '4px 0 0',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.6,
        }}>
          {highlightVariables(step.action)}
        </p>
      </div>

      {/* Variables */}
      {variables.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
          {variables.map((v, i) => (
            <span key={i} style={{
              padding: '2px 8px', backgroundColor: '#F1F5F9', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 11, color: '#64748B',
            }}>
              {`{{${v.name}}}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Menu Button ---
function MenuButton({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 36, padding: '0 12px', border: 'none', borderRadius: 6,
      backgroundColor: 'transparent', color: danger ? '#DC2626' : '#334155',
      fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
      textAlign: 'left', fontFamily: 'Inter',
    }}>
      {icon}
      {label}
    </button>
  );
}

// --- Create/Edit Modal ---
function CreateEditModal({ step, categories, onClose, onSave }: {
  step?: SharedStep; categories: Category[]; onClose: () => void; onSave: (step: SharedStep) => void;
}) {
  const [name, setName] = useState(step?.name || '');
  const [action, setAction] = useState(step?.action || '');
  const [expectedResult, setExpectedResult] = useState(step?.expected_result || '');
  const [categoryId, setCategoryId] = useState(step?.category_id || '');
  const [saving, setSaving] = useState(false);

  const isEdit = !!step;
  const isValid = name.trim() && action.trim();

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      action: action.trim(),
      expected_result: expectedResult.trim() || null,
      category_id: categoryId || null,
    };

    if (isEdit) {
      const { data, error } = await supabase
        .from('th_shared_steps')
        .update(payload)
        .eq('id', step.id)
        .select(`*, category:th_shared_step_categories ( id, name, color, icon )`)
        .single();
      if (!error && data) onSave(data as any);
      else toast.error('Failed to save');
    } else {
      const { data, error } = await supabase
        .from('th_shared_steps')
        .insert({ ...payload, usage_count: 0 })
        .select(`*, category:th_shared_step_categories ( id, name, color, icon )`)
        .single();
      if (!error && data) { onSave(data as any); toast.success('Step created'); }
      else toast.error('Failed to create');
    }
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
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

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FieldGroup label="Name *">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Login to Application"
              style={{ width: '100%', height: 44, padding: '0 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8 }} />
          </FieldGroup>
          <FieldGroup label="Category">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              style={{ width: '100%', height: 44, padding: '0 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8, backgroundColor: '#FFFFFF' }}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Action *">
            <textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="Describe the action to perform..." rows={4}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8, resize: 'vertical' }} />
          </FieldGroup>
          <FieldGroup label="Expected Result">
            <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} placeholder="Describe the expected outcome..." rows={4}
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'Inter', border: '1.5px solid #E2E8F0', borderRadius: 8, resize: 'vertical' }} />
          </FieldGroup>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#64748B', cursor: 'pointer', fontFamily: 'Inter' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!isValid || saving} style={{
            height: 40, padding: '0 20px',
            background: isValid && !saving ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#E2E8F0',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            color: isValid && !saving ? '#FFFFFF' : '#94A3B8',
            cursor: isValid && !saving ? 'pointer' : 'not-allowed', fontFamily: 'Inter',
          }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Step'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Field Group ---
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6, fontFamily: 'Inter' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

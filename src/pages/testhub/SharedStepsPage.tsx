/**
 * Shared Steps Library Page — TestHub Module
 * Route: /testhub/shared-steps
 * G2-03: Data Fetching & List Display with category join, variable highlighting, kebab menu
 */

import { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library, Plus, Search, Filter, ArrowUpDown, RefreshCw,
  MoreVertical, Pencil, Copy, Trash2, Eye, Tag,
  Shield, Navigation2, FormInput, Plug, CheckCircle,
  Database, Gauge, Folder, List, LayoutGrid, ChevronDown,
  ArrowUp, ArrowDown, Settings, Users, FileText, Zap,
  Globe, Lock, Bell, Heart, Star,
} from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { CreateSharedStepModal } from '@/components/testhub/CreateSharedStepModal';
import { ViewSharedStepModal } from '@/components/testhub/ViewSharedStepModal';
import { DeleteSharedStepModal } from '@/components/testhub/DeleteSharedStepModal';
import { CreateCategoryModal } from '@/components/testhub/CreateCategoryModal';

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
  step_count?: number;
}

// --- Helpers ---

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  'shield': Shield,
  'navigation': Navigation2,
  'form-input': FormInput,
  'plug': Plug,
  'check-circle': CheckCircle,
  'database': Database,
  'eye': Eye,
  'gauge': Gauge,
  'folder': Folder,
  'tag': Tag,
  'settings': Settings,
  'users': Users,
  'file-text': FileText,
  'zap': Zap,
  'globe': Globe,
  'lock': Lock,
  'bell': Bell,
  'heart': Heart,
  'star': Star,
};

function getCategoryIcon(iconName: string, color: string, size: number = 16) {
  const IconComponent = CATEGORY_ICON_MAP[iconName] || Tag;
  return <IconComponent size={size} style={{ color }} />;
}

/** Highlight {{variable}} placeholders in text */
function highlightVariables(text: string, isDark = false) {
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
            backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF',
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
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedStep | null>(null);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [viewStep, setViewStep] = useState<SharedStep | null>(null);
  const [deleteStep, setDeleteStep] = useState<SharedStep | null>(null);

  // Filter, Sort, View mode state
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortField, setSortField] = useState<'usage_count' | 'name' | 'updated_at'>('usage_count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch categories with step counts
  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: catError } = await supabase
        .from('tm_shared_step_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catError) { console.error('Categories fetch error:', catError); return; }

      const { data: countsData } = await typedQuery('tm_shared_steps')
        .select('category_id')
        .eq('is_active', true);

      if (countsData) {
        const countMap: Record<string, number> = {};
        countsData.forEach((step: any) => {
          if (step.category_id) countMap[step.category_id] = (countMap[step.category_id] || 0) + 1;
        });
        setCategories((categoriesData || []).map(cat => ({ ...cat, step_count: countMap[cat.id] || 0 })));
      } else {
        setCategories(categoriesData || []);
      }
    } catch (err) { console.error('Categories fetch error:', err); }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => { setIsFilterOpen(false); setIsSortOpen(false); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch steps when filters change
  useEffect(() => {
    fetchSharedSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, searchQuery, sortField, sortDirection, activeFilters]);

  const fetchSharedSteps = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tm_shared_steps' as any)
        .select(`
          *,
          category:tm_shared_step_categories (
            id, name, color, icon
          )
        `, { count: 'exact' })
        .eq('is_active', true);

      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId);
      }
      if (activeFilters.length > 0 && !selectedCategoryId) {
        query = query.in('category_id', activeFilters);
      }
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      const { data, error, count } = await query;
      if (error) {
        console.error('Fetch error:', error);
        catalystToast.error('Failed to load shared steps', { title: 'Error' });
        return;
      }
      setSharedSteps((data || []) as any);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Fetch error:', err);
      catalystToast.error('Failed to load shared steps', { title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSharedSteps();
    fetchCategories();
    catalystToast.success('Shared steps refreshed');
  };

  const handleDelete = (step: SharedStep) => {
    setDeleteStep(step);
  };

  const handleDuplicate = async (step: SharedStep) => {
    const { data, error } = await typedQuery('tm_shared_steps')
      .insert({
        name: `${step.name} (Copy)`,
        description: step.description,
        action: step.action,
        expected_result: step.expected_result,
        category_id: step.category_id,
        variables: step.variables as any,
        usage_count: 0,
        project_id: '00000000-0000-0000-0000-000000000001',
      })
      .select(`*, category:tm_shared_step_categories ( id, name, color, icon )`)
      .single();
    if (error) { catalystToast.error('Failed to duplicate'); return; }
    if (data) {
      setSharedSteps(prev => [data as any, ...prev]);
      setTotalCount(prev => prev + 1);
      catalystToast.success('Step duplicated');
    }
  };

  // no longer needed — counts come from fetchCategories

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC' }}>
      <TestHubPageHeader title="Shared Steps Library" subtitle="Reusable test steps for consistency across test cases">
            <button onClick={handleRefresh} title="Refresh" style={{
              width: 40, height: 40, padding: 0, border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#64748B', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={18} />
            </button>
            <button onClick={() => setCreateModalOpen(true)} style={{
              height: 40, padding: '0 20px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)', fontFamily: 'var(--cp-font-body)',
            }}>
              <Plus size={18} />
              Create Shared Step
            </button>
      </TestHubPageHeader>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Category Sidebar */}
        <div style={{
          width: 260, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderRight: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '16px 16px 12px', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{
              fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase',
              letterSpacing: '0.05em', margin: 0, fontFamily: 'var(--cp-font-body)',
            }}>Categories</h2>
            <button onClick={() => setIsCreateCategoryModalOpen(true)} title="Add category" style={{
              width: 28, height: 28, padding: 0, border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 6,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#64748B', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={14} />
            </button>
          </div>

          {/* Category List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {/* All Steps */}
            <CategorySidebarItem
              label="All Steps"
              icon={<Folder size={16} style={{ color: !selectedCategoryId ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B') }} />}
              count={totalCount}
              isSelected={!selectedCategoryId}
              selectedColor="#2563EB"
              onClick={() => setSelectedCategoryId(null)}
              isDark={isDark}
            />

            <div style={{ height: 1, backgroundColor: isDark ? '#292929' : '#F1F5F9', margin: '8px 0' }} />

            {categories.map(cat => (
              <CategorySidebarItem
                key={cat.id}
                label={cat.name}
                icon={getCategoryIcon(cat.icon, selectedCategoryId === cat.id ? cat.color : (isDark ? '#A1A1A1' : '#64748B'))}
                count={cat.step_count || 0}
                isSelected={selectedCategoryId === cat.id}
                selectedColor={cat.color}
                onClick={() => setSelectedCategoryId(cat.id)}
                isDark={isDark}
              />
            ))}
          </div>

          {/* Sidebar Footer */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, fontSize: 12, color: isDark ? '#878787' : '#94A3B8' }}>
            {categories.length} categories
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            padding: '16px 24px', backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#878787' : '#94A3B8' }} />
              <input
                type="text" placeholder="Search shared steps..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: 40, paddingLeft: 40, paddingRight: 12,
                  border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, fontSize: 14,
                  color: isDark ? '#EDEDED' : '#0F172A', backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF', fontFamily: 'var(--cp-font-body)',
                }}
              />
            </div>

            {/* Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
                style={{
                  height: 40, padding: '0 14px',
                  border: `1.5px solid ${activeFilters.length > 0 ? '#2563EB' : (isDark ? '#2E2E2E' : '#E2E8F0')}`,
                  borderRadius: 8,
                  backgroundColor: activeFilters.length > 0 ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#FFFFFF'),
                  color: activeFilters.length > 0 ? '#2563EB' : (isDark ? '#A1A1A1' : '#334155'),
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--cp-font-body)',
                }}
              >
                <Filter size={16} />
                Filter
                {activeFilters.length > 0 && (
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', backgroundColor: '#2563EB',
                    color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {activeFilters.length}
                  </span>
                )}
                <ChevronDown size={14} />
              </button>

              {isFilterOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 280,
                    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
                    boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden',
                  }}
                >
                  <div style={{
                    padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#A1A1A1' : '#64748B', fontFamily: 'var(--cp-font-body)' }}>Filter by Category</span>
                    {activeFilters.length > 0 && (
                      <button onClick={() => setActiveFilters([])} style={{
                        background: 'none', border: 'none', color: '#2563EB', fontSize: 12,
                        fontWeight: 500, cursor: 'pointer', padding: 0, fontFamily: 'var(--cp-font-body)',
                      }}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <div style={{ padding: 8, maxHeight: 240, overflowY: 'auto' }}>
                    {categories.map((cat) => {
                      const isChecked = activeFilters.includes(cat.id);
                      return (
                        <label key={cat.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                          borderRadius: 8, cursor: 'pointer', fontSize: 14, color: isDark ? '#EDEDED' : '#334155', fontFamily: 'var(--cp-font-body)',
                          backgroundColor: isChecked ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : 'transparent',
                        }}>
                          <input
                            type="checkbox" checked={isChecked}
                            onChange={() => {
                              setActiveFilters(prev =>
                                isChecked ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            style={{ width: 16, height: 16, accentColor: '#2563EB' }}
                          />
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{cat.name}</span>
                          <span style={{ fontSize: 12, color: isDark ? '#878787' : '#94A3B8' }}>{cat.step_count || 0}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ padding: '8px 12px', borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
                    <button onClick={() => setIsFilterOpen(false)} style={{
                      width: '100%', height: 50,
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                    }}>
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
                style={{
                  height: 40, padding: '0 14px', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#334155', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--cp-font-body)',
                }}
              >
                <ArrowUpDown size={16} />
                Sort
                <ChevronDown size={14} />
              </button>

              {isSortOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 220,
                    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
                    boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)', zIndex: 200, padding: 8,
                  }}
                >
                  {([
                    { field: 'usage_count' as const, label: 'Most Used', defaultDir: 'desc' as const },
                    { field: 'name' as const, label: 'Name (A-Z)', defaultDir: 'asc' as const },
                    { field: 'updated_at' as const, label: 'Recently Updated', defaultDir: 'desc' as const },
                  ]).map((option) => {
                    const isActive = sortField === option.field;
                    return (
                      <button
                        key={option.field}
                        onClick={() => {
                          if (isActive) {
                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField(option.field);
                            setSortDirection(option.defaultDir);
                          }
                          setIsSortOpen(false);
                        }}
                        style={{
                          width: '100%', height: 40, padding: '8px 12px', border: 'none', borderRadius: 8,
                          backgroundColor: isActive ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : 'transparent',
                          color: isActive ? '#2563EB' : (isDark ? '#A1A1A1' : '#334155'), fontSize: 14,
                          fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          textAlign: 'left', fontFamily: 'var(--cp-font-body)',
                        }}
                      >
                        {option.label}
                        {isActive && (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            {/* View Toggle */}
            <div style={{ display: 'flex', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('list')} title="List view" style={{
                width: 40, height: 38, padding: 0, border: 'none',
                backgroundColor: viewMode === 'list' ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#FFFFFF'),
                color: viewMode === 'list' ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'), cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <List size={18} />
              </button>
              <button onClick={() => setViewMode('card')} title="Card view" style={{
                width: 40, height: 38, padding: 0, border: 'none',
                borderLeft: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`,
                backgroundColor: viewMode === 'card' ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : (isDark ? '#1A1A1A' : '#FFFFFF'),
                color: viewMode === 'card' ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'), cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LayoutGrid size={18} />
              </button>
            </div>

            <span style={{ fontSize: 13, color: isDark ? '#878787' : '#64748B', fontFamily: 'var(--cp-font-body)' }}>
              {totalCount} shared step{totalCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Steps Content */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <div style={{
                  width: 40, height: 40, border: `3px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderTopColor: '#2563EB',
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
              </div>
            ) : sharedSteps.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: isDark ? '#878787' : '#94A3B8',
              }}>
                <Library size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px', fontFamily: 'var(--cp-font-body)' }}>
                  {searchQuery || selectedCategoryId || activeFilters.length > 0 ? 'No matching shared steps' : 'No shared steps yet'}
                </p>
                <p style={{ fontSize: 14, margin: 0, fontFamily: 'var(--cp-font-body)' }}>
                  {searchQuery || activeFilters.length > 0 ? 'Try different search or filters' : 'Create your first shared step to get started'}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cp-font-body)' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Variables</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>Used</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedSteps.map((step, index) => {
                      const variables = Array.isArray(step.variables) ? step.variables : [];
                      return (
                        <tr
                          key={step.id}
                          onClick={() => setViewStep(step)}
                          style={{
                            borderBottom: index < sharedSteps.length - 1 ? `1px solid ${isDark ? '#292929' : '#F1F5F9'}` : 'none',
                            cursor: 'pointer', transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#1A1A1A' : '#F8FAFC'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>{step.name}</div>
                            {step.description && (
                              <div style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                {step.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {step.category ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                                backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4, fontSize: 11,
                                fontWeight: 600, color: isDark ? '#A1A1A1' : '#374151',
                              }}>
                                {step.category.name}
                              </span>
                            ) : (
                              <span style={{ color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {variables.length > 0 ? (
                              <span style={{ padding: '2px 8px', backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                                {variables.length}
                              </span>
                            ) : (
                              <span style={{ color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/testhub/shared-steps/${step.id}`); }}
                              style={{
                                padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                backgroundColor: step.usage_count > 0 ? (isDark ? 'rgba(5,150,105,0.12)' : '#F0FDF4') : (isDark ? '#1A1A1A' : '#F1F5F9'),
                                color: step.usage_count > 0 ? '#059669' : (isDark ? '#878787' : '#64748B'),
                                border: 'none', cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => { if (step.usage_count > 0) e.currentTarget.style.textDecoration = 'underline'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                            >
                              {step.usage_count}x
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setEditingStep(step)} title="Edit" style={{
                              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
                              backgroundColor: 'transparent', color: isDark ? '#A1A1A1' : '#64748B', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(step)} title="Delete" style={{
                              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
                              backgroundColor: 'transparent', color: isDark ? '#A1A1A1' : '#64748B', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, gridAutoRows: '1fr' }}>
                {sharedSteps.map(step => (
                  <SharedStepCard
                    key={step.id}
                    step={step}
                    onView={() => setViewStep(step)}
                    onEdit={() => setEditingStep(step)}
                    onDuplicate={() => handleDuplicate(step)}
                    onDelete={() => handleDelete(step)}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Modal */}
      <ViewSharedStepModal
        isOpen={!!viewStep}
        sharedStep={viewStep}
        onClose={() => setViewStep(null)}
        onEdit={() => { setEditingStep(viewStep); setViewStep(null); }}
        onDelete={() => { if (viewStep) { handleDelete(viewStep); setViewStep(null); } }}
        onDuplicate={() => { if (viewStep) { handleDuplicate(viewStep); setViewStep(null); } }}
      />

      {/* Create Modal */}
      <CreateSharedStepModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => { fetchSharedSteps(); fetchCategories(); }}
        categories={categories}
      />
      {/* Edit Modal */}
      <CreateSharedStepModal
        isOpen={!!editingStep}
        onClose={() => setEditingStep(null)}
        onSuccess={() => { fetchSharedSteps(); fetchCategories(); setEditingStep(null); }}
        categories={categories}
        mode="edit"
        sharedStep={editingStep}
      />

      {/* Delete Modal */}
      <DeleteSharedStepModal
        isOpen={!!deleteStep}
        sharedStep={deleteStep}
        onClose={() => setDeleteStep(null)}
        onSuccess={() => { fetchSharedSteps(); fetchCategories(); setDeleteStep(null); }}
      />

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        onSuccess={() => fetchCategories()}
        existingCategories={categories}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- Category Sidebar Item ---
function CategorySidebarItem({ label, icon, count, isSelected, selectedColor, onClick, isDark = false }: {
  label: string; icon: React.ReactNode; count: number; isSelected: boolean; selectedColor: string; onClick: () => void; isDark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8,
        backgroundColor: isSelected ? `${selectedColor}15` : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left', transition: 'background-color 0.15s', marginBottom: 2,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        backgroundColor: isSelected ? `${selectedColor}25` : (isDark ? '#1A1A1A' : '#F1F5F9'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <span style={{
        flex: 1, fontSize: 14, fontWeight: isSelected ? 600 : 500,
        color: isSelected ? selectedColor : (isDark ? '#A1A1A1' : '#334155'), fontFamily: 'var(--cp-font-body)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 12, flexShrink: 0,
        color: isSelected ? selectedColor : (isDark ? '#878787' : '#94A3B8'),
        backgroundColor: isSelected ? `${selectedColor}20` : (isDark ? '#1A1A1A' : '#F1F5F9'),
      }}>
        {count}
      </span>
    </button>
  );
}

// --- Shared Step Card ---
function SharedStepCard({ step, onView, onEdit, onDuplicate, onDelete, isDark = false }: {
  step: SharedStep; onView: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; isDark?: boolean;
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
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: 8,
        padding: 16, cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', display: 'flex', flexDirection: 'column' as const,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? '#454545' : '#CBD5E1'; e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
      onClick={onView}
    >
      {/* Top row: category badge + usage + kebab */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {cat && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4, fontSize: 11,
              fontWeight: 600, color: isDark ? '#A1A1A1' : '#374151', fontFamily: 'var(--cp-font-body)',
            }}>
              {cat.name}
            </span>
          )}
          <span style={{
            padding: '2px 8px', backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', borderRadius: 4,
            fontSize: 11, fontWeight: 600, color: '#2563EB', fontFamily: 'var(--cp-font-body)',
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
              backgroundColor: 'transparent', color: isDark ? '#878787' : '#94A3B8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, top: 36, width: 160, backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                borderRadius: 8, border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
                padding: 4, zIndex: 50,
              }}
            >
              <MenuButton icon={<Eye size={14} />} label="View" onClick={() => { onView(); setMenuOpen(false); }} />
              <MenuButton icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(); setMenuOpen(false); }} />
              <MenuButton icon={<Copy size={14} />} label="Duplicate" onClick={() => { onDuplicate(); setMenuOpen(false); }} />
              <div style={{ height: 1, backgroundColor: isDark ? '#292929' : '#F1F5F9', margin: '4px 0' }} />
              <MenuButton icon={<Trash2 size={14} />} label="Delete" onClick={() => { onDelete(); setMenuOpen(false); }} danger />
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 style={{ fontFamily: 'var(--cp-font-body)', fontSize: 15, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 4px' }}>
        {step.name}
      </h3>

      {/* Description */}
      {step.description && (
        <p style={{
          fontFamily: 'var(--cp-font-body)', fontSize: 13, color: isDark ? '#878787' : '#64748B', margin: '0 0 12px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {step.description}
        </p>
      )}

      {/* Action */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#878787' : '#64748B' }}>
          Action
        </span>
        <p style={{
          fontFamily: 'var(--cp-font-body)', fontSize: 13, color: isDark ? '#A1A1A1' : '#334155', margin: '4px 0 0',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.6,
        }}>
          {highlightVariables(step.action, isDark)}
        </p>
      </div>

      {/* Variables */}
      {variables.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
          {variables.map((v, i) => (
            <span key={i} style={{
              padding: '2px 8px', backgroundColor: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 11, color: isDark ? '#878787' : '#64748B',
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
      width: '100%', height: 50, padding: '8px 12px', border: 'none', borderRadius: 6,
      backgroundColor: 'transparent', color: danger ? '#DC2626' : 'inherit',
      fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
      textAlign: 'left', fontFamily: 'var(--cp-font-body)',
    }}>
      {icon}
      {label}
    </button>
  );
}


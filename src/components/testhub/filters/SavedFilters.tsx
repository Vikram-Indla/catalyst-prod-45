/**
 * SavedFilters — Reusable saved filter presets component
 */
import { useState, useEffect } from 'react';
import { Filter, Plus, Star, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface SavedFilter {
  id: string;
  name: string;
  entity_type: string;
  filter_config: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

interface SavedFiltersProps {
  entityType: 'test_case' | 'cycle' | 'defect' | 'requirement' | 'report';
  currentFilters: Record<string, any>;
  onApplyFilter: (filters: Record<string, any>) => void;
}

export function SavedFilters({ entityType, currentFilters, onApplyFilter }: SavedFiltersProps) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchFilters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('th_saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .eq('entity_type', entityType)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setFilters(data || []);
    } catch (err) {
      console.error('Fetch filters error:', err);
    }
  };

  useEffect(() => { fetchFilters(); }, [entityType]);

  const saveCurrentFilter = async () => {
    if (!newFilterName.trim()) {
      catalystToast.error('Please enter a filter name');
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from('th_saved_filters')
        .insert({
          user_id: user.id,
          name: newFilterName.trim(),
          entity_type: entityType,
          filter_config: currentFilters,
          is_default: false,
        });

      if (error) throw error;
      catalystToast.success('Filter saved');
      setNewFilterName('');
      setShowSaveModal(false);
      fetchFilters();
    } catch (err) {
      console.error('Save filter error:', err);
      catalystToast.error('Failed to save filter');
    } finally {
      setIsSaving(false);
    }
  };

  const setAsDefault = async (filterId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('th_saved_filters')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('entity_type', entityType);

      await (supabase as any)
        .from('th_saved_filters')
        .update({ is_default: true })
        .eq('id', filterId);

      catalystToast.success('Default filter updated');
      fetchFilters();
    } catch (err) {
      catalystToast.error('Failed to update default');
    }
  };

  const deleteFilter = async (filterId: string) => {
    if (!confirm('Delete this saved filter?')) return;
    try {
      const { error } = await (supabase as any)
        .from('th_saved_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;
      catalystToast.success('Filter deleted');
      fetchFilters();
    } catch (err) {
      catalystToast.error('Failed to delete filter');
    }
  };

  const hasActiveFilters = Object.values(currentFilters).some(v => v && v !== 'all' && v !== '');

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', border: '1.5px solid var(--divider)', borderRadius: 12, backgroundColor: filters.length > 0 ? 'var(--bg-1)' : 'var(--cp-float)', color: 'var(--fg-3)', fontSize: 13, cursor: 'pointer' }}>
        <Filter size={16} /> Saved ({filters.length})
      </button>

      {isExpanded && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 280, backgroundColor: 'var(--cp-float)', borderRadius: 12, border: '1px solid var(--divider)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Saved Filters</span>
            {hasActiveFilters && (
              <button onClick={() => setShowSaveModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', backgroundColor: 'var(--cp-blue)', border: 'none', borderRadius: 6, color: 'var(--cp-float)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                <Plus size={12} /> Save Current
              </button>
            )}
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filters.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>No saved filters yet</div>
            ) : (
              filters.map((filter) => (
                <div key={filter.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--cp-bd-zone)' }}>
                  <button onClick={() => onApplyFilter(filter.filter_config)}
                    style={{ flex: 1, textAlign: 'left', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{filter.name}</span>
                  </button>
                  <button onClick={() => setAsDefault(filter.id)} title={filter.is_default ? 'Default filter' : 'Set as default'}
                    style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: filter.is_default ? 'var(--sem-warning)' : 'var(--divider)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={14} fill={filter.is_default ? 'var(--sem-warning)' : 'none'} />
                  </button>
                  <button onClick={() => deleteFilter(filter.id)}
                    style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          {hasActiveFilters && (
            <div style={{ padding: 10, borderTop: '1px solid var(--divider)' }}>
              <button onClick={() => onApplyFilter({})}
                style={{ width: '100%', padding: '8px 12px', backgroundColor: 'var(--cp-bd-zone)', border: 'none', borderRadius: 6, color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer' }}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {showSaveModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 340, backgroundColor: 'var(--cp-float)', borderRadius: 12, padding: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', margin: '0 0 16px' }}>Save Current Filter</h3>
            <input type="text" placeholder="Filter name" value={newFilterName} onChange={(e) => setNewFilterName(e.target.value)} autoFocus
              style={{ width: '100%', height: 44, padding: '0 14px', border: '1.5px solid var(--divider)', borderRadius: 12, fontSize: 14, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowSaveModal(false); setNewFilterName(''); }}
                style={{ padding: '10px 16px', backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 8, color: 'var(--fg-3)', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveCurrentFilter} disabled={isSaving}
                style={{ padding: '10px 16px', backgroundColor: 'var(--cp-blue)', border: 'none', borderRadius: 8, color: 'var(--cp-float)', fontSize: 13, fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

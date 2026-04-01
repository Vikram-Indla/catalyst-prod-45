/**
 * G8-05: Link Test Case Modal
 */

import { useState, useEffect } from 'react';
import { X, Link2, Search, CheckSquare, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface LinkTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirementId: string;
  onLinked: () => void;
  alreadyLinkedIds: string[];
}

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  priority: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#059669',
};

export function LinkTestCaseModal({ isOpen, onClose, requirementId, onLinked, alreadyLinkedIds }: LinkTestCaseModalProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTestCases = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from('th_test_cases' as any).select('id, case_key, title, priority').order('case_key');
        if (alreadyLinkedIds.length > 0) {
          query = query.not('id', 'in', `(${alreadyLinkedIds.join(',')})`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setTestCases((data as any[]) || []);
      } catch (err) {
        console.error('Fetch test cases error:', err);
        catalystToast.error('Failed to load test cases');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTestCases();
    setSelectedIds(new Set());
    setSearchTerm('');
  }, [isOpen]);

  const filtered = testCases.filter(tc => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return tc.case_key.toLowerCase().includes(s) || tc.title.toLowerCase().includes(s);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(tc => tc.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = Array.from(selectedIds).map(test_case_id => ({
        requirement_id: requirementId,
        test_case_id,
        created_by: user?.id || null,
      }));
      const { error } = await supabase.from('th_requirement_tests' as any).insert(rows);
      if (error) throw error;
      catalystToast.success(`${selectedIds.size} test case${selectedIds.size > 1 ? 's' : ''} linked`);
      onLinked();
      onClose();
    } catch (err) {
      console.error('Link test cases error:', err);
      catalystToast.error('Failed to link test cases');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 600, maxHeight: '80vh', backgroundColor: 'var(--cp-float)', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Link2 size={22} style={{ color: '#FFFFFF' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Link Test Cases</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search + Select All */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)' }} />
            <input type="text" placeholder="Search test cases..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 14px 0 44px', border: '1.5px solid var(--divider)', borderRadius: 10, fontSize: 14, backgroundColor: 'var(--cp-float)' }} />
          </div>
          <button onClick={toggleAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: '#0891B2', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Test Case List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>Loading test cases...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No test cases available</div>
          ) : (
            filtered.map(tc => {
              const isSelected = selectedIds.has(tc.id);
              const priorityColor = PRIORITY_COLORS[tc.priority] || '#D97706';
              return (
                <div key={tc.id} onClick={() => toggleSelect(tc.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6,
                    borderRadius: 10, border: `1.5px solid ${isSelected ? '#0891B2' : '#E2E8F0'}`,
                    backgroundColor: isSelected ? '#F0FDFA' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {isSelected ? <CheckSquare size={18} style={{ color: '#0891B2', flexShrink: 0 }} /> : <Square size={18} style={{ color: 'var(--divider)', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '2px 8px', borderRadius: 4 }}>{tc.case_key}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: priorityColor }}>{tc.priority}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--fg-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.title}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 16px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 10, fontSize: 14, color: 'var(--fg-2)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={selectedIds.size === 0 || isSubmitting}
              style={{ height: 40, padding: '0 20px', background: selectedIds.size === 0 ? '#CBD5E1' : 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link2 size={16} /> {isSubmitting ? 'Linking...' : `Link ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

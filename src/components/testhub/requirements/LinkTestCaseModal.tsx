/**
 * G8-05: Link Test Case Modal
 * Authority: tm_requirement_tests + tm_test_cases
 */

import { useState, useEffect } from 'react';
import { X, Link2, Search, CheckSquare, Square } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';

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
  priority_id: string | null;
  priority: { id: string; name: string; color: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--ds-text-danger, #DC2626)', high: '#EA580C', medium: 'var(--ds-text-warning, #D97706)', low: '#059669',
};

export function LinkTestCaseModal({ isOpen, onClose, requirementId, onLinked, alreadyLinkedIds }: LinkTestCaseModalProps) {
  const { isDark } = useTheme();
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
        let query = typedQuery('tm_test_cases').select('id, case_key, title, priority_id, priority:tm_case_priorities ( id, name, color )').order('case_key');
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
      const { error } = await typedQuery('tm_requirement_tests').insert(rows);
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
      <div style={{ width: '100%', maxWidth: 600, maxHeight: '80vh', backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'var(--ds-text-brand, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Link2 size={22} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: 0 }}>Link Test Cases</h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 50, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--cp-text-tertiary, #64748B)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--cp-text-muted, #94A3B8)' }} />
            <input type="text" placeholder="Search test cases..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 14px 0 44px', border: `1.5px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, fontSize: 14, backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', color: isDark ? 'var(--ds-text, #EDEDED)' : undefined }} />
          </div>
          <button onClick={toggleAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: 'none', backgroundColor: 'transparent', color: 'var(--ds-text-brand, #2563EB)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--cp-text-muted, #94A3B8)' }}>Loading test cases...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--cp-text-muted, #94A3B8)' }}>No test cases available</div>
          ) : (
            filtered.map(tc => {
              const isSelected = selectedIds.has(tc.id);
              const priorityName = tc.priority?.name || 'Medium';
              const priorityColor = PRIORITY_COLORS[priorityName.toLowerCase()] || 'var(--ds-text-warning, #D97706)';
              return (
                <div key={tc.id} onClick={() => toggleSelect(tc.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6,
                    borderRadius: 12, border: `1.5px solid ${isSelected ? 'var(--ds-text-brand, #2563EB)' : ('var(--cp-border, #E2E8F0)')}`,
                    backgroundColor: isSelected ? ('var(--cp-primary-light, #EFF6FF)') : ('var(--cp-bg-elevated, #FFFFFF)'), cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {isSelected ? <CheckSquare size={18} style={{ color: 'var(--ds-text-brand, #2563EB)', flexShrink: 0 }} /> : <Square size={18} style={{ color: 'var(--cp-border, #E2E8F0)', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-brand, #2563EB)', backgroundColor: 'var(--ds-background-selected, #EFF6FF)', padding: '2px 8px', borderRadius: 4 }}>{tc.case_key}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: priorityColor }}>{priorityName}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--cp-text-primary, #0F172A)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tc.title}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${'var(--cp-border, #E2E8F0)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--cp-text-tertiary, #64748B)' }}>{selectedIds.size} selected</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 16px', backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', border: `1.5px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, fontSize: 14, color: 'var(--cp-text-tertiary, #64748B)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={selectedIds.size === 0 || isSubmitting}
              style={{ height: 40, padding: '0 20px', backgroundColor: selectedIds.size === 0 ? ('var(--cp-border, #E2E8F0)') : 'var(--ds-text-brand, #2563EB)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link2 size={16} /> {isSubmitting ? 'Linking...' : `Link ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
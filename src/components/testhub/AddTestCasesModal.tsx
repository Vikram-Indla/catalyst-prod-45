import { useState, useEffect } from 'react';
import { X, Search, Plus, Check, Folder, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface TestCaseItem {
  id: string;
  case_key: string;
  title: string;
  priority: string;
  type: string;
  folder_id: string | null;
}

interface TestFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface AddTestCasesModalProps {
  isOpen: boolean;
  cycleId: string;
  existingTestCaseIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const priorityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'var(--sem-danger)', bg: 'rgba(248,113,113,0.06)' },
  high: { color: '#EA580C', bg: '#FFF7ED' },
  medium: { color: 'var(--sem-warning)', bg: '#FFFBEB' },
  low: { color: 'var(--sem-success)', bg: 'rgba(74,222,128,0.06)' },
};

export function AddTestCasesModal({ isOpen, cycleId, existingTestCaseIds, onClose, onSuccess }: AddTestCasesModalProps) {
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSelectedIds(new Set());
      setSearchQuery('');
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [foldersRes, casesRes] = await Promise.all([
        supabase.from('tm_folders').select('id, name, parent_id').order('name'),
        (supabase as any).from('tm_test_cases').select('id, case_key, title, priority_id, case_type_id, folder_id').order('case_key'),
      ]);
      setFolders((foldersRes.data as any[]) || []);
      setTestCases((casesRes.data || []).map((tc: any) => ({ id: tc.id, case_key: tc.case_key, title: tc.title, priority: 'medium', type: 'functional', folder_id: tc.folder_id })));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTestCases = testCases.filter(tc => {
    if (existingTestCaseIds.includes(tc.id)) return false;
    if (selectedFolderId && tc.folder_id !== selectedFolderId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return tc.case_key.toLowerCase().includes(q) || tc.title.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const newSet = new Set(selectedIds);
    filteredTestCases.forEach(tc => newSet.add(tc.id));
    setSelectedIds(newSet);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) { catalystToast.warning('Please select at least one test case'); return; }
    setIsSubmitting(true);
    try {
      const insertData = Array.from(selectedIds).map(testCaseId => ({
        cycle_id: cycleId, test_case_id: testCaseId, current_status: 'not_run',
      }));
      const { error } = await (supabase as any).from('tm_cycle_scope').insert(insertData);
      if (error) { catalystToast.error(error.message || 'Failed to add test cases'); return; }
      // Note: tm_test_cycles counters (total_cases, not_run_count, etc.) are automatically
      // updated by the DB trigger trg_tm_cycle_scope_insert — no manual update needed.
      catalystToast.success(`Added ${selectedIds.size} test case${selectedIds.size !== 1 ? 's' : ''} to cycle`, { title: 'Test Cases Added' });
      onSuccess();
      onClose();
    } catch (err: any) {
      catalystToast.error(err.message || 'Failed to add test cases');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 900, height: '80vh', maxHeight: 700, backgroundColor: 'var(--cp-float)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>Add Test Cases</h2>
            <p style={{ fontSize: 14, color: 'var(--fg-3)', margin: '4px 0 0' }}>Select test cases from the repository to add to this cycle</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Folder Sidebar */}
          <div style={{ width: 220, borderRight: '1px solid var(--divider)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cp-bd-zone)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Folders</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              <button onClick={() => setSelectedFolderId(null)} style={{
                width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8,
                backgroundColor: selectedFolderId === null ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'transparent',
                color: selectedFolderId === null ? 'var(--cp-blue)' : 'var(--fg-2)',
                fontSize: 14, fontWeight: selectedFolderId === null ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <FolderOpen size={16} style={{ color: selectedFolderId === null ? 'var(--cp-blue)' : 'var(--fg-3)' }} /> All Test Cases
              </button>
              {folders.filter(f => !f.parent_id).map(folder => (
                <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} style={{
                  width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8,
                  backgroundColor: selectedFolderId === folder.id ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'transparent',
                  color: selectedFolderId === folder.id ? 'var(--cp-blue)' : 'var(--fg-2)',
                  fontSize: 14, fontWeight: selectedFolderId === folder.id ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Folder size={16} style={{ color: selectedFolderId === folder.id ? 'var(--cp-blue)' : 'var(--fg-3)' }} /> {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cases List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)' }} />
                <input type="text" placeholder="Search test cases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: 50, paddingLeft: 36, paddingRight: 12, border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 13, color: 'var(--fg-1)' }}
                />
              </div>
              <button onClick={selectAll} style={{ height: 50, padding: '8px 12px', border: '1px solid var(--divider)', borderRadius: 6, backgroundColor: 'var(--cp-float)', color: 'var(--cp-blue)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Select All</button>
              {selectedIds.size > 0 && (
                <button onClick={() => setSelectedIds(new Set())} style={{ height: 50, padding: '8px 12px', border: '1px solid var(--divider)', borderRadius: 6, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Deselect All</button>
              )}
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{filteredTestCases.length} available</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-3)' }}>Loading...</div>
              ) : filteredTestCases.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-4)' }}>
                  <p style={{ fontSize: 14, margin: 0 }}>{searchQuery ? 'No matching test cases' : 'All test cases already added'}</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {filteredTestCases.map((tc) => {
                      const isSelected = selectedIds.has(tc.id);
                      const priority = priorityConfig[tc.priority?.toLowerCase()] || priorityConfig.medium;
                      return (
                        <tr key={tc.id} onClick={() => toggleSelection(tc.id)} style={{ borderBottom: '1px solid var(--cp-bd-zone)', cursor: 'pointer', backgroundColor: isSelected ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', width: 40 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? 'none' : '2px solid rgba(237,237,237,0.53)', backgroundColor: isSelected ? 'var(--cp-blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isSelected && <Check size={14} style={{ color: '#FFFFFF' }} />}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', width: 100 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '3px 8px', borderRadius: 4 }}>{tc.case_key}</span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>{tc.title}</span>
                          </td>
                          <td style={{ padding: '12px 16px', width: 90 }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: priority.color, backgroundColor: priority.bg, padding: '3px 8px', borderRadius: 4, textTransform: 'capitalize' as const }}>{tc.priority || 'Medium'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>{selectedIds.size > 0 && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-blue)' }}>{selectedIds.size} test case{selectedIds.size !== 1 ? 's' : ''} selected</span>}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} disabled={isSubmitting} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting || selectedIds.size === 0} style={{
              height: 40, padding: '0 20px',
              background: selectedIds.size > 0 ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'var(--fg-4)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed', opacity: isSubmitting ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Plus size={18} />
              {isSubmitting ? 'Adding...' : `Add ${selectedIds.size > 0 ? selectedIds.size : ''} Test Case${selectedIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

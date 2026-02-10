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
  critical: { color: '#DC2626', bg: '#FEF2F2' },
  high: { color: '#EA580C', bg: '#FFF7ED' },
  medium: { color: '#D97706', bg: '#FFFBEB' },
  low: { color: '#059669', bg: '#ECFDF5' },
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
        supabase.from('th_folders').select('id, name, parent_id').order('name'),
        supabase.from('th_test_cases').select('id, case_key, title, priority, type, folder_id').order('case_key'),
      ]);
      setFolders((foldersRes.data as any[]) || []);
      setTestCases(casesRes.data || []);
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
        cycle_id: cycleId, test_case_id: testCaseId, execution_status: 'not_run',
      }));
      const { error } = await supabase.from('th_cycle_test_cases').insert(insertData);
      if (error) { catalystToast.error(error.message || 'Failed to add test cases'); return; }
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
      <div style={{ width: 900, height: '80vh', maxHeight: 700, backgroundColor: '#FFFFFF', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Add Test Cases</h2>
            <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>Select test cases from the repository to add to this cycle</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Folder Sidebar */}
          <div style={{ width: 220, borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Folders</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              <button onClick={() => setSelectedFolderId(null)} style={{
                width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8,
                backgroundColor: selectedFolderId === null ? '#EFF6FF' : 'transparent',
                color: selectedFolderId === null ? '#2563EB' : '#334155',
                fontSize: 14, fontWeight: selectedFolderId === null ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <FolderOpen size={16} style={{ color: selectedFolderId === null ? '#2563EB' : '#64748B' }} /> All Test Cases
              </button>
              {folders.filter(f => !f.parent_id).map(folder => (
                <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} style={{
                  width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8,
                  backgroundColor: selectedFolderId === folder.id ? '#EFF6FF' : 'transparent',
                  color: selectedFolderId === folder.id ? '#2563EB' : '#334155',
                  fontSize: 14, fontWeight: selectedFolderId === folder.id ? 600 : 400, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Folder size={16} style={{ color: selectedFolderId === folder.id ? '#2563EB' : '#64748B' }} /> {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cases List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input type="text" placeholder="Search test cases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#0F172A' }}
                />
              </div>
              <button onClick={selectAll} style={{ height: 36, padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 6, backgroundColor: '#FFFFFF', color: '#2563EB', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Select All</button>
              {selectedIds.size > 0 && (
                <button onClick={() => setSelectedIds(new Set())} style={{ height: 36, padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 6, backgroundColor: '#FFFFFF', color: '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Deselect All</button>
              )}
              <span style={{ fontSize: 13, color: '#64748B' }}>{filteredTestCases.length} available</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#64748B' }}>Loading...</div>
              ) : filteredTestCases.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94A3B8' }}>
                  <p style={{ fontSize: 14, margin: 0 }}>{searchQuery ? 'No matching test cases' : 'All test cases already added'}</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {filteredTestCases.map((tc) => {
                      const isSelected = selectedIds.has(tc.id);
                      const priority = priorityConfig[tc.priority?.toLowerCase()] || priorityConfig.medium;
                      return (
                        <tr key={tc.id} onClick={() => toggleSelection(tc.id)} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: isSelected ? '#EFF6FF' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', width: 40 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? 'none' : '2px solid #CBD5E1', backgroundColor: isSelected ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isSelected && <Check size={14} style={{ color: '#FFFFFF' }} />}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', width: 100 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: 4 }}>{tc.case_key}</span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ fontSize: 14, color: '#334155' }}>{tc.title}</span>
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
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>{selectedIds.size > 0 && <span style={{ fontSize: 14, fontWeight: 600, color: '#2563EB' }}>{selectedIds.size} test case{selectedIds.size !== 1 ? 's' : ''} selected</span>}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} disabled={isSubmitting} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting || selectedIds.size === 0} style={{
              height: 40, padding: '0 20px',
              background: selectedIds.size > 0 ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#94A3B8',
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

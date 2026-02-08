// ═══════════════════════════════════════════════════════════════════════════
// TEST REPOSITORY PAGE - MAIN COMPONENT
// Copy this ENTIRE file to: src/pages/testhub/TestRepositoryPage.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, MoveRight, CheckSquare } from 'lucide-react';
import { FolderPanel } from '@/components/testhub/FolderPanel';
import { TestCasesTable } from '@/components/testhub/TestCasesTable';
import { TestCasesToolbar } from '@/components/testhub/TestCasesToolbar';
import { CreateTestCaseModal } from '@/components/testhub/CreateTestCaseModal';
import { supabase } from '@/integrations/supabase/client';

// Import the CSS
import '@/styles/testhub.css';

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'functional' | 'regression' | 'security' | 'integration' | 'performance';
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  automation: 'manual' | 'automated' | 'planned';
  ownerName?: string;
  ownerInitials?: string;
  ownerColor?: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  testCaseCount: number;
}

export function TestRepositoryPage() {
  // State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string | null>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [totalTestCases, setTotalTestCases] = useState(0);

  // Fetch folders
  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('th_folders')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching folders:', error);
      return;
    }

    // Get counts
    const { data: counts } = await supabase
      .from('th_test_cases')
      .select('folder_id');

    const countMap: Record<string, number> = {};
    counts?.forEach(tc => {
      if (tc.folder_id) {
        countMap[tc.folder_id] = (countMap[tc.folder_id] || 0) + 1;
      }
    });

    const foldersWithCounts = data?.map(f => ({
      id: f.id,
      name: f.name,
      parentId: f.parent_id,
      testCaseCount: countMap[f.id] || 0,
    })) || [];

    setFolders(foldersWithCounts);
    setTotalTestCases(counts?.length || 0);
  };

  // Fetch test cases
  const fetchTestCases = async () => {
    setIsLoading(true);

    let query = supabase
      .from('th_test_cases')
      .select('*');

    if (selectedFolderId) {
      query = query.eq('folder_id', selectedFolderId);
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,case_key.ilike.%${searchQuery}%`);
    }

    if (sortColumn) {
      const columnMap: Record<string, string> = {
        caseKey: 'case_key',
        title: 'title',
        priority: 'priority',
        status: 'status',
        updatedAt: 'updated_at',
      };
      query = query.order(columnMap[sortColumn] || sortColumn, { ascending: sortDirection === 'asc' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching test cases:', error);
      setIsLoading(false);
      return;
    }

    const mapped = data?.map(tc => ({
      id: tc.id,
      caseKey: tc.case_key,
      title: tc.title,
      priority: tc.priority as TestCase['priority'],
      type: tc.type as TestCase['type'],
      status: tc.status as TestCase['status'],
      automation: tc.automation as TestCase['automation'],
      ownerInitials: 'AK',
      ownerColor: 'blue',
      updatedAt: tc.updated_at,
    })) || [];

    setTestCases(mapped);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    fetchTestCases();
  }, [selectedFolderId, searchQuery, sortColumn, sortDirection]);

  // Handlers
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(testCases.map(tc => tc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (testCase: TestCase) => {
    // Open view modal - to be implemented
    console.log('View test case:', testCase);
  };

  const handleRowAction = (testCase: TestCase, action: string) => {
    console.log('Action:', action, 'on', testCase);
  };

  const handleCreateTestCase = async (data: any) => {
    // Generate case key
    const { data: lastCase } = await supabase
      .from('th_test_cases')
      .select('case_key')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (lastCase && lastCase.length > 0) {
      const match = lastCase[0].case_key.match(/TC-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const caseKey = `TC-${String(nextNum).padStart(3, '0')}`;

    // Insert test case - uses simplified schema with direct priority/type/automation columns
    const { data: newCase, error } = await supabase
      .from('th_test_cases')
      .insert({
        case_key: caseKey,
        title: data.title,
        objective: data.objective,
        preconditions: data.preconditions,
        folder_id: data.folderId || null,
        priority: data.priority,
        type: data.type,
        status: data.status,
        automation: data.automation,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test case:', error);
      throw error;
    }

    // Insert steps
    if (data.steps && data.steps.length > 0) {
      const stepsToInsert = data.steps.map((step: any, index: number) => ({
        test_case_id: newCase.id,
        step_number: index + 1,
        action: step.action,
        expected_result: step.expectedResult,
      }));

      await supabase.from('th_test_steps').insert(stepsToInsert);
    }

    // Refresh
    fetchTestCases();
    fetchFolders();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} test case(s)?`)) return;

    const { error } = await supabase
      .from('th_test_cases')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      console.error('Error deleting:', error);
      return;
    }

    setSelectedIds(new Set());
    fetchTestCases();
    fetchFolders();
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="testhub">
      <div className="th-page">
        {/* Page Header */}
        <div style={{
          height: 64,
          padding: '0 24px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.01em',
            margin: 0,
          }}>Test Repository</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => { fetchTestCases(); fetchFolders(); }}
              style={{
                height: 40,
                padding: '0 20px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <RefreshCw style={{ width: 16, height: 16, color: '#64748B' }} />
              Refresh
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                height: 40,
                padding: '0 20px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(37,99,235,0.18)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.18)';
              }}
            >
              <Plus style={{ width: 16, height: 16, color: '#FFFFFF' }} />
              New Test Case
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="th-page-content">
          {/* Folder Panel */}
          <FolderPanel
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={() => console.log('Create folder')}
            totalTestCases={totalTestCases}
          />

          {/* List Panel */}
          <div className="th-list-panel">
            {/* Toolbar */}
            <TestCasesToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              testCaseCount={testCases.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              hasActiveFilters={false}
              onFilterClick={() => console.log('Open filters')}
            />

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="th-bulk-bar visible">
                <span className="th-bulk-count">{selectedIds.size} selected</span>
                <div className="th-bulk-actions">
                  <button className="th-bulk-btn">
                    <MoveRight />
                    Move
                  </button>
                  <button className="th-bulk-btn">
                    <CheckSquare />
                    Status
                  </button>
                  <button className="th-bulk-btn danger" onClick={handleBulkDelete}>
                    <Trash2 />
                    Delete
                  </button>
                </div>
                <button className="th-bulk-clear" onClick={clearSelection}>
                  Clear selection
                </button>
              </div>
            )}

            {/* Table */}
            <div className="th-table-container">
              {isLoading ? (
                <div className="th-loading">
                  <div className="th-spinner"></div>
                </div>
              ) : testCases.length === 0 ? (
                <div className="th-empty-state">
                  <div className="th-empty-icon">📋</div>
                  <h3 className="th-empty-title">No test cases found</h3>
                  <p className="th-empty-description">
                    {selectedFolderId
                      ? 'This folder is empty. Create a test case to get started.'
                      : 'Create your first test case to get started.'}
                  </p>
                  <button className="th-btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus />
                    Create Test Case
                  </button>
                </div>
              ) : (
                <TestCasesTable
                  testCases={testCases}
                  selectedIds={selectedIds}
                  onSelectAll={handleSelectAll}
                  onSelectOne={handleSelectOne}
                  onRowClick={handleRowClick}
                  onRowAction={handleRowAction}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              )}
            </div>

            {/* Pagination */}
            {testCases.length > 0 && (
              <div className="th-pagination">
                <span className="th-pagination-info">
                  Showing 1-{testCases.length} of {testCases.length}
                </span>
                <div className="th-pagination-buttons">
                  <button className="th-pagination-btn" disabled>
                    ←
                  </button>
                  <button className="th-pagination-btn active">1</button>
                  <button className="th-pagination-btn" disabled>
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <CreateTestCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTestCase}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
        selectedFolderId={selectedFolderId || undefined}
      />
    </div>
  );
}

export default TestRepositoryPage;

// ═══════════════════════════════════════════════════════════════════════════
// TEST REPOSITORY PAGE - MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, MoveRight, CheckSquare, Download, Upload, Sparkles } from 'lucide-react';
import { FolderPanel } from '@/components/testhub/FolderPanel';
import { TestCasesTable } from '@/components/testhub/TestCasesTable';
import { TestCasesToolbar } from '@/components/testhub/TestCasesToolbar';
import { TestCaseGridView } from '@/components/testhub/TestCaseGridView';
import { CreateTestCaseModal } from '@/components/testhub/CreateTestCaseModal';
import { ViewTestCaseModal } from '@/components/testhub/ViewTestCaseModal';
import { CloneTestCaseModal } from '@/components/testhub/CloneTestCaseModal';
import { DeleteTestCaseModal } from '@/components/testhub/DeleteTestCaseModal';
import { TestCaseContextMenu } from '@/components/testhub/TestCaseContextMenu';
import { CreateFolderModal } from '@/components/testhub/CreateFolderModal';
import { ImportTestCasesModal } from '@/components/testhub/ImportTestCasesModal';
import { ExportTestCasesModal } from '@/components/testhub/ExportTestCasesModal';
import { AIGenerateModal } from '@/components/testhub/AIGenerateModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  objective?: string | null;
  preconditions?: string | null;
  folderId?: string | null;
  version?: number;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  testCaseCount: number;
  icon?: string;
}

interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
}

interface RawTestCase {
  id: string;
  case_key: string;
  title: string;
  objective: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority: string;
  type: string;
  status: string;
  automation: string;
  version: number;
  updated_at: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  testCase: TestCase;
}

export function TestRepositoryPage() {
  const { toast } = useToast();
  
  // State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [filters, setFilters] = useState({ priorities: [] as string[], statuses: [] as string[], types: [] as string[], automations: [] as string[] });

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<RawTestCase | null>(null);
  const [selectedTestCaseSteps, setSelectedTestCaseSteps] = useState<TestStep[]>([]);
  const [testCasesToDelete, setTestCasesToDelete] = useState<{ id: string; case_key: string; title: string }[]>([]);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
      icon: f.icon || '📁',
    })) || [];

    setFolders(foldersWithCounts);
    setTotalTestCases(counts?.length || 0);
  };

   // Fetch test cases
   const fetchTestCases = async () => {
     setIsLoading(true);

     let query = supabase.from('th_test_cases').select('*');

     if (selectedFolderId) {
       query = query.eq('folder_id', selectedFolderId);
     }

     if (searchQuery) {
       query = query.or(`title.ilike.%${searchQuery}%,case_key.ilike.%${searchQuery}%`);
     }

     const { data, error } = await query;

     if (error) {
       console.error('Error fetching test cases:', error);
       setIsLoading(false);
       return;
     }

     let mapped = data?.map(tc => ({
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
       objective: tc.objective,
       preconditions: tc.preconditions,
       folderId: tc.folder_id,
       version: tc.version || 1,
     })) || [];

     // Apply client-side filtering
     if (filters.priorities.length > 0 || filters.statuses.length > 0 || filters.types.length > 0 || filters.automations.length > 0) {
       mapped = mapped.filter(tc => {
         const priorityMatch = filters.priorities.length === 0 || filters.priorities.includes(tc.priority);
         const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(tc.status);
         const typeMatch = filters.types.length === 0 || filters.types.includes(tc.type);
         const automationMatch = filters.automations.length === 0 || filters.automations.includes(tc.automation);
         return priorityMatch && statusMatch && typeMatch && automationMatch;
       });
     }

     // Apply client-side sorting
     if (sortColumn) {
       const sortMap: Record<string, (tc: TestCase) => any> = {
         caseKey: (tc) => tc.caseKey.toLowerCase(),
         title: (tc) => tc.title.toLowerCase(),
         priority: (tc) => tc.priority,
         status: (tc) => tc.status,
         updatedAt: (tc) => new Date(tc.updatedAt).getTime(),
       };

       const sortFn = sortMap[sortColumn];
       if (sortFn) {
         mapped.sort((a, b) => {
           const aVal = sortFn(a);
           const bVal = sortFn(b);
           const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
           return sortDirection === 'asc' ? comparison : -comparison;
         });
       }
     }

     setTestCases(mapped);
     setIsLoading(false);
   };

   useEffect(() => {
     fetchFolders();
   }, []);

   useEffect(() => {
     fetchTestCases();
   }, [selectedFolderId, searchQuery, sortColumn, sortDirection, filters]);

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

  const handleRowClick = async (testCase: TestCase) => {
    const { data: fullTC } = await supabase
      .from('th_test_cases')
      .select('*')
      .eq('id', testCase.id)
      .single();

    if (fullTC) {
      setSelectedTestCase(fullTC as RawTestCase);
      setIsViewModalOpen(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, testCase: TestCase) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      testCase,
    });
  };

  const openEditModal = async (tc: RawTestCase) => {
    const { data: stepsData } = await supabase
      .from('th_test_steps')
      .select('*')
      .eq('test_case_id', tc.id)
      .order('step_number');

    const mappedSteps: TestStep[] = (stepsData || []).map(s => ({
      id: s.id,
      action: s.action,
      expectedResult: s.expected_result || '',
    }));

    setSelectedTestCase(tc);
    setSelectedTestCaseSteps(mappedSteps.length > 0 ? mappedSteps : [{ id: '1', action: '', expectedResult: '' }]);
    setEditMode(true);
    setIsCreateModalOpen(true);
  };

  const handleViewFromContext = async () => {
    if (!contextMenu) return;
    const { data: fullTC } = await supabase
      .from('th_test_cases')
      .select('*')
      .eq('id', contextMenu.testCase.id)
      .single();

    if (fullTC) {
      setSelectedTestCase(fullTC as RawTestCase);
      setIsViewModalOpen(true);
    }
    setContextMenu(null);
  };

  const handleEditFromContext = async () => {
    if (!contextMenu) return;
    const { data: fullTC } = await supabase
      .from('th_test_cases')
      .select('*')
      .eq('id', contextMenu.testCase.id)
      .single();

    if (fullTC) {
      await openEditModal(fullTC as RawTestCase);
    }
    setContextMenu(null);
  };

  const handleCloneFromContext = async () => {
    if (!contextMenu) return;
    const { data: fullTC } = await supabase
      .from('th_test_cases')
      .select('*')
      .eq('id', contextMenu.testCase.id)
      .single();

    if (fullTC) {
      setSelectedTestCase(fullTC as RawTestCase);
      setIsCloneModalOpen(true);
    }
    setContextMenu(null);
  };

  const handleDeleteFromContext = () => {
    if (!contextMenu) return;
    setTestCasesToDelete([{
      id: contextMenu.testCase.id,
      case_key: contextMenu.testCase.caseKey,
      title: contextMenu.testCase.title,
    }]);
    setIsDeleteModalOpen(true);
    setContextMenu(null);
  };

  const handleMoveFromContext = () => {
    toast({
      title: 'Move',
      description: 'Move functionality coming soon',
    });
    setContextMenu(null);
  };

  const handleStatusFromContext = () => {
    toast({
      title: 'Change Status',
      description: 'Status change functionality coming soon',
    });
    setContextMenu(null);
  };

  const handleEditFromView = async () => {
    if (selectedTestCase) {
      setIsViewModalOpen(false);
      await openEditModal(selectedTestCase);
    }
  };

  const handleCloneFromView = () => {
    setIsViewModalOpen(false);
    setIsCloneModalOpen(true);
  };

  const handleRefresh = () => {
    fetchTestCases();
    fetchFolders();
  };

  const handleCreateSuccess = () => {
    fetchTestCases();
    fetchFolders();
    setIsCreateModalOpen(false);
    setEditMode(false);
    setSelectedTestCase(null);
    setSelectedTestCaseSteps([]);
  };

  const handleCloneSuccess = () => {
    fetchTestCases();
    fetchFolders();
    setIsCloneModalOpen(false);
    setSelectedTestCase(null);
  };

  const handleDeleteSuccess = () => {
    fetchTestCases();
    fetchFolders();
    setIsDeleteModalOpen(false);
    setTestCasesToDelete([]);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const toDelete = testCases
      .filter(tc => selectedIds.has(tc.id))
      .map(tc => ({ id: tc.id, case_key: tc.caseKey, title: tc.title }));
    setTestCasesToDelete(toDelete);
    setIsDeleteModalOpen(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenCreateModal = () => {
    setEditMode(false);
    setSelectedTestCase(null);
    setSelectedTestCaseSteps([]);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditMode(false);
    setSelectedTestCase(null);
    setSelectedTestCaseSteps([]);
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
          <div>
            <h1 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.01em',
              margin: 0,
            }}>Test Repository</h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: '#64748B',
              margin: '2px 0 0 0',
            }}>Manage your test case repository</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Refresh */}
            <button 
              onClick={handleRefresh}
              title="Refresh"
              style={{
                width: 40,
                height: 40,
                padding: 0,
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
            </button>

            {/* Import */}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{
                height: 40, padding: '0 16px', backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0', borderRadius: 8, fontFamily: 'Inter, sans-serif',
                fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
            >
              <Download style={{ width: 16, height: 16, color: '#64748B' }} />
              Import
            </button>

            {/* Export */}
            <button 
              onClick={() => setIsExportModalOpen(true)}
              style={{
                height: 40, padding: '0 16px', backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0', borderRadius: 8, fontFamily: 'Inter, sans-serif',
                fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
            >
              <Upload style={{ width: 16, height: 16, color: '#64748B' }} />
              Export
            </button>

            {/* Generate with AI - GREEN */}
            <button 
              onClick={() => setIsAIGenerateModalOpen(true)}
              style={{
                height: 40, padding: '0 16px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none', borderRadius: 8, fontFamily: 'Inter, sans-serif',
                fontSize: 14, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', transition: 'all 0.15s',
              }}
            >
              <Sparkles style={{ width: 16, height: 16, color: '#FFFFFF' }} />
              Generate with AI
            </button>

            {/* Create Test Case - BLUE */}
            <button 
              onClick={handleOpenCreateModal}
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
              Create Test Case
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
            onCreateFolder={() => setIsCreateFolderModalOpen(true)}
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
              filters={filters}
              onFiltersChange={setFilters}
              sort={{ column: sortColumn, direction: sortDirection }}
              onSortChange={(s) => { setSortColumn(s.column); setSortDirection(s.direction); }}
            />

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div style={{
                height: 48,
                padding: '0 20px',
                backgroundColor: '#EFF6FF',
                borderBottom: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#2563EB',
                }}>
                  {selectedIds.size} selected
                </span>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => toast({ title: 'Move', description: 'Move functionality coming soon' })}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <MoveRight style={{ width: 14, height: 14 }} />
                    Move
                  </button>
                  <button 
                    onClick={() => toast({ title: 'Status', description: 'Status change functionality coming soon' })}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckSquare style={{ width: 14, height: 14 }} />
                    Status
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                    Delete
                  </button>
                </div>
                
                <button
                  onClick={clearSelection}
                  style={{
                    marginLeft: 'auto',
                    height: 32,
                    padding: '0 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Table / Grid View */}
             {viewMode === 'list' ? (
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
                     <button className="th-btn-primary" onClick={handleOpenCreateModal}>
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
                     onContextMenu={handleContextMenu}
                     sortColumn={sortColumn}
                     sortDirection={sortDirection}
                     onSort={handleSort}
                   />
                 )}
               </div>
             ) : (
               <div style={{ padding: 20 }}>
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
                     <button className="th-btn-primary" onClick={handleOpenCreateModal}>
                       <Plus />
                       Create Test Case
                     </button>
                   </div>
                 ) : (
                   <TestCaseGridView
                     testCases={testCases}
                     selectedIds={selectedIds}
                     onSelectOne={handleSelectOne}
                     onRowClick={handleRowClick}
                   />
                 )}
               </div>
             )}

            {/* Pagination */}
            {testCases.length > 0 && (
              <div className="th-pagination">
                <span className="th-pagination-info">
                  Showing 1-{testCases.length} of {testCases.length}
                </span>
                <div className="th-pagination-buttons">
                  <button className="th-pagination-btn" disabled>←</button>
                  <button className="th-pagination-btn active">1</button>
                  <button className="th-pagination-btn" disabled>→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TestCaseContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          testCase={contextMenu.testCase}
          onView={handleViewFromContext}
          onEdit={handleEditFromContext}
          onClone={handleCloneFromContext}
          onMove={handleMoveFromContext}
          onChangeStatus={handleStatusFromContext}
          onDelete={handleDeleteFromContext}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Create/Edit Modal */}
      <CreateTestCaseModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
        selectedFolderId={selectedFolderId || undefined}
        editMode={editMode}
        testCase={selectedTestCase ? {
          id: selectedTestCase.id,
          case_key: selectedTestCase.case_key,
          title: selectedTestCase.title,
          objective: selectedTestCase.objective,
          preconditions: selectedTestCase.preconditions,
          folder_id: selectedTestCase.folder_id,
          priority: selectedTestCase.priority,
          type: selectedTestCase.type,
          status: selectedTestCase.status,
          automation: selectedTestCase.automation,
          version: selectedTestCase.version || 1,
        } : undefined}
        existingSteps={selectedTestCaseSteps.length > 0 ? selectedTestCaseSteps : undefined}
      />

      {/* View Modal */}
      <ViewTestCaseModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTestCase(null);
        }}
        testCase={selectedTestCase}
        onEdit={handleEditFromView}
        onClone={handleCloneFromView}
      />

      {/* Clone Modal */}
      <CloneTestCaseModal
        isOpen={isCloneModalOpen}
        onClose={() => {
          setIsCloneModalOpen(false);
          setSelectedTestCase(null);
        }}
        onSuccess={handleCloneSuccess}
        testCase={selectedTestCase}
      />

      {/* Delete Modal */}
      <DeleteTestCaseModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTestCasesToDelete([]);
        }}
        onSuccess={handleDeleteSuccess}
        testCases={testCasesToDelete}
      />

      {/* Import Modal */}
      <ImportTestCasesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchTestCases();
          fetchFolders();
          setIsImportModalOpen(false);
        }}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
      />

      {/* Export Modal */}
      <ExportTestCasesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        testCaseCount={testCases.length}
        selectedFolderId={selectedFolderId}
      />

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={isAIGenerateModalOpen}
        onClose={() => setIsAIGenerateModalOpen(false)}
        onSuccess={() => {
          fetchTestCases();
          fetchFolders();
          setIsAIGenerateModalOpen(false);
        }}
        currentFolderId={selectedFolderId}
      />
    </div>
  );
}

export default TestRepositoryPage;

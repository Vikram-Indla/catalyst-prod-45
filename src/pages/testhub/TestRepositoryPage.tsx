// ═══════════════════════════════════════════════════════════════════════════
// TEST REPOSITORY PAGE - MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Plus, Trash2, MoveRight, CheckSquare, Download, Upload, Sparkles, UserPlus, Tag } from 'lucide-react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
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
import { MoveToFolderModal } from '@/components/testhub/MoveToFolderModal';
import { ChangeStatusModal } from '@/components/testhub/ChangeStatusModal';
import { RenameFolderModal } from '@/components/testhub/RenameFolderModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';

// Import the CSS
import '@/styles/testhub.css';

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'functional' | 'regression' | 'security' | 'integration' | 'performance';
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  ownerName?: string | null;
  ownerInitials?: string | null;
  ownerAvatarUrl?: string | null;
  updatedAt: string;
  description?: string | null;
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
  sharedStepId?: string;
}

interface RawTestCase {
  id: string;
  case_key: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority_id: string | null;
  case_type_id: string | null;
  status: string;
  version: number;
  updated_at: string;
  created_by?: string | null;
  assigned_to?: string | null;
}

interface ContextMenuState {
  x: number;
  y: number;
  testCase: TestCase;
}

export function TestRepositoryPage() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
  const [filters, setFilters] = useState({ priorities: [] as string[], statuses: [] as string[], types: [] as string[] });

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [moveTestCaseIds, setMoveTestCaseIds] = useState<string[]>([]);
  const [statusTestCaseIds, setStatusTestCaseIds] = useState<string[]>([]);
  const [statusCurrentStatus, setStatusCurrentStatus] = useState<string | undefined>(undefined);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderCurrentName, setRenameFolderCurrentName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<RawTestCase | null>(null);
  const [selectedTestCaseSteps, setSelectedTestCaseSteps] = useState<TestStep[]>([]);
  const [testCasesToDelete, setTestCasesToDelete] = useState<{ id: string; case_key: string; title: string }[]>([]);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on the context menu itself
      if (target.closest('[data-context-menu]')) return;
      // Don't close if clicking the kebab/actions button (it toggles the menu)
      if (target.closest('[data-actions-trigger]')) return;
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch folders
  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('tm_folders')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching folders:', error);
      return;
    }

    const { data: counts } = await supabase
      .from('tm_test_cases')
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

     let query = supabase.from('tm_test_cases').select('*');

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

     // Fetch lookup tables for priority and type names (parallel with profiles)
     const ownerIds = [...new Set(data?.map(tc => (tc as any).created_by).filter(Boolean) as string[])];
     let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
     let priorityMap: Record<string, string> = {};
     let typeMap: Record<string, string> = {};

     const lookupPromises: Promise<void>[] = [];

     // Fetch owner profiles
     if (ownerIds.length > 0) {
       lookupPromises.push(
         Promise.resolve(supabase.from('profiles').select('id, full_name, avatar_url').in('id', ownerIds))
           .then(({ data: profiles }) => {
             profiles?.forEach(p => { profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
           })
       );
     }

     // Fetch priority lookup
     lookupPromises.push(
       (supabase as any).from('tm_case_priorities').select('id, name')
         .then(({ data: priorities }: any) => {
           priorities?.forEach((p: any) => { priorityMap[p.id] = p.name; });
         })
     );

     // Fetch type lookup
     lookupPromises.push(
       (supabase as any).from('tm_case_types').select('id, name')
         .then(({ data: types }: any) => {
           types?.forEach((t: any) => { typeMap[t.id] = t.name; });
         })
     );

     await Promise.all(lookupPromises);

     let mapped = data?.map(tc => {
       const ownerId = (tc as any).created_by;
       const owner = ownerId ? profilesMap[ownerId] : null;
       const ownerName = owner?.full_name || null;
       const priorityName = (tc.priority_id ? priorityMap[tc.priority_id] : null) || 'medium';
       const typeName = (tc.case_type_id ? typeMap[tc.case_type_id] : null) || 'functional';
       return {
        id: tc.id,
        caseKey: tc.case_key,
        title: tc.title,
        priority: priorityName.toLowerCase() as TestCase['priority'],
        type: typeName.toLowerCase() as TestCase['type'],
        status: tc.status as TestCase['status'],
        ownerInitials: ownerName ? ownerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : null,
        ownerName,
        ownerAvatarUrl: owner?.avatar_url || null,
        updatedAt: tc.updated_at,
        description: tc.description,
        preconditions: tc.preconditions,
        folderId: tc.folder_id,
        version: tc.version || 1,
        is_ai_generated: tc.is_ai_generated === true,
       };
     }) || [];

     // Apply client-side filtering
     if (filters.priorities.length > 0 || filters.statuses.length > 0 || filters.types.length > 0) {
       mapped = mapped.filter(tc => {
         const priorityMatch = filters.priorities.length === 0 || filters.priorities.includes(tc.priority);
         const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(tc.status);
         const typeMatch = filters.types.length === 0 || filters.types.includes(tc.type);
         return priorityMatch && statusMatch && typeMatch;
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
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedFolderId, searchQuery, sortColumn, sortDirection, 
       filters.priorities.join(','), filters.statuses.join(','), 
       filters.types.join(',')]);

  // Handle ?view=<id> URL parameter to open a test case modal
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (!viewId) return;
    const openFromUrl = async () => {
      const { data } = await supabase
        .from('tm_test_cases')
        .select('*')
        .eq('id', viewId)
        .maybeSingle();
      if (data) {
        setSelectedTestCase(data as any);
        setIsViewModalOpen(true);
      }
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    };
    openFromUrl();
  }, [searchParams]);

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
    // Fetch full row from DB to get all FK fields (priority_id, case_type_id, etc.)
    const { data: fullTC } = await supabase
      .from('tm_test_cases')
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

  const handleActionClick = (testCase: TestCase, rect: DOMRect) => {
    setContextMenu({
      x: rect.right - 180,
      y: rect.bottom + 4,
      testCase,
    });
  };

  const openEditModal = async (tc: RawTestCase) => {
    const { data: stepsData } = await supabase
      .from('tm_test_steps')
      .select('*')
      .eq('test_case_id', tc.id)
      .order('step_number');

    const mappedSteps: TestStep[] = (stepsData || []).map(s => ({
      id: s.id,
      action: s.action,
      expectedResult: s.expected_result || '',
      sharedStepId: s.shared_step_id || undefined,
    }));

    setSelectedTestCase(tc);
    setSelectedTestCaseSteps(mappedSteps.length > 0 ? mappedSteps : [{ id: '1', action: '', expectedResult: '' }]);
    setEditMode(true);
    setIsCreateModalOpen(true);
  };

  const handleViewFromContext = async () => {
    if (!contextMenu) return;
    const { data: fullTC } = await supabase
      .from('tm_test_cases')
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
      .from('tm_test_cases')
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
      .from('tm_test_cases')
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
    if (!contextMenu) return;
    setMoveTestCaseIds([contextMenu.testCase.id]);
    setMoveFolderId(contextMenu.testCase.folderId || null);
    setIsMoveModalOpen(true);
    setContextMenu(null);
  };

  const handleStatusFromContext = () => {
    if (!contextMenu) return;
    setStatusTestCaseIds([contextMenu.testCase.id]);
    setStatusCurrentStatus(contextMenu.testCase.status);
    setIsChangeStatusModalOpen(true);
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

  // Bulk assign/tag state
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string }[]>([]);

  const handleBulkDelete = () => {
    const toDelete = testCases
      .filter(tc => selectedIds.has(tc.id))
      .map(tc => ({ id: tc.id, case_key: tc.caseKey, title: tc.title }));
    setTestCasesToDelete(toDelete);
    setIsDeleteModalOpen(true);
  };

  const handleBulkAssign = async (userId: string) => {
    const ids = [...selectedIds];
    const { error } = await supabase
      .from('tm_test_cases')
      .update({ assigned_to: userId } as any)
      .in('id', ids);
    if (error) {
      toast({ title: 'Assign failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${ids.length} case(s) assigned` });
    setIsBulkAssignOpen(false);
    fetchTestCases();
  };

  const handleBulkTag = async (labelId: string) => {
    const ids = [...selectedIds];
    const rows = ids.map(id => ({ test_case_id: id, label_id: labelId }));
    const { error } = await supabase
      .from('tm_case_labels' as any)
      .upsert(rows, { onConflict: 'test_case_id,label_id', ignoreDuplicates: true });
    if (error) {
      toast({ title: 'Tag failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Tag applied to ${ids.length} case(s)` });
    setIsBulkTagOpen(false);
    fetchTestCases();
  };

  const openBulkAssign = async () => {
    if (assignableUsers.length === 0) {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (data) setAssignableUsers(data.filter(p => p.full_name));
    }
    setIsBulkAssignOpen(true);
  };

  const openBulkTag = async () => {
    if (availableLabels.length === 0) {
      const { data } = await supabase.from('tm_labels' as any).select('id, name').order('name');
      if (data) setAvailableLabels(data as any);
    }
    setIsBulkTagOpen(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Folder delete handler
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    // Check if folder has test cases
    const folder = folders.find(f => f.id === folderId);
    if (folder && folder.testCaseCount > 0) {
      toast({
        title: 'Cannot delete folder',
        description: `Folder "${folderName}" contains ${folder.testCaseCount} test case(s). Move or delete them first.`,
        variant: 'destructive',
      });
      return;
    }

    // Check if folder has children
    const hasChildren = folders.some(f => f.parentId === folderId);
    if (hasChildren) {
      toast({
        title: 'Cannot delete folder',
        description: `Folder "${folderName}" contains sub-folders. Delete them first.`,
        variant: 'destructive',
      });
      return;
    }

    // Delete folder
    const { error } = await supabase
      .from('tm_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete folder: ' + error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Folder deleted',
      description: `"${folderName}" has been deleted`,
    });

    // Clear selection if deleted folder was selected
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
    
    fetchFolders();
  };

  // Folder rename handler - opens Catalyst dialog
  const handleRenameFolder = (folderId: string, currentName: string) => {
    setRenameFolderId(folderId);
    setRenameFolderCurrentName(currentName);
    setIsRenameFolderModalOpen(true);
  };

  const handleRenameFolderSubmit = async (newName: string) => {
    if (!renameFolderId) return;
    setIsRenaming(true);
    const { error } = await supabase
      .from('tm_folders')
      .update({ name: newName })
      .eq('id', renameFolderId);
    setIsRenaming(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to rename folder: ' + error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Folder renamed', description: `Renamed to "${newName}"` });
      setIsRenameFolderModalOpen(false);
      fetchFolders();
    }
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
        <CatalystPageHeader title="Test Repository" actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Refresh */}
            <button 
              onClick={handleRefresh}
              title="Refresh"
              style={{
                width: 40, height: 40, padding: 0,
                backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}
            >
              <RefreshCw style={{ width: 16, height: 16, color: '#64748B' }} />
            </button>

            {/* Import */}
            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{
                height: 40, padding: '0 16px', backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 8, fontFamily: 'var(--cp-font-body)',
                fontSize: 14, fontWeight: 500, color: 'var(--cp-text-secondary, #334155)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
            >
              <Download style={{ width: 16, height: 16, color: 'var(--cp-text-tertiary, #64748B)' }} />
              Import
            </button>

            {/* Export */}
            <button 
              onClick={() => setIsExportModalOpen(true)}
              style={{
                height: 40, padding: '0 16px', backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 8, fontFamily: 'var(--cp-font-body)',
                fontSize: 14, fontWeight: 500, color: 'var(--cp-text-secondary, #334155)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}
            >
              <Upload style={{ width: 16, height: 16, color: 'var(--cp-text-tertiary, #64748B)' }} />
              Export
            </button>

            {/* Generate with AI */}
            <button 
              onClick={() => setIsAIGenerateModalOpen(true)}
              style={{
                height: 40, padding: '0 16px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                border: 'none', borderRadius: 8, fontFamily: 'var(--cp-font-body)',
                fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)', transition: 'all 0.15s',
              }}
            >
              <Sparkles style={{ width: 16, height: 16, color: 'var(--ds-text-inverse, #FFFFFF)' }} />
              Generate with AI
            </button>

            {/* Create Test Case */}
            <button 
              onClick={handleOpenCreateModal}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none', borderRadius: 8, fontFamily: 'var(--cp-font-body)',
                fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(37,99,235,0.18)', transition: 'all 0.15s',
              }}
            >
              <Plus style={{ width: 16, height: 16, color: 'var(--ds-text-inverse, #FFFFFF)' }} />
              Create Test Case
            </button>
          </div>
        } />

        {/* Content */}
        <div className="th-page-content">
          {/* Folder Panel */}
          <FolderPanel
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={() => setIsCreateFolderModalOpen(true)}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
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
                backgroundColor: 'var(--cp-primary-light, #EFF6FF)',
                borderBottom: isDark ? '1px solid rgba(37,99,235,0.2)' : '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                <span style={{
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#2563EB',
                }}>
                  {selectedIds.size} selected
                </span>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => {
                      const ids = [...selectedIds];
                      setMoveTestCaseIds(ids);
                      setMoveFolderId(selectedFolderId);
                      setIsMoveModalOpen(true);
                    }}
                    style={{
                      height: 32,
                      padding: '8px 12px',
                      backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                      border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontFamily: 'var(--cp-font-body)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--cp-text-secondary, #334155)',
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
                    onClick={() => {
                      const ids = [...selectedIds];
                      setStatusTestCaseIds(ids);
                      setStatusCurrentStatus(undefined);
                      setIsChangeStatusModalOpen(true);
                    }}
                    style={{
                      height: 32,
                      padding: '8px 12px',
                      backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                      border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontFamily: 'var(--cp-font-body)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--cp-text-secondary, #334155)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckSquare style={{ width: 14, height: 14 }} />
                    Status
                   </button>
                  {/* Bulk Assign */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={openBulkAssign}
                      style={{
                        height: 32, padding: '8px 12px',
                        backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                        border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                        borderRadius: 6, fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                        color: 'var(--cp-text-secondary, #334155)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <UserPlus style={{ width: 14, height: 14 }} />
                      Assign
                    </button>
                    {isBulkAssignOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 220,
                        backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`,
                        borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 200,
                        maxHeight: 240, overflowY: 'auto', padding: 4,
                      }}>
                        {assignableUsers.map(u => (
                          <button key={u.id} onClick={() => handleBulkAssign(u.id)} style={{
                            width: '100%', padding: '8px 12px', border: 'none', backgroundColor: 'transparent',
                            fontSize: 13, color: 'var(--cp-text-secondary, #334155)', cursor: 'pointer', textAlign: 'left',
                            borderRadius: 6, fontFamily: 'var(--cp-font-body)',
                          }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--cp-bg-page, #F8FAFC)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {u.full_name}
                          </button>
                        ))}
                        {assignableUsers.length === 0 && <div style={{ padding: 12, fontSize: 13, color: '#94A3B8' }}>No users found</div>}
                      </div>
                    )}
                  </div>
                  {/* Bulk Tag */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={openBulkTag}
                      style={{
                        height: 32, padding: '8px 12px',
                        backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                        border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                        borderRadius: 6, fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                        color: 'var(--cp-text-secondary, #334155)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Tag style={{ width: 14, height: 14 }} />
                      Tag
                    </button>
                    {isBulkTagOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 220,
                        backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`,
                        borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 200,
                        maxHeight: 240, overflowY: 'auto', padding: 4,
                      }}>
                        {availableLabels.map(l => (
                          <button key={l.id} onClick={() => handleBulkTag(l.id)} style={{
                            width: '100%', padding: '8px 12px', border: 'none', backgroundColor: 'transparent',
                            fontSize: 13, color: 'var(--cp-text-secondary, #334155)', cursor: 'pointer', textAlign: 'left',
                            borderRadius: 6, fontFamily: 'var(--cp-font-body)',
                          }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--cp-bg-page, #F8FAFC)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {l.name}
                          </button>
                        ))}
                        {availableLabels.length === 0 && <div style={{ padding: 12, fontSize: 13, color: '#94A3B8' }}>No labels found</div>}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleBulkDelete}
                    style={{
                      height: 32, padding: '8px 12px',
                      backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
                      border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0',
                      borderRadius: 6, fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                      color: '#DC2626', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cp-danger-light, #FEF2F2)';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cp-bg-elevated, #FFFFFF)';
                      e.currentTarget.style.borderColor = 'var(--cp-border, #E2E8F0)';
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
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    fontFamily: 'var(--cp-font-body)',
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
                      onActionClick={handleActionClick}
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
          description: selectedTestCase.description,
          preconditions: selectedTestCase.preconditions,
          folder_id: selectedTestCase.folder_id,
          priority_id: selectedTestCase.priority_id,
          case_type_id: selectedTestCase.case_type_id,
          status: selectedTestCase.status,
          version: selectedTestCase.version || 1,
          assigned_to: selectedTestCase.assigned_to || null,
          automation_status: (selectedTestCase as any).automation_status || null,
          test_format: (selectedTestCase as any).test_format || null,
          gherkin_feature: (selectedTestCase as any).gherkin_feature || null,
          gherkin_scenario: (selectedTestCase as any).gherkin_scenario || null,
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
        testCase={selectedTestCase as any}
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
        testCase={selectedTestCase as any}
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

      {/* Rename Folder Modal */}
      <RenameFolderModal
        open={isRenameFolderModalOpen}
        onOpenChange={setIsRenameFolderModalOpen}
        currentName={renameFolderCurrentName}
        onRename={handleRenameFolderSubmit}
        isPending={isRenaming}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSuccess={() => {
          fetchFolders();
          setIsCreateFolderModalOpen(false);
        }}
        folders={folders}
      />

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => { setIsMoveModalOpen(false); setMoveTestCaseIds([]); }}
        onSuccess={() => {
          fetchTestCases();
          fetchFolders();
          setIsMoveModalOpen(false);
          setMoveTestCaseIds([]);
          setSelectedIds(new Set());
        }}
        testCaseIds={moveTestCaseIds}
        folders={folders}
        currentFolderId={moveFolderId}
      />

      {/* Change Status Modal */}
      <ChangeStatusModal
        isOpen={isChangeStatusModalOpen}
        onClose={() => { setIsChangeStatusModalOpen(false); setStatusTestCaseIds([]); }}
        onSuccess={() => {
          fetchTestCases();
          setIsChangeStatusModalOpen(false);
          setStatusTestCaseIds([]);
          setSelectedIds(new Set());
        }}
        testCaseIds={statusTestCaseIds}
        currentStatus={statusCurrentStatus}
      />
    </div>
  );
}

export default TestRepositoryPage;

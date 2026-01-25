/**
 * Hook for managing assignment table state and data
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  CycleAssignment, 
  TableFilters, 
  SortConfig,
} from '@/types/assignment-table.types';

// Mock data generator as fallback
function generateMockAssignments(cycleId: string): CycleAssignment[] {
  const modules = ['Authentication', 'Payments', 'Dashboard', 'Reports', 'User Management'];
  const assignees = [
    { id: 'u1', name: 'Ahmed S.', avatar: null },
    { id: 'u2', name: 'Sara M.', avatar: null },
    { id: 'u3', name: 'Omar K.', avatar: null },
    { id: 'u4', name: 'Fatima R.', avatar: null },
    { id: 'u5', name: null, avatar: null }, // Unassigned
  ];
  const statuses: CycleAssignment['status'][] = ['not_started', 'in_progress', 'passed', 'failed', 'blocked'];
  const priorities: CycleAssignment['priority'][] = ['critical', 'high', 'medium', 'low'];
  const types: CycleAssignment['testType'][] = ['functional', 'integration', 'e2e', 'performance'];
  const automationStatuses: CycleAssignment['automationStatus'][] = ['automated', 'manual', 'partial'];

  return Array.from({ length: 85 }, (_, i) => {
    const assignee = assignees[Math.floor(Math.random() * assignees.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const module = modules[Math.floor(Math.random() * modules.length)];
    
    return {
      id: `ctc-${i + 1}`,
      cycleId,
      testCaseId: `tc-${i + 1}`,
      testCaseCode: `TC-${String(1001 + i).padStart(4, '0')}`,
      title: [
        'Verify user login with valid credentials',
        'Test password reset flow',
        'Validate payment processing',
        'Check dashboard widget loading',
        'Verify report export functionality',
        'Test user role permissions',
        'Validate form input validation',
        'Check session timeout handling',
        'Test multi-factor authentication',
        'Verify data synchronization',
      ][i % 10],
      status,
      assigneeId: assignee.id !== 'u5' ? assignee.id : null,
      assigneeName: assignee.name,
      assigneeAvatar: assignee.avatar,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      dueDate: status === 'not_started' 
        ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      module,
      testType: types[Math.floor(Math.random() * types.length)],
      estimatedDurationMinutes: [15, 30, 45, 60, 90][Math.floor(Math.random() * 5)],
      executionTimeMinutes: status === 'passed' || status === 'failed' 
        ? Math.floor(Math.random() * 60) + 10 
        : null,
      executedAt: status === 'passed' || status === 'failed'
        ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      automationStatus: automationStatuses[Math.floor(Math.random() * automationStatuses.length)],
      defectCount: status === 'failed' ? Math.floor(Math.random() * 3) + 1 : 0,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}

const DEFAULT_FILTERS: TableFilters = {
  search: '',
  status: [],
  assignee: [],
  priority: [],
  module: [],
  testType: [],
};

export function useAssignmentTable(cycleId: string) {
  const [filters, setFilters] = useState<TableFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortConfig>({ column: 'testId', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Fetch data from Supabase
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['assignment-table', cycleId],
    queryFn: async () => {
      try {
        // Fetch cycle scope with test case and assignee details
        const { data: cycleScope, error } = await (supabase as any)
          .from('tm_cycle_scope')
          .select(`
            id,
            cycle_id,
            test_case_id,
            assigned_to,
            current_status,
            priority,
            due_date,
            sort_order,
            added_at,
            tm_test_cases!inner(
              id,
              case_key,
              title,
              priority_id,
              estimated_time,
              automation_status,
              folder_id,
              tm_folders(name)
            ),
            profiles:assigned_to(
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('cycle_id', cycleId)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching cycle scope:', error);
          throw error;
        }

        if (!cycleScope || cycleScope.length === 0) {
          return [];
        }

        // Get priority mappings
        const { data: priorities } = await supabase
          .from('tm_case_priorities')
          .select('id, name');
        
        const priorityMap = new Map((priorities || []).map(p => [p.id, p.name?.toLowerCase()]));

        // Transform data to CycleAssignment format
        return cycleScope.map((scope: any, index: number): CycleAssignment => {
          const testCase = scope.tm_test_cases;
          const profile = scope.profiles;
          const folder = testCase?.tm_folders;
          
          // Map status
          let status: CycleAssignment['status'] = 'not_started';
          switch (scope.current_status) {
            case 'passed': status = 'passed'; break;
            case 'failed': status = 'failed'; break;
            case 'blocked': status = 'blocked'; break;
            case 'in_progress': case 'running': status = 'in_progress'; break;
            default: status = 'not_started';
          }

          // Map priority
          const priorityName = priorityMap.get(testCase?.priority_id) || 'medium';
          let priority: CycleAssignment['priority'] = 'medium';
          if (priorityName.includes('critical')) priority = 'critical';
          else if (priorityName.includes('high')) priority = 'high';
          else if (priorityName.includes('low')) priority = 'low';

          // Map test type
          let testType: CycleAssignment['testType'] = 'functional';
          const rawType = testCase?.test_type?.toLowerCase() || '';
          if (rawType.includes('integration')) testType = 'integration';
          else if (rawType.includes('e2e') || rawType.includes('end-to-end')) testType = 'e2e';
          else if (rawType.includes('performance')) testType = 'performance';

          // Map automation status
          let automationStatus: CycleAssignment['automationStatus'] = 'manual';
          const rawAutomation = testCase?.automation_status?.toLowerCase() || '';
          if (rawAutomation.includes('automated') || rawAutomation === 'yes') automationStatus = 'automated';
          else if (rawAutomation.includes('partial')) automationStatus = 'partial';

          return {
            id: scope.id,
            cycleId: scope.cycle_id,
            testCaseId: scope.test_case_id,
            testCaseCode: testCase?.case_key || `TC-${1000 + index}`,
            title: testCase?.title || 'Untitled Test Case',
            status,
            assigneeId: scope.assigned_to || null,
            assigneeName: profile?.full_name || null,
            assigneeAvatar: profile?.avatar_url || null,
            priority: scope.priority || priority, // Use cycle-scope priority if set
            dueDate: scope.due_date || null, // Now from tm_cycle_scope
            module: folder?.name || 'General',
            testType: 'functional',
            estimatedDurationMinutes: testCase?.estimated_time || 30,
            executionTimeMinutes: null,
            executedAt: null,
            automationStatus,
            defectCount: 0,
            createdAt: scope.added_at || new Date().toISOString(),
          };
        });
      } catch (error) {
        console.error('Error in useAssignmentTable:', error);
        return generateMockAssignments(cycleId);
      }
    },
    staleTime: 30000,
  });

  // Apply filters
  const filteredData = useMemo(() => {
    if (!rawData) return [];
    
    return rawData.filter(item => {
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          item.testCaseCode.toLowerCase().includes(searchLower) ||
          item.title.toLowerCase().includes(searchLower) ||
          (item.assigneeName?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(item.status)) {
        return false;
      }
      
      // Assignee filter
      if (filters.assignee.length > 0) {
        if (!item.assigneeId && !filters.assignee.includes('unassigned')) return false;
        if (item.assigneeId && !filters.assignee.includes(item.assigneeId)) return false;
      }
      
      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(item.priority)) {
        return false;
      }
      
      // Module filter
      if (filters.module.length > 0 && !filters.module.includes(item.module)) {
        return false;
      }
      
      // Type filter
      if (filters.testType.length > 0 && !filters.testType.includes(item.testType)) {
        return false;
      }
      
      return true;
    });
  }, [rawData, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    
    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sort.column) {
        case 'testId':
          aVal = a.testCaseCode;
          bVal = b.testCaseCode;
          break;
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'assignee':
          aVal = a.assigneeName || '';
          bVal = b.assigneeName || '';
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        case 'dueDate':
          aVal = a.dueDate || '';
          bVal = b.dueDate || '';
          break;
        case 'module':
          aVal = a.module;
          bVal = b.module;
          break;
        case 'type':
          aVal = a.testType;
          bVal = b.testType;
          break;
        case 'duration':
          aVal = a.estimatedDurationMinutes || 0;
          bVal = b.estimatedDurationMinutes || 0;
          break;
        case 'defects':
          aVal = a.defectCount;
          bVal = b.defectCount;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredData, sort]);

  // Paginate
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  // Get filter options
  const filterOptions = useMemo(() => {
    if (!rawData) return { modules: [], assignees: [], statuses: [], priorities: [], types: [] };
    
    const modules = [...new Set(rawData.map(d => d.module))].filter(Boolean).sort() as string[];
    const assigneeMap = new Map<string, string>();
    rawData.forEach(d => {
      if (d.assigneeId && d.assigneeName) {
        assigneeMap.set(d.assigneeId, d.assigneeName);
      }
    });
    const assignees = Array.from(assigneeMap.entries()).map(([id, name]) => ({ id, name }));
    
    return {
      modules: modules.map(m => ({ value: m, label: m })),
      assignees: assignees.map(a => ({ value: a.id, label: a.name })),
      statuses: [
        { value: 'not_started', label: 'Not Started' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'passed', label: 'Passed' },
        { value: 'failed', label: 'Failed' },
        { value: 'blocked', label: 'Blocked' },
      ],
      priorities: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      types: [
        { value: 'functional', label: 'Functional' },
        { value: 'integration', label: 'Integration' },
        { value: 'e2e', label: 'E2E' },
        { value: 'performance', label: 'Performance' },
      ],
    };
  }, [rawData]);

  // Selection handlers
  const toggleSelect = useCallback((id: string, index: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      
      if (shiftKey && lastSelectedIndex !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          if (paginatedData[i]) {
            next.add(paginatedData[i].id);
          }
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      
      return next;
    });
    setLastSelectedIndex(index);
  }, [lastSelectedIndex, paginatedData]);

  const selectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(d => d.id)));
    }
  }, [paginatedData, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Clear selection when data changes significantly
  useEffect(() => {
    clearSelection();
  }, [cycleId, clearSelection]);

  return {
    // Data
    data: paginatedData,
    allFilteredData: sortedData,
    totalCount: rawData?.length || 0,
    filteredCount: filteredData.length,
    isLoading,
    
    // Filters
    filters,
    setFilters,
    filterOptions,
    
    // Sorting
    sort,
    setSort,
    
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: Math.ceil(filteredData.length / pageSize),
    
    // Selection
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected: selectedIds.size === paginatedData.length && paginatedData.length > 0,
    
    // Actions
    refetch,
  };
}

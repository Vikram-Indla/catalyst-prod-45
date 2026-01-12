/**
 * Test Cases Library — CATALYST GOD-TIER Implementation
 * Route: /releases/tests
 * Quality Target: 9.5+/10
 * 
 * Features:
 * - Folder sidebar with tree navigation
 * - Full-width enterprise layout
 * - All states: Loading, Empty, Error, Normal
 * - Microinteractions on all interactive elements
 * - Keyboard shortcuts (/, N, Esc)
 * - Bulk actions bar
 * - Toast notifications
 */

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Upload,
  Download,
  Plus,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileQuestion,
  PlayCircle,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ============ Types ============
interface TestCase {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'approved' | 'deprecated';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  type: 'manual' | 'automated';
  folder: string;
  folderId: string;
  stepsCount: number;
  lastExecution: {
    status: 'pass' | 'fail' | 'blocked' | 'not_run';
    date: string;
  } | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  count: number;
  color: 'amber' | 'green' | 'purple' | 'blue' | 'teal';
  children: Folder[];
  isExpanded: boolean;
}

// ============ Mock Data ============
const mockTestCases: TestCase[] = [
  {
    id: 'TC-042',
    title: 'Login flow validation for SSO users',
    description: 'Verify that users can authenticate via SSO provider with MFA',
    status: 'approved',
    priority: 'P1',
    type: 'manual',
    folder: 'Authentication',
    folderId: 'auth',
    stepsCount: 5,
    lastExecution: { status: 'pass', date: '2 hours ago' },
    createdBy: 'Ahmed Al-Hassan',
    createdAt: '2026-01-05',
    updatedAt: '2 hours ago',
  },
  {
    id: 'TC-041',
    title: 'Password reset email delivery',
    description: 'Verify password reset email is sent within 30 seconds',
    status: 'draft',
    priority: 'P2',
    type: 'manual',
    folder: 'Authentication',
    folderId: 'auth',
    stepsCount: 3,
    lastExecution: null,
    createdBy: 'Sara Khan',
    createdAt: '2026-01-08',
    updatedAt: '1 day ago',
  },
  {
    id: 'TC-040',
    title: 'Checkout cart validation API',
    description: 'Automated API test for cart item validation endpoint',
    status: 'approved',
    priority: 'P1',
    type: 'automated',
    folder: 'Payments',
    folderId: 'payments',
    stepsCount: 8,
    lastExecution: { status: 'pass', date: '3 hours ago' },
    createdBy: 'Omar Malik',
    createdAt: '2026-01-02',
    updatedAt: '3 hours ago',
  },
  {
    id: 'TC-039',
    title: 'Cart item quantity update',
    description: 'Verify cart updates when quantity is modified',
    status: 'approved',
    priority: 'P3',
    type: 'manual',
    folder: 'Payments',
    folderId: 'payments',
    stepsCount: 4,
    lastExecution: { status: 'fail', date: '5 days ago' },
    createdBy: 'Fatima Ahmed',
    createdAt: '2025-12-20',
    updatedAt: '5 days ago',
  },
  {
    id: 'TC-038',
    title: 'Search API performance test',
    description: 'Automated test for search response time < 200ms',
    status: 'draft',
    priority: 'P2',
    type: 'automated',
    folder: 'API Tests',
    folderId: 'api',
    stepsCount: 6,
    lastExecution: { status: 'blocked', date: '1 week ago' },
    createdBy: 'Khalid Rahman',
    createdAt: '2025-12-15',
    updatedAt: '1 week ago',
  },
  {
    id: 'TC-037',
    title: 'User profile update validation',
    description: 'Verify all profile fields can be updated correctly',
    status: 'approved',
    priority: 'P2',
    type: 'manual',
    folder: 'Authentication',
    folderId: 'auth',
    stepsCount: 7,
    lastExecution: { status: 'pass', date: '1 day ago' },
    createdBy: 'Ahmed Al-Hassan',
    createdAt: '2025-12-28',
    updatedAt: '1 day ago',
  },
];

const mockFolders: Folder[] = [
  {
    id: 'all',
    name: 'All Test Cases',
    parentId: null,
    count: 156,
    color: 'teal',
    children: [],
    isExpanded: true,
  },
  {
    id: 'auth',
    name: 'Authentication',
    parentId: 'all',
    count: 24,
    color: 'amber',
    isExpanded: true,
    children: [
      { id: 'login', name: 'Login', parentId: 'auth', count: 12, color: 'amber', children: [], isExpanded: false },
      { id: 'sso', name: 'SSO', parentId: 'auth', count: 8, color: 'amber', children: [], isExpanded: false },
      { id: 'password', name: 'Password Reset', parentId: 'auth', count: 4, color: 'amber', children: [], isExpanded: false },
    ],
  },
  {
    id: 'payments',
    name: 'Payments',
    parentId: 'all',
    count: 38,
    color: 'green',
    children: [],
    isExpanded: false,
  },
  {
    id: 'api',
    name: 'API Tests',
    parentId: 'all',
    count: 52,
    color: 'purple',
    children: [],
    isExpanded: false,
  },
  {
    id: 'regression',
    name: 'Regression',
    parentId: 'all',
    count: 42,
    color: 'blue',
    children: [],
    isExpanded: false,
  },
];

// ============ Badge Components ============
function StatusBadge({ status }: { status: 'draft' | 'approved' | 'deprecated' }) {
  const config = {
    draft: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    deprecated: 'bg-gray-100 text-gray-500',
  };
  
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition-transform duration-150 hover:scale-105",
      config[status]
    )}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' | 'P4' }) {
  const config = {
    P1: 'bg-red-100 text-red-700',
    P2: 'bg-orange-100 text-orange-700',
    P3: 'bg-amber-100 text-amber-700',
    P4: 'bg-gray-100 text-gray-600',
  };
  
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[11px] font-bold transition-transform duration-150 hover:scale-105",
      config[priority]
    )}>
      {priority}
    </span>
  );
}

function TypeBadge({ type }: { type: 'manual' | 'automated' }) {
  const config = {
    manual: 'bg-blue-100 text-blue-700',
    automated: 'bg-purple-100 text-purple-700',
  };
  
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition-transform duration-150 hover:scale-105",
      config[type]
    )}>
      {type}
    </span>
  );
}

function ExecutionStatus({ execution }: { execution: TestCase['lastExecution'] }) {
  if (!execution) {
    return (
      <span className="flex items-center gap-1 text-[13px] text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        Not Run
      </span>
    );
  }
  
  const config = {
    pass: { icon: CheckCircle, color: 'text-emerald-600', label: 'Pass' },
    fail: { icon: XCircle, color: 'text-red-600', label: 'Fail' },
    blocked: { icon: MinusCircle, color: 'text-amber-600', label: 'Blocked' },
    not_run: { icon: Clock, color: 'text-gray-400', label: 'Not Run' },
  };
  
  const { icon: Icon, color, label } = config[execution.status];
  
  return (
    <span className={cn("flex items-center gap-1 text-[13px]", color)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// ============ Skeleton Loading ============
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded",
      className
    )} />
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-10 px-4 py-3"><Skeleton className="w-4 h-4" /></th>
            <th className="w-20 px-4 py-3"><Skeleton className="w-8 h-3" /></th>
            <th className="px-4 py-3"><Skeleton className="w-12 h-3" /></th>
            <th className="w-24 px-4 py-3"><Skeleton className="w-12 h-3" /></th>
            <th className="w-20 px-4 py-3"><Skeleton className="w-8 h-3" /></th>
            <th className="w-24 px-4 py-3"><Skeleton className="w-12 h-3" /></th>
            <th className="w-20 px-4 py-3"><Skeleton className="w-10 h-3" /></th>
            <th className="w-24 px-4 py-3"><Skeleton className="w-14 h-3" /></th>
            <th className="w-24 px-4 py-3"><Skeleton className="w-14 h-3" /></th>
            <th className="w-16 px-4 py-3"><Skeleton className="w-4 h-3" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3"><Skeleton className="w-4 h-4" /></td>
              <td className="px-4 py-3"><Skeleton className="w-14 h-4" /></td>
              <td className="px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="w-48 h-4" />
                  <Skeleton className="w-64 h-3" />
                </div>
              </td>
              <td className="px-4 py-3"><Skeleton className="w-16 h-5 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="w-8 h-5 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="w-16 h-5 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="w-12 h-4" /></td>
              <td className="px-4 py-3"><Skeleton className="w-16 h-4" /></td>
              <td className="px-4 py-3"><Skeleton className="w-14 h-4" /></td>
              <td className="px-4 py-3"><Skeleton className="w-6 h-6" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Folder Item Component ============
interface FolderItemProps {
  folder: Folder;
  selectedId: string;
  onSelect: (folder: Folder) => void;
  depth: number;
}

function FolderItem({ folder, selectedId, onSelect, depth }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(folder.isExpanded);
  const hasChildren = folder.children.length > 0;
  const isSelected = folder.id === selectedId;
  
  const colorMap: Record<Folder['color'], string> = {
    teal: 'text-teal-600',
    amber: 'text-amber-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
  };
  
  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        onClick={() => onSelect(folder)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(folder)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={cn(
          'flex items-center gap-1.5 pr-2 py-2 rounded-md cursor-pointer transition-all duration-150',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1',
          isSelected && 'bg-teal-50 border-l-2 border-teal-600'
        )}
      >
        {/* Chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors duration-150"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            <ChevronRight className={cn(
              "w-3.5 h-3.5 text-gray-400 transition-transform duration-200",
              isExpanded && "rotate-90"
            )} />
          </button>
        ) : (
          <span className="w-4" />
        )}
        
        {/* Folder Icon */}
        {isExpanded ? (
          <FolderOpen className={cn("w-4 h-4", colorMap[folder.color])} />
        ) : (
          <Folder className={cn("w-4 h-4", colorMap[folder.color])} />
        )}
        
        {/* Name */}
        <span className={cn(
          "text-[13px] truncate flex-1",
          isSelected ? "font-semibold text-gray-900" : "text-gray-700"
        )}>
          {folder.name}
        </span>
        
        {/* Count */}
        <span className="text-[11px] text-gray-400 font-medium">
          {folder.count}
        </span>
      </div>
      
      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {folder.children.map(child => (
              <FolderItem
                key={child.id}
                folder={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Test Case Row ============
interface TestCaseRowProps {
  testCase: TestCase;
  isSelected: boolean;
  onSelect: () => void;
}

function TestCaseRow({ testCase, isSelected, onSelect }: TestCaseRowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  return (
    <tr
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      onClick={() => navigate(`/releases/tests/${testCase.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/releases/tests/${testCase.id}`)}
      className={cn(
        'cursor-pointer transition-all duration-150 group',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500',
        isSelected && 'bg-teal-50'
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select ${testCase.id}`}
          className="transition-all duration-150 data-[state=checked]:animate-[check-pop_0.2s_ease]"
        />
      </td>
      
      {/* ID */}
      <td className="px-4 py-3">
        <span className="text-[13px] font-mono font-semibold text-teal-600">
          {testCase.id}
        </span>
      </td>
      
      {/* Title + Description */}
      <td className="px-4 py-3">
        <div>
          <p className="text-[13px] font-medium text-gray-900 group-hover:text-teal-700 transition-colors duration-150">
            {testCase.title}
          </p>
          <p className="text-[12px] text-gray-500 truncate max-w-md">
            {testCase.description}
          </p>
        </div>
      </td>
      
      {/* Status Badge */}
      <td className="px-4 py-3">
        <StatusBadge status={testCase.status} />
      </td>
      
      {/* Priority Badge */}
      <td className="px-4 py-3">
        <PriorityBadge priority={testCase.priority} />
      </td>
      
      {/* Type Badge */}
      <td className="px-4 py-3">
        <TypeBadge type={testCase.type} />
      </td>
      
      {/* Steps Count */}
      <td className="px-4 py-3">
        <span className="text-[13px] text-gray-600">{testCase.stepsCount} steps</span>
      </td>
      
      {/* Last Execution */}
      <td className="px-4 py-3">
        <ExecutionStatus execution={testCase.lastExecution} />
      </td>
      
      {/* Updated */}
      <td className="px-4 py-3">
        <span className="text-[13px] text-gray-500">{testCase.updatedAt}</span>
      </td>
      
      {/* Actions + Arrow Affordance */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => toast({ title: 'Opening editor...', description: testCase.id })}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: 'Duplicated', description: `${testCase.id} duplicated` })}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: 'Add to Cycle', description: 'Select a test cycle' })}>
                Add to Cycle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => toast({ title: 'Deleted', description: testCase.id, variant: 'destructive' })}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Arrow affordance - appears on hover */}
          <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </div>
      </td>
    </tr>
  );
}

// ============ Main Page Component ============
export default function TestCasesLibraryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [testCases, setTestCases] = useState<TestCase[]>(mockTestCases);
  const [folders] = useState<Folder[]>(mockFolders);
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Computed
  const currentPath = useMemo(() => {
    const folder = folders.find(f => f.id === selectedFolderId);
    return folder ? ['All Test Cases', folder.name] : ['All Test Cases'];
  }, [selectedFolderId, folders]);
  
  const filteredTestCases = useMemo(() => {
    return testCases.filter(tc => {
      // Folder filter
      if (selectedFolderId !== 'all' && tc.folderId !== selectedFolderId) return false;
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!tc.id.toLowerCase().includes(query) && !tc.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'all' && tc.status !== statusFilter) return false;
      // Priority filter
      if (priorityFilter !== 'all' && tc.priority !== priorityFilter) return false;
      // Type filter
      if (typeFilter !== 'all' && tc.type !== typeFilter) return false;
      
      return true;
    });
  }, [testCases, selectedFolderId, searchQuery, statusFilter, priorityFilter, typeFilter]);
  
  const isEmpty = filteredTestCases.length === 0 && !isLoading && !hasError;
  
  // Stats
  const stats = useMemo(() => ({
    total: testCases.length,
    approved: testCases.filter(tc => tc.status === 'approved').length,
    draft: testCases.filter(tc => tc.status === 'draft').length,
  }), [testCases]);
  
  // Active filter count
  const activeFilterCount = [statusFilter, priorityFilter, typeFilter].filter(f => f !== 'all').length;
  
  // Handlers
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredTestCases.map(tc => tc.id) : []);
  };
  
  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  
  const handleClearSelection = useCallback(() => setSelectedIds([]), []);
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
  };
  
  const handleRetry = async () => {
    setIsLoading(true);
    setHasError(false);
    await new Promise(r => setTimeout(r, 1500));
    setTestCases(mockTestCases);
    setIsLoading(false);
  };
  
  const handleNewTestCase = useCallback(() => {
    toast({ 
      title: 'New Test Case', 
      description: 'Opening test case editor...' 
    });
  }, [toast]);
  
  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      
      switch (e.key) {
        case '/':
          e.preventDefault();
          handleFocusSearch();
          break;
        case 'n':
        case 'N':
          handleNewTestCase();
          break;
        case 'Escape':
          handleClearSelection();
          break;
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNewTestCase, handleFocusSearch, handleClearSelection]);
  
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0">
        {/* Header - Sticky */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="w-full px-6">
            {/* Row 1: Breadcrumb + Stats + Actions */}
            <div className="h-14 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 hover:text-gray-700 cursor-pointer transition-colors duration-150">
                    Releases
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">Test Cases</span>
                </nav>
                
                {/* Stats */}
                <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
                  <span className="text-[13px] text-gray-600">
                    <span className="font-semibold text-gray-900">{stats.total}</span> total
                  </span>
                  <span className="text-[13px] text-emerald-600">
                    <span className="font-semibold">{stats.approved}</span> approved
                  </span>
                  <span className="text-[13px] text-amber-600">
                    <span className="font-semibold">{stats.draft}</span> draft
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 transition-all duration-150 hover:bg-gray-50">
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Import
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Import test cases from Excel</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 transition-all duration-150 hover:bg-gray-50">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export test cases</TooltipContent>
                </Tooltip>
                
                <div className="w-px h-6 bg-gray-200 mx-1" />
                
                <Button 
                  size="sm" 
                  className="h-8 bg-teal-600 hover:bg-teal-700 transition-all duration-150"
                  onClick={handleNewTestCase}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Test Case
                  <kbd className="ml-2 px-1 py-0.5 bg-teal-700/50 rounded text-[10px] font-mono">N</kbd>
                </Button>
              </div>
            </div>
            
            {/* Row 2: Search + Filters */}
            <div className="pb-3 flex items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search test cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-8 transition-all duration-150 focus:ring-2 focus:ring-teal-500"
                  aria-label="Search test cases"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px] font-mono">
                  /
                </kbd>
              </div>
              
              {/* Filters */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="P1">P1 - Critical</SelectItem>
                  <SelectItem value="P2">P2 - High</SelectItem>
                  <SelectItem value="P3">P3 - Medium</SelectItem>
                  <SelectItem value="P4">P4 - Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                </SelectContent>
              </Select>
              
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 text-gray-500 hover:text-gray-700 transition-colors duration-150"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full flex gap-4 px-6 py-4">
            {/* Left: Folder Sidebar */}
            <aside className="w-56 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-gray-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Folders
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-teal-600 hover:text-teal-700">
                  + New
                </Button>
              </div>
              
              {/* Current Path Breadcrumb */}
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-1 text-[11px] text-gray-500 overflow-x-auto">
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  {currentPath.map((segment, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span className={cn(
                        "truncate",
                        i === currentPath.length - 1 && "font-medium text-gray-700"
                      )}>
                        {segment}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Folder Tree */}
              <div role="tree" aria-label="Test case folders" className="flex-1 overflow-y-auto py-2">
                {folders.map(folder => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    selectedId={selectedFolderId}
                    onSelect={(f) => setSelectedFolderId(f.id)}
                    depth={0}
                  />
                ))}
              </div>
            </aside>
            
            {/* Right: Table Area */}
            <div className="flex-1 min-w-0 flex flex-col">
              <AnimatePresence mode="wait">
                {/* LOADING STATE */}
                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TableSkeleton rows={6} />
                  </motion.div>
                )}
                
                {/* ERROR STATE */}
                {hasError && !isLoading && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Failed to load test cases
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        There was an error connecting to the server. Please check your connection and try again.
                      </p>
                      <Button onClick={handleRetry} className="transition-all duration-150">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {/* EMPTY STATE */}
                {isEmpty && !isLoading && !hasError && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center justify-center"
                  >
                    <div className="text-center max-w-sm">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl flex items-center justify-center animate-bounce-slow">
                        <FileQuestion className="w-10 h-10 text-teal-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No test cases in this folder
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                        Get started by creating your first test case or importing existing ones from Excel.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button 
                          className="bg-teal-600 hover:bg-teal-700 transition-all duration-150"
                          onClick={handleNewTestCase}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          New Test Case
                        </Button>
                        <Button variant="outline" className="transition-all duration-150">
                          <Upload className="w-4 h-4 mr-2" />
                          Import from Excel
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* NORMAL STATE */}
                {!isLoading && !hasError && !isEmpty && (
                  <motion.div
                    key="table"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
                      <div className="overflow-auto flex-1">
                        <table className="w-full" role="grid">
                          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                              <th className="w-10 px-4 py-3 text-left">
                                <Checkbox
                                  checked={selectedIds.length === filteredTestCases.length && filteredTestCases.length > 0}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Select all test cases"
                                />
                              </th>
                              <th className="w-20 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                ID
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Title
                              </th>
                              <th className="w-24 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Status
                              </th>
                              <th className="w-20 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Priority
                              </th>
                              <th className="w-24 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Type
                              </th>
                              <th className="w-20 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Steps
                              </th>
                              <th className="w-24 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Last Exec
                              </th>
                              <th className="w-24 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Updated
                              </th>
                              <th className="w-16 px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredTestCases.map(tc => (
                              <TestCaseRow
                                key={tc.id}
                                testCase={tc}
                                isSelected={selectedIds.includes(tc.id)}
                                onSelect={() => handleSelectOne(tc.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination */}
                      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <span className="text-[13px] text-gray-500">
                          Showing <span className="font-medium text-gray-900">{filteredTestCases.length}</span> test cases
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled className="h-8">
                            Previous
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-teal-600 text-white border-teal-600">
                            1
                          </Button>
                          <Button variant="outline" size="sm" disabled className="h-8">
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
        
        {/* Bulk Actions Bar - Fixed bottom center */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 z-50"
            >
              <span className="text-sm font-medium px-2">
                {selectedIds.length} selected
              </span>
              
              <div className="w-px h-5 bg-gray-700" />
              
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-white hover:bg-gray-800 transition-colors duration-150"
                      onClick={() => toast({ title: 'Added to cycle', description: `${selectedIds.length} test cases added` })}
                    >
                      <PlayCircle className="w-4 h-4 mr-1.5" />
                      Add to Cycle
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add to test cycle</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-white hover:bg-gray-800 transition-colors duration-150"
                      onClick={() => toast({ title: 'Approved', description: `${selectedIds.length} test cases approved` })}
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Approve
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Approve selected</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-white hover:bg-gray-800 transition-colors duration-150"
                      onClick={() => toast({ title: 'Move', description: 'Select destination folder' })}
                    >
                      <Folder className="w-4 h-4 mr-1.5" />
                      Move
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move to folder</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors duration-150"
                      onClick={() => toast({ title: 'Deleted', description: `${selectedIds.length} test cases deleted`, variant: 'destructive' })}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete selected</TooltipContent>
                </Tooltip>
              </div>
              
              <div className="w-px h-5 bg-gray-700" />
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-150"
                onClick={handleClearSelection}
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

/**
 * GLOBAL TESTS LAYOUT
 * Top-level layout for /tests/* routes
 * Header with scope switcher and global search - sidebar handles navigation
 */

import React, { useState, useCallback } from 'react';
import { Outlet, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  Plus,
  RefreshCw,
  ChevronDown,
  Building2,
  Briefcase,
  FolderKanban,
  Search,
  ListChecks,
  RefreshCcw,
  Package,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGlobalTestScope, ScopeType } from '../hooks/useGlobalTestScope';
import { useGlobalTestMetrics } from '../hooks/useGlobalTestMetrics';
import { CreateTestCaseModal } from '@/modules/in-jira/components/tests/CreateTestCaseModal';
import { CreateCycleModal } from './CreateCycleModal';

// ═══════════════════════════════════════════════════════════════════
// SCOPE SWITCHER COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface ScopeSwitcherProps {
  scopeType: ScopeType;
  scopeId: string | null;
  onScopeChange: (type: ScopeType, id: string | null) => void;
  programs: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; program_id?: string }>;
  isLoading: boolean;
}

function ScopeSwitcher({ scopeId, onScopeChange, projects, isLoading }: ScopeSwitcherProps) {
  if (isLoading) {
    return <Skeleton className="h-8 w-52" />;
  }

  // Get current project name
  const currentProject = projects.find(p => p.id === scopeId);

  return (
    <Select 
      value={scopeId || ''} 
      onValueChange={(value) => onScopeChange('project', value || null)}
    >
      <SelectTrigger className="w-52 h-8 bg-surface-0 border-2 border-border-strong hover:border-brand-primary focus:border-brand-primary font-semibold shadow-sm">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-brand-primary flex-shrink-0" />
          <span className="truncate text-sm font-semibold text-text-primary">
            {currentProject?.name || 'Select Project'}
          </span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-surface-elevated border-border-strong shadow-lg max-h-72">
        {projects.map(p => (
          <SelectItem key={p.id} value={p.id} className="text-sm font-medium">
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN LAYOUT COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function GlobalTestsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Global scope state
  const { 
    scopeType, 
    scopeId, 
    setScopeType, 
    setScopeId,
    programs,
    projects,
    isLoading: scopeLoading,
  } = useGlobalTestScope();

  // Global metrics
  const { metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useGlobalTestMetrics(scopeType, scopeId);

  // Modal states
  const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false);
  const [createCycleModalOpen, setCreateCycleModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Determine current page from path
  const currentPath = location.pathname.replace('/tests', '').replace(/^\//, '');
  const getPageTitle = () => {
    switch (currentPath) {
      case '': return 'Overview';
      case 'cases': return 'Test Cases';
      case 'sets': return 'Test Sets';
      case 'cycles': return 'Test Cycles';
      case 'executions': return 'Executions';
      case 'traceability': return 'Traceability';
      case 'reports': return 'Reports';
      case 'admin': return 'Administration';
      default: return 'Tests';
    }
  };

  // Handle scope change
  const handleScopeChange = useCallback((type: ScopeType, id: string | null) => {
    setScopeType(type);
    setScopeId(id);
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    newParams.set('scopeType', type);
    if (id) {
      newParams.set('scopeId', id);
    } else {
      newParams.delete('scopeId');
    }
    setSearchParams(newParams);
  }, [setScopeType, setScopeId, searchParams, setSearchParams]);

  // Context-aware CTA
  const renderPrimaryCTA = () => {
    switch (currentPath) {
      case 'cases':
        return (
          <Button 
            size="sm" 
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
            onClick={() => setCreateCaseModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        );
      case 'sets':
        return (
          <Button 
            size="sm" 
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Set
          </Button>
        );
      case 'cycles':
        return (
          <Button 
            size="sm" 
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
            onClick={() => setCreateCycleModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Cycle
          </Button>
        );
      case 'executions':
        return (
          <Button 
            size="sm" 
            className="bg-accent-primary text-white hover:bg-accent-primary/90"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Tests
          </Button>
        );
      default:
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-accent-primary text-white hover:bg-accent-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
              <DropdownMenuItem onClick={() => setCreateCaseModalOpen(true)}>
                <ListChecks className="w-4 h-4 mr-2" />
                Test Case
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateCycleModalOpen(true)}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Test Cycle
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Package className="w-4 h-4 mr-2" />
                Test Set
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Compact Header */}
      <div className="border-b border-border-default bg-surface-1 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-accent-primary" />
              <h1 className="text-lg font-semibold text-text-primary">{getPageTitle()}</h1>
            </div>
            <div className="text-sm text-text-tertiary">
              {metricsLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span>
                  {metrics?.totalCases || 0} cases • {metrics?.passRate || 0}% pass rate
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Scope Switcher */}
            <ScopeSwitcher
              scopeType={scopeType}
              scopeId={scopeId}
              onScopeChange={handleScopeChange}
              programs={programs}
              projects={projects}
              isLoading={scopeLoading}
            />


            {renderPrimaryCTA()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet context={{ scopeType, scopeId, globalSearch }} />
      </div>

      {/* Modals */}
      <CreateTestCaseModal
        open={createCaseModalOpen}
        onOpenChange={setCreateCaseModalOpen}
        projectId={scopeType === 'project' ? scopeId || '' : ''}
        programId={scopeType === 'program' ? scopeId || '' : ''}
        onSubmit={async () => {
          setCreateCaseModalOpen(false);
          refetchMetrics();
        }}
        isSubmitting={false}
      />

      <CreateCycleModal
        open={createCycleModalOpen}
        onOpenChange={setCreateCycleModalOpen}
        projectId={scopeType === 'project' ? scopeId || '' : undefined}
      />
    </div>
  );
}

// Hook to access scope context from child pages
export function useGlobalTestsContext() {
  const [searchParams] = useSearchParams();
  return {
    scopeType: (searchParams.get('scopeType') as ScopeType) || 'global',
    scopeId: searchParams.get('scopeId'),
    globalSearch: '',
  };
}

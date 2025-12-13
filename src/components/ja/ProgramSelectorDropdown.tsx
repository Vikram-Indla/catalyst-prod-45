/**
 * Program Selector Dropdown - Revamped for Catalyst Menu
 * Shows: Program list with "Name (KEY)" format
 * Admin-only: Create Program, Manage Programs
 * Default program hidden from list
 * Clicking navigates to Epic Backlog
 */
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Settings, Folder, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { isDefaultProgram } from '@/lib/programKeyUtils';
import { cn } from '@/lib/utils';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProgramSelectorDropdown = React.memo(function ProgramSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProgramSelectorDropdownProps) {
  const navigate = useNavigate();
  const { programs, programsLoading, isAdmin } = useWorkspaceAccess();
  const { setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();
  const [search, setSearch] = useState('');

  // Filter programs: exclude Default, apply search
  const filteredPrograms = programs
    .filter(p => !isDefaultProgram(p))
    .filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
    );

  const handleSelect = useCallback((program: typeof programs[0]) => {
    if (!program.canAccess) return;
    
    setProgramId(program.id);
    setProgramName(program.name);
    setProjectId(null);
    setProjectName(null);
    // Navigate to Epic Backlog as default
    navigate(`/program/${program.id}/epic-backlog`);
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleCreate = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManage = useCallback(() => {
    navigate('/admin/portfolios');
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="w-72 bg-popover border border-border rounded-md shadow-md overflow-hidden z-[60]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground mb-2">Programs</p>
        <div className="relative">
          <Input
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pr-8"
            autoFocus
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Programs List */}
      <div className="max-h-[280px] overflow-y-auto">
        {programsLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {search ? 'No programs found' : 'No programs available'}
          </div>
        ) : (
          filteredPrograms.map((program) => {
            const hasValidKey = program.key && program.key.length === 3;
            return (
              <button
                key={program.id}
                onClick={() => handleSelect(program)}
                disabled={!program.canAccess}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors",
                  program.canAccess 
                    ? "hover:bg-muted cursor-pointer" 
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm text-foreground truncate">
                    {program.name}
                  </span>
                  {!program.canAccess && (
                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                {hasValidKey && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 font-mono uppercase">
                    ({program.key})
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="border-t border-border divide-y divide-border/50">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create Program
          </button>
          <button
            onClick={handleManage}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Manage Programs
          </button>
        </div>
      )}
    </div>
  );
});

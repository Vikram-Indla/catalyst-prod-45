import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Settings, Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystContext } from '@/contexts/CatalystContext';
import { getProgramLandingRoute } from '@/lib/workspaceContext';
import { Input } from '@/components/ui/input';

interface ProgramSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export const ProgramSelectorDropdown = React.memo(function ProgramSelectorDropdown({ 
  onClose, 
  onCreateClick 
}: ProgramSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { setProgramId, setProjectId, setProgramName, setProjectName } = useCatalystContext();

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-header'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (programs || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback((programId: string, programName: string) => {
    setProgramId(programId);
    setProgramName(programName);
    setProjectId(null);
    setProjectName(null);
    navigate(getProgramLandingRoute(programId));
    onClose();
  }, [navigate, onClose, setProgramId, setProgramName, setProjectId, setProjectName]);

  const handleCreateClick = useCallback(() => {
    onClose();
    onCreateClick?.();
  }, [onClose, onCreateClick]);

  const handleManageClick = useCallback(() => {
    navigate('/admin/portfolios');
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="w-80 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
      {/* HEADER */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          PROGRAMS
        </h3>
      </div>

      {/* SEARCH */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* PROGRAMS LIST */}
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search ? 'No programs found' : 'No programs available'}
          </div>
        ) : (
          filtered.map((program) => (
            <ProgramListItem
              key={program.id}
              id={program.id}
              name={program.name}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-border">
        <DropdownActionButton onClick={handleCreateClick} isPrimary>
          <Plus className="h-4 w-4 text-muted-foreground" />
          Create Program
        </DropdownActionButton>
        
        <DropdownActionButton onClick={handleManageClick}>
          <Settings className="h-4 w-4 text-muted-foreground" />
          Manage Programs
        </DropdownActionButton>
      </div>
    </div>
  );
});

// Memoized list item component
interface ProgramListItemProps {
  id: string;
  name: string;
  onSelect: (id: string, name: string) => void;
}

const ProgramListItem = React.memo(function ProgramListItem({ id, name, onSelect }: ProgramListItemProps) {
  const handleClick = useCallback(() => {
    onSelect(id, name);
  }, [id, name, onSelect]);

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-4 py-2 text-left transition-colors hover:bg-muted"
    >
      <Folder className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate">
          {name}
        </div>
      </div>
    </button>
  );
});

// Action button component
interface DropdownActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  isPrimary?: boolean;
}

const DropdownActionButton = React.memo(function DropdownActionButton({ 
  onClick, 
  children, 
  isPrimary 
}: DropdownActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
});

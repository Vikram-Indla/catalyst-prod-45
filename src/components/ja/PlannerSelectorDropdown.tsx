/**
 * Planner Selector Dropdown - Team-based navigation
 * Shows: Accessible teams for the user based on role/membership
 * Admin/Program Manager: See all teams + "All Teams" view
 * Regular users: Only see teams they're members of
 */
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Lock, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAccessibleTeams, useCanViewAllTeams } from '@/hooks/useAccessibleTeams';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PlannerSelectorDropdownProps {
  onClose: () => void;
}

// Team type colors for visual distinction
const teamTypeColors: Record<string, string> = {
  'AGILE': '#5c7c5c',
  'KANBAN': '#8b7355',
  'COP': '#c69c6d',
  'PROGRAM': '#2563eb',
  'PORTFOLIO': '#6366f1',
  'SOLUTION': '#0d9488',
  'PROCESS_FLOW': '#9333ea',
};

export const PlannerSelectorDropdown = React.memo(function PlannerSelectorDropdown({ 
  onClose 
}: PlannerSelectorDropdownProps) {
  const navigate = useNavigate();
  const { data: accessibleTeams = [], isLoading } = useAccessibleTeams();
  const { canViewAllTeams, isLoading: isRoleLoading } = useCanViewAllTeams();
  const [search, setSearch] = useState('');

  // Filter teams by search
  const filteredTeams = accessibleTeams.filter(team => 
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.short_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTeam = useCallback((teamId: string) => {
    // Navigate to planner with team pre-selected
    navigate(`/planner/boards?team=${teamId}`);
    onClose();
  }, [navigate, onClose]);

  const handleSelectAllTeams = useCallback(() => {
    navigate('/planner/boards');
    onClose();
  }, [navigate, onClose]);

  const loading = isLoading || isRoleLoading;

  return (
    <div className="w-72 bg-popover border border-border rounded-md shadow-md overflow-hidden z-[60]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Planner</p>
          {!canViewAllTeams && !loading && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="w-3 h-3" />
              My Teams
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pr-8"
            autoFocus
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Teams List */}
      <div className="max-h-[320px] overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {/* All Teams option for admin/program_manager */}
            {canViewAllTeams && (
              <button
                onClick={handleSelectAllTeams}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors hover:bg-muted cursor-pointer border-b border-border/50"
              >
                <LayoutGrid className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">All Teams</span>
              </button>
            )}

            {filteredTeams.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {search ? 'No teams found' : 'No teams available'}
              </div>
            ) : (
              filteredTeams.map((team) => {
                const teamColor = teamTypeColors[team.team_type] || '#5c7c5c';
                return (
                  <button
                    key={team.id}
                    onClick={() => handleSelectTeam(team.id)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors hover:bg-muted cursor-pointer"
                  >
                    {/* Team color indicator */}
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: teamColor }}
                    />
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">
                        {team.name}
                      </span>
                      {team.project_name && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {team.project_name}
                        </span>
                      )}
                    </div>
                    {team.short_name && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 font-mono uppercase">
                        {team.short_name}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
});

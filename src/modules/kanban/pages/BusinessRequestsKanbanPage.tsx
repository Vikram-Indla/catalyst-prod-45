// Main KanbanBoard component - BusinessRequestsKanbanPage

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanTicket, StatusId, GroupByOption, ScoringFilter, COLUMNS_CONFIG, PRIORITIES, GROUP_BY_OPTIONS, SCORING_OPTIONS, KANBAN_COLORS, SwimlaneGroup } from '../types';
import { useKanbanData, useTeamMembers } from '../hooks/useKanbanData';
import { KanbanColumn } from '../components/KanbanColumn';
import { Swimlane } from '../components/Swimlane';
import { QuickFilterAvatars, FilterDropdown, GroupByDropdown } from '../components/KanbanFilters';
import { KanbanIcons } from '../components/KanbanIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { IndustryHeaderToolbarV2 } from '@/shared/components/IndustryHeaderToolbarV2';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';

export default function BusinessRequestsKanbanPage() {
  const navigate = useNavigate();
  const { tickets, isLoading, updateStatus } = useKanbanData();
  const teamMembers = useTeamMembers();
  
  // Fetch departments from admin-configured data (not hardcoded)
  const { data: departments = [] } = useDepartments();
  
  // Build department ID → name map for grouping labels
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [scoringFilter, setScoringFilter] = useState<ScoringFilter>('all');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<StatusId[]>([]);
  const [compactMode, setCompactMode] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Record<string, boolean>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Handle card click - open main business drawer directly
  const handleCardClick = useCallback((ticket: KanbanTicket) => {
    if (ticket._dbId) {
      setSelectedCardId(ticket._dbId);
    }
  }, []);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!ticket.id.toLowerCase().includes(query) && !ticket.summary.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (selectedAssignees.length > 0 && !selectedAssignees.includes(ticket.assignee || '')) {
        return false;
      }
      if (scoringFilter === 'scored' && ticket.score === null) return false;
      if (scoringFilter === 'unscored' && ticket.score !== null) return false;
      return true;
    });
  }, [tickets, searchQuery, selectedAssignees, scoringFilter]);

  // Group tickets by column
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<StatusId, KanbanTicket[]> = {} as any;
    COLUMNS_CONFIG.forEach(col => {
      grouped[col.id] = filteredTickets.filter(t => t.status === col.id);
    });
    return grouped;
  }, [filteredTickets]);

  // Scoring stats
  const scoringStats = useMemo(() => ({
    total: tickets.length,
    scored: tickets.filter(t => t.score !== null).length,
    unscored: tickets.filter(t => t.score === null).length,
  }), [tickets]);

  // Group by swimlanes
  const groupedTickets = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, SwimlaneGroup> = {};
    
    filteredTickets.forEach(ticket => {
      let key = 'unassigned';
      let label = 'Unassigned';
      let color: string | undefined;
      
      if (groupBy === 'department') {
        // Use admin-configured departments from database
        if (ticket.department) {
          key = ticket.department;
          // Look up department name from admin data
          const deptName = departmentNameById.get(ticket.department);
          label = deptName || 'Unknown Department';
        } else {
          key = 'unassigned';
          label = 'Unassigned';
        }
        // Use brand color for departments
        color = KANBAN_COLORS.bronze;
      } else if (groupBy === 'assignee') {
        const m = teamMembers.find(tm => tm.id === ticket.assignee || tm.name === ticket.assignee);
        key = ticket.assignee || 'unassigned';
        label = m?.name || ticket.assignee || 'Unassigned';
        color = m?.color;
      } else if (groupBy === 'business_owner') {
        key = ticket.businessOwner || 'unassigned';
        label = ticket.businessOwner || 'Unassigned';
      }
      
      if (!groups[key]) {
        groups[key] = { label, color, tickets: [] };
      }
      groups[key].tickets.push(ticket);
    });
    
    // Sort groups: admin-defined order for departments, alphabetical for others, "Unassigned" last
    const sortedEntries = Object.entries(groups).sort((a, b) => {
      if (a[0] === 'unassigned') return 1;
      if (b[0] === 'unassigned') return -1;
      
      if (groupBy === 'department') {
        // Sort by department sort_order from admin
        const deptA = departments.find(d => d.id === a[0]);
        const deptB = departments.find(d => d.id === b[0]);
        const orderA = deptA?.sort_order ?? 999;
        const orderB = deptB?.sort_order ?? 999;
        return orderA - orderB;
      }
      
      return a[1].label.localeCompare(b[1].label);
    });
    
    return Object.fromEntries(sortedEntries);
  }, [filteredTickets, groupBy, teamMembers, departmentNameById, departments]);

  const handleDrop = useCallback((ticketId: string, newStatus: StatusId) => {
    updateStatus({ ticketId, newStatus });
  }, [updateStatus]);

  const toggleColumnCollapse = (columnId: StatusId) => {
    setCollapsedColumns(prev => prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId]);
  };

  const toggleSwimlaneExpand = (swimlaneId: string) => {
    setExpandedSwimlanes(prev => ({ ...prev, [swimlaneId]: !prev[swimlaneId] }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedAssignees([]);
    setScoringFilter('all');
  };

  const hasActiveFilters = searchQuery || selectedAssignees.length > 0 || scoringFilter !== 'all';

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col overflow-hidden"
      style={{ 
        height: 'calc(100vh - 48px)', // Subtract global header
        backgroundColor: 'var(--bg)' 
      }}
    >
      {/* Unified Header Toolbar */}
      <IndustryHeaderToolbarV2
        title="Product Kanban"
        countText={`${filteredTickets.length}`}
        activeView="board"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        avatars={teamMembers.slice(0, 6).map(m => ({
          id: m.id,
          name: m.name,
          initials: m.name.split(' ').map(n => n[0]).join('').substring(0, 2),
          color: m.color
        }))}
        selectedAvatarIds={selectedAssignees}
        onToggleAvatar={(id) => setSelectedAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])}
        onSelectAllAvatars={() => setSelectedAssignees([])}
        scoringFilter={scoringFilter}
        onScoringFilterChange={setScoringFilter}
        onViewSettings={() => setCompactMode(!compactMode)}
        onExport={() => {
          // Export CSV
          const headers = ['ID', 'Summary', 'Status', 'Score', 'Assignee'];
          const csvRows = [headers.join(',')];
          filteredTickets.forEach(t => {
            csvRows.push([t.id, `"${t.summary.replace(/"/g, '""')}"`, t.status, t.score ?? '', t.assignee ?? ''].join(','));
          });
          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'business-requests.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      {/* Board Container - fills remaining viewport with proper flex rules */}
      <div 
        className="flex-1 flex flex-col overflow-hidden px-4 pt-3"
        style={{ 
          backgroundColor: 'var(--surface-1)',
          minHeight: 0,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {groupBy === 'none' ? (
          <div 
            className="flex gap-3 flex-1 overflow-x-auto overflow-y-hidden"
            style={{ minHeight: 0 }}
          >
            {COLUMNS_CONFIG.map(column => (
              <KanbanColumn 
                key={column.id} 
                column={column.id} 
                tickets={ticketsByColumn[column.id] || []} 
                onDrop={handleDrop} 
                onCardClick={handleCardClick} 
                compactMode={compactMode} 
                collapsed={collapsedColumns.includes(column.id)} 
                onToggleCollapse={() => toggleColumnCollapse(column.id)} 
                teamMembers={teamMembers} 
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {Object.entries(groupedTickets || {}).map(([key, group]) => (
              <Swimlane 
                key={key} 
                label={group.label} 
                color={group.color} 
                icon={group.icon} 
                tickets={group.tickets} 
                count={group.tickets.length} 
                onDrop={handleDrop} 
                onCardClick={handleCardClick} 
                compactMode={compactMode} 
                collapsedColumns={collapsedColumns} 
                onToggleColumnCollapse={toggleColumnCollapse} 
                isExpanded={expandedSwimlanes[key] !== false} 
                onToggleExpand={() => toggleSwimlaneExpand(key)} 
                teamMembers={teamMembers} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        isOpen={!!selectedCardId}
        onClose={() => setSelectedCardId(null)}
        requestId={selectedCardId || undefined}
      />

      {/* Create Business Request Modal */}
      <CreateBusinessRequestModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}

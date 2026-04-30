/**
 * Business Requests Kanban Page
 * Dynamic columns built from demand_process_steps table
 * Shares state with List view via useIndustryViewStore
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanTicket, GroupByOption, KANBAN_COLORS, SwimlaneGroup, DynamicColumnConfig } from '../types';
import { useKanbanData, useTeamMembers } from '../hooks/useKanbanData';
import { useKanbanColumns } from '../hooks/useProcessSteps';
import { KanbanColumn } from '../components/KanbanColumn';
import { Swimlane } from '../components/Swimlane';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { IndustryHeaderToolbarV2 } from '@/shared/components/IndustryHeaderToolbarV2';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
// jira-compare cycle 5 — BusinessRequestDetailModal replaced by CatalystViewBusinessRequestV2.
// Legacy import retained as commented sunset breadcrumb.
// import { BusinessRequestDetailModal } from '@/components/business-requests/BusinessRequestDetailModal';
import CatalystViewBusinessRequestV2 from '@/components/catalyst-detail-views/business-request/CatalystViewBusinessRequest.v2';
import { PageChrome } from '@/components/layout/PageChrome';
import { useIndustryViewStore } from '@/stores/useIndustryViewStore';

export default function CatalystDemandKanban() {
  const navigate = useNavigate();
  
  // Shared state from store
  const { 
    searchQuery, 
    setSearchQuery, 
    scoringFilter, 
    setScoringFilter
  } = useIndustryViewStore();
  
  // Fetch dynamic columns from demand_process_steps
  const { columns, isLoading: columnsLoading } = useKanbanColumns();
  
  const { tickets, isLoading: ticketsLoading, updateStatus } = useKanbanData();
  const teamMembers = useTeamMembers();
  
  const isLoading = columnsLoading || ticketsLoading;
  
  // Fetch departments from admin-configured data (not hardcoded)
  const { data: departments = [] } = useDepartments();
  
  // Build department ID → name map for grouping labels
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);
  
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [densityMode, setDensityMode] = useState<'compact' | 'regular' | 'relaxed'>('regular');
  const compactMode = densityMode === 'compact';
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Record<string, boolean>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Handle card click - open main business drawer directly
  const handleCardClick = useCallback((ticket: KanbanTicket) => {
    if (ticket._dbId) {
      setSelectedCardId(ticket._dbId);
    }
  }, []);

  // Filter tickets using shared state
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!ticket.id.toLowerCase().includes(query) && !ticket.summary.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Scoring filter
      if (scoringFilter === 'scored' && (ticket.score === null || ticket.score === 0)) return false;
      if (scoringFilter === 'unscored' && (ticket.score !== null && ticket.score > 0)) return false;
      return true;
    });
  }, [tickets, searchQuery, scoringFilter]);

  // Group tickets by column (dynamic)
  const ticketsByColumn = useMemo(() => {
    const grouped: Record<string, KanbanTicket[]> = {};
    columns.forEach(col => {
      grouped[col.id] = filteredTickets.filter(t => t.status === col.id);
    });
    return grouped;
  }, [filteredTickets, columns]);

  // Group by swimlanes
  const groupedTickets = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, SwimlaneGroup> = {};
    
    filteredTickets.forEach(ticket => {
      let key = 'unassigned';
      let label = 'Unassigned';
      let color: string | undefined;
      
      if (groupBy === 'department') {
        if (ticket.department) {
          key = ticket.department;
          const deptName = departmentNameById.get(ticket.department);
          label = deptName || 'Unknown Department';
        } else {
          key = 'unassigned';
          label = 'Unassigned';
        }
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
    
    const sortedEntries = Object.entries(groups).sort((a, b) => {
      if (a[0] === 'unassigned') return 1;
      if (b[0] === 'unassigned') return -1;
      
      if (groupBy === 'department') {
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

  const handleDrop = useCallback((ticketId: string, newStatus: string) => {
    updateStatus({ ticketId, newStatus });
  }, [updateStatus]);

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => prev.includes(columnId) ? prev.filter(c => c !== columnId) : [...prev, columnId]);
  };

  const toggleSwimlaneExpand = (swimlaneId: string) => {
    setExpandedSwimlanes(prev => ({ ...prev, [swimlaneId]: !prev[swimlaneId] }));
  };

  // Toolbar content
  const toolbarElement = (
    <IndustryHeaderToolbarV2
      title="Product Kanban"
      countText={`${filteredTickets.length}`}
      activeView="board"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      scoringFilter={scoringFilter}
      onScoringFilterChange={setScoringFilter}
      densityMode={densityMode}
      onDensityModeChange={setDensityMode}
      onExport={() => {
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
      onCreateRequest={() => setCreateModalOpen(true)}
    />
  );

  if (isLoading) {
    return (
      <PageChrome toolbar={toolbarElement}>
        <div className="p-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome toolbar={toolbarElement}>
      {/* Board Container */}
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
            {columns.map(column => (
              <KanbanColumn 
                key={column.id} 
                column={column.id}
                columnConfig={column}
                tickets={ticketsByColumn[column.id] || []} 
                onDrop={handleDrop} 
                onCardClick={handleCardClick} 
                compactMode={compactMode} 
                collapsed={collapsedColumns.includes(column.id)} 
                onToggleCollapse={() => toggleColumnCollapse(column.id)} 
                teamMembers={teamMembers}
                onAddRequest={() => setCreateModalOpen(true)}
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
                columns={columns}
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

      {/* Business Request Detail Modal */}
      <CatalystViewBusinessRequestV2
        isOpen={!!selectedCardId}
        onClose={() => setSelectedCardId(null)}
        requestId={selectedCardId || null}
      />

      {/* Create Business Request Modal */}
      <CreateBusinessRequestModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </PageChrome>
  );
}

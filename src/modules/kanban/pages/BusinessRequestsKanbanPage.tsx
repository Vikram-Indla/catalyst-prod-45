// Main KanbanBoard component - BusinessRequestsKanbanPage

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanTicket, StatusId, GroupByOption, ScoringFilter, COLUMNS_CONFIG, PRIORITIES, GROUP_BY_OPTIONS, SCORING_OPTIONS, KANBAN_COLORS, SwimlaneGroup } from '../types';
import { useKanbanData, useTeamMembers } from '../hooks/useKanbanData';
import { KanbanColumn } from '../components/KanbanColumn';
import { Swimlane } from '../components/Swimlane';
import { QuickFilterAvatars, FilterDropdown, GroupByDropdown } from '../components/KanbanFilters';
import { CardDetailPanel } from '../components/CardDetailPanel';
import { KanbanIcons } from '../components/KanbanIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { IndustryHeaderToolbarV2 } from '@/shared/components/IndustryHeaderToolbarV2';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';

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
  const [selectedCard, setSelectedCard] = useState<KanbanTicket | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<StatusId[]>([]);
  const [compactMode, setCompactMode] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Record<string, boolean>>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
    <div style={{ minHeight: '100vh', backgroundColor: KANBAN_COLORS.bgPage }}>
      {/* Row 1 - Title Row (44px) - Title + Count only, no border */}
      <div style={{ 
        height: '44px', 
        padding: '0 24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        backgroundColor: KANBAN_COLORS.bgHeader 
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: KANBAN_COLORS.textPrimary, margin: 0 }}>Business Requests</h1>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 500, 
          color: KANBAN_COLORS.textMuted, 
          backgroundColor: 'hsl(var(--muted))', 
          padding: '2px 8px', 
          borderRadius: '10px' 
        }}>{filteredTickets.length}</span>
      </div>

      {/* Row 2 - Toolbar Row (52px) - All controls, no border */}
      <div style={{ 
        height: '52px', 
        padding: '0 24px', 
        display: 'grid', 
        gridTemplateColumns: 'auto 1fr auto', 
        alignItems: 'center', 
        gap: '12px',
        backgroundColor: KANBAN_COLORS.bgHeader,
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Left - View toggle - show only switch-to-other-view button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <IndustryViewSwitchButton currentView="kanban" />
        </div>

        {/* Center - Search */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '0 12px', 
            height: '32px',
            border: `1px solid ${KANBAN_COLORS.borderDefault}`, 
            borderRadius: '6px', 
            backgroundColor: KANBAN_COLORS.bgCard, 
            width: '100%',
            maxWidth: '320px' 
          }}>
            <KanbanIcons.Search />
            <input 
              type="text" 
              placeholder="Search requests..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              style={{ border: 'none', outline: 'none', fontSize: '13px', flex: 1, backgroundColor: 'transparent', color: KANBAN_COLORS.textPrimary }} 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: KANBAN_COLORS.textMuted }}>
                <KanbanIcons.X />
              </button>
            )}
          </div>
        </div>

        {/* Right - Filters + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QuickFilterAvatars 
            members={teamMembers.slice(0, 6)} 
            selected={selectedAssignees} 
            onToggle={(id) => setSelectedAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])} 
          />
          <div style={{ width: '1px', height: '20px', backgroundColor: KANBAN_COLORS.borderLight }} />
          <FilterDropdown label="" options={SCORING_OPTIONS} singleSelect value={scoringFilter} onChange={(v) => setScoringFilter(v as ScoringFilter)} icon="📊" tooltip="Scoring" />
          <GroupByDropdown value={groupBy} onChange={setGroupBy} iconOnly />
          {hasActiveFilters && (
            <button onClick={clearAllFilters} title="Clear Filters" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '6px', backgroundColor: `${KANBAN_COLORS.danger}10`, color: KANBAN_COLORS.danger, cursor: 'pointer' }}>
              <KanbanIcons.X />
            </button>
          )}
          <div style={{ width: '1px', height: '20px', backgroundColor: KANBAN_COLORS.borderLight }} />
          <button 
            onClick={() => setCompactMode(!compactMode)} 
            title={compactMode ? 'Standard View' : 'Compact View'} 
            style={{ 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${compactMode ? KANBAN_COLORS.gold : KANBAN_COLORS.borderDefault}`, 
              borderRadius: '6px', 
              backgroundColor: compactMode ? KANBAN_COLORS.bgSelected : KANBAN_COLORS.bgCard, 
              color: compactMode ? KANBAN_COLORS.gold : KANBAN_COLORS.textMuted, 
              cursor: 'pointer' 
            }}
          >
            {compactMode ? '⊡' : '⊟'}
          </button>
          <button 
            onClick={() => setCreateModalOpen(true)} 
            title="Create Request" 
            style={{ 
              height: '32px',
              padding: '0 12px', 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none', 
              borderRadius: '6px', 
              backgroundColor: KANBAN_COLORS.gold, 
              color: 'white', 
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            <KanbanIcons.Plus />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Board */}
      <div style={{ padding: '20px 28px' }}>
        {groupBy === 'none' ? (
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', minWidth: 'max-content', paddingBottom: '20px' }}>
            {COLUMNS_CONFIG.map(column => (
              <KanbanColumn key={column.id} column={column.id} tickets={ticketsByColumn[column.id] || []} onDrop={handleDrop} onCardClick={setSelectedCard} compactMode={compactMode} collapsed={collapsedColumns.includes(column.id)} onToggleCollapse={() => toggleColumnCollapse(column.id)} teamMembers={teamMembers} />
            ))}
          </div>
        ) : (
          <div>
            {Object.entries(groupedTickets || {}).map(([key, group]) => (
              <Swimlane key={key} label={group.label} color={group.color} icon={group.icon} tickets={group.tickets} count={group.tickets.length} onDrop={handleDrop} onCardClick={setSelectedCard} compactMode={compactMode} collapsedColumns={collapsedColumns} onToggleColumnCollapse={toggleColumnCollapse} isExpanded={expandedSwimlanes[key] !== false} onToggleExpand={() => toggleSwimlaneExpand(key)} teamMembers={teamMembers} />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedCard && (
        <>
          <div onClick={() => setSelectedCard(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 150 }} />
          <CardDetailPanel ticket={selectedCard} onClose={() => setSelectedCard(null)} teamMembers={teamMembers} />
        </>
      )}

      {/* Create Business Request Modal */}
      <CreateBusinessRequestModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}

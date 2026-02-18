import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanToolbar } from '@/components/producthub/kanban/KanbanToolbar';
import { KanbanFilterBar } from '@/components/producthub/kanban/KanbanFilterBar';
import { KanbanBoard } from '@/components/producthub/kanban/KanbanBoard';
import { InitiativeDetailPanel } from '@/components/producthub/timeline/InitiativeDetailPanel';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import type { Initiative } from '@/types/initiative';
import type { FilterChip } from '@/types/producthub/initiative';
import type { TimelineInitiative } from '@/types/producthub/initiative';

/** Adapt Initiative → TimelineInitiative for the detail panel */
function toTimelineInitiative(i: Initiative): TimelineInitiative {
  return {
    id: i.id,
    initiative_key: i.initiative_key,
    title: i.title,
    description: i.description,
    status: i.status as any,
    assignee_id: i.assignee_id,
    assignee_name: i.assignee_name,
    business_owner_id: i.business_owner_id,
    reporter_id: i.reporter_id,
    department_id: i.department_id,
    department_name: i.department_name,
    department_code: null,
    target_quarter: i.target_quarter,
    business_ask_date: i.business_ask_date,
    kickoff_date: i.kickoff_date,
    target_complete: i.target_complete,
    progress: i.progress,
    sort_order: i.sort_order,
    risk_count: i.risk_count,
    is_archived: i.is_archived,
    score_strategic_alignment: i.score_strategic_alignment,
    score_business_impact: i.score_business_impact,
    score_time_urgency: i.score_time_urgency,
    score_resource_feasibility: i.score_resource_feasibility,
    computed_score: i.computed_score,
    created_at: i.created_at,
    updated_at: i.updated_at,
  };
}

export default function KanbanPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useInitiativesMock();
  const initiatives = data?.data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [sortBy, setSortBy] = useState('score');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter logic
  const filtered = useMemo(() => {
    let result = initiatives;

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.initiative_key.toLowerCase().includes(q) ||
          i.department_name?.toLowerCase().includes(q)
      );
    }

    // Chip filters
    switch (activeFilter) {
      case 'high':
        result = result.filter(i => (i.computed_score ?? 0) >= 4.0);
        break;
      case 'unscored':
        result = result.filter(i => i.computed_score === null);
        break;
      case 'overdue':
        result = result.filter(i => {
          if (!i.target_complete) return false;
          return new Date(i.target_complete) < new Date() && i.progress < 100;
        });
        break;
      case 'starred':
        result = result.filter(i => i.is_favorited);
        break;
      case 'quarter': {
        const now = new Date();
        const q = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
        result = result.filter(i => i.target_quarter === q);
        break;
      }
    }

    return result;
  }, [initiatives, searchTerm, activeFilter]);

  const selectedInitiative = selectedId ? initiatives.find(i => i.id === selectedId) : null;

  const handleCardClick = useCallback((initiative: Initiative) => {
    setSelectedId(initiative.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fb]">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 bg-white border-b border-zinc-200">
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
          <span className="hover:text-zinc-600 cursor-pointer" onClick={() => navigate('/producthub')}>ProductHub</span>
          <span>›</span>
          <span className="hover:text-zinc-600 cursor-pointer" onClick={() => navigate('/producthub/backlog')}>Initiatives</span>
          <span>›</span>
          <span className="text-zinc-600">Kanban</span>
        </nav>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-zinc-900">Product Kanban</h1>
          <span className="text-xs font-semibold bg-zinc-100 text-zinc-500 rounded-full px-2.5 py-0.5 tabular-nums">
            {filtered.length}
          </span>
        </div>
        <p className="text-sm text-zinc-500 mt-0.5">Drag initiatives across status columns</p>
      </div>

      {/* Toolbar */}
      <KanbanToolbar
        sortBy={sortBy}
        onSortChange={setSortBy}
        onNewInitiative={() => {}}
      />

      {/* Filter Bar */}
      <KanbanFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Board */}
      <KanbanBoard
        initiatives={filtered}
        sortBy={sortBy}
        onCardClick={handleCardClick}
      />

      {/* Detail Panel */}
      {selectedInitiative && (
        <InitiativeDetailPanel
          initiative={toTimelineInitiative(selectedInitiative)}
          initiatives={filtered.map(toTimelineInitiative)}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

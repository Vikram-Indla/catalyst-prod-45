import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { KanbanToolbar } from '@/components/producthub/kanban/KanbanToolbar';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { KanbanFilterBar } from '@/components/producthub/kanban/KanbanFilterBar';
import { KanbanBoard } from '@/components/producthub/kanban/KanbanBoard';
import { InitiativeDetailPanel } from '@/components/producthub/timeline/InitiativeDetailPanel';
import { useMDTBacklog } from '@/hooks/useMDTBacklog';
import { supabase } from '@/integrations/supabase/client';
import type { Initiative } from '@/types/initiative';
import type { FilterChip } from '@/types/producthub/initiative';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import type { SwimlaneField } from '@/components/producthub/kanban/KanbanColumn';
import '@/styles/product-kanban.css';

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
    reporter_name: i.reporter_name,
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
    initiative_type_key: i.initiative_type_key ?? null,
    initiative_type_label: i.initiative_type_label ?? null,
    initiative_type_color_hex: i.initiative_type_color_hex ?? null,
    health_status: i.health_status ?? null,
    business_value: i.business_value ?? null,
    ea_review: (i as any).ea_review ?? null,
    priority: (i as any).priority ?? null,
    on_roadmap: i.on_roadmap ?? false,
  };
}

export default function KanbanPage() {
  const { data, isLoading } = useMDTBacklog();
  const initiatives = data?.data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [sortBy, setSortBy] = useState('score');
  const [swimlane, setSwimlane] = useState<SwimlaneField>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const filtered = useMemo(() => {
    let result = initiatives;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        i => i.title.toLowerCase().includes(q) || i.initiative_key.toLowerCase().includes(q) || i.department_name?.toLowerCase().includes(q)
      );
    }
    switch (activeFilter) {
      case 'my':
        if (currentUserId) result = result.filter(i => i.assignee_id === currentUserId);
        break;
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
  }, [initiatives, searchTerm, activeFilter, currentUserId]);

  const selectedInitiative = useMemo(() => selectedId ? initiatives.find(i => i.id === selectedId) : null, [selectedId, initiatives]);

  const memoizedTimelineInitiatives = useMemo(() => filtered.map(toTimelineInitiative), [filtered]);

  const handleCardClick = useCallback((initiative: Initiative) => {
    setSelectedId(initiative.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="pk-page" data-module="product-kanban">
        <CatalystPageHeader title="Product Kanban" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--pk-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pk-page" data-module="product-kanban">
      <div className="pk-page-header">
        <h1 className="pk-page-title">Product Kanban</h1>
        <p className="pk-page-subtitle">Drag initiatives between status columns to update workflow</p>
      </div>

      <KanbanToolbar
        sortBy={sortBy}
        onSortChange={setSortBy}
        swimlane={swimlane}
        onSwimlaneChange={setSwimlane}
        onNewInitiative={() => setShowCreateDrawer(true)}
        initiatives={filtered}
      />

      <KanbanFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <KanbanBoard
        initiatives={filtered}
        sortBy={sortBy}
        swimlane={swimlane}
        onCardClick={handleCardClick}
        totalCount={initiatives.length}
      />

      {selectedInitiative && (
        <InitiativeDetailPanel
          initiative={toTimelineInitiative(selectedInitiative)}
          initiatives={memoizedTimelineInitiatives}
          onClose={handleCloseDetail}
        />
      )}

      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
}

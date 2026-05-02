/**
 * AllWorkToolbar — Jira-parity refinement bar for the All Work surface.
 *
 * jira-compare catalog items 3-9 (2026-05-02). One row hosting:
 *   3. Ask Caty (Catalyst AI entry — replaces Jira's "Ask AI" label)
 *   4. Search work — @atlaskit/textfield, isCompact
 *   5. Avatar group filter — @atlaskit/avatar-group with overflow popover
 *   6. Filter button — @atlaskit/popup with assignee / type / status facets
 *   7. Saved filters — @atlaskit/dropdown-menu
 *   8. View toggle (list ↔ split) — @atlaskit/icon-button group
 *   9. Meatball — @atlaskit/dropdown-menu
 *
 * Lane A canonical (Jira BAU project, testid namespace
 * `issue-navigator.ui.refinement-bar.*`):
 *   container: flex · gap 8 · pad 8 12 · border-bottom 1px DFE1E6
 *
 * Filter / Saved filters menu items are stubs; their facet payloads
 * forward to a single onFilterChange callback so the parent owns
 * the JQL-equivalent state. View toggle is a controlled prop.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import Button, { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Popup from '@atlaskit/popup';
import { toast } from 'sonner';
import {
  EditorMoreIcon,
  ShareIcon as MeatballAlt,
} from '@/components/layout/ProjectHeaderChipIcons';
import { Search as SearchGlyph, SlidersHorizontal, Star, ChevronDown, LayoutList, Columns3, Sparkles } from 'lucide-react';

export type AllWorkView = 'split' | 'list';

interface Props {
  projectKey: string;
  query: string;
  onQueryChange: (q: string) => void;
  view: AllWorkView;
  onViewChange: (v: AllWorkView) => void;
  /** Optional: parent owns filter chip state. */
  activeFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
  /** Avatar group selected user IDs (filter by assignee). */
  selectedAssignees?: string[];
  onAssigneesChange?: (ids: string[]) => void;
}

interface Member {
  id: string;
  name: string;
  src?: string | null;
}

const SearchIcon = () => <SearchGlyph size={14} />;
const FilterIcon = () => <SlidersHorizontal size={14} />;
const StarIcon = () => <Star size={14} />;
const ChevronIcon = () => <ChevronDown size={12} />;
const ListIcon = () => <LayoutList size={16} />;
const SplitIcon = () => <Columns3 size={16} />;
const SparkIcon = () => <Sparkles size={14} />;

export function AllWorkToolbar({
  projectKey,
  query,
  onQueryChange,
  view,
  onViewChange,
  activeFilters = [],
  onFilterChange,
  selectedAssignees = [],
  onAssigneesChange,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);

  /* Avatar group seed — pull project members. Mirrors the pattern in
     BacklogPage.atlaskit.tsx ProjectChromeBand chrome-band-members. */
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['allwork-toolbar-members', projectKey],
    enabled: !!projectKey,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: project } = await (supabase as any)
        .from('projects').select('id').eq('key', projectKey).maybeSingle();
      if (!project?.id) return [];
      const { data } = await (supabase as any)
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .limit(20);
      return ((data ?? []) as any[]).map(r => ({
        id: r.profiles?.id ?? r.user_id,
        name: r.profiles?.full_name ?? 'Member',
        src: r.profiles?.avatar_url ?? null,
      }));
    },
  });

  const avatarData = members.map(m => ({
    key: m.id,
    name: m.name,
    src: m.src ?? undefined,
  }));

  return (
    <div
      data-testid="catalyst-allwork-toolbar.bar"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        background: 'transparent',
        flexShrink: 0,
        fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* 3. Ask Caty entry — replaces Jira's "Ask AI" with Catalyst's
          AskCatalystPill semantics. Stubs to a toast for now; real
          integration mounts the AskCatalystPill / Caty chat widget. */}
      <Button
        appearance="subtle"
        spacing="compact"
        iconBefore={SparkIcon}
        onClick={() => toast('Ask Caty — coming soon')}
        testId="catalyst-allwork-toolbar.ask-caty"
      >
        Ask Caty
      </Button>

      {/* 4. Search */}
      <div style={{ flex: '0 1 220px', minWidth: 140 }}>
        <Textfield
          isCompact
          appearance="standard"
          placeholder="Search work"
          value={query}
          onChange={(e) => onQueryChange((e.target as HTMLInputElement).value)}
          elemBeforeInput={<span style={{ paddingLeft: 8, color: 'var(--ds-text-subtle, #505258)' }}><SearchIcon /></span>}
          testId="catalyst-allwork-toolbar.search"
        />
      </div>

      {/* 5. Avatar group filter */}
      {avatarData.length > 0 && (
        <AvatarGroup
          appearance="stack"
          size="small"
          maxCount={4}
          data={avatarData}
          onAvatarClick={(_, member) => {
            if (!onAssigneesChange) return;
            const id = (member as any).key as string;
            const next = selectedAssignees.includes(id)
              ? selectedAssignees.filter(x => x !== id)
              : [...selectedAssignees, id];
            onAssigneesChange(next);
          }}
          testId="catalyst-allwork-toolbar.assignee-avatars"
        />
      )}

      {/* 6. Filter facet popover */}
      <Popup
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        placement="bottom-start"
        content={() => (
          <div style={{ minWidth: 240, padding: '8px 0' }}>
            <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 500, color: 'var(--ds-text-subtle, #505258)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Filter by
            </div>
            {['Type', 'Status', 'Priority', 'Fix versions', 'Labels'].map(facet => (
              <button key={facet}
                onClick={() => {
                  const next = activeFilters.includes(facet)
                    ? activeFilters.filter(f => f !== facet)
                    : [...activeFilters, facet];
                  onFilterChange?.(next);
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 16px', border: 'none',
                  background: activeFilters.includes(facet) ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                  fontSize: 13, color: 'var(--ds-text, #292A2E)', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!activeFilters.includes(facet)) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                onMouseLeave={e => { if (!activeFilters.includes(facet)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >{facet}</button>
            ))}
          </div>
        )}
        trigger={(triggerProps) => (
          <Button
            {...triggerProps}
            appearance="default"
            spacing="compact"
            iconBefore={FilterIcon}
            onClick={() => setFilterOpen(o => !o)}
            testId="catalyst-allwork-toolbar.filter"
          >
            Filter{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
          </Button>
        )}
      />

      <span style={{ flex: 1 }} />

      {/* 7. Saved filters — REMOVED 2026-05-02 per Vikram directive
          ("saved filters is not required"). */}

      {/* 8. View toggle: list / split */}
      <div style={{ display: 'inline-flex', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 4, overflow: 'hidden' }}>
        <IconButton
          icon={ListIcon}
          label="List view"
          appearance={view === 'list' ? 'primary' : 'subtle'}
          onClick={() => onViewChange('list')}
          testId="catalyst-allwork-toolbar.view-list"
        />
        <IconButton
          icon={SplitIcon}
          label="Split view"
          appearance={view === 'split' ? 'primary' : 'subtle'}
          onClick={() => onViewChange('split')}
          testId="catalyst-allwork-toolbar.view-split"
        />
      </div>

      {/* 9. Meatball */}
      <DropdownMenu
        trigger={({ triggerRef, ...props }) => (
          <IconButton
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...props}
            icon={EditorMoreIcon}
            label="More toolbar actions"
            appearance="subtle"
            testId="catalyst-allwork-toolbar.meatball"
          />
        )}
      >
        <DropdownItemGroup>
          <DropdownItem onClick={() => toast('Export — coming soon')}>Export</DropdownItem>
          <DropdownItem onClick={() => toast('Share view — coming soon')}>Share view</DropdownItem>
          <DropdownItem onClick={() => toast('Refresh data')}>Refresh</DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>
    </div>
  );
}

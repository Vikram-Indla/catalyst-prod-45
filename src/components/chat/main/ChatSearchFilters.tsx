/**
 * ChatSearchFilters — filter chips row for the chat message search panel.
 *
 * Four chips: Person (from:), Project (in: project channel), Ticket (key:),
 * Type (conversation kind). Reuses the global-search FilterDropdown pattern
 * (createPortal to document.body, data-filter-portal — @atlaskit/popup has
 * an empty-portal bug on overflow:hidden surfaces, CLAUDE.md 2026-05-08).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FilterDropdown, type FilterOption } from '@/components/global-search/FilterDropdown';
import PersonIcon from '@atlaskit/icon/glyph/person';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import IssuesIcon from '@atlaskit/icon/glyph/issues';
import CommentIcon from '@atlaskit/icon/glyph/comment';

export interface ChatSearchFilterState {
  authorIds: string[];
  projectKeys: string[];
  issueKeys: string[];
  kinds: string[];
}

export const EMPTY_CHAT_SEARCH_FILTERS: ChatSearchFilterState = {
  authorIds: [],
  projectKeys: [],
  issueKeys: [],
  kinds: [],
};

export function hasActiveFilters(f: ChatSearchFilterState): boolean {
  return (
    f.authorIds.length > 0 ||
    f.projectKeys.length > 0 ||
    f.issueKeys.length > 0 ||
    f.kinds.length > 0
  );
}

const KIND_OPTIONS: FilterOption[] = [
  { id: 'channel', name: 'Channel' },
  { id: 'dm', name: 'Direct message' },
  { id: 'group_dm', name: 'Group message' },
  { id: 'ticket', name: 'Ticket' },
];

function usePersonOptions(): FilterOption[] {
  const { data } = useQuery<FilterOption[]>({
    queryKey: ['chat', 'search-filter', 'people'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name')
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        avatarSrc: p.avatar_url || undefined,
      }));
    },
  });
  return data ?? [];
}

function useProjectOptions(): FilterOption[] {
  const { data } = useQuery<FilterOption[]>({
    queryKey: ['chat', 'search-filter', 'projects'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chat_conversations')
        .select('project_key, title')
        .eq('kind', 'channel')
        .not('project_key', 'is', null)
        .limit(200);
      if (error) throw error;
      const byKey = new Map<string, FilterOption>();
      (data ?? []).forEach((c: any) => {
        if (!byKey.has(c.project_key)) {
          byKey.set(c.project_key, { id: c.project_key, name: c.project_key, tag: c.title || undefined });
        }
      });
      return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
  return data ?? [];
}

function useTicketOptions(): FilterOption[] {
  const { data } = useQuery<FilterOption[]>({
    queryKey: ['chat', 'search-filter', 'tickets'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chat_message_issue_refs')
        .select('issue_key')
        .limit(500);
      if (error) throw error;
      const seen = new Set<string>();
      const out: FilterOption[] = [];
      (data ?? []).forEach((r: any) => {
        if (!seen.has(r.issue_key)) {
          seen.add(r.issue_key);
          out.push({ id: r.issue_key, name: r.issue_key });
        }
      });
      return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    },
  });
  return data ?? [];
}

export interface ChatSearchFiltersProps {
  filters: ChatSearchFilterState;
  onChange: (next: ChatSearchFilterState) => void;
}

export function ChatSearchFilters({ filters, onChange }: ChatSearchFiltersProps) {
  const people = usePersonOptions();
  const projects = useProjectOptions();
  const tickets = useTicketOptions();

  return (
    <div className="cc-msg-search-filters" data-testid="chat-search-filters">
      <FilterDropdown
        label="Person"
        searchPlaceholder="Search people"
        leadingIcon={PersonIcon}
        options={people}
        selectedIds={filters.authorIds}
        onChange={(authorIds) => onChange({ ...filters, authorIds })}
      />
      <FilterDropdown
        label="Project"
        searchPlaceholder="Search projects"
        leadingIcon={FolderIcon}
        options={projects}
        selectedIds={filters.projectKeys}
        onChange={(projectKeys) => onChange({ ...filters, projectKeys })}
      />
      <FilterDropdown
        label="Ticket"
        searchPlaceholder="Search ticket keys"
        leadingIcon={IssuesIcon}
        options={tickets}
        selectedIds={filters.issueKeys}
        onChange={(issueKeys) => onChange({ ...filters, issueKeys })}
      />
      <FilterDropdown
        label="Type"
        searchPlaceholder="Search types"
        leadingIcon={CommentIcon}
        options={KIND_OPTIONS}
        selectedIds={filters.kinds}
        onChange={(kinds) => onChange({ ...filters, kinds })}
      />
    </div>
  );
}

export default ChatSearchFilters;

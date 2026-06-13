/**
 * InlineCreateCard — Canonical inline issue creation for kanban columns.
 *
 * Replaces per-board create flows with a unified component:
 * - TextArea (summary, autoFocus, appearance="subtle")
 * - DropdownMenu (issue type with JiraIssueTypeIcon)
 * - Date picker (createPortal to document.body, position:fixed for A2 halt fix)
 * - Assignee search (debounced 300ms)
 * - Submit button (disabled when summary empty)
 * - Error handling + form clear on success
 *
 * Props:
 *   projectKey: Jira project key (BAU, INV, etc.)
 *   columnId: Destination column ID
 *   swimlaneGroupKey?: Optional swimlane group (for swimlane boards)
 *   onCreateCard: Callback fired on successful creation with CreatedIssue data
 *   onCancel: Callback fired when user cancels (Escape or Cancel button)
 *
 * Returns:
 *   { issueId, issueKey, issueType, summary, status, dueDate?, assigneeId? }
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Calendar from '@atlaskit/calendar';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { supabase } from '@/integrations/supabase/client';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';
import type { AssigneeOption } from './AssigneePickerPopover';

export interface CreatedIssue {
  issueId: string;
  issueKey: string;
  issueType: string;
  summary: string;
  status: string;
  dueDate?: string;
  assigneeId?: string;
}

interface InlineCreateCardProps {
  projectKey: string;
  columnId: string;
  swimlaneGroupKey?: string;
  /** The target status for the new card — typically the destination column's
   *  primary status. The created card lands in this status, which puts it in
   *  the right column immediately after creation. */
  status?: string;
  /** Optional override for the creatable type list. Falls back to the canonical
   *  Catalyst list (matches BacklogPage's CREATABLE_TYPES). */
  creatableTypes?: string[];
  /** Assignee options sourced from the kanban host (the same list the board's
   *  AssigneePickerPopover uses). When empty/undefined the picker is hidden
   *  by an empty-state message. */
  assigneeOptions?: AssigneeOption[];
  /** Lower-case-name → avatar URL map used to render avatars in the picker. */
  avatarsByName?: Map<string, string>;
  onCreateCard: (issue: CreatedIssue) => void;
  onCancel: () => void;
}

/* Canonical Catalyst-creatable types — mirrors BacklogPage's CREATABLE_TYPES
   so the kanban + backlog stay in sync. No Jira REST createmeta fetch is
   required (and the REST call previously used a hard-coded 'mock-token'
   that didn't authenticate). */
const DEFAULT_CREATABLE_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'QA Bug',
  'Production Incident', 'Business Gap', 'API Requirement', 'Change Request',
];

function InlineCreateCardComponent({
  projectKey,
  columnId,
  swimlaneGroupKey,
  status,
  creatableTypes,
  assigneeOptions = [],
  avatarsByName,
  onCreateCard,
  onCancel,
}: InlineCreateCardProps) {
  const [summary, setSummary] = useState('');
  const [issueName, setIssueName] = useState('Story');
  const [dueDate, setDueDate] = useState('');           // ISO yyyy-mm-dd
  const [assigneeName, setAssigneeName] = useState<string>('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown visibility
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs
  const datePickerRef = useRef<HTMLDivElement>(null);
  const assigneePickerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // The creatable type list (string names — icon comes from JiraIssueTypeIcon)
  const issueTypes = creatableTypes && creatableTypes.length > 0
    ? creatableTypes
    : DEFAULT_CREATABLE_TYPES;

  /* All profiles — the same source the canonical AssigneePickerPopover and
     avatarsByName map are derived from. Falls back to the host-supplied
     assigneeOptions when the query hasn't returned yet so the picker still
     populates from the kanban-scope assignees in the meantime. */
  const { data: profileAssignees = [] } = useQuery<AssigneeOption[]>({
    queryKey: ['inline-create-assignees'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email')
        .not('full_name', 'is', null)
        .order('full_name');
      return ((data as any[]) || [])
        .filter((p) => !!p.full_name)
        .map((p) => ({
          name: p.full_name as string,
          avatarUrl: p.avatar_url ?? null,
          email: p.email ?? null,
        }));
    },
  });

  /* Merge: host-supplied assigneeOptions (board-scoped) ∪ profileAssignees
     (app-wide). Dedup by lower-case name. Profile entries win for avatar URL
     because they reflect the latest profile photo. */
  const mergedAssignees = useMemo(() => {
    const byName = new Map<string, AssigneeOption>();
    assigneeOptions.forEach(a => byName.set(a.name.toLowerCase(), a));
    profileAssignees.forEach(a => byName.set(a.name.toLowerCase(), a));
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assigneeOptions, profileAssignees]);

  // Filter the merged list against the search query
  const filteredAssignees = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return mergedAssignees;
    return mergedAssignees.filter(a => a.name.toLowerCase().includes(q));
  }, [assigneeSearch, mergedAssignees]);

  // Focus summary on mount + default the due date to today so the picker
  // input reads today's date the moment the form opens (Jira parity).
  useEffect(() => {
    summaryRef.current?.focus();
    if (!dueDate) setDueDate(new Date().toISOString().slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close child popovers (type + assignee + date) on click outside their panels.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setShowDatePicker(false);
      }
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(target)) {
        setShowAssigneeDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside, { capture: true });
    return () => document.removeEventListener('click', handleClickOutside, { capture: true });
  }, []);

  // Close the whole form when the user clicks outside it (Jira parity:
  // there's no cancel button — clicking off the card dismisses without
  // saving). Portals (date picker, assignee picker, type dropdown) carry
  // data-inline-create-portal so clicking inside them does NOT dismiss.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (formRef.current?.contains(target)) return;
      if (target.closest && target.closest('[data-inline-create-portal="true"]')) return;
      onCancel();
    };
    // Defer one frame so the click that opened the form doesn't immediately close it.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onCancel]);

  // Escape key handling — closes any open child dropdown first, then the form.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDatePicker) {
          setShowDatePicker(false);
          e.stopPropagation();
        } else if (showAssigneeDropdown) {
          setShowAssigneeDropdown(false);
          e.stopPropagation();
        } else if (showTypeDropdown) {
          setShowTypeDropdown(false);
          e.stopPropagation();
        } else {
          onCancel();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [showDatePicker, showAssigneeDropdown, showTypeDropdown, onCancel]);

  /* Toggle the calendar popover. The Atlaskit <Calendar /> grid renders
     directly inside — no input or inner icon click required. */
  const toggleDatePicker = () => setShowDatePicker(v => !v);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }
    if (!projectKey) {
      setError('Missing project key');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      // Mirror useCreateStoryMutation's pattern: generate a real issue_key
      // and insert directly into ph_issues with source='catalyst'. The host's
      // onCreateCard then invalidates ['kanban-issues', key]; the refetch
      // picks up the new row, rawIssues updates → the colMap useEffect
      // rebuilds → the card appears in its destination column with no
      // manual page refresh.
      const issueKey = await generateIssueKey(projectKey);
      const nowIso = new Date().toISOString();
      const insertRow: Record<string, any> = {
        project_key: projectKey,
        issue_key: issueKey,
        summary: summary.trim(),
        issue_type: issueName,
        status: status || 'To Do',
        priority: 'Medium',
        labels: [],
        source: 'catalyst',
        jira_created_at: nowIso,
        jira_updated_at: nowIso,
        description_text: null,
        description_adf: null,
        parent_key: null,
        assignee_display_name: assigneeName || null,
        due_date: dueDate || null,
      };

      const { data, error: insErr } = await supabase
        .from('ph_issues')
        .insert(insertRow as any)
        .select('id, issue_key')
        .single();
      if (insErr) throw insErr;

      const createdIssue: CreatedIssue = {
        issueId: (data as any)?.id ?? issueKey,
        issueKey: (data as any)?.issue_key ?? issueKey,
        issueType: issueName,
        summary: summary.trim(),
        status: status || 'To Do',
        dueDate: dueDate || undefined,
        assigneeId: assigneeName || undefined,
      };
      onCreateCard(createdIssue);

      // Clear form (the form is also unmounted by the host after this returns)
      setSummary('');
      setDueDate('');
      setAssigneeName('');
      setAssigneeSearch('');
      setError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errorMsg);
      console.error('Create issue error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const formatDueDate = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const canSubmit = !!summary.trim() && !isSubmitting;

  const iconBtnStyle: React.CSSProperties = {
    width: 28, height: 28,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', borderRadius: 4,
    cursor: 'pointer', padding: 0,
    color: 'var(--ds-text-subtle, #44546F)',
  };

  /* Position helper for portal popovers — anchored under the toolbar. */
  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 10000,
    background: 'var(--ds-surface-overlay, #FFFFFF)',
    border: '1px solid var(--ds-border, #DFE1E6)',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(9,30,66,0.16)',
  };

  return (
    <div
      ref={formRef}
      data-inline-create-form="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 12px',
        background: 'var(--ds-surface, #FFFFFF)',
        borderRadius: 6,
        /* Jira-parity: full clean blue outline around the whole card. */
        border: '2px solid var(--ds-border-selected, #0C66E4)',
        boxShadow: '0 2px 8px rgba(9,30,66,0.06)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {error && (
        <div
          style={{
            background: 'var(--ds-background-danger, #FFEBE6)',
            color: 'var(--ds-text-danger, #AE2A19)',
            padding: '4px 6px',
            borderRadius: 3,
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}

      {/* Summary input — single placeholder "What needs to be done?" */}
      <textarea
        ref={summaryRef}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="What needs to be done?"
        disabled={isSubmitting}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) handleSubmit();
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          resize: 'none',
          fontSize: 14,
          lineHeight: '20px',
          fontFamily: 'var(--cp-font-body)',
          color: 'var(--ds-text, #292A2E)',
          padding: 0,
          minHeight: 40,
        }}
      />

      {/* Bottom toolbar: type · date · assignee · (spacer) · enter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
        {/* Type icon dropdown */}
        <div ref={typeDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowTypeDropdown(v => !v)}
            style={iconBtnStyle}
            aria-label={`Type: ${issueName}`}
            title={issueName}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <JiraIssueTypeIcon type={issueName.toLowerCase()} size={16} />
          </button>
          {showTypeDropdown && (
            <div data-inline-create-portal="true" style={{ ...popoverStyle, minWidth: 200, padding: '4px 0' }}>
              {issueTypes.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setIssueName(name);
                    setShowTypeDropdown(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 12px',
                    border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: 13, color: 'var(--ds-text, #292A2E)',
                    fontFamily: 'var(--cp-font-body)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-information, #E9F2FE)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <JiraIssueTypeIcon type={name.toLowerCase()} size={14} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Calendar / due date — icon trigger opens an Atlaskit Calendar
            popover directly. No input, no inner-icon click, no extra
            Clear/Today chrome. */}
        <div ref={datePickerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={toggleDatePicker}
            style={dueDate ? {
              ...iconBtnStyle,
              width: 'auto',
              padding: '0 8px',
              gap: 6,
            } : iconBtnStyle}
            aria-label="Due date"
            title="Due date"
            aria-haspopup="dialog"
            aria-expanded={showDatePicker}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="2" y="3" width="12" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {dueDate && (
              <span style={{ fontSize: 12, fontWeight: 500 }}>{formatDueDate(dueDate)}</span>
            )}
          </button>
          {showDatePicker && (
            <div
              data-inline-create-portal="true"
              style={{ ...popoverStyle, padding: 6 }}
              onMouseDown={e => e.stopPropagation()}
            >
              <Calendar
                selected={dueDate ? [dueDate] : []}
                defaultSelected={dueDate ? [dueDate] : []}
                onSelect={(d: any) => {
                  if (d?.iso) setDueDate(d.iso);
                  setShowDatePicker(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Assignee avatar */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowAssigneeDropdown(v => !v)}
            style={iconBtnStyle}
            aria-label={assigneeName ? `Assigned to ${assigneeName}` : 'Unassigned'}
            title={assigneeName || 'Unassigned'}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {assigneeName ? (
              (() => {
                const url = avatarsByName?.get(assigneeName.toLowerCase());
                return url ? (
                  <img
                    src={url}
                    alt={assigneeName}
                    style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',
                      color: 'var(--ds-text, #172B4D)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                    }}
                  >
                    {assigneeName.slice(0, 1).toUpperCase()}
                  </span>
                );
              })()
            ) : (
              /* Unassigned avatar — solid neutral fill, person silhouette
                 inside. No dashed border (matches the rest of the app's
                 avatar treatment). Visual footprint matches the assigned
                 18×18 badge so the toolbar slots stay aligned. */
              <span
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--ds-background-neutral, #F1F2F4)',
                  color: 'var(--ds-text-subtle, #44546F)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width={12} height={12} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <circle cx="8" cy="6.2" r="2.6" />
                  <path d="M2.8 14c0-2.6 2.4-4.5 5.2-4.5s5.2 1.9 5.2 4.5z" />
                </svg>
              </span>
            )}
          </button>
          {showAssigneeDropdown && (
            <div
              ref={assigneePickerRef}
              data-inline-create-portal="true"
              style={{ ...popoverStyle, minWidth: 240, maxHeight: 280, overflowY: 'auto' }}
            >
              <div style={{ padding: 8, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
                <input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  placeholder="Search a user…"
                  autoFocus
                  style={{
                    width: '100%', padding: '6px 8px',
                    border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 4, fontSize: 13,
                    fontFamily: 'var(--cp-font-body)', outline: 'none',
                  }}
                />
              </div>
              <div style={{ padding: '4px 0' }}>
                {/* Unassign option (only when somebody is currently assigned) */}
                {assigneeName && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeName('');
                      setAssigneeSearch('');
                      setShowAssigneeDropdown(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 12px',
                      border: 'none', background: 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                      fontSize: 13, color: 'var(--ds-text-subtle, #44546F)',
                      fontFamily: 'var(--cp-font-body)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-information, #E9F2FE)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    Unassign
                  </button>
                )}
                {filteredAssignees.length > 0 ? (
                  filteredAssignees.map((option) => {
                    const url = avatarsByName?.get(option.name.toLowerCase()) ?? option.avatarUrl ?? null;
                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => {
                          setAssigneeName(option.name);
                          setAssigneeSearch('');
                          setShowAssigneeDropdown(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 12px',
                          border: 'none', background: 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          fontSize: 13, color: 'var(--ds-text, #292A2E)',
                          fontFamily: 'var(--cp-font-body)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-information, #E9F2FE)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        {url ? (
                          <img src={url} alt={option.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span
                            style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',
                              color: 'var(--ds-text, #172B4D)',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                            }}
                          >
                            {option.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span>{option.name}</span>
                      </button>
                    );
                  })
                ) : assigneeOptions.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>
                    No assignees available
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--ds-text-subtle, #44546F)' }}>
                    No results for "{assigneeSearch}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <span style={{ flex: 1 }} />

        {/* Enter / submit button — blue + white when ready, gray when disabled */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Create"
          title="Create (Enter)"
          style={{
            width: 28, height: 28,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 4, padding: 0,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit
              ? 'var(--ds-background-brand-bold, #0C66E4)'
              : 'var(--ds-background-neutral, #F1F2F4)',
            color: canSubmit
              ? 'var(--ds-text-inverse, #FFFFFF)'
              : 'var(--ds-text-disabled, #B3B9C4)',
            transition: 'background 120ms ease, color 120ms ease',
          }}
        >
          {/* Return / enter glyph — corner-arrow */}
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M14 3.5v3.5a3 3 0 0 1-3 3H3M3 10l3.2-3.2M3 10l3.2 3.2"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { InlineCreateCardComponent as InlineCreateCard };
export default InlineCreateCardComponent;

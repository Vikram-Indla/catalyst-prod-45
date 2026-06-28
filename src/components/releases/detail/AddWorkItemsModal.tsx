/**
 * AddWorkItemsModal — multi-select dropdown to attach work items to a release.
 *
 * UX:
 *   - Field shows selected chips (each with × to remove); clear-all icon on the right
 *   - Click chevron → dropdown of "Recent work items" with auto-focus search
 *   - Add button (blue) enabled once ≥1 picked
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CrossCircleIcon from '@atlaskit/icon/glyph/cross-circle';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface WorkItem {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string | null;
  project_key: string | null;
}

interface Props {
  isOpen: boolean;
  release: { id: string; name: string; project_id: string };
  onClose: () => void;
  onSuccess?: () => void;
}

const BORDER = 'var(--ds-border)';
const BLUE = 'var(--ds-border-selected)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';

export function AddWorkItemsModal({ isOpen, release, onClose, onSuccess }: Props) {
  const [picked, setPicked] = useState<WorkItem[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setPicked([]);
      setQuery('');
      setOpen(false);
    }
  }, [isOpen]);

  // anchor popup
  useEffect(() => {
    if (!open || !fieldRef.current) return;
    const update = () => {
      const r = fieldRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    const s = () => update();
    window.addEventListener('scroll', s, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', s, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (fieldRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Capture phase so Atlaskit Modal's mousedown handlers can't stop it
    // before we get a chance to close the dropdown.
    document.addEventListener('mousedown', onDown, true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  useEffect(() => { if (open) searchRef.current?.focus(); }, [open]);

  // 2026-06-26: scope dropdown to the parent project. Before, the query
  // returned the global top 20 ph_issues — every release + every sprint
  // showed the same 20 items. Resolve project_id -> project_key once,
  // then filter ph_issues by project_key.
  const { data: parentProjectKey = null } = useQuery({
    queryKey: ['add-work-items-project-key', release.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('key')
        .eq('id', release.project_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.key as string | undefined) ?? null;
    },
    enabled: !!release.project_id,
    staleTime: 5 * 60_000,
  });

  const { data: items = [] } = useQuery<WorkItem[]>({
    queryKey: ['add-work-items-search', release.id, parentProjectKey, query],
    queryFn: async () => {
      if (!parentProjectKey) return [];
      const q = query.trim();
      let builder = supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, project_key')
        .eq('project_key', parentProjectKey)
        .order('jira_created_at', { ascending: false })
        .limit(50);
      if (q) builder = builder.or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`);
      const { data, error } = await builder;
      if (error) throw new Error(error.message);
      return (data ?? []) as WorkItem[];
    },
    enabled: isOpen && open && !!parentProjectKey,
    staleTime: 15_000,
  });

  const available = useMemo(
    () => items.filter((i) => !picked.some((p) => p.id === i.id)),
    [items, picked],
  );

  const togglePick = (it: WorkItem) => {
    setPicked((p) => (p.some((x) => x.id === it.id) ? p.filter((x) => x.id !== it.id) : [...p, it]));
  };

  const removeChip = (id: string) => setPicked((p) => p.filter((x) => x.id !== id));

  const mutation = useMutation({
    mutationFn: async () => {
      const newEntry = {
        id: '',
        name: release.name,
        releaseDate: '',
      };
      let updatedCount = 0;
      // For each picked ph_issue, append release reference to its sprint_release jsonb (idempotent).
      // Migration 20260624234500 exempts sprint_release-only UPDATEs from the
      // 2026 guard so pre-2026 rows can still be linked to current releases.
      for (const it of picked) {
        const { data: row, error: readErr } = await supabase
          .from('ph_issues')
          .select('sprint_release')
          .eq('id', it.id)
          .single();
        if (readErr) throw new Error(readErr.message);
        const current: any[] = Array.isArray((row as any)?.sprint_release) ? (row as any).sprint_release : [];
        if (current.some((el: any) => el && el.name === release.name)) {
          updatedCount += 1;
          continue;
        }
        const next = [...current, newEntry];
        const { data: upRows, error: upErr } = await supabase
          .from('ph_issues')
          .update({ sprint_release: next })
          .eq('id', it.id)
          .select('id');
        if (upErr) throw new Error(upErr.message);
        if (!upRows || upRows.length === 0) {
          throw new Error(`Update returned 0 rows for ${it.issue_key}.`);
        }
        updatedCount += 1;
      }
      return updatedCount;
    },
    onSuccess: async (updatedCount) => {
      // 2026-06-26: WorkItemsSection's list query was renamed
      // 'ph_release_items' → 'ph_entity_items' (config-aware for sprints).
      // Also invalidate work-nav linked-keys queries for both release +
      // sprint surfaces so the navigator picks the new items up too.
      await queryClient.refetchQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === 'ph_release_items'
            || q.queryKey[0] === 'ph_entity_items'
            || q.queryKey[0] === 'ph_release_contributors'
            || (typeof q.queryKey[0] === 'string'
                && (q.queryKey[0] as string).startsWith('projecthub-')
                && q.queryKey[1] === 'work-nav-linked-keys')),
      });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-sprints'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub-releases'] });
      catalystFlag.success(`Added ${updatedCount} work item${updatedCount === 1 ? '' : 's'} to "${release.name}".`);
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to add work items'),
  });

  return (
    <>
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width={867} shouldCloseOnOverlayClick={false}>
          <ModalHeader hasCloseButton>
            <ModalTitle>Add work items to this version</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div
              ref={fieldRef}
              onClick={() => setOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 40,
                padding: 4,
                border: `1px solid ${open ? BLUE : BORDER}`,
                borderRadius: 3,
                background: 'var(--ds-surface)',
                cursor: 'text',
                boxShadow: open ? '0 0 0 1px rgba(24,104,219,0.2)' : 'none', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {picked.map((p) => (
                  <span
                    key={p.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '0px 8px',
                      background: 'var(--ds-background-neutral)',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 3,
                      fontSize: 'var(--ds-font-size-200)',
                      color: TEXT,
                    }}
                  >
                    <JiraIssueTypeIcon type={p.issue_type as any} size={14} />
                    <span style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.issue_key} {p.summary}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={(e) => { e.stopPropagation(); removeChip(p.id); }}
                      style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', color: SUBTLE }}
                    >
                      <EditorCloseIcon label="" size="small" />
                    </button>
                  </span>
                ))}
                {picked.length === 0 && (
                  <span style={{ color: SUBTLE, fontSize: 'var(--ds-font-size-400)', padding: '0 4px' }}>
                    Search by work item key or summary
                  </span>
                )}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {picked.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear all"
                    onClick={(e) => { e.stopPropagation(); setPicked([]); }}
                    style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: SUBTLE }}
                  >
                    <CrossCircleIcon label="" size="small" />
                  </button>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', color: SUBTLE }}>
                  <ChevronDownIcon label="" size="small" />
                </span>
              </span>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={picked.length === 0 || mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Add
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>

      {isOpen && open && pos && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10010,
            background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 360,
          }}
        >
          <div style={{ padding: 8, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: SUBTLE, display: 'inline-flex' }}><SearchIcon label="" size="small" /></span>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search by work item key or summary"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 'var(--ds-font-size-400)', color: TEXT }}
            />
          </div>
          <div style={{ padding: '4px 0', overflowY: 'auto' }}>
            <div style={{ padding: '4px 12px', fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: SUBTLE }}>
              Recent work items
            </div>
            {available.length === 0 && (
              <div style={{ padding: '12px 16px', fontSize: 'var(--ds-font-size-300)', color: SUBTLE }}>No matches</div>
            )}
            {available.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => togglePick(it)}
                style={{
                  all: 'unset',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral))'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ flex: '0 0 16px', display: 'inline-flex' }}>
                  <JiraIssueTypeIcon type={it.issue_type as any} size={16} />
                </span>
                <span style={{
                  flex: '0 0 80px',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 400,
                  color: 'var(--ds-link)',
                  textDecoration: 'underline',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {it.issue_key}
                </span>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 400,
                  color: 'var(--ds-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {it.summary}
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

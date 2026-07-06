/**
 * SuggestChildIssuesDialog — modal for the "Suggest child work items"
 * menu item under the Improve dropdown.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2):
 *   Mirrors Jira's "Suggest child work items" flow. Calls the
 *   `ai-improve-story` edge function with `improve_type:
 *   'suggest_child_issues'` — backend selects the appropriate
 *   child issue type from the parent (Epic → Story, Story → Task,
 *   Task → Subtask, QA Bug → Linked test, Production Incident →
 *   Action item, Business Request → Story, etc.). Suggestions
 *   come back as { title, description, type } triples. The user
 *   ticks the ones they want and clicks "Create selected" — each
 *   ticked suggestion calls `createChildIssue` from
 *   workItemRepo.ts (the same path the SubtasksPanel uses) so the
 *   resulting rows behave identically to manually-created
 *   children.
 *
 *   Mounts inline in leftContent — jira-compare 2026-05-10 moved
 *   from stacked modal to inline panel matching Jira's UX.
 */

import React, { useEffect, useState } from 'react';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { token } from '@atlaskit/tokens';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { createChildIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { improveTriggerLabel, childWorkItemLabel } from './improve-config';

interface Suggestion {
  title: string;
  description: string;
  type: string;
}

interface SuggestChildIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Parent issue type — drives child type selection in backend. */
  issueType?: string | null;
  /** Parent issue summary — prompt context. */
  issueSummary?: string | null;
  /** Parent description — prompt context. */
  parentDescription?: string | null;
  /** Parent issue_key — needed for createChildIssue. */
  parentIssueKey?: string | null;
  /** Parent source ('jira' | 'catalyst'). */
  parentSource?: 'jira' | 'catalyst' | string | null;
  /** Project key — required for createChildIssue. */
  projectKey?: string | null;
  /** Project ID (UUID) — passed through to createChildIssue. */
  projectId?: string | null;
  /** Called once children have been created. */
  onChildrenCreated?: (createdKeys: string[]) => void;
}

export function SuggestChildIssuesDialog({
  isOpen,
  onClose,
  issueType,
  issueSummary,
  parentDescription,
  parentIssueKey,
  parentSource,
  projectKey,
  projectId,
  onChildrenCreated,
}: SuggestChildIssuesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setSuggestions([]);
      setChecked(new Set());
      setCreating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
          body: {
            improve_type: 'suggest_child_issues',
            parent_type: issueType || 'Story',
            parent_summary: issueSummary || '',
            parent_description: parentDescription || '',
          },
        });
        if (cancelled) return;
        if (fnError) throw fnError;
        if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
          throw new Error((data as { error?: string })?.error || 'AI gateway error');
        }
        const list = (data as { suggestions?: Suggestion[] }).suggestions || [];
        setSuggestions(list);
        // Default: pre-check all
        setChecked(new Set(list.map((_, i) => i)));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'AI features temporarily unavailable. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, issueType, issueSummary, parentDescription]);

  // Esc to close (CLAUDE.md L1 pattern).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !creating) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, loading, creating, onClose]);

  const toggleCheck = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecked(next);
  };

  const createSelected = async () => {
    if (!parentIssueKey || !projectKey) {
      catalystToast.error('Missing parent context — cannot create children.');
      return;
    }
    setCreating(true);
    const selectedIdxs = [...checked];
    const created: string[] = [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? null;
      for (const idx of selectedIdxs) {
        const s = suggestions[idx];
        if (!s) continue;
        const result = await createChildIssue({
          parent: {
            issueKey: parentIssueKey,
            source: (parentSource as 'jira' | 'catalyst') || 'catalyst',
          },
          summary: s.title,
          issueType: s.type || 'Subtask',
          projectKey,
          projectId: projectId ?? undefined,
          reporterId: reporterId ?? undefined,
        } as Parameters<typeof createChildIssue>[0]);
        if (result?.issue_key) created.push(result.issue_key);
      }
      catalystToast.success(`Created ${created.length} child work item${created.length === 1 ? '' : 's'}`);
      if (onChildrenCreated) onChildrenCreated(created);
      onClose();
    } catch (e) {
      catalystToast.error('Failed to create children', {
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const triggerLabel = improveTriggerLabel(issueType);
  const childLabel = childWorkItemLabel(issueType);

  return (
    <ModalDialog onClose={onClose} width={680}>
      <ModalHeader hasCloseButton>
        <ModalTitle>{triggerLabel} — Suggest {childLabel.toLowerCase()}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle', 'var(--ds-text-subtlest)') }}>
          {loading
            ? 'Generating suggestions…'
            : suggestions.length > 0
              ? `Pick the ones you want — selected items become real ${childLabel.toLowerCase()} under this parent.`
              : ''}
        </p>

        <div>
          {loading && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: token('color.text.subtle', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-400)' }}>
              Generating suggestions…
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 4,
                background: token('color.background.danger', 'var(--ds-background-danger)'),
                color: token('color.text.danger', 'var(--ds-text-danger)'),
                fontSize: 'var(--ds-font-size-300)',
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: token('color.text.subtle', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-400)' }}>
              No suggestions returned.
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderRadius: 6,
                    border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral))')}`,
                    background: checked.has(i)
                      ? token('color.background.selected', 'var(--ds-background-selected)')
                      : token('elevation.surface', 'var(--ds-surface)'),
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleCheck(i)}
                >
                  <div style={{ flexShrink: 0, paddingTop: 0 }}>
                    <Checkbox
                      isChecked={checked.has(i)}
                      onChange={() => toggleCheck(i)}
                      label=""
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 'var(--ds-font-size-400)',
                          fontWeight: 600,
                          color: token('color.text', 'var(--ds-text)'),
                        }}
                      >
                        {s.title}
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--ds-font-size-100)',
                          fontWeight: 700,
                          color: token('color.text.subtle', 'var(--ds-text-subtlest)'),
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {s.type}
                      </span>
                    </div>
                    {s.description && (
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 'var(--ds-font-size-300)',
                          lineHeight: '18px',
                          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={creating}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={createSelected}
          isLoading={creating}
          isDisabled={loading || creating || checked.size === 0}
        >
          Create {checked.size > 0 ? `${checked.size} ${childLabel.toLowerCase()}` : 'selected'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

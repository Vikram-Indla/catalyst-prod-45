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
 *   Same `createPortal`-to-body pattern as the other Improve
 *   dialogs (CLAUDE.md L1).
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import { token } from '@atlaskit/tokens';
import { toast } from 'sonner';
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
        if (fnError) throw fnError;
        if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
          throw new Error((data as { error?: string })?.error || 'AI gateway error');
        }
        const list = (data as { suggestions?: Suggestion[] }).suggestions || [];
        setSuggestions(list);
        // Default: pre-check all
        setChecked(new Set(list.map((_, i) => i)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI features temporarily unavailable. Try again.');
      } finally {
        setLoading(false);
      }
    })();
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
      toast.error('Missing parent context — cannot create children.');
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
      toast.success(`Created ${created.length} child work item${created.length === 1 ? '' : 's'}`);
      if (onChildrenCreated) onChildrenCreated(created);
      onClose();
    } catch (e) {
      toast.error('Failed to create children', {
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const triggerLabel = improveTriggerLabel(issueType);
  const childLabel = childWorkItemLabel(issueType);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(9, 30, 66, 0.54)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 60,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${triggerLabel} — suggest ${childLabel.toLowerCase()}`}
        data-testid="suggest-child-issues-dialog"
        style={{
          width: 720,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 100px)',
          background: token('elevation.surface.overlay', '#FFFFFF'),
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px 8px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              lineHeight: '24px',
              color: token('color.text', '#292A2E'),
            }}
          >
            {triggerLabel} — Suggest {childLabel.toLowerCase()}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: token('color.text.subtle', '#6B6E76'),
            }}
          >
            {loading
              ? 'Generating suggestions…'
              : suggestions.length > 0
                ? `Pick the ones you want — selected items become real ${childLabel.toLowerCase()} under this parent.`
                : ''}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
          {loading && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: token('color.text.subtle', '#6B6E76'), fontSize: 14 }}>
              Generating suggestions…
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 4,
                background: token('color.background.danger', '#FFEBE6'),
                color: token('color.text.danger', '#AE2A19'),
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: token('color.text.subtle', '#6B6E76'), fontSize: 14 }}>
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
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                    background: checked.has(i)
                      ? token('color.background.selected', '#E9F2FF')
                      : token('elevation.surface', '#FFFFFF'),
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleCheck(i)}
                >
                  <div style={{ flexShrink: 0, paddingTop: 1 }}>
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
                          fontSize: 14,
                          fontWeight: 600,
                          color: token('color.text', '#292A2E'),
                        }}
                      >
                        {s.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: token('color.text.subtle', '#6B6E76'),
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
                          fontSize: 13,
                          lineHeight: '18px',
                          color: token('color.text.subtle', '#42526E'),
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 24px',
            borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
          }}
        >
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
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * LinkSimilarItemsDialog — modal for the "Link similar work items"
 * menu item under the Improve dropdown.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2):
 *   Mirrors Jira's "Link similar work items" UX. Calls the
 *   pre-existing `ai-similar-items` edge function (left untouched —
 *   it already returns ranked suggestions for the source issue).
 *   Each suggestion shows with an inline "Link as relates to"
 *   button that inserts a `ph_issue_links` row using the source +
 *   target UUIDs (looked up from `ph_issues` by issue_key). The
 *   richer collapsible-panel UX in `AiLinkSimilarPanel.tsx`
 *   remains the canonical pattern for inline use; this dialog is
 *   the modal-side equivalent that's reachable from the Improve
 *   dropdown.
 *
 *   Same `createPortal`-to-body pattern as the other Improve
 *   dialogs (CLAUDE.md L1).
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { improveTriggerLabel } from './improve-config';

interface SimilarSuggestion {
  issue_key: string;
  summary: string;
  issue_type?: string | null;
  status?: string | null;
}

interface LinkSimilarItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Source issue type — for the trigger label only. */
  issueType?: string | null;
  /** Source issue_key — passed to the AI endpoint. */
  issueKey?: string | null;
  /** Existing linked keys to exclude from suggestions. */
  existingLinkedKeys?: string[];
  /** Called after at least one link is created. */
  onLinked?: () => void;
}

export function LinkSimilarItemsDialog({
  isOpen,
  onClose,
  issueType,
  issueKey,
  existingLinkedKeys = [],
  onLinked,
}: LinkSimilarItemsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SimilarSuggestion[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [linkedThisSession, setLinkedThisSession] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setSuggestions([]);
      setLinking(null);
      setLinkedThisSession(new Set());
      return;
    }
    if (!issueKey) {
      setError('Missing issue key — cannot fetch similar items.');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('ai-similar-items', {
          body: { issueKey, existingLinkedKeys },
        });
        if (fnError) throw fnError;
        const list = (data as { suggestions?: SimilarSuggestion[] }).suggestions || [];
        setSuggestions(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI features temporarily unavailable. Try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, issueKey, JSON.stringify(existingLinkedKeys)]);

  // Esc to close (CLAUDE.md L1 pattern).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !linking) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, loading, linking, onClose]);

  const linkOne = async (target: SimilarSuggestion) => {
    if (!issueKey) return;
    setLinking(target.issue_key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Look up UUIDs by issue_key for both source and target.
      const { data: rows, error: rowsErr } = await supabase
        .from('ph_issues')
        .select('id, issue_key')
        .in('issue_key', [issueKey, target.issue_key]);
      if (rowsErr) throw rowsErr;
      const sourceRow = rows?.find((r) => r.issue_key === issueKey);
      const targetRow = rows?.find((r) => r.issue_key === target.issue_key);
      if (!sourceRow?.id || !targetRow?.id) {
        throw new Error('Could not resolve issue UUIDs.');
      }
      const { error: insertErr } = await supabase.from('ph_issue_links').insert({
        source_id: sourceRow.id,
        target_id: targetRow.id,
        link_type: 'relates to',
        created_by: user.id,
      });
      if (insertErr) throw new Error(insertErr.message);
      setLinkedThisSession((prev) => new Set(prev).add(target.issue_key));
      toast.success(`Linked ${target.issue_key}`);
      if (onLinked) onLinked();
    } catch (e) {
      toast.error('Failed to link', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setLinking(null);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const triggerLabel = improveTriggerLabel(issueType);

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
        aria-label={`${triggerLabel} — link similar work items`}
        data-testid="link-similar-items-dialog"
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
            {triggerLabel} — Link similar work items
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: token('color.text.subtle', '#6B6E76'),
            }}
          >
            {loading ? 'Finding related items…' : suggestions.length > 0 ? 'AI-ranked candidates from this project. Each link uses the "relates to" type.' : ''}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 16px' }}>
          {loading && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: token('color.text.subtle', '#6B6E76'), fontSize: 14 }}>
              Searching…
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
              No similar items found in this project.
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((s) => {
                const linked = linkedThisSession.has(s.issue_key);
                return (
                  <div
                    key={s.issue_key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: 12,
                      borderRadius: 6,
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      background: linked ? token('color.background.success', '#E3FCEF') : token('elevation.surface', '#FFFFFF'),
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: token('color.text.brand', '#0C66E4'),
                          }}
                        >
                          {s.issue_key}
                        </span>
                        {s.issue_type && (
                          <Lozenge appearance="default">{s.issue_type}</Lozenge>
                        )}
                        {s.status && (
                          <Lozenge appearance="inprogress">{s.status}</Lozenge>
                        )}
                      </div>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 14,
                          lineHeight: '20px',
                          color: token('color.text', '#292A2E'),
                        }}
                      >
                        {s.summary}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {linked ? (
                        <span style={{ fontSize: 12, color: token('color.text.success', '#216E4E'), fontWeight: 600 }}>
                          ✓ Linked
                        </span>
                      ) : (
                        <Button
                          appearance="default"
                          spacing="compact"
                          onClick={() => linkOne(s)}
                          isLoading={linking === s.issue_key}
                          isDisabled={!!linking}
                        >
                          Link as relates to
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
          <Button appearance="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

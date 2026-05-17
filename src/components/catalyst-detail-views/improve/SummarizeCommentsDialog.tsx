/**
 * SummarizeCommentsDialog — modal for the "Summarize comments"
 * menu item under the Improve dropdown.
 *
 * Apr 28, 2026 (jira-compare cycle 3 — Phase B B2):
 *   Mirrors Jira's "Summarize comments" UX. Fetches the issue's
 *   comments from `ph_comments` (limit 30 most recent), then
 *   calls `ai-improve-story` with `improve_type:
 *   'summarize_comments'` and the issue type — backend selects a
 *   per-type tone (Bug → triage-focused, Incident →
 *   incident-mgmt-focused, Story → decision-focused, etc.) so the
 *   summary matches what a reader of that work-item type expects.
 *
 *   Mounts inline in leftContent — jira-compare 2026-05-10 moved
 *   from stacked modal to inline panel matching Jira's UX.
 */

import React, { useEffect, useState } from 'react';
import Button from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import { token } from '@atlaskit/tokens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { improveTriggerLabel } from './improve-config';

interface SummarizeCommentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Issue type — drives the per-type tone of the summary. */
  issueType?: string | null;
  /** Issue summary (title) — prompt context. */
  issueSummary?: string | null;
  /**
   * Work item ID — the value matched against `ph_comments.work_item_id`.
   * That column is a `uuid` (verified via PostgREST 22P02 error on
   * 2026-04-28), so this MUST be `ph_issues.id` (the UUID). Passing
   * `issue_key` ("BAU-5711") trips a type-mismatch error and the
   * dialog falls into the "AI features temporarily unavailable" path.
   * The consumer (`ImproveIssueDropdown`) sources this from
   * `issue?.id ?? issue?.issue_key` so a UUID lands when available.
   */
  workItemId?: string | null;
}

export function SummarizeCommentsDialog({
  isOpen,
  onClose,
  issueType,
  issueSummary,
  workItemId,
}: SummarizeCommentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setSummary(null);
      setCommentCount(null);
      return;
    }
    if (!workItemId) {
      setError('Missing work item id — cannot fetch comments.');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: comments, error: e1 } = await supabase
          .from('ph_comments')
          .select('id, author_id, body, created_at')
          .eq('work_item_id', workItemId)
          .order('created_at', { ascending: true })
          .limit(50);
        if (e1) throw e1;
        const list = comments || [];
        setCommentCount(list.length);
        if (list.length === 0) {
          setSummary('');
          setLoading(false);
          return;
        }
        // Best-effort author display name — fall back to author_id.
        const authorIds = [...new Set(list.map((c) => c.author_id).filter(Boolean))] as string[];
        const profileMap = new Map<string, string>();
        if (authorIds.length) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', authorIds);
          for (const p of profiles || []) {
            profileMap.set(p.id as string, (p.full_name as string) || (p.email as string) || (p.id as string));
          }
        }
        const aiPayload = list.map((c) => ({
          author: c.author_id ? profileMap.get(c.author_id) || c.author_id : '(unknown)',
          created_at: c.created_at,
          body: c.body || '',
        }));

        const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
          body: {
            improve_type: 'summarize_comments',
            issue_type: issueType || 'Default',
            issue_summary: issueSummary || '',
            comments: aiPayload,
          },
        });
        if (fnError) throw fnError;
        if (!data || (typeof data === 'object' && 'error' in data && data.error)) {
          throw new Error((data as { error?: string })?.error || 'AI gateway error');
        }
        setSummary(typeof (data as { summary?: string }).summary === 'string' ? (data as { summary: string }).summary : '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI features temporarily unavailable. Try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, workItemId, issueType, issueSummary]);

  // Esc to close (CLAUDE.md L1 pattern).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const triggerLabel = improveTriggerLabel(issueType);

  return (
    <ModalDialog onClose={onClose} width={640}>
      <ModalHeader hasCloseButton>
        <ModalTitle>{triggerLabel} — Summarize comments</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: token('color.text.subtle', '#6B6E76') }}>
          {commentCount !== null ? `${commentCount} comment${commentCount === 1 ? '' : 's'} processed.` : 'Fetching comments…'}
        </p>

        {loading && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: token('color.text.subtle', '#6B6E76'), fontSize: 14 }}>
            Generating summary…
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

        {!loading && !error && summary !== null && summary.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: token('color.text.subtle', '#6B6E76'), fontSize: 14 }}>
            No comments to summarize yet.
          </div>
        )}

        {!loading && !error && summary && summary.length > 0 && (
          <div
            style={{
              padding: 16,
              borderRadius: 6,
              background: token('color.background.neutral', '#F4F5F7'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              fontSize: 14,
              lineHeight: '21px',
              color: token('color.text', '#292A2E'),
              whiteSpace: 'pre-wrap',
            }}
          >
            {summary}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {summary && (
          <Button
            appearance="subtle"
            onClick={() => {
              navigator.clipboard.writeText(summary);
              toast.success('Summary copied to clipboard');
            }}
          >
            Copy
          </Button>
        )}
        <Button appearance="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}

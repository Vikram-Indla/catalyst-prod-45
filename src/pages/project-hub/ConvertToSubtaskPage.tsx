/**
 * ConvertToSubtaskPage — Jira-parity wizard for converting an issue into a sub-task.
 *
 * Route: /project-hub/:key/issue/:issueKey/convert-to-subtask
 *
 * Layout:
 *   - Universal shell owns the left sidebar + top header (mounted at the app root).
 *   - This page owns everything else: title + divider, steps rail (left), current
 *     step content (right), shared footer (Next / Cancel).
 *
 * Steps (Jira flow):
 *   1. Select Parent and Sub-task Type
 *   2. Select New Status
 *   3. Update Fields
 *   4. Confirmation
 *
 * Step 1 (this phase): parent-issue picker placeholder + Sub-task type dropdown
 * (single option — "Sub-task"). The parent-picker popover is stubbed for now;
 * Vikram is going to spec it in the next phase.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import ArrowRightIcon from '@atlaskit/icon/utility/arrow-right';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useCatalystIssue } from '@/components/catalyst-detail-views/shared/hooks/useCatalystIssue';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ─── Steps rail model ───────────────────────────────────────────────────── */

interface WizardStep {
  index: number;
  label: string;
  shortHelper: string;
}

const STEPS: WizardStep[] = [
  { index: 1, label: 'Select Parent and Sub-task Type', shortHelper: 'Select parent issue and sub-task type…' },
  { index: 2, label: 'Select New Status', shortHelper: 'Select a valid status for the new sub-task…' },
  { index: 3, label: 'Update Fields', shortHelper: 'Fill in any required fields for the new sub-task type…' },
  { index: 4, label: 'Confirmation', shortHelper: 'Review the changes before finishing…' },
];

/* ─── Style tokens (ADS only) ────────────────────────────────────────────── */

const pageWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)',
};

/* Title left-aligns with the step labels in the rail (Vikram 2026-07-04).
   No dividers anywhere — layout separates via whitespace only. */
const RAIL_WIDTH = 260;
const CONTENT_PADDING_X = 32;
const RAIL_PADDING_LEFT = 32;
const BULLET_SIZE = 10;
const BULLET_GAP = 12;

/* Title now lives INSIDE the content column (not full-width above it). Its
   border-bottom therefore stops at the content column's edges — no long
   line across the empty rail area. */
const titleBar: React.CSSProperties = {
  padding: `0 0 0 0`,
  fontSize: 'var(--ds-font-size-700)',
  fontWeight: 700,
  lineHeight: 1.2,
  color: 'var(--ds-text)',
  borderBottom: '1px solid var(--ds-border)',
  marginBottom: 8,
};

const bodyLayout: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
};

const stepsRail: React.CSSProperties = {
  width: RAIL_WIDTH,
  /* Top padding pushes the first step down so its baseline aligns with the
     BOTTOM of the page title (not vertically centered). Value = content
     padding-top (20) + title height ≈ (font-size-700 * 1.2 ≈ 34) - step text
     height (~18) = ~36. */
  padding: `36px ${CONTENT_PADDING_X}px 24px ${RAIL_PADDING_LEFT}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flexShrink: 0,
};

const stepRow = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: BULLET_GAP,
  color: active ? 'var(--ds-text)' : 'var(--ds-text-subtle)',
  fontWeight: active ? 700 : 400,
  fontSize: 'var(--ds-font-size-300)',
  lineHeight: 1.35,
});

/* Only the ACTIVE step renders a filled brand-bold dot. Inactive steps get
   an invisible spacer of the same size so the label column stays aligned. */
const stepBullet = (active: boolean): React.CSSProperties => ({
  width: BULLET_SIZE,
  height: BULLET_SIZE,
  borderRadius: '50%',
  background: active ? 'var(--ds-background-brand-bold)' : 'transparent',
  flexShrink: 0,
});

const contentArea: React.CSSProperties = {
  flex: 1,
  padding: '20px 32px 24px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  minWidth: 0,
};

/* Footer lives INSIDE the content column so its borders stop at the content
   edges (don't cross the rail area). Buttons left-aligned; Next first, then
   Cancel as a blue link. Top + bottom divider match Jira. */
const footer: React.CSSProperties = {
  padding: '12px 0',
  marginTop: 16,
  borderTop: '1px solid var(--ds-border)',
  borderBottom: '1px solid var(--ds-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 16,
};

const cancelLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 4px',
  cursor: 'pointer',
  color: 'var(--ds-link)',
  fontSize: 'var(--ds-font-size-300)',
  fontWeight: 500,
  fontFamily: 'inherit',
};

const stepHeaderStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-300)',
  lineHeight: 1.5,
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  color: 'var(--ds-text)',
  fontSize: 'var(--ds-font-size-300)',
  marginBottom: 6,
};

/* Two-column form: label column on the left (right-aligned), value column
   on the right. Matches Jira's convert-to-subtask layout. */
const FIELD_LABEL_COL = 180;

const fieldRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${FIELD_LABEL_COL}px 1fr`,
  columnGap: 24,
  alignItems: 'start',
};

const fieldRowLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: 'var(--ds-text)',
  fontSize: 'var(--ds-font-size-300)',
  textAlign: 'left',
  paddingTop: 6,
};

const helperTextStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text-subtle)',
  lineHeight: 1.4,
};

const parentPickerBox: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  width: 220,
  minHeight: 32,
  border: '1px solid var(--ds-border-input)',
  borderRadius: 3,
  background: 'var(--ds-surface)',
  color: 'var(--ds-text-subtle)',
  fontSize: 'var(--ds-font-size-300)',
  cursor: 'pointer',
};

const parentPickerLink: React.CSSProperties = {
  color: 'var(--ds-link)',
  fontWeight: 500,
  textDecoration: 'none',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

const SUBTASK_TYPE_OPTIONS = [
  { label: 'Sub-task', value: 'Sub-task' },
];

/* Bolds the substring of `text` that matches `query` — used in the
   autocomplete rows so the search term stands out (Jira parity). */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <strong>{match}</strong>
      {after}
    </>
  );
}

export default function ConvertToSubtaskPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();
  const { data: issue } = useCatalystIssue(issueKey ?? '', !!issueKey);

  const [currentStep] = useState(1);
  const [parentIssueKey, setParentIssueKey] = useState<string | null>(null);
  const [parentQuery, setParentQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [subtaskType, setSubtaskType] = useState<{ label: string; value: string }>(SUBTASK_TYPE_OPTIONS[0]);

  /* Listen for the parent pick coming back from the Issue Selector browser
     popup (`window.opener.postMessage(...)`). Same origin only. */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; issueKey?: string } | null;
      if (data?.type === 'CONVERT_PARENT_SELECT' && data.issueKey) {
        setParentIssueKey(data.issueKey);
        setParentQuery(data.issueKey);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const openIssueSelectorPopup = () => {
    if (!projectKey) return;
    const url = `/project-hub/${projectKey}/issue-selector?source=${encodeURIComponent(issueKey ?? '')}`;
    const features = 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
    window.open(url, 'IssueSelector', features);
  };

  /* Type-ahead suggestions — searches ph_issues by key or summary in the
     current project, excludes subtask-type rows and the source issue itself.
     Returns `{ rows, total }` so the header can show "Showing N of M".
     `suggestLimit` grows on scroll to the bottom (infinite scroll). */
  const SUGGEST_PAGE = 20;
  const [suggestLimit, setSuggestLimit] = useState(SUGGEST_PAGE);
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const dropdownListRef = useRef<HTMLDivElement | null>(null);

  /* Reset the page window whenever the query changes so a new search starts
     from the first N rows. */
  useEffect(() => {
    setSuggestLimit(SUGGEST_PAGE);
  }, [parentQuery]);

  const { data: suggestionResult } = useQuery({
    queryKey: ['convert-parent-suggest', projectKey, issueKey, parentQuery, suggestLimit],
    enabled: suggestOpen && !!projectKey && parentQuery.trim().length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const q = parentQuery.trim();
      const { data, count } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type', { count: 'exact' })
        .eq('project_key', projectKey!)
        .is('deleted_at', null)
        .or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`)
        .limit(suggestLimit);
      const raw = (data ?? []) as Array<{ issue_key: string; summary: string; issue_type: string | null }>;
      const rows = raw.filter((r) => {
        if (r.issue_key === issueKey) return false;
        const t = (r.issue_type ?? '').toLowerCase().trim();
        return !['sub-task','subtask','backend','frontend','integration'].includes(t);
      });
      return { rows, total: count ?? rows.length };
    },
  });
  const suggestions = suggestionResult?.rows ?? [];
  const suggestionsTotal = suggestionResult?.total ?? suggestions.length;

  /* Portal-position the dropdown relative to the input so it isn't clipped
     by parent overflow/stacking contexts. Re-measured on open + on scroll/
     resize while open. */
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    if (!suggestOpen) { setDropdownPos(null); return; }
    const measure = () => {
      const el = inputWrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: 460 });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [suggestOpen]);

  const projectName = issue?.project_name ?? projectKey ?? '';
  const workType = issue?.issue_type ?? 'Issue';
  const activeStep = useMemo(() => STEPS.find((s) => s.index === currentStep) ?? STEPS[0], [currentStep]);

  const canGoNext = !!parentIssueKey;

  const handleCancel = () => navigate(-1);
  const handleNext = () => {
    /* Wizard advance wired in the next phase. */
  };

  return (
    <div style={pageWrap}>
      <div style={bodyLayout}>
        {/* Uses <div> not <aside> — global sidebar CSS in index.css paints
           EVERY <aside> with `--bg-1` bg + inset right-border, which showed
           up here as the phantom "gray rail with vertical divider". */}
        <div role="navigation" aria-label="Convert wizard steps" style={stepsRail}>
          {STEPS.map((s) => {
            const active = s.index === currentStep;
            return (
              <div key={s.index} style={stepRow(active)}>
                <span aria-hidden="true" style={stepBullet(active)} />
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div style={contentArea}>
          <div style={titleBar}>
            Convert Issue to Sub-task: {issueKey ?? ''}
          </div>
          <div style={stepHeaderStyle}>
            <span style={{ fontWeight: 700, color: 'var(--ds-text)' }}>
              Step {activeStep.index} of {STEPS.length}
            </span>
            <span style={{ color: 'var(--ds-text-subtle)' }}>
              {': '}{activeStep.shortHelper}
            </span>
          </div>

          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 32 }}>
              <div style={fieldRowStyle}>
                <label style={fieldRowLabelStyle}>Select Parent Issue:</label>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                    <div ref={inputWrapperRef} style={{ ...parentPickerBox, position: 'relative' }}>
                      <input
                        type="text"
                        value={parentQuery}
                        onChange={(e) => {
                          setParentQuery(e.target.value);
                          setSuggestOpen(true);
                          if (parentIssueKey && e.target.value !== parentIssueKey) {
                            setParentIssueKey(null);
                          }
                        }}
                        onFocus={() => setSuggestOpen(true)}
                        onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                        placeholder=""
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          padding: 0,
                          fontSize: 'var(--ds-font-size-300)',
                          color: 'var(--ds-text)',
                        }}
                      />
                      {suggestOpen && parentQuery.trim().length > 0 && suggestions.length > 0 && dropdownPos && createPortal(
                        <div
                          /* Prevent input blur when interacting with the dropdown
                             (scrollbar drag, row click). Without this, the input's
                             onBlur closes the dropdown before the scroll registers. */
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            background: 'var(--ds-surface-overlay)',
                            border: '1px solid var(--ds-border)',
                            borderRadius: 3,
                            boxShadow: 'var(--ds-shadow-overlay)',
                            zIndex: 3000,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ padding: '6px 10px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', borderBottom: '1px solid var(--ds-border)' }}>
                            History Search(Showing {suggestions.length} of {suggestionsTotal} matching issues)
                          </div>
                          <div
                            ref={dropdownListRef}
                            /* Fixed height for ~8 rows (row = 30px). Infinite scroll
                               kicks in when the user hits ~32px from the bottom. */
                            style={{ maxHeight: 240, overflowY: 'auto' }}
                            onScroll={(e) => {
                              const el = e.currentTarget;
                              if (
                                el.scrollTop + el.clientHeight >= el.scrollHeight - 32 &&
                                suggestions.length < suggestionsTotal
                              ) {
                                setSuggestLimit((n) => n + SUGGEST_PAGE);
                              }
                            }}
                          >
                            {suggestions.map((s) => (
                              <button
                                key={s.issue_key}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setParentIssueKey(s.issue_key);
                                  setParentQuery(s.issue_key);
                                  setSuggestOpen(false);
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '6px 10px',
                                  background: 'none',
                                  border: 'none',
                                  borderBottom: '1px solid var(--ds-border)',
                                  textAlign: 'left',
                                  fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>
                                  <JiraIssueTypeIcon type={s.issue_type ?? 'Task'} size={16} />
                                </span>
                                <span style={{ color: 'var(--ds-text)' }}>
                                  {highlightMatch(s.issue_key, parentQuery)}
                                </span>
                                <span style={{ color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {s.summary}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>,
                        document.body,
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openIssueSelectorPopup}
                      style={{ ...parentPickerLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      [select issue]
                    </button>
                  </div>
                  <div style={{ ...helperTextStyle, marginTop: 8 }}>
                    <div>Begin typing to search for issues to link</div>
                    <div>
                      Only non-sub-task issues from the same project <strong>{projectName}</strong> can be selected.
                    </div>
                  </div>
                </div>
              </div>

              <div style={fieldRowStyle}>
                <label style={fieldRowLabelStyle}>Select Sub-task Type:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                    Current Issue Type: <strong>{workType}</strong>
                  </span>
                  <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon)' }}>
                    <ArrowRightIcon label="" />
                  </span>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', fontWeight: 500 }}>
                    New Sub-task Type:
                  </span>
                  <div style={{ minWidth: 160 }}>
                    <Select
                      value={subtaskType}
                      options={SUBTASK_TYPE_OPTIONS}
                      onChange={(next) => next && setSubtaskType(next as any)}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Steps 2–4 UI wired in later phases. */}

          <div style={footer}>
            <Button appearance="primary" isDisabled={!canGoNext} onClick={handleNext}>
              Next &gt;&gt;
            </Button>
            <button type="button" onClick={handleCancel} style={cancelLinkStyle}>
              Cancel
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

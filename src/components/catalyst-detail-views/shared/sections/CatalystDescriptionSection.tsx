/**
 * CANONICAL — Description section for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Renders ADF (Atlassian Document Format) content with full Jira-parity
 * (headings, bold, numbered lists, tables with borders, media with lightbox).
 * Includes expand/collapse toggle matching Jira's collapsible sections.
 * Click-to-edit: clicking the description or pencil icon enters edit mode
 * with the canonical CatalystRichTextEditor (TipTap + image management).
 * Falls back to plain text. Shows placeholder when empty.
 */
import React, { Suspense, lazy, useState, useCallback } from 'react';
import { ChevronRight, Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adfToHtml } from '@/modules/project-work-hub/utils/adfToHtml';
import { AdfDescriptionRenderer } from '@/modules/project-work-hub/components/AdfDescriptionRenderer';
import { CatalystRichTextEditor } from '@/components/shared/rich-text';
import type { PhIssue } from '../types';

/* Atlaskit pilot — Epic only.
   Lazy-loaded so the @atlaskit/editor-core + renderer bundle (~1MB) is only
   fetched when an Epic description is actually viewed/edited. All other
   issue types continue to use the existing TipTap-based path with zero
   bundle impact.
   Wrapped in AtlaskitBoundary so a chunk-load failure or runtime error
   surfaces in the console and the existing TipTap path is used as fallback. */
const EpicDescriptionEditor = lazy(() =>
  import('@/components/shared/rich-text/atlaskit').then((m) => ({ default: m.EpicDescriptionEditor }))
);
const EpicDescriptionRenderer = lazy(() =>
  import('@/components/shared/rich-text/atlaskit').then((m) => ({ default: m.EpicDescriptionRenderer }))
);
import { AtlaskitBoundary } from '@/components/shared/rich-text/atlaskit/AtlaskitBoundary';

function isEpic(issue: PhIssue | null): boolean {
  const raw = (issue?.issue_type ?? '').toString().trim().toLowerCase();
  return raw === 'epic';
}

function AtlaskitFallback({ minHeight = 80 }: { minHeight?: number }) {
  return (
    <div style={{ minHeight, paddingLeft: 20, color: '#97A0AF', fontSize: 13 }}>
      Loading editor…
    </div>
  );
}

/* Visible marker — emitted next to the Description heading when the
   Epic-only pilot molecule is active. Pilot currently routes through
   the existing TipTap editor + AdfDescriptionRenderer pair (Atlaskit
   editor-core/renderer cannot resolve their transitive dep tree in
   Catalyst's npm registry — see EpicDescriptionEditor / Renderer files
   for the rationale). The molecule still owns the Epic edit/view
   contract so it can be re-pointed at Atlaskit later without touching
   any caller. Removed when pilot promotes to all issue types. */
function AtlaskitPilotBadge() {
  return (
    <span
      title="Epic description pilot — owns the Epic edit/view contract for future Atlaskit promotion"
      style={{
        marginLeft: 6, padding: '1px 6px', borderRadius: 3,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
        background: '#E9F2FF', color: '#0747A6',
        textTransform: 'uppercase',
      }}
    >
      Epic Pilot
    </span>
  );
}

/* ── Scoped styles for ADF content inside CatalystView ── */
const STYLE_ID = 'cv-desc-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .cv-desc-body h1 { font-size: 24px; font-weight: 700; margin: 20px 0 8px; color: #172B4D; line-height: 1.3; }
    .cv-desc-body h2 { font-size: 20px; font-weight: 600; margin: 16px 0 8px; color: #172B4D; line-height: 1.3; }
    .cv-desc-body h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; color: #172B4D; line-height: 1.4; }
    .cv-desc-body h4 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; color: #172B4D; }
    .cv-desc-body h5 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; color: #172B4D; }
    .cv-desc-body h6 { font-size: 12px; font-weight: 600; margin: 8px 0 4px; color: #5E6C84; text-transform: uppercase; }
    .cv-desc-body ol, .cv-desc-body ul { margin: 4px 0 8px; padding-left: 24px; }
    .cv-desc-body li { margin-bottom: 4px; }
    .cv-desc-body ol { list-style-type: decimal; }
    .cv-desc-body ul { list-style-type: disc; }
    .cv-desc-body table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .cv-desc-body th { background: #F4F5F7; font-weight: 600; text-align: left; }
    .cv-desc-body th, .cv-desc-body td { border: 1px solid #DFE1E6; padding: 8px 12px; font-size: 14px; vertical-align: top; }
    .cv-desc-body blockquote { border-left: 2px solid #DFE1E6; padding: 8px 12px; margin: 8px 0; color: #5E6C84; }
    .cv-desc-body pre { background: #F4F5F7; padding: 12px; border-radius: 4px; font-size: 13px; overflow-x: auto; margin: 4px 0 8px; font-family: 'JetBrains Mono', monospace; }
    .cv-desc-body code { background: #F4F5F7; padding: 2px 4px; border-radius: 3px; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
    .cv-desc-body pre code { background: none; padding: 0; }
    .cv-desc-body p { margin: 0 0 8px; }
    .cv-desc-body a { color: #0052CC; text-decoration: none; }
    .cv-desc-body a:hover { text-decoration: underline; }
    .cv-desc-body hr { border: none; border-top: 1px solid #DFE1E6; margin: 16px 0; }
    .cv-desc-body img { max-width: 100%; border-radius: 4px; cursor: pointer; }
  `;
  document.head.appendChild(s);
}

interface CatalystDescriptionSectionProps {
  issue: PhIssue | null;
  /** Override the section heading (default: "Description") */
  label?: string;
  /** Start collapsed (default: false) */
  defaultCollapsed?: boolean;
}

export function CatalystDescriptionSection({ issue, label = 'Description', defaultCollapsed = false }: CatalystDescriptionSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const queryClient = useQueryClient();
  const epic = isEpic(issue);

  /* One-shot diagnostic so we can see in the browser console which path is
     active for the issue currently being viewed. Removed when the pilot
     is promoted globally. */
  React.useEffect(() => {
    if (!issue) return;
    // eslint-disable-next-line no-console
    console.debug(
      `[CatalystDescriptionSection] issue_key=${issue.issue_key ?? 'n/a'} issue_type=${JSON.stringify(issue.issue_type)} → ${epic ? 'ATLASKIT pilot' : 'TipTap (legacy)'}`,
    );
  }, [issue, epic]);

  // Raw ADF content string for the editor (prefer description_adf_raw → description_adf → text)
  const rawAdfContent = issue?.description_adf
    ? (typeof issue.description_adf === 'string' ? issue.description_adf : JSON.stringify(issue.description_adf))
    : (issue?.description_text || '');

  const descHtml = adfToHtml(issue?.description_adf) || issue?.description_text || '';
  const isEmpty = !descHtml.trim();

  // Mutation to save description
  const saveDescriptionMutation = useMutation({
    mutationFn: async (adfJson: string) => {
      const parsed = adfJson ? JSON.parse(adfJson) : null;
      await supabase
        .from('ph_issues')
        .update({ description_adf: parsed })
        .eq('id', issue!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issue?.id] });
      setEditing(false);
    },
  });

  const handleSave = useCallback((adfJson: string) => {
    if (!issue) return;
    saveDescriptionMutation.mutate(adfJson);
  }, [issue, saveDescriptionMutation]);

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header with expand/collapse + edit button */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 14, fontWeight: 600, color: '#172B4D',
          marginBottom: collapsed ? 0 : 8, userSelect: 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1 }}
        >
          <ChevronRight
            size={16}
            style={{
              transition: 'transform 0.15s ease',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              color: '#5E6C84',
            }}
          />
          {label}
          {epic && <AtlaskitPilotBadge />}
        </div>
        {/* Edit pencil — visible on hover, hidden when editing or collapsed */}
        {!collapsed && !editing && issue && (
          <button
            onClick={() => setEditing(true)}
            title="Edit description"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 4, color: '#6B778C',
              display: 'flex', alignItems: 'center',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s, color 0.1s, background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        editing && issue ? (
          /* ── Edit mode ── */
          epic ? (
            <div style={{ paddingLeft: 20 }}>
              <AtlaskitBoundary
                diagnosticTag={`epic-edit:${issue.issue_key ?? issue.id}`}
                fallback={
                  <CatalystRichTextEditor
                    content={rawAdfContent}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    placeholder="Add a description..."
                    minHeight={200}
                    mode="save"
                    workItemId={issue.id}
                    storagePath="description-images"
                  />
                }
              >
                <Suspense fallback={<AtlaskitFallback minHeight={240} />}>
                  <EpicDescriptionEditor
                    initialContent={issue.description_adf ?? issue.description_text ?? null}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    workItemId={issue.id}
                    placeholder="Add a description..."
                  />
                </Suspense>
              </AtlaskitBoundary>
            </div>
          ) : (
            <div style={{ paddingLeft: 20 }}>
              <CatalystRichTextEditor
                content={rawAdfContent}
                onSave={handleSave}
                onCancel={handleCancel}
                placeholder="Add a description..."
                minHeight={200}
                mode="save"
                workItemId={issue.id}
                storagePath="description-images"
              />
            </div>
          )
        ) : isEmpty ? (
          /* ── Empty placeholder — click to edit ── */
          <div
            onClick={() => { if (issue) setEditing(true); }}
            style={{
              fontSize: 14, color: '#97A0AF', fontStyle: 'italic',
              minHeight: 40, paddingLeft: 20, cursor: issue ? 'pointer' : 'default',
              borderRadius: 4, padding: '8px 20px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (issue) e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Add a description...
          </div>
        ) : (
          /* ── Read-only ADF render — click to edit ── */
          epic ? (
            <div
              style={{
                paddingLeft: 20, minHeight: 40, cursor: 'text', borderRadius: 4,
                position: 'relative',
              }}
              onDoubleClick={() => { if (issue) setEditing(true); }}
            >
              <AtlaskitBoundary
                diagnosticTag={`epic-view:${issue?.issue_key ?? issue?.id ?? 'n/a'}`}
                fallback={
                  <div className="cv-desc-body" style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7 }}>
                    <AdfDescriptionRenderer html={descHtml} issueKey={issue?.issue_key} />
                  </div>
                }
              >
                <Suspense fallback={<AtlaskitFallback minHeight={40} />}>
                  <EpicDescriptionRenderer content={issue?.description_adf ?? issue?.description_text ?? null} issueKey={issue?.issue_key} />
                </Suspense>
              </AtlaskitBoundary>
            </div>
          ) : (
            <div
              className="cv-desc-body"
              style={{
                fontSize: 14, color: '#172B4D', lineHeight: 1.7,
                minHeight: 40, paddingLeft: 20, cursor: 'text',
                borderRadius: 4, position: 'relative',
              }}
              onDoubleClick={() => { if (issue) setEditing(true); }}
            >
              <AdfDescriptionRenderer html={descHtml} issueKey={issue?.issue_key} />
            </div>
          )
        )
      )}
    </div>
  );
}

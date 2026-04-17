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
import { prefetchEpicEditor } from '@/lib/atlaskitPrefetch';
import type { PhIssue } from '../types';

/* Atlaskit pilot — Epic only.
   LAYER 1 — STRICT VIEW/EDIT SPLIT (Atlassian-canonical).
   The renderer chunk (~400–600KB) is loaded on Epic view.
   The editor-core chunk (~2MB) is loaded only on Edit click.

   These lazy imports MUST target the component files directly, NOT the
   `@/components/shared/rich-text/atlaskit` barrel. Rollup treats each
   `import(...)` specifier as the module boundary for the generated chunk:
   if both dynamic imports resolve to the same barrel module, Rollup
   hoists every barrel re-export into one chunk — so loading the
   Renderer drags `@atlaskit/editor-core` with it. Direct file imports
   keep the two graphs separate and let the renderer load alone on view.

   Wrapped in AtlaskitBoundary so a chunk-load failure or runtime error
   surfaces in the console and the existing TipTap path is used as fallback. */
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);
const EpicDescriptionRenderer = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer'),
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

/* LAYER 2 (mini) — pre-hydration placeholder parity.
   Renders the description via the synchronous HTML path that is already
   in the main bundle, so the text is on screen in <5ms. When the real
   @atlaskit/renderer chunk arrives, React swaps it in with matching
   typography and lineHeight — no layout shift, no flash of empty state.
   This is the same DOM the Atlaskit-failure fallback produces, so the
   placeholder is guaranteed to match the chunk-failure path as well. */
function AtlaskitRendererPlaceholder({
  html,
  issueKey,
}: {
  html: string;
  issueKey?: string;
}) {
  return (
    <div
      className="cv-desc-body"
      style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7 }}
    >
      <AdfDescriptionRenderer html={html} issueKey={issueKey} />
    </div>
  );
}

/* Build-ID marker so we can distinguish which deployed commit is running
   by looking at the console without checking chunk hashes. Update when
   the pilot surface changes materially. */
const PILOT_BUILD_ID = 'atlaskit-editor-core-v217 [e5f0102]';

/* Visible marker — emitted next to the Description heading when the
   Epic-only pilot molecule is active. Badge text reflects which engine
   actually ran at render time (atlaskit vs tiptap fallback). */
function AtlaskitPilotBadge({ engine }: { engine: 'atlaskit' | 'tiptap-fallback' }) {
  return (
    <span
      title={`Epic description pilot — engine=${engine}  build=${PILOT_BUILD_ID}`}
      style={{
        marginLeft: 6, padding: '1px 6px', borderRadius: 3,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
        background: engine === 'atlaskit' ? '#E3FCEF' : '#FFF7E6',
        color: engine === 'atlaskit' ? '#006644' : '#974F0C',
        textTransform: 'uppercase',
      }}
    >
      {engine === 'atlaskit' ? 'ATLASKIT' : 'TIPTAP FALLBACK'}
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
  const [engineState, setEngineState] = useState<'atlaskit' | 'tiptap-fallback'>('atlaskit');

  /* Per-issue diagnostic at info level (visible at default console filter).
     Prints the build ID so we can confirm which deployed bundle is live
     without inspecting chunk hashes. */
  React.useEffect(() => {
    if (!issue) return;
    // eslint-disable-next-line no-console
    console.info(
      `[CatalystDescriptionSection] build=${PILOT_BUILD_ID} issue_key=${issue.issue_key ?? 'n/a'} issue_type=${JSON.stringify(issue.issue_type)} → ${epic ? 'ATLASKIT pilot' : 'TipTap (legacy)'}`,
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
            /*
             * Layer 3 — intent-based prefetch.
             * Epic editor chunk is ~2MB; start its dynamic import the
             * moment the user hovers or focuses the pencil. By the time
             * the click fires, vendor-atlaskit-editor is in the HTTP
             * cache and <EpicDescriptionEditor /> mounts synchronously
             * from Suspense. No visible loading state for 95% of users.
             * Only run for Epics — non-Epic path uses Tiptap (already in
             * the main bundle, no prefetch needed).
             */
            onMouseEnter={e => {
              e.currentTarget.style.color = '#172B4D';
              e.currentTarget.style.background = '#F4F5F7';
              if (epic) prefetchEpicEditor();
            }}
            onFocus={() => { if (epic) prefetchEpicEditor(); }}
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
                onFallback={() => setEngineState('tiptap-fallback')}
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
          /* ── Read-only ADF render — click anywhere to edit (Jira parity) ── */
          epic ? (
            <div
              role="button"
              tabIndex={0}
              style={{
                paddingLeft: 20, minHeight: 40, cursor: 'text', borderRadius: 4,
                position: 'relative',
                transition: 'background 0.15s',
              }}
              onClick={() => { if (issue) setEditing(true); }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && issue) {
                  e.preventDefault();
                  setEditing(true);
                }
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title="Click to edit"
            >
              <AtlaskitBoundary
                diagnosticTag={`epic-view:${issue?.issue_key ?? issue?.id ?? 'n/a'}`}
                onFallback={() => setEngineState('tiptap-fallback')}
                fallback={
                  <AtlaskitRendererPlaceholder html={descHtml} issueKey={issue?.issue_key} />
                }
              >
                <Suspense
                  fallback={
                    <AtlaskitRendererPlaceholder html={descHtml} issueKey={issue?.issue_key} />
                  }
                >
                  <EpicDescriptionRenderer content={issue?.description_adf ?? issue?.description_text ?? null} issueKey={issue?.issue_key} />
                </Suspense>
              </AtlaskitBoundary>
            </div>
          ) : (
            <div
              className="cv-desc-body"
              role="button"
              tabIndex={0}
              style={{
                fontSize: 14, color: '#172B4D', lineHeight: 1.7,
                minHeight: 40, paddingLeft: 20, cursor: 'text',
                borderRadius: 4, position: 'relative',
                transition: 'background 0.15s',
              }}
              onClick={() => { if (issue) setEditing(true); }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && issue) {
                  e.preventDefault();
                  setEditing(true);
                }
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title="Click to edit"
            >
              <AdfDescriptionRenderer html={descHtml} issueKey={issue?.issue_key} />
            </div>
          )
        )
      )}
    </div>
  );
}

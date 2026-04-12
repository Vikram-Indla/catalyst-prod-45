/**
 * CANONICAL — Description section for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Renders ADF (Atlassian Document Format) content with full Jira-parity
 * (headings, bold, numbered lists, tables with borders, media with lightbox).
 * Includes expand/collapse toggle matching Jira's collapsible sections.
 * Falls back to plain text. Shows placeholder when empty.
 */
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { adfToHtml } from '@/modules/project-work-hub/utils/adfToHtml';
import { AdfDescriptionRenderer } from '@/modules/project-work-hub/components/AdfDescriptionRenderer';
import type { PhIssue } from '../types';

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
  const descHtml = adfToHtml(issue?.description_adf) || issue?.description_text || '';
  const isEmpty = !descHtml.trim();

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section header with expand/collapse */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: collapsed ? 0 : 8,
          userSelect: 'none',
        }}
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

      {/* Collapsible body */}
      {!collapsed && (
        isEmpty ? (
          <div style={{ fontSize: 14, color: '#97A0AF', fontStyle: 'italic', minHeight: 40, paddingLeft: 20 }}>
            Add a description…
          </div>
        ) : (
          <div className="cv-desc-body" style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, minHeight: 40, paddingLeft: 20 }}>
            <AdfDescriptionRenderer html={descHtml} issueKey={issue?.issue_key} />
          </div>
        )
      )}
    </div>
  );
}

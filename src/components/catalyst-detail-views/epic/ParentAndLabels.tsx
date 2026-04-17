/**
 * ParentAndLabels — Above-description metadata strip for the Epic detail view.
 *
 * Renders Parent + Labels in a vertical "Details"-style rhythm (label on top,
 * value below) matching the sidebar Details card. Wraps the canonical
 * `CatalystParentLinker` (so functionality + ringfencing are untouched) and
 * adds a read-only Labels chip strip sourced from `ph_issues.labels`.
 */
import React from 'react';
import { CatalystParentLinker } from '../shared/sections';
import type { PhIssue } from '../shared/types';
import type { CatalystItemType } from '../shared/types';

interface ParentAndLabelsProps {
  issue: PhIssue | null;
  itemId: string;
  itemType: CatalystItemType;
  projectKey?: string;
  onOpenItem?: (itemId: string) => void;
}

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#44546F',
  textTransform: 'none',
  letterSpacing: 0,
  marginBottom: 6,
  display: 'block',
};

const LABEL_CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 22,
  padding: '0 8px',
  borderRadius: 3,
  background: '#F1F2F4',
  color: '#44546F',
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

export function ParentAndLabels({
  issue,
  itemId,
  itemType,
  projectKey,
  onOpenItem,
}: ParentAndLabelsProps) {
  const labels = (issue?.labels ?? []).filter(Boolean);

  return (
    <>
      <style>{`
        .cv-parent-strip > div > span:first-child { display: none !important; }
        .cv-parent-strip > div { padding: 0 !important; gap: 0 !important; }
        .cv-parent-strip > div > div { flex: 1 1 auto !important; }
      `}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          columnGap: 32,
          rowGap: 4,
          padding: '4px 0 16px',
        }}
      >
        {/* Parent */}
        <div style={{ minWidth: 0 }}>
          <span style={FIELD_LABEL}>Parent</span>
          <div className="cv-parent-strip">
            <CatalystParentLinker
              issue={issue}
              itemId={itemId}
              itemType={itemType}
              projectKey={projectKey}
              onOpenItem={onOpenItem}
            />
          </div>
        </div>

        {/* Labels */}
        <div style={{ minWidth: 0 }}>
          <span style={FIELD_LABEL}>Labels</span>
          {labels.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {labels.map((l) => (
                <span key={l} style={LABEL_CHIP}>
                  {l}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#7A869A' }}>None</span>
          )}
        </div>
      </div>
    </>
  );
}

export default ParentAndLabels;

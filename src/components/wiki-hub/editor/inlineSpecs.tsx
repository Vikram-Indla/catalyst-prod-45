/**
 * inlineSpecs — custom BlockNote inline content for the Catalyst Wiki
 * (CAT-DOCS-NOTION-20260704-001 P7): @-mention chips for work items and
 * wiki page links. Rendered via createReactInlineContentSpec, styled with
 * ADS tokens only. Non-editable (content: 'none') — the chip is atomic.
 */
import type { CSSProperties } from 'react';
import { createReactInlineContentSpec } from '@blocknote/react';
import { Routes } from '@/lib/routes';

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  maxWidth: 320,
  padding: '0 6px',
  borderRadius: 4,
  border: '1px solid var(--ds-border)',
  background: 'var(--ds-background-neutral)',
  color: 'var(--ds-text)',
  font: 'var(--ds-font-body-small)',
  verticalAlign: 'baseline',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const truncateStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** Work-item mention chip, e.g. [BAU-5389 Fix login redirect]. */
export const workItemMention = createReactInlineContentSpec(
  {
    type: 'workItemMention',
    propSchema: {
      entityType: { default: 'issue' },
      entityId: { default: '' },
      label: { default: '' },
      title: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { label, title } = props.inlineContent.props;
      return (
        <span style={chipStyle} data-entity-type={props.inlineContent.props.entityType}>
          <span style={{ fontWeight: 600, flexShrink: 0 }}>{label}</span>
          {title ? (
            <span style={{ ...truncateStyle, color: 'var(--ds-text-subtle)' }}>{title}</span>
          ) : null}
        </span>
      );
    },
  },
);

/** Wiki page link chip, e.g. [📄 Release notes]. Plain <a> — no router context needed. */
export const pageLink = createReactInlineContentSpec(
  {
    type: 'pageLink',
    propSchema: {
      pageId: { default: '' },
      slug: { default: '' },
      workspaceSlug: { default: '' },
      title: { default: '' },
      // Nullable emoji — propSchema only carries scalars, '' means "no icon".
      icon: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { workspaceSlug, slug, title, icon } = props.inlineContent.props;
      return (
        <a href={Routes.wiki.page(workspaceSlug, slug)} style={chipStyle}>
          <span aria-hidden style={{ flexShrink: 0 }}>{icon || '📄'}</span>
          <span style={truncateStyle}>{title || 'Untitled'}</span>
        </a>
      );
    },
  },
);

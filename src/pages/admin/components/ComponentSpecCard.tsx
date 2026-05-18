/**
 * ComponentSpecCard — right-pane detail view of a single registry entry.
 *
 * Authored: 2026-05-17 (preflight Step 7).
 *
 * Rendered inside InventoryPane in ComponentsAdminPage when the user selects
 * a component from the side-navigation. Surfaces every field on the entry
 * plus aggregate consumer information sourced from usage-map.generated.ts.
 *
 * Hard guardrails (CLAUDE.md):
 *   - @atlaskit/* primitives only (Lozenge, Badge, Heading, Inline message)
 *   - ADS tokens for all colors (no raw hex)
 *   - File-path link uses vscode://file/ so engineers can jump to source
 *   - No hand-rolled menus
 */
import { useState } from 'react';
import Lozenge from '@atlaskit/lozenge';
import Heading from '@atlaskit/heading';
import Badge from '@atlaskit/badge';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

import type { ComponentRegistryEntry } from '@/registry/components.registry';
import { getAllConsumersByName, getUsageByName } from '@/registry/usage-map.generated';
import ComponentLivePreview from './ComponentLivePreview';

const CONSUMER_PREVIEW_LIMIT = 10;
const REPO_ROOT = '/Users/vikramindla/Documents/GitHub/catalyst-prod-45';

function StatusBadge({ status }: { status: ComponentRegistryEntry['status'] }) {
  if (status === 'canonical') return <Lozenge appearance="success">Canonical</Lozenge>;
  if (status === 'deprecated') return <Lozenge appearance="moved">Deprecated</Lozenge>;
  if (status === 'banned') return <Lozenge appearance="removed">Banned</Lozenge>;
  return <Lozenge>Observed</Lozenge>;
}

function CategoryBadge({ category }: { category: ComponentRegistryEntry['category'] }) {
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 3,
        background: token('color.background.neutral', '#091E420F'),
        color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
      }}
    >
      {label}
    </span>
  );
}

function VscodeLink({ path, label }: { path: string; label?: string }) {
  // path is repo-relative; vscode://file/ wants an absolute path.
  const href = `vscode://file/${REPO_ROOT}/${path}`;
  return (
    <a
      href={href}
      style={{
        color: token('color.link', '#0C66E4'),
        textDecoration: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", "Roboto Mono", monospace',
        fontSize: 12,
      }}
    >
      {label ?? path}
    </a>
  );
}

function FeatureFlagsTable({ flags }: { flags: NonNullable<ComponentRegistryEntry['feature_flags']> }) {
  return (
    <div>
      <Heading size="xsmall">Feature flags</Heading>
      <div
        style={{
          marginTop: token('space.100', '8px'),
          border: `1px solid ${token('color.border', '#DCDFE4')}`,
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: token('color.background.neutral.subtle', '#F7F8F9') }}>
              <th style={{ textAlign: 'left', padding: token('space.100', '8px'), fontWeight: 600 }}>Flag</th>
              <th style={{ textAlign: 'left', padding: token('space.100', '8px'), fontWeight: 600 }}>Default</th>
              <th style={{ textAlign: 'left', padding: token('space.100', '8px'), fontWeight: 600 }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(flag => (
              <tr key={flag.name} style={{ borderTop: `1px solid ${token('color.border', '#DCDFE4')}` }}>
                <td
                  style={{
                    padding: token('space.100', '8px'),
                    fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", "Roboto Mono", monospace',
                    fontSize: 12,
                    color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                    verticalAlign: 'top',
                  }}
                >
                  {flag.name}
                </td>
                <td
                  style={{
                    padding: token('space.100', '8px'),
                    color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
                    verticalAlign: 'top',
                  }}
                >
                  {String(flag.default)}
                </td>
                <td
                  style={{
                    padding: token('space.100', '8px'),
                    color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                    verticalAlign: 'top',
                  }}
                >
                  {flag.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConsumerList({ name }: { name: string }) {
  const consumers = getAllConsumersByName(name);
  const variants = getUsageByName(name);
  const [expanded, setExpanded] = useState(false);

  if (consumers.length === 0) {
    return (
      <div
        style={{
          color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
          fontSize: 13,
          fontStyle: 'italic',
        }}
      >
        No live consumers found by the AST scan. (This is expected for entries
        not yet rendered, or names that don't match any imported identifier.)
      </div>
    );
  }

  const visible = expanded ? consumers : consumers.slice(0, CONSUMER_PREVIEW_LIMIT);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
          marginBottom: token('space.100', '8px'),
        }}
      >
        <Heading size="xsmall">Consumers</Heading>
        <Badge>{consumers.length}</Badge>
        {variants.length > 1 && (
          <span style={{ fontSize: 11, color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)') }}>
            across {variants.length} import source{variants.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: token('space.050', '4px'),
        }}
      >
        {visible.map(path => (
          <li key={path}>
            <VscodeLink path={path} />
          </li>
        ))}
      </ul>
      {consumers.length > CONSUMER_PREVIEW_LIMIT && (
        <div style={{ marginTop: token('space.150', '12px') }}>
          <Button
            appearance="subtle"
            onClick={() => setExpanded(prev => !prev)}
            spacing="compact"
          >
            {expanded
              ? `Collapse to top ${CONSUMER_PREVIEW_LIMIT}`
              : `Show all ${consumers.length} consumers`}
          </Button>
        </div>
      )}
    </div>
  );
}

export interface ComponentSpecCardProps {
  entry: ComponentRegistryEntry;
}

export default function ComponentSpecCard({ entry }: ComponentSpecCardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.300', '24px') }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: token('space.150', '12px'),
            flexWrap: 'wrap',
          }}
        >
          <Heading size="large">{entry.name}</Heading>
          <StatusBadge status={entry.status} />
          <CategoryBadge category={entry.category} />
          <span style={{ fontSize: 12, color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)') }}>
            v{entry.version}
          </span>
        </div>

        {entry.file_path && (
          <div style={{ marginTop: token('space.100', '8px') }}>
            <VscodeLink path={entry.file_path} />
          </div>
        )}

        {entry.atlaskit_package && (
          <div
            style={{
              marginTop: token('space.075', '6px'),
              fontSize: 12,
              color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
            }}
          >
            Atlaskit package: <code>{entry.atlaskit_package}</code>
          </div>
        )}

        {entry.ads_origin_url && (
          <div style={{ marginTop: token('space.075', '6px') }}>
            <a
              href={entry.ads_origin_url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: token('color.link', '#0C66E4'),
                fontSize: 12,
                textDecoration: 'none',
              }}
            >
              View on atlassian.design ↗
            </a>
          </div>
        )}

        {entry.jsdoc_excerpt && (
          <p
            style={{
              marginTop: token('space.200', '16px'),
              fontSize: 14,
              lineHeight: '20px',
              color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
            }}
          >
            {entry.jsdoc_excerpt}
          </p>
        )}
      </div>

      {entry.status === 'deprecated' && entry.deprecation_target && (
        <div
          style={{
            padding: token('space.150', '12px'),
            borderRadius: 6,
            background: token('color.background.warning', '#FFF7D6'),
            color: token('color.text.warning', '#7F5F01'),
            fontSize: 13,
          }}
        >
          Deprecated. Migrate consumers to{' '}
          <strong>{entry.deprecation_target}</strong>.
        </div>
      )}

      {entry.feature_flags && entry.feature_flags.length > 0 && (
        <FeatureFlagsTable flags={entry.feature_flags} />
      )}

      <ComponentLivePreview entry={entry} />

      <ConsumerList name={entry.name} />

      {entry.tags && entry.tags.length > 0 && (
        <div style={{ display: 'flex', gap: token('space.075', '6px'), flexWrap: 'wrap' }}>
          {entry.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 12,
                background: token('color.background.neutral', '#091E420F'),
                color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

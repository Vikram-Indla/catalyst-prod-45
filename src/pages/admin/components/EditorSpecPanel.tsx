/**
 * EditorSpecPanel — deep engineering spec renderer for high-stake components.
 *
 * Rendered inside ComponentSpecCard when a registry entry carries an editor_spec.
 * Surfaces: props table (required/optional split), data contract, architecture,
 * hard constraints, canonical usage snippet, and external docs links.
 *
 * ADS-compliant: @atlaskit/* only, token() for all colours.
 */
import { useState } from 'react';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

import type { ComponentEditorSpec, ComponentPropSpec } from '@/registry/components.registry';

// ─── Sub-components ────────────────────────────────────────────────────────────

function PropTypeChip({ type }: { type: string }) {
  return (
    <code
      style={{
        fontSize: 'var(--ds-font-size-100)',
        fontFamily: 'var(--ds-font-family-code)',
        background: token('color.background.neutral', '#091E420F'),
        color: token('color.text', 'var(--ds-text)'),
        padding: '1px 6px',
        borderRadius: 3,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {type}
    </code>
  );
}

function PropRow({ prop }: { prop: ComponentPropSpec }) {
  return (
    <tr
      style={{
        borderTop: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
        verticalAlign: 'top',
      }}
    >
      <td style={{ padding: token('space.100', '8px'), minWidth: 140 }}>
        <span
          style={{
            fontFamily: 'var(--ds-font-family-code)',
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 600,
            color: token('color.text', 'var(--ds-text)'),
          }}
        >
          {prop.name}
        </span>
      </td>
      <td style={{ padding: token('space.100', '8px') }}>
        {prop.required ? (
          <Lozenge appearance="removed">required</Lozenge>
        ) : (
          <Lozenge appearance="default">optional</Lozenge>
        )}
      </td>
      <td style={{ padding: token('space.100', '8px'), maxWidth: 220 }}>
        <PropTypeChip type={prop.type} />
      </td>
      <td
        style={{
          padding: token('space.100', '8px'),
          fontSize: 'var(--ds-font-size-200)',
          color: token('color.text.subtle', 'var(--ds-icon)'),
          fontFamily: 'var(--ds-font-family-code)',
        }}
      >
        {prop.default ?? <span style={{ fontStyle: 'italic' }}>—</span>}
      </td>
      <td
        style={{
          padding: token('space.100', '8px'),
          fontSize: 'var(--ds-font-size-300)',
          color: token('color.text', 'var(--ds-text)'),
          lineHeight: '18px',
        }}
      >
        {prop.description}
      </td>
    </tr>
  );
}

function PropsTable({ props }: { props: ComponentPropSpec[] }) {
  const required = props.filter((p) => p.required);
  const optional = props.filter((p) => !p.required);

  const headerStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: token('space.100', '8px'),
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 600,
    color: token('color.text.subtle', 'var(--ds-icon)'),
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
    whiteSpace: 'nowrap' as const,
  };

  const sectionLabelStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: 'var(--ds-font-size-100)',
    fontWeight: 600,
    color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
    background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  };

  return (
    <div
      style={{
        border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--ds-font-size-300)' }}>
        <thead>
          <tr>
            <th style={headerStyle}>Prop</th>
            <th style={headerStyle}>Required</th>
            <th style={headerStyle}>Type</th>
            <th style={headerStyle}>Default</th>
            <th style={{ ...headerStyle, width: '40%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {required.length > 0 && (
            <>
              <tr>
                <td colSpan={5} style={sectionLabelStyle}>
                  Required props ({required.length})
                </td>
              </tr>
              {required.map((p) => (
                <PropRow key={p.name} prop={p} />
              ))}
            </>
          )}
          {optional.length > 0 && (
            <>
              <tr>
                <td colSpan={5} style={sectionLabelStyle}>
                  Optional props ({optional.length})
                </td>
              </tr>
              {optional.map((p) => (
                <PropRow key={p.name} prop={p} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <pre
        style={{
          margin: 0,
          padding: token('space.200', '16px'),
          paddingRight: 80,
          background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
          border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
          borderRadius: 6,
          fontSize: 'var(--ds-font-size-200)',
          fontFamily: 'var(--ds-font-family-code)',
          color: token('color.text', 'var(--ds-text)'),
          overflowX: 'auto',
          whiteSpace: 'pre',
          lineHeight: '20px',
        }}
      >
        {code}
      </pre>
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <Button appearance="subtle" spacing="compact" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export interface EditorSpecPanelProps {
  spec: ComponentEditorSpec;
  componentName: string;
  filePath?: string;
}

const REPO_ROOT = '/Users/vikramindla/Documents/GitHub/catalyst-prod-45';

export function EditorSpecPanel({ spec, componentName, filePath }: EditorSpecPanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.300', '24px'),
        paddingTop: token('space.300', '24px'),
        borderTop: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
      }}
    >
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Heading size="medium">Engineering spec</Heading>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {spec.atlaskit_package && (
            <code
              style={{
                fontSize: 'var(--ds-font-size-100)',
                padding: '2px 8px',
                borderRadius: 3,
                background: token('color.background.neutral', '#091E420F'),
                color: token('color.text.subtle', 'var(--ds-icon)'),
                fontFamily: 'var(--ds-font-family-code)',
              }}
            >
              {spec.atlaskit_package}
            </code>
          )}
          {spec.storybook_url && (
            <a
              href={spec.storybook_url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: token('color.link', 'var(--ds-link)'),
                fontSize: 'var(--ds-font-size-200)',
                textDecoration: 'none',
              }}
            >
              View on atlassian.design ↗
            </a>
          )}
          {filePath && (
            <a
              href={`vscode://file/${REPO_ROOT}/${filePath}`}
              style={{
                color: token('color.link', 'var(--ds-link)'),
                fontSize: 'var(--ds-font-size-200)',
                textDecoration: 'none',
                fontFamily: 'var(--ds-font-family-code)',
              }}
            >
              Open in VS Code ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Props reference ─────────────────────────────────────────────────── */}
      <div>
        <div style={{ marginBottom: token('space.150', '12px') }}>
          <Heading size="xsmall">Props reference</Heading>
        </div>
        <PropsTable props={spec.props} />
      </div>

      {/* ── Data contract ───────────────────────────────────────────────────── */}
      {spec.data_contract && (
        <div>
          <div style={{ marginBottom: token('space.100', '8px') }}>
            <Heading size="xsmall">Data contract</Heading>
          </div>
          <div
            style={{
              padding: token('space.150', '12px'),
              borderLeft: `3px solid ${token('color.border.information', '#1D9BF0')}`,
              background: token('color.background.information', 'var(--ds-background-selected)'),
              borderRadius: '0 4px 4px 0',
              fontSize: 'var(--ds-font-size-300)',
              lineHeight: '20px',
              color: token('color.text', 'var(--ds-text)'),
            }}
          >
            {spec.data_contract}
          </div>
        </div>
      )}

      {/* ── Architecture ────────────────────────────────────────────────────── */}
      {spec.architecture && (
        <div>
          <div style={{ marginBottom: token('space.100', '8px') }}>
            <Heading size="xsmall">Architecture</Heading>
          </div>
          <div
            style={{
              padding: token('space.150', '12px'),
              background: token('color.background.neutral.subtle', 'var(--ds-surface-sunken)'),
              border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
              borderRadius: 6,
              fontSize: 'var(--ds-font-size-300)',
              lineHeight: '20px',
              color: token('color.text', 'var(--ds-text)'),
            }}
          >
            {spec.architecture}
          </div>
        </div>
      )}

      {/* ── Constraints ─────────────────────────────────────────────────────── */}
      {spec.constraints && spec.constraints.length > 0 && (
        <div>
          <div style={{ marginBottom: token('space.100', '8px') }}>
            <Heading size="xsmall">Hard constraints</Heading>
          </div>
          <div
            style={{
              border: `1px solid ${token('color.border.warning', 'var(--ds-background-warning-bold)')}`,
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {spec.constraints.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
                  borderTop: i > 0 ? `1px solid ${token('color.border.warning', 'var(--ds-background-warning-bold)')}` : undefined,
                  background: token('color.background.warning', 'var(--ds-background-warning)'),
                }}
              >
                <span style={{ fontSize: 'var(--ds-font-size-400)', flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: '20px', color: token('color.text.warning', 'var(--ds-text-warning)') }}>
                  {c}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Canonical usage ─────────────────────────────────────────────────── */}
      {spec.usage_snippet && (
        <div>
          <div style={{ marginBottom: token('space.100', '8px') }}>
            <Heading size="xsmall">Canonical usage</Heading>
          </div>
          <CodeBlock code={spec.usage_snippet} />
        </div>
      )}
    </div>
  );
}

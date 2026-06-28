import React, { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Tabs from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import EpicDescriptionEditor from '@/components/shared/rich-text/atlaskit/EpicDescriptionEditor';

/**
 * EpicDescriptionEditorPreview — Showcase component for the Atlaskit Editor Core integration.
 * Renders 12 interactive story variants as tabbed interface, each with live editor instance
 * and collapsible ADF JSON output viewer.
 *
 * Variants:
 * 1. Empty — default placeholder visible
 * 2. Rich content (marks) — bold, italic, strike, underline, code, link
 * 3. Rich content (blocks) — headings, lists, code blocks, blockquotes, hr, tables, task lists
 * 4. Image + mention — inline media and @mention
 * 5. Read-only — disabled edit mode
 * 6. minHeight 120px — compact variant
 * 7. minHeight 240px — standard variant
 * 8. minHeight 360px — expanded variant
 * 9. minHeight 600px — full-height variant
 * 10. Dark mode (light appearance) — light theme variant
 * 11. Dark mode (dark appearance) — dark theme variant (simulated via token resolution)
 * 12. Suspense loading state — loading skeleton
 */

interface PreviewVariant {
  id: string;
  name: string;
  description: string;
  initialContent: unknown;
  appearance?: 'comment' | 'chromeless' | 'full-page';
  minHeight?: number;
}

const PREVIEW_VARIANTS: PreviewVariant[] = [
  {
    id: 'empty',
    name: 'Empty',
    description: 'Default placeholder state',
    initialContent: null,
    appearance: 'comment',
    minHeight: 240,
  },
  {
    id: 'rich-marks',
    name: 'Rich content (marks)',
    description: 'Bold, italic, strike, underline, code, link text formatting',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This is ' },
            { type: 'text', text: 'bold text', marks: [{ type: 'strong' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'italic text', marks: [{ type: 'em' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'strikethrough', marks: [{ type: 'strike' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'underline', marks: [{ type: 'underline' }] },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'code', marks: [{ type: 'code' }] },
            { type: 'text', text: ' and ' },
            {
              type: 'text',
              text: 'link text',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 240,
  },
  {
    id: 'rich-blocks',
    name: 'Rich content (blocks)',
    description: 'Headings, lists, code blocks, blockquotes, tables, task lists',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Heading 2' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Regular paragraph.' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First item' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second item' }] }],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [
            {
              type: 'text',
              text: 'const x = 42;\nconsole.log(x);',
            },
          ],
        },
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'A blockquote for emphasis.' }] },
          ],
        },
        {
          type: 'rule',
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Incomplete task' }] },
              ],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Completed task' }] },
              ],
            },
          ],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 480,
  },
  {
    id: 'image-mention',
    name: 'Image + mention',
    description: 'Inline image and @mention rich content',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Assigned to ' },
            {
              type: 'mention',
              attrs: {
                id: 'user-123',
                text: 'John Doe',
              },
            },
            { type: 'text', text: ' for review.' },
          ],
        },
        {
          type: 'mediaSingle',
          attrs: { layout: 'center' },
          content: [
            {
              type: 'media',
              attrs: {
                type: 'external',
                url: 'https://via.placeholder.com/320x240?text=Sample+Image',
                alt: 'Sample image',
                width: 320,
                height: 240,
              },
            },
          ],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 360,
  },
  {
    id: 'readonly',
    name: 'Read-only',
    description: 'Editor disabled, content is view-only',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This content is ' },
            { type: 'text', text: 'read-only', marks: [{ type: 'strong' }] },
            { type: 'text', text: ' — editing is disabled.' },
          ],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 240,
  },
  {
    id: 'minheight-120',
    name: 'minHeight 120px',
    description: 'Compact editor height',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Compact variant.' }] }],
    },
    appearance: 'comment',
    minHeight: 120,
  },
  {
    id: 'minheight-240',
    name: 'minHeight 240px',
    description: 'Standard editor height',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Standard variant.' }] }],
    },
    appearance: 'comment',
    minHeight: 240,
  },
  {
    id: 'minheight-360',
    name: 'minHeight 360px',
    description: 'Expanded editor height',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Expanded variant.' }] }],
    },
    appearance: 'comment',
    minHeight: 360,
  },
  {
    id: 'minheight-600',
    name: 'minHeight 600px',
    description: 'Full-height editor',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Full-height variant.' }] }],
    },
    appearance: 'comment',
    minHeight: 600,
  },
  {
    id: 'darkmode-light',
    name: 'Dark mode (light)',
    description: 'Light theme variant (tokens auto-resolve)',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Theme-aware editor. Tokens auto-adjust to light mode.' }],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 240,
  },
  {
    id: 'darkmode-dark',
    name: 'Dark mode (dark)',
    description: 'Dark theme variant (tokens auto-resolve)',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Theme-aware editor. Tokens auto-adjust to dark mode.' }],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 240,
  },
  {
    id: 'suspense',
    name: 'Suspense loading',
    description: 'Editor initializing state',
    initialContent: {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Loading content...' }],
        },
      ],
    },
    appearance: 'comment',
    minHeight: 240,
  },
];

export default function EpicDescriptionEditorPreview() {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [latestAdf, setLatestAdf] = useState<string>('{}');
  const [isJsonVisible, setIsJsonVisible] = useState(false);

  const variant = PREVIEW_VARIANTS[selectedTabIndex];
  const isReadOnly = variant?.id === 'readonly';

  const handleEditorChange = (adfJson: string) => {
    setLatestAdf(adfJson);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.300', '24px') }}>
      {/* Tab navigation */}
      <Tabs
        id="epic-description-preview-tabs"
        selected={selectedTabIndex}
        onChange={(newIdx) => setSelectedTabIndex(newIdx)}
      >
        {PREVIEW_VARIANTS.map((v, idx) => (
          <div key={v.id} title={v.description}>
            <div style={{ display: 'flex', gap: token('space.100', '8px'), alignItems: 'center' }}>
              <span>{v.name}</span>
              {idx < 3 && (
                <Lozenge appearance="success" isSelected={selectedTabIndex === idx}>
                  Happy
                </Lozenge>
              )}
              {idx >= 3 && idx < 5 && (
                <Lozenge appearance="inprogress" isSelected={selectedTabIndex === idx}>
                  State
                </Lozenge>
              )}
            </div>
          </div>
        ))}
      </Tabs>

      {/* Variant description */}
      {variant && (
        <div
          style={{
            fontSize: 13,
            color: token('color.text.subtle', 'var(--ds-icon)'),
            padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
            backgroundColor: token('elevation.surface.sunken', 'var(--ds-surface-sunken)'),
            borderRadius: 3,
          }}
        >
          <strong>{variant.name}</strong> — {variant.description}
        </div>
      )}

      {/* Editor instance */}
      {variant && (
        <div
          style={{
            border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <EpicDescriptionEditor
            initialContent={variant.initialContent}
            workItemId="preview-variant"
            placeholder="Add a description..."
            onChange={handleEditorChange}
            onSave={(adf) => {
              setLatestAdf(adf);
              console.log('[EpicDescriptionEditorPreview] onSave:', adf);
            }}
            onCancel={() => console.log('[EpicDescriptionEditorPreview] onCancel')}
            appearance={variant.appearance || 'comment'}
            readOnly={isReadOnly}
          />
        </div>
      )}

      {/* Collapsible ADF JSON viewer */}
      <div
        style={{
          border: `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: token('space.100', '8px'),
            padding: token('space.150', '12px'),
            backgroundColor: token('elevation.surface.raised', 'var(--ds-surface)'),
            border: 'none',
            borderBottom: isJsonVisible
              ? `1px solid ${token('color.border', 'var(--ds-border-disabled)')}`
              : 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: token('color.text', 'var(--ds-text)'),
            textAlign: 'left',
          }}
          onClick={() => setIsJsonVisible(!isJsonVisible)}
        >
          {isJsonVisible ? <ChevronDownIcon /> : <ChevronRightIcon />}
          ADF Output
        </button>

        {isJsonVisible && (
          <pre
            style={{
              margin: 0,
              padding: token('space.200', '16px'),
              backgroundColor: token('color.background.neutral.subtle', 'var(--ds-background-neutral)'),
              fontSize: 11,
              fontFamily: 'var(--ds-font-family-code)',
              color: token('color.text', 'var(--ds-text)'),
              overflowX: 'auto',
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            {JSON.stringify(JSON.parse(latestAdf || '{}'), null, 2)}
          </pre>
        )}
      </div>

      {/* Instructions */}
      <div
        style={{
          fontSize: 12,
          color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
          padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
          backgroundColor: token('color.background.information.subtle', '#DEEBF7'),
          borderRadius: 3,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>How to use:</div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Click tabs to switch between variants</li>
          <li>Type or paste content to update the editor</li>
          <li>Click "ADF Output" to expand JSON viewer</li>
          <li>Check browser console for onChange / onSave events</li>
          <li>Toggle system dark mode to test theme auto-resolution</li>
        </ul>
      </div>
    </div>
  );
}

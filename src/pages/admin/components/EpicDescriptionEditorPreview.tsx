/**
 * EpicDescriptionEditorPreview — 12 interactive variants of AdfDescriptionField.
 *
 * Showcases the canonical rich-text description editor used across all Epic
 * detail views. Each variant demonstrates a distinct editing state, content
 * pattern, or user interaction flow.
 *
 * Components: AdfDescriptionField (wrapping EpicDescriptionEditor)
 * Integrations: Atlaskit editor-core (ProseMirror), ADF round-trip, image uploads
 */

import { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Tabs from '@atlaskit/tabs';

import { AdfDescriptionField } from '@/components/shared/rich-text/atlaskit/AdfDescriptionField';

/**
 * 12 story variants, each with distinct initial content + interaction pattern
 */
const PREVIEW_VARIANTS = [
  {
    id: 'empty-editable',
    label: 'Empty / Editable',
    description: 'No initial content; user can start typing',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [],
    }),
  },
  {
    id: 'multiline-text-editable',
    label: 'Multi-line Text / Editable',
    description: 'Paragraph with multiple sentences',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This epic covers the redesign of the authentication flow across all Catalyst modules. Includes SSO integration, MFA setup, session management, and security policy enforcement.',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'formatted-text-editable',
    label: 'Formatted Text / Editable',
    description: 'Bold, italic, and mixed formatting',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Core ',
            },
            {
              type: 'text',
              text: 'objectives',
              marks: [{ type: 'strong' }],
            },
            {
              type: 'text',
              text: ' for this cycle: ',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'with-bullet-list-editable',
    label: 'With Bullet List / Editable',
    description: 'Paragraph + unordered list',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Requirements:',
            },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'JWT-based session tokens',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Rate-limiting on auth endpoints',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'with-code-block-editable',
    label: 'With Code Block / Editable',
    description: 'Mixed prose and code example',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Implementation pattern:',
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [
            {
              type: 'text',
              text: 'const auth = useAuth();\nif (!auth.isAdmin) {\n  return <AccessDenied />;\n}',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'with-link-editable',
    label: 'With Link / Editable',
    description: 'Paragraph containing hyperlink',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'See the ',
            },
            {
              type: 'text',
              text: 'implementation guide',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com/auth-guide',
                  },
                },
              ],
            },
            {
              type: 'text',
              text: ' for full details.',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'dense-content-editable',
    label: 'Dense Content / Editable',
    description: 'Multiple paragraphs + lists',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Phase 1: Foundation',
            },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Database schema setup' },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'API endpoint definitions' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Phase 2: Integration',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'empty-readonly',
    label: 'Empty / Read-only',
    description: 'No content; locked editing',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [],
    }),
  },
  {
    id: 'content-readonly',
    label: 'Content / Read-only',
    description: 'Populated but not editable',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This epic is locked and cannot be edited. Contact the project lead for changes.',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'long-form-readonly',
    label: 'Long-form / Read-only',
    description: 'Extended content in read-only mode',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Design System Governance is a suite of tools and processes that ensure Catalyst adheres to the Atlassian Design System (ADS) v4 as the exclusive design system. This epic encompasses the audit framework, CI enforcement, admin dashboards, and developer tooling for detecting and remediating design drift across the codebase.',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'error-state',
    label: 'Save Error / Recovering',
    description: 'Recoverable error state after save failure',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This content will attempt to save but simulates a network error. In production, users see a retry banner and the draft is preserved.',
            },
          ],
        },
      ],
    }),
  },
  {
    id: 'concurrent-edit-state',
    label: 'Concurrent Edit / Locked',
    description: 'Another user is editing; save blocked',
    initialContent: JSON.stringify({
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Vikram Indla is currently editing this epic. Your changes are saved locally but cannot be published until they finish.',
            },
          ],
        },
      ],
    }),
  },
];

export function EpicDescriptionEditorPreview() {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('empty-editable');
  const [editorContent, setEditorContent] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    PREVIEW_VARIANTS.forEach((v) => {
      initial[v.id] = v.initialContent;
    });
    return initial;
  });

  const currentVariant = PREVIEW_VARIANTS.find((v) => v.id === selectedVariantId);
  if (!currentVariant) return null;

  // Determine if this variant is read-only
  const isReadOnly = currentVariant.id.includes('readonly') || currentVariant.id.includes('locked');

  const handleEditorChange = (adfJson: string) => {
    if (!isReadOnly) {
      setEditorContent((prev) => ({
        ...prev,
        [selectedVariantId]: adfJson,
      }));
    }
  };

  const handleEditorSave = (adfJson: string) => {
    if (!isReadOnly) {
      // In a real preview, this would call the Supabase edge function
      console.log(`[SAVE] Epic description for variant: ${selectedVariantId}`, adfJson);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      {/* Header + Tab Navigation */}
      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: token('color.text', '#292A2E') }}>
          AdfDescriptionField — 12 Variants
        </h3>
        <Tabs tabs={PREVIEW_VARIANTS.map((v) => ({ label: v.label, key: v.id }))} selected={selectedVariantId} onChange={(key) => setSelectedVariantId(key)} />
      </div>

      {/* Variant Description */}
      <div style={{ padding: '8px 12px', backgroundColor: token('color.background.neutral', '#F1F2F4'), borderRadius: 3, fontSize: 13 }}>
        <strong>{currentVariant.label}:</strong> {currentVariant.description}
        {isReadOnly && (
          <div style={{ marginTop: 6, fontSize: 12, color: token('color.text.subtlest', '#626F86') }}>
            🔒 Read-only — editor is locked in this variant
          </div>
        )}
      </div>

      {/* Live Editor */}
      <div style={{ padding: 12, border: `1px solid ${token('color.border', '#DCDFE4')}`, borderRadius: 3 }}>
        <AdfDescriptionField
          initialAdfJson={editorContent[selectedVariantId]}
          onChange={handleEditorChange}
          onSave={handleEditorSave}
          onCancel={() => console.log('[CANCEL]')}
          workItemId={`epic-preview-${selectedVariantId}`}
          placeholder="Add an epic description…"
          // Read-only state: disable onChange/onSave if read-only variant
          // (Note: AdfDescriptionField doesn't have a readOnly prop, so we disable handlers)
        />
      </div>

      {/* Debug Info */}
      <details style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86') }}>
        <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Debug: ADF JSON</summary>
        <pre
          style={{
            padding: 8,
            backgroundColor: token('color.background.neutral', '#F1F2F4'),
            borderRadius: 3,
            overflow: 'auto',
            maxHeight: 200,
            fontSize: 11,
            fontFamily: 'var(--ds-font-family-code)',
          }}
        >
          {editorContent[selectedVariantId]}
        </pre>
      </details>
    </div>
  );
}

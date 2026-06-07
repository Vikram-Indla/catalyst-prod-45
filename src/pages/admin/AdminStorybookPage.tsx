import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Tabs from '@atlaskit/tabs';
import { TabPanel } from '@atlaskit/tabs';
import Section from '@atlaskit/section-message';

const T = {
  text: 'var(--ds-text)',
  textSubtle: 'var(--ds-text-subtle)',
  bgPage: 'var(--ds-background-accent-gray-subtlest)',
  border: 'var(--ds-border)',
  code: '#f4f5f7',
};

const CodeBlock = ({ code }: { code: string }) => (
  <pre
    style={{
      background: T.code,
      border: `1px solid ${T.border}`,
      borderRadius: '3px',
      padding: '12px',
      overflow: 'auto',
      fontSize: '12px',
      fontFamily: 'monospace',
      lineHeight: '1.5',
      color: T.text,
      margin: '8px 0',
    }}
  >
    {code}
  </pre>
);

const ComponentSection = ({
  name,
  npm,
  description,
  installation,
  apiReference,
  examples,
  dosAndDonts,
}: {
  name: string;
  npm: string;
  description: string;
  installation: string;
  apiReference: Array<{ prop: string; type: string; default: string; description: string }>;
  examples: Array<{ title: string; code: string }>;
  dosAndDonts: { dos: string[]; donts: string[] };
}) => (
  <div style={{ marginBottom: '32px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 600, marginTop: '24px', marginBottom: '12px', color: T.text }}>
      {name}
    </h2>

    <div style={{ marginBottom: '16px' }}>
      <p style={{ color: T.textSubtle, margin: '0 0 8px 0' }}>
        <strong>NPM Package:</strong> <code style={{ background: T.code, padding: '2px 6px', borderRadius: '3px' }}>{npm}</code>
      </p>
      <p style={{ color: T.text, margin: '0 0 16px 0' }}>{description}</p>
    </div>

    <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '20px', marginBottom: '8px' }}>Installation</h3>
    <CodeBlock code={installation} />

    <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '20px', marginBottom: '8px' }}>API Reference</h3>
    <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          border: `1px solid ${T.border}`,
        }}
      >
        <thead>
          <tr style={{ background: T.bgPage, borderBottom: `1px solid ${T.border}` }}>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: T.text }}>Prop</th>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: T.text }}>Type</th>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: T.text }}>Default</th>
            <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: T.text }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {apiReference.map((ref, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '8px', color: T.text }}>
                <code style={{ background: T.code, padding: '2px 4px', borderRadius: '2px' }}>{ref.prop}</code>
              </td>
              <td style={{ padding: '8px', color: T.text }}>
                <code style={{ background: T.code, padding: '2px 4px', borderRadius: '2px', fontSize: '11px' }}>{ref.type}</code>
              </td>
              <td style={{ padding: '8px', color: T.textSubtle }}>{ref.default}</td>
              <td style={{ padding: '8px', color: T.text }}>{ref.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '20px', marginBottom: '8px' }}>Usage Examples</h3>
    {examples.map((ex, i) => (
      <div key={i} style={{ marginBottom: '16px' }}>
        <p style={{ fontWeight: 500, color: T.text, margin: '0 0 6px 0' }}>{ex.title}</p>
        <CodeBlock code={ex.code} />
      </div>
    ))}

    <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '20px', marginBottom: '8px' }}>Do's and Don'ts</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
      <div style={{ padding: '12px', background: 'rgba(76, 154, 73, 0.1)', borderLeft: '4px solid rgb(76, 154, 73)', borderRadius: '3px' }}>
        <p style={{ fontWeight: 600, color: 'rgb(76, 154, 73)', margin: '0 0 8px 0' }}>✓ Do's</p>
        <ul style={{ margin: '0', paddingLeft: '16px', color: T.text }}>
          {dosAndDonts.dos.map((d, i) => (
            <li key={i} style={{ margin: '4px 0' }}>
              {d}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ padding: '12px', background: 'rgba(225, 42, 25, 0.1)', borderLeft: '4px solid rgb(225, 42, 25)', borderRadius: '3px' }}>
        <p style={{ fontWeight: 600, color: 'rgb(225, 42, 25)', margin: '0 0 8px 0' }}>✗ Don'ts</p>
        <ul style={{ margin: '0', paddingLeft: '16px', color: T.text }}>
          {dosAndDonts.donts.map((d, i) => (
            <li key={i} style={{ margin: '4px 0' }}>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export function AdminStorybookPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  const components = [
    {
      id: 'tokens',
      name: '@Catalyst/tokens',
      npm: '@Catalyst/tokens',
      description:
        'Design token system providing semantic color, spacing, and typography values. Integrates with Atlassian Design System for consistent theming across Catalyst applications.',
      installation: 'npm install @Catalyst/tokens',
      apiReference: [
        { prop: 'DS_COLOR', type: 'object', default: '—', description: 'Color token map (primary, neutral, danger, warning, success)' },
        { prop: 'DS_SPACING', type: 'object', default: '—', description: 'Spacing grid tokens (4, 8, 16, 24, 32px)' },
        { prop: 'DS_TYPOGRAPHY', type: 'object', default: '—', description: 'Typography scale (heading, body, caption, code)' },
      ],
      examples: [
        {
          title: 'Using color tokens in React',
          code: `import { DS_COLOR } from '@Catalyst/tokens';

<div style={{ background: DS_COLOR.primaryBackground }}>
  Text with primary background
</div>`,
        },
        {
          title: 'Using spacing tokens in styled components',
          code: `import { DS_SPACING } from '@Catalyst/tokens';

const padding = DS_SPACING.md; // 16px
const gap = DS_SPACING.sm;     // 8px`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Use tokens for all color, spacing, and typography',
          'Reference tokens from @Catalyst/tokens in component styles',
          'Build design system extensions on token foundation',
          'Use semantic token names (primary, danger, success)',
        ],
        donts: [
          'Use hardcoded hex colors (#FF0000)',
          'Use arbitrary spacing values (13px, 18px)',
          'Import tokens from @atlaskit/*',
          'Create custom color palettes outside token system',
        ],
      },
    },
    {
      id: 'theme',
      name: '@Catalyst/theme',
      npm: '@Catalyst/theme',
      description:
        'Theme provider and configuration for dark/light mode support. Applies token values to CSS variables and provides runtime theme switching.',
      installation: 'npm install @Catalyst/theme',
      apiReference: [
        { prop: 'ThemeProvider', type: 'React.ComponentType<{children}>', default: '—', description: 'Root wrapper that applies theme tokens to the page' },
        { prop: 'useTheme', type: 'hook', default: '—', description: 'Hook to access current theme object and mode' },
        { prop: 'toggleTheme', type: 'function', default: '—', description: 'Function to switch between dark and light themes' },
      ],
      examples: [
        {
          title: 'Wrap app with ThemeProvider',
          code: `import { ThemeProvider } from '@Catalyst/theme';

export function App() {
  return (
    <ThemeProvider defaultMode="light">
      <MainContent />
    </ThemeProvider>
  );
}`,
        },
        {
          title: 'Use theme hook in component',
          code: `import { useTheme } from '@Catalyst/theme';

export function Header() {
  const { mode, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>
      Switch to {mode === 'light' ? 'dark' : 'light'} mode
    </button>
  );
}`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Wrap root App component with ThemeProvider',
          'Use useTheme hook to access current theme mode',
          'Persist theme mode to localStorage',
          'Respect system theme preference on first load',
        ],
        donts: [
          'Create manual light/dark mode implementation',
          'Hardcode theme values in component styles',
          'Force a theme mode without user control',
          'Bypass ThemeProvider for theme switching',
        ],
      },
    },
    {
      id: 'icons',
      name: '@Catalyst/icons',
      npm: '@Catalyst/icons',
      description:
        'Curated icon set built on Atlassian Design System foundation. Provides consistent 16px and 24px icon variants for all Catalyst UI surfaces.',
      installation: 'npm install @Catalyst/icons',
      apiReference: [
        { prop: 'size', type: '"small" | "medium" | "large"', default: '"medium"', description: 'Icon size: 16px, 24px, or 32px' },
        { prop: 'color', type: 'string', default: 'currentColor', description: 'Icon color (hex, css var, or ADS token)' },
        { prop: 'label', type: 'string', default: '—', description: 'Accessibility label for icon (required if not decorative)' },
      ],
      examples: [
        {
          title: 'Import and use specific icon',
          code: `import { CheckIcon, WarningIcon, ChevronDown } from '@Catalyst/icons';

<CheckIcon size="medium" color="var(--ds-text-success)" />
<WarningIcon size="large" label="Warning" />
<ChevronDown size="small" />`,
        },
        {
          title: 'Icon in button with label',
          code: `import { PlusIcon } from '@Catalyst/icons';

<button style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
  <PlusIcon size="small" />
  Create new item
</button>`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Use @Catalyst/icons exclusively for all UI icons',
          'Provide accessible labels for non-decorative icons',
          'Use appropriate icon size for context (16px in compact, 24px in spacious)',
          'Reference icon color from DS tokens',
        ],
        donts: [
          'Use third-party icon libraries (lucide-react, feather, etc.)',
          'Import icons from @atlaskit/icon',
          'Use hardcoded SVGs for standard Catalyst icons',
          'Resize icons with CSS (breaks pixel perfection)',
        ],
      },
    },
    {
      id: 'primitives',
      name: '@Catalyst/primitives',
      npm: '@Catalyst/primitives',
      description:
        'Low-level React primitives (Button, Input, Card, Dialog, etc.) built on Radix UI and styled with ADS tokens. Atomic foundation for all Catalyst UI.',
      installation: 'npm install @Catalyst/primitives @atlaskit/primitives',
      apiReference: [
        { prop: 'Button', type: 'ComponentType', default: '—', description: 'Semantic button primitive with aria-*, size, and variant props' },
        { prop: 'Input', type: 'ComponentType', default: '—', description: 'Text input primitive with validation state' },
        { prop: 'Card', type: 'ComponentType', default: '—', description: 'Container primitive with elevation and border' },
        { prop: 'Dialog', type: 'ComponentType', default: '—', description: 'Modal dialog primitive with focus management and backdrop' },
      ],
      examples: [
        {
          title: 'Button primitive usage',
          code: `import { Button } from '@Catalyst/primitives';

<Button variant="primary" size="medium">
  Create item
</Button>`,
        },
        {
          title: 'Card with input',
          code: `import { Card, Input } from '@Catalyst/primitives';

<Card style={{ padding: '16px' }}>
  <label>Item name</label>
  <Input type="text" placeholder="Enter name..." />
</Card>`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Build component hierarchies on @Catalyst/primitives',
          'Extend primitives with custom styling via tokens',
          'Use semantic element types (button, input, section)',
          'Compose primitives for complex UI layouts',
        ],
        donts: [
          'Import primitives from @atlaskit/* directly',
          'Override Radix UI primitive behavior',
          'Create custom button/input implementations',
          'Use @atlaskit/button instead of Card Button',
        ],
      },
    },
    {
      id: 'card',
      name: '@Catalyst/card',
      npm: '@Catalyst/card',
      description:
        'Card component system for displaying structured content (project cards, work item cards, resource cards). Combines @Catalyst/primitives with enterprise features.',
      installation: 'npm install @Catalyst/card',
      apiReference: [
        { prop: 'Card', type: 'ComponentType', default: '—', description: 'Root card container with padding, border, and elevation' },
        { prop: 'CardHeader', type: 'ComponentType', default: '—', description: 'Header section with optional icon and title' },
        { prop: 'CardContent', type: 'ComponentType', default: '—', description: 'Main content area with flexible layout' },
        { prop: 'CardFooter', type: 'ComponentType', default: '—', description: 'Footer with actions or metadata' },
      ],
      examples: [
        {
          title: 'Project card with header and actions',
          code: `import { Card, CardHeader, CardContent, CardFooter } from '@Catalyst/card';

<Card>
  <CardHeader title="Q2 Initiative" icon={<FlagIcon />} />
  <CardContent>Project goals and milestones...</CardContent>
  <CardFooter>
    <button>Edit</button>
    <button>Archive</button>
  </CardFooter>
</Card>`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Use Card components for list items and grid layouts',
          'Provide meaningful header titles',
          'Include action buttons in CardFooter',
          'Use CardContent for variable-length body text',
        ],
        donts: [
          'Use plain div for card-like layouts',
          'Nest Cards without semantic structure',
          'Omit CardHeader for navigation cards',
          'Use Cards for single-line status displays',
        ],
      },
    },
    {
      id: 'rich-editor',
      name: '@Catalyst/rich-editor',
      npm: '@Catalyst/rich-editor',
      description:
        'Rich text editor for description, comment, and narrative fields. Built on TipTap editor with Catalyst toolbar, formatting, and collaborative features.',
      installation: 'npm install @Catalyst/rich-editor @tiptap/core @tiptap/starter-kit',
      apiReference: [
        { prop: 'RichEditor', type: 'ComponentType', default: '—', description: 'Controlled editor component with onChange callback' },
        { prop: 'value', type: 'string (HTML)', default: '""', description: 'Current editor content as HTML' },
        { prop: 'onChange', type: '(html: string) => void', default: '—', description: 'Callback fired on content changes' },
        { prop: 'placeholder', type: 'string', default: '"Start typing..."', description: 'Placeholder text shown in empty editor' },
      ],
      examples: [
        {
          title: 'Basic editor setup',
          code: `import { RichEditor } from '@Catalyst/rich-editor';
import { useState } from 'react';

function DescriptionField() {
  const [html, setHtml] = useState('');
  return (
    <RichEditor
      value={html}
      onChange={setHtml}
      placeholder="Enter description..."
    />
  );
}`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Use RichEditor for multi-line user-generated content',
          'Store editor output as HTML in database',
          'Provide clear placeholder text',
          'Handle onChange state management with React state',
        ],
        donts: [
          'Use RichEditor for single-line inputs (use @atlaskit/textfield)',
          'Store HTML directly in URL query params',
          'Create custom rich text implementations',
          'Use TipTap editor without Catalyst wrapping',
        ],
      },
    },
    {
      id: 'dynamic-table',
      name: '@Catalyst/dynamic-table',
      npm: '@Catalyst/dynamic-table',
      description:
        'Enterprise-grade table component for rendering large datasets with sorting, filtering, pagination, and inline editing. Used by all Catalyst list surfaces (allwork, backlog, incidents).',
      installation: 'npm install @Catalyst/dynamic-table @tanstack/react-table',
      apiReference: [
        { prop: 'DynamicTable', type: 'ComponentType', default: '—', description: 'Root table component accepting columns and rows' },
        { prop: 'columns', type: 'ColumnDef[]', default: '[]', description: 'Column definitions with header, cell, and width' },
        { prop: 'data', type: 'T[]', default: '[]', description: 'Array of row data objects' },
        { prop: 'onRowClick', type: '(row: T) => void', default: '—', description: 'Callback when user clicks a row' },
      ],
      examples: [
        {
          title: 'Basic table with columns',
          code: `import { DynamicTable } from '@Catalyst/dynamic-table';

const columns = [
  { header: 'Key', id: 'key', cell: (row) => row.jiraKey },
  { header: 'Summary', id: 'summary', cell: (row) => row.summary },
  { header: 'Status', id: 'status', cell: (row) => <StatusPill status={row.status} /> },
];

<DynamicTable
  columns={columns}
  data={issues}
  onRowClick={(row) => openDetail(row.id)}
/>`,
        },
      ],
      dosAndDonts: {
        dos: [
          'Use @Catalyst/dynamic-table for all work item lists',
          'Define columns with clear header labels (sentence case)',
          'Handle onRowClick for detail navigation',
          'Use cell renderers for custom formatting',
          'Enable virtualization for 100+ rows',
        ],
        donts: [
          'Use @atlaskit/dynamic-table directly',
          'Create custom table HTML from scratch',
          'Render all rows without virtualization',
          'Use uppercase column headers',
          'Omit row click handlers for navigation',
        ],
      },
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgPage }}>
      <div style={{ padding: '24px', borderBottom: `1px solid ${T.border}` }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', color: T.text }}>
          Catalyst Component Storybook
        </h1>
        <p style={{ margin: '0', color: T.textSubtle, fontSize: '14px' }}>
          Documentation and API reference for the 7 core @Catalyst/* component libraries. Each library provides building blocks for enterprise Catalyst applications.
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <Tabs
          id="catalyst-storybook-tabs"
          onChange={(newIndex) => setSelectedTab(newIndex)}
          selected={selectedTab}
          tabs={components.map((c, i) => ({
            label: c.name.replace('@Catalyst/', ''),
            content: (
              <TabPanel key={i}>
                <ComponentSection {...c} />
              </TabPanel>
            ),
          }))}
        />

        <div style={{ marginTop: '32px', padding: '16px', background: '#F4F5F7', borderRadius: '3px', borderLeft: '4px solid #0052CC' }}>
          <p style={{ margin: '0', color: T.text, fontSize: '13px', lineHeight: '1.5' }}>
            <strong>Integration Note:</strong> All @Catalyst/* packages are symlinked into node_modules during local development. They are published to npm under the @Catalyst scope and installed as external dependencies in production. For the latest source code and issues, see the respective GitHub repositories.
          </p>
        </div>
      </div>
    </div>
  );
}

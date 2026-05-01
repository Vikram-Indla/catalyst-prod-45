/**
 * InlineEdit — Storybook canonical fixture.
 *
 * InlineEdit is the right-rail field pattern used on every Jira issue view.
 * Stories demonstrate the three archetypal value types:
 *   • plain text (summary)
 *   • option (priority via a trivial Select stand-in)
 *   • no-value / placeholder
 *
 * The `play()` function in Editing covers the Atlaskit interaction model:
 * click to enter edit mode, type, blur to commit.
 *
 * Implementation note: stories that manage local state must put `useState`
 * inside a proper named component (PascalCase). A bare `render: () => { ... useState }`
 * trips `react-hooks/rules-of-hooks` because ESLint cannot prove the function
 * is a component. We therefore define a `<TextInlineEdit />`, `<EmptyInlineEdit />`,
 * and `<EditingInlineEdit />` component per story and let the story's render
 * just return `<Component />`.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, within } from '@storybook/test';
import { InlineEdit, Textfield } from '@/components/ads';

const meta: Meta<typeof InlineEdit<string>> = {
  title: 'ADS/InlineEdit',
  component: InlineEdit<string>,
};
export default meta;

type Story = StoryObj<typeof InlineEdit<string>>;

/* ─────────────────────────────────────────────────────────────────
 * TextValue — summary field with an initial non-empty value.
 * ───────────────────────────────────────────────────────────────── */

function TextInlineEdit() {
  const [value, setValue] = useState('Add metrics to onboarding dashboard');
  return (
    <div style={{ width: 320 }}>
      <InlineEdit<string>
        value={value}
        defaultValue=""
        label="Summary"
        readView={() => (
          <div style={{ padding: '6px 8px', minHeight: 32 }}>{value || 'Click to add summary'}</div>
        )}
        editView={(fieldProps) => (
          <Textfield
            value={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            onBlur={fieldProps.onBlur}
            aria-label={fieldProps['aria-label']}
            autoFocus
          />
        )}
        onConfirm={(next) => setValue(next)}
        testId="inline-edit-summary"
      />
    </div>
  );
}

export const TextValue: Story = {
  render: () => <TextInlineEdit />,
};

/* ─────────────────────────────────────────────────────────────────
 * EmptyValue — placeholder-only demo.
 * ───────────────────────────────────────────────────────────────── */

function EmptyInlineEdit() {
  const [value, setValue] = useState('');
  return (
    <div style={{ width: 320 }}>
      <InlineEdit<string>
        value={value}
        defaultValue=""
        label="Summary"
        readView={() => (
          <div style={{ padding: '6px 8px', minHeight: 32, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' }}>
            {value || 'Click to add summary'}
          </div>
        )}
        editView={(fieldProps) => (
          <Textfield
            value={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            onBlur={fieldProps.onBlur}
            aria-label={fieldProps['aria-label']}
            autoFocus
            placeholder="Enter a summary…"
          />
        )}
        onConfirm={(next) => setValue(next)}
      />
    </div>
  );
}

export const EmptyValue: Story = {
  render: () => <EmptyInlineEdit />,
};

/* ─────────────────────────────────────────────────────────────────
 * Editing — interactive play() test covering the full commit cycle.
 * ───────────────────────────────────────────────────────────────── */

function EditingInlineEdit() {
  const [value, setValue] = useState('Original value');
  return (
    <div style={{ width: 320 }}>
      <InlineEdit<string>
        value={value}
        defaultValue=""
        label="Summary"
        readView={() => (
          <div data-testid="summary-read" style={{ padding: '6px 8px' }}>{value}</div>
        )}
        editView={(fieldProps) => (
          <Textfield
            value={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            onBlur={fieldProps.onBlur}
            aria-label={fieldProps['aria-label']}
            testId="summary-input"
            autoFocus
          />
        )}
        onConfirm={(next) => setValue(next)}
      />
    </div>
  );
}

/**
 * Interaction test — exercises the full enter-edit → type → blur → commit
 * cycle. Storybook's addon-interactions surfaces each step in the UI, and
 * Playwright re-runs the same play() in CI via @storybook/test.
 */
export const Editing: Story = {
  render: () => <EditingInlineEdit />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const readView = await canvas.findByTestId('summary-read');
    await userEvent.click(readView);
    const input = await canvas.findByTestId('summary-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated via interaction test');
    await userEvent.tab(); // blur — commits
    const committed = await canvas.findByTestId('summary-read');
    await expect(committed.textContent).toBe('Updated via interaction test');
  },
};

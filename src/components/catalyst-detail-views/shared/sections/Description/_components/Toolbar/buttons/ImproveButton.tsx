import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import MagicWandIcon from '@atlaskit/icon/core/magic-wand';

interface Props {
  editor: Editor | null;
  onImprove?: () => void;
}

export function ImproveButton({ editor, onImprove }: Props) {
  // Empty when the document is just an empty paragraph and has no image
  // or other atomic node. Tiptap's `isEmpty` already accounts for that.
  const isEmpty = editor?.isEmpty ?? true;
  const disabled = isEmpty;

  return (
    <button
      type="button"
      title={
        disabled
          ? 'Improve description — add content first'
          : 'Improve description'
      }
      aria-label="Improve description"
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (disabled) return;
        onImprove?.();
      }}
      style={{
        height: 28,
        padding: '0 8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: 'none',
        borderRadius: 3,
        background: 'transparent',
        color: disabled
          ? 'var(--ds-text-disabled, #B3B9C4)'
          : 'var(--ds-text-subtle, #44546F)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontSize: 13,
        fontWeight: 500,
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
        transition: 'background 100ms ease, color 100ms ease',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background =
          'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'transparent';
      }}
      data-testid="catalyst-desc-toolbar-improve"
    >
      <MagicWandIcon label="" />
      <span>Improve description</span>
    </button>
  );
}

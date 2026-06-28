import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

// ads-scanner:ignore-next-line — color palette for rich text editor, intentional design colors without ADS token equivalents [CAT-ADS-DESIGN-PALETTE-001]
const COLORS: string[] = [
  'var(--ds-text)', 'var(--ds-link-pressed)', 'var(--ds-text-success)', 'var(--ds-background-warning-bold)', 'var(--ds-text-danger)', 'var(--ds-text)',
  'var(--ds-text-subtle)', 'var(--ds-link)', 'var(--ds-background-success-bold)', 'var(--ds-background-warning-bold)', 'var(--ds-background-danger-bold)', 'var(--ds-text-subtle)',
  'var(--ds-text-subtlest)', 'var(--ds-link)', 'var(--ds-background-success-bold)', 'var(--ds-background-warning-bold)', 'var(--ds-background-danger-bold)', 'var(--ds-background-information)',
  'var(--ds-text-disabled)', 'var(--ds-background-information-bold)', 'var(--ds-background-success)', 'var(--ds-background-warning)', 'var(--ds-background-danger)', 'var(--ds-background-information)',
  'var(--ds-border)', 'var(--ds-background-information)', 'var(--ds-background-success)', 'var(--ds-background-warning)', 'var(--ds-background-danger)', 'var(--ds-surface)',
];

function isRemoveDisabled(editor: Editor): boolean {
  const attrs = editor.getAttributes('textStyle');
  const color = (attrs?.color as string | undefined) ?? null;
  if (!color) return true;
  const c = color.toLowerCase().trim();
  return c === 'var(--ds-text)' || c === 'var(--ds-surface)' || c === 'black' || c === 'white';
}

export function TextColorPicker({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <ToolbarIconButton
        label="Text Color Ctrl+Alt+C"
        active={open}
        onClick={() => setOpen((o) => !o)}
        testId="catalyst-desc-toolbar-color"
      >
        {/* Plain bordered "A" — thin rounded border, regular weight. */}
        <span
          style={{
            fontWeight: 400,
            fontSize: 'var(--ds-font-size-200)',
            lineHeight: '14px',
            padding: '0 4px',
            border: '1px solid var(--ds-text-subtle)',
            borderRadius: 3,
            color: 'var(--ds-text)',
          }}
        >
          A
        </span>
      </ToolbarIconButton>

      {open && (
        <div
          role="dialog"
          aria-label="Text color picker"
          style={{
            position: 'absolute',
            top: 32,
            left: 0,
            zIndex: 10,
            background: 'var(--ds-surface-overlay)',
            border: '1px solid var(--ds-border)',
            borderRadius: 4,
            boxShadow:
              '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
            padding: 8,
            width: 224,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 4,
              marginBottom: 8,
            }}
          >
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`Color ${c}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setColor(c).run();
                  setOpen(false);
                }}
                style={{
                  width: 24,
                  height: 24,
                  border: '1px solid var(--ds-border)',
                  borderRadius: 3,
                  background: c,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={isRemoveDisabled(editor)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setOpen(false);
            }}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid var(--ds-border)',
              borderRadius: 3,
              background: 'var(--ds-surface)',
              color: 'var(--ds-text)',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 500,
              cursor: isRemoveDisabled(editor) ? 'not-allowed' : 'pointer',
              opacity: isRemoveDisabled(editor) ? 0.5 : 1,
            }}
          >
            Remove color
          </button>
        </div>
      )}
    </div>
  );
}

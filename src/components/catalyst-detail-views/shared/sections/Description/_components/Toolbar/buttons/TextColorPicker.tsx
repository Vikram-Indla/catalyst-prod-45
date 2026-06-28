import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

const COLORS: string[] = [
  'var(--ds-text, #172B4D)', 'var(--ds-link-pressed, #0747A6)', 'var(--ds-text-success, #006644)', 'var(--ds-background-warning-bold, #E2B203)', 'var(--ds-text-danger, #AE2A19)', 'var(--ds-text, #172B4D)',
  'var(--ds-text-subtle, #42526E)', 'var(--ds-link, #0052CC)', 'var(--ds-background-success-bold, #1F845A)', 'var(--ds-background-warning-bold, #E2B203)', 'var(--ds-background-danger-bold, #C9372C)', 'var(--ds-text-subtle, #44546F)',
  'var(--ds-text-subtlest, #626F86)', 'var(--ds-link, #0C66E4)', 'var(--ds-background-success-bold, #57D9A3)', '#FFC400', 'var(--ds-background-danger-bold, #C9372C)', 'var(--ds-background-information, #E9F2FF)',
  'var(--ds-text-disabled, #8590A2)', 'var(--ds-background-information-bold, #0C66E4)', '#79F2C0', '#FFE380', 'var(--ds-background-danger, #FFECEB)', 'var(--ds-background-information, #E9F2FF)',
  'var(--ds-border, #DFE1E6)', 'var(--ds-background-information, #E9F2FF)', '#ABF5D1', 'var(--ds-background-warning, #FFF7D6)', '#FFBDAD', 'var(--ds-surface, #FFFFFF)',
];

function isRemoveDisabled(editor: Editor): boolean {
  const attrs = editor.getAttributes('textStyle');
  const color = (attrs?.color as string | undefined) ?? null;
  if (!color) return true;
  const c = color.toLowerCase().trim();
  return c === 'var(--ds-text, #172B4D)' || c === 'var(--ds-surface, #FFFFFF)' || c === 'black' || c === 'white';
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
            fontSize: 12,
            lineHeight: '14px',
            padding: '0 4px',
            border: '1px solid var(--ds-text-subtle, #44546F)',
            borderRadius: 3,
            color: 'var(--ds-text, #292A2E)',
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
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
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
              gap: 6,
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
                  border: '1px solid var(--ds-border, #DFE1E6)',
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
              padding: '6px 8px',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #292A2E)',
              fontSize: 12,
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

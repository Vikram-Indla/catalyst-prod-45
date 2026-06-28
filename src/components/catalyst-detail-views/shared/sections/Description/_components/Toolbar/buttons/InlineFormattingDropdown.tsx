import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import BoldIcon from '@atlaskit/icon/glyph/editor/bold';
// eslint-disable-next-line no-restricted-imports
import ItalicIcon from '@atlaskit/icon/glyph/editor/italic';
// eslint-disable-next-line no-restricted-imports
import UnderlineIcon from '@atlaskit/icon/glyph/editor/underline';
// eslint-disable-next-line no-restricted-imports
import StrikethroughIcon from '@atlaskit/icon/glyph/editor/strikethrough';
// eslint-disable-next-line no-restricted-imports
import CodeIcon from '@atlaskit/icon/glyph/editor/code';
import { ToolbarPopover, MenuItem } from '../ToolbarPopover';
import { ChevronDownGlyph } from '../ChevronDownGlyph';

interface Props {
  editor: Editor;
}

interface Row {
  glyph: React.ReactNode;
  label: string;
  shortcut: string;
  isActive: (e: Editor) => boolean;
  toggle: (e: Editor) => void;
}

const ROWS: Row[] = [
  { glyph: <BoldIcon label="" />, label: 'Bold', shortcut: 'Ctrl+B',
    isActive: (e) => e.isActive('bold'),
    toggle: (e) => e.chain().focus().toggleBold().run() },
  { glyph: <ItalicIcon label="" />, label: 'Italic', shortcut: 'Ctrl+I',
    isActive: (e) => e.isActive('italic'),
    toggle: (e) => e.chain().focus().toggleItalic().run() },
  { glyph: <UnderlineIcon label="" />, label: 'Underline', shortcut: 'Ctrl+U',
    isActive: (e) => e.isActive('underline'),
    toggle: (e) => e.chain().focus().toggleUnderline().run() },
  { glyph: <StrikethroughIcon label="" />, label: 'Strikethrough', shortcut: 'Ctrl+Shift+S',
    isActive: (e) => e.isActive('strike'),
    toggle: (e) => e.chain().focus().toggleStrike().run() },
  { glyph: <CodeIcon label="" />, label: 'Code', shortcut: 'Ctrl+Shift+M',
    isActive: (e) => e.isActive('code'),
    toggle: (e) => e.chain().focus().toggleCode().run() },
  {
    glyph: <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>X<sub style={{ fontSize: 'var(--ds-font-size-100)' }}>2</sub></span>,
    label: 'Subscript', shortcut: 'Ctrl+,',
    isActive: (e) => e.isActive('subscript'),
    toggle: (e) => e.chain().focus().toggleSubscript().run(),
  },
  {
    glyph: <span style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-200)' }}>X<sup style={{ fontSize: 'var(--ds-font-size-100)' }}>2</sup></span>,
    label: 'Superscript', shortcut: 'Ctrl+.',
    isActive: (e) => e.isActive('superscript'),
    toggle: (e) => e.chain().focus().toggleSuperscript().run(),
  },
];

export function InlineFormattingDropdown({ editor }: Props) {
  return (
    <ToolbarPopover
      label="More formatting"
      triggerContent={<ChevronDownGlyph />}
      panelWidth={220}
      testId="catalyst-desc-toolbar-inlinefmt"
    >
      {({ close }) =>
        ROWS.map((row) => (
          <MenuItem
            key={row.label}
            glyph={row.glyph}
            label={row.label}
            shortcut={row.shortcut}
            active={row.isActive(editor)}
            onClick={() => {
              row.toggle(editor);
              close();
            }}
          />
        ))
      }
    </ToolbarPopover>
  );
}

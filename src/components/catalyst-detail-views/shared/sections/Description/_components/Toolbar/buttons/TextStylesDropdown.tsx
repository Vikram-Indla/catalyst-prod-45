import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ToolbarPopover, MenuItem } from '../ToolbarPopover';

interface Props {
  editor: Editor;
}

type StyleKey = 'paragraph' | 'small' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface StyleOption {
  key: StyleKey;
  label: string;
  shortcut: string;
  apply: (editor: Editor) => void;
}

const OPTIONS: StyleOption[] = [
  { key: 'paragraph', label: 'Normal text', shortcut: 'Ctrl+Alt+0',
    apply: (e) => e.chain().focus().setParagraph().unsetMark('smallText').run() },
  { key: 'h1', label: 'Heading 1', shortcut: 'Ctrl+Alt+1',
    apply: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { key: 'h2', label: 'Heading 2', shortcut: 'Ctrl+Alt+2',
    apply: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { key: 'h3', label: 'Heading 3', shortcut: 'Ctrl+Alt+3',
    apply: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { key: 'h4', label: 'Heading 4', shortcut: 'Ctrl+Alt+4',
    apply: (e) => e.chain().focus().setHeading({ level: 4 }).run() },
  { key: 'h5', label: 'Heading 5', shortcut: 'Ctrl+Alt+5',
    apply: (e) => e.chain().focus().setHeading({ level: 5 }).run() },
  { key: 'h6', label: 'Heading 6', shortcut: 'Ctrl+Alt+6',
    apply: (e) => e.chain().focus().setHeading({ level: 6 }).run() },
  { key: 'small', label: 'Small text', shortcut: '',
    apply: (e) => e.chain().focus().setParagraph().setMark('smallText').run() },
];

function currentStyle(editor: Editor): StyleKey {
  if (editor.isActive('smallText')) return 'small';
  for (let level = 1; level <= 6; level++) {
    if (editor.isActive('heading', { level })) return `h${level}` as StyleKey;
  }
  return 'paragraph';
}

function triggerLabel(key: StyleKey): React.ReactNode {
  if (key === 'paragraph') return <span style={{ fontWeight: 600 }}>T</span>;
  if (key === 'small') {
    return (
      <>
        <span style={{ fontWeight: 600 }}>T</span>
        <sub style={{ fontSize: 9 }}>s</sub>
      </>
    );
  }
  const level = key.slice(1);
  return (
    <>
      <span style={{ fontWeight: 600 }}>H</span>
      <sub style={{ fontSize: 9 }}>{level}</sub>
    </>
  );
}

export function TextStylesDropdown({ editor }: Props) {
  const [activeKey, setActiveKey] = useState<StyleKey>(() => currentStyle(editor));

  useEffect(() => {
    const update = () => setActiveKey(currentStyle(editor));
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  return (
    <ToolbarPopover
      label="Text Styles"
      triggerContent={triggerLabel(activeKey)}
      triggerWidth={32}
      panelWidth={200}
      testId="catalyst-desc-toolbar-textstyles"
    >
      {({ close }) =>
        OPTIONS.map((opt) => (
          <MenuItem
            key={opt.key}
            label={opt.label}
            shortcut={opt.shortcut}
            active={activeKey === opt.key}
            onClick={() => {
              opt.apply(editor);
              close();
            }}
          />
        ))
      }
    </ToolbarPopover>
  );
}

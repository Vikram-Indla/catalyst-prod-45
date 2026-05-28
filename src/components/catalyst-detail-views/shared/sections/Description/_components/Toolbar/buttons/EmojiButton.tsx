// eslint-disable-next-line no-restricted-imports
import EmojiIcon from '@atlaskit/icon/glyph/editor/emoji';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  onOpen?: (anchor: HTMLElement) => void;
}

export function EmojiButton({ onOpen }: Props) {
  return (
    <ToolbarIconButton
      label="Emoji :"
      onClick={(e) => onOpen?.(e.currentTarget)}
      testId="catalyst-desc-toolbar-emoji"
    >
      <EmojiIcon label="" />
    </ToolbarIconButton>
  );
}

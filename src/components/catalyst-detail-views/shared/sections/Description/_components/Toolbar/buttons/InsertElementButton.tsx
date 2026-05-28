// eslint-disable-next-line no-restricted-imports
import AddIcon from '@atlaskit/icon/glyph/editor/add';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  onOpen?: (anchor: HTMLElement) => void;
}

export function InsertElementButton({ onOpen }: Props) {
  return (
    <ToolbarIconButton
      label="Insert Element /"
      onClick={(e) => onOpen?.(e.currentTarget)}
      testId="catalyst-desc-toolbar-insert"
    >
      <AddIcon label="" />
    </ToolbarIconButton>
  );
}

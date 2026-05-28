// eslint-disable-next-line no-restricted-imports
import ClockIcon from '@atlaskit/icon/core/clock';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  /** When false (always in v1) the button is rendered disabled. */
  available?: boolean;
}

export function HistoryButton({ available = false }: Props) {
  return (
    <ToolbarIconButton
      label={
        available
          ? 'View Changes Ctrl+Alt+Z'
          : 'View Changes Ctrl+Alt+Z (no changes yet)'
      }
      disabled={!available}
      testId="catalyst-desc-toolbar-history"
    >
      <ClockIcon label="" />
    </ToolbarIconButton>
  );
}

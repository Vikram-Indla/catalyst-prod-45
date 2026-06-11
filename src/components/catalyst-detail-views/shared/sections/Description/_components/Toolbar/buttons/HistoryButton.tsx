// eslint-disable-next-line no-restricted-imports
import ClockIcon from '@atlaskit/icon/core/clock';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  /** When false (always in v1) the button is rendered disabled. */
  available?: boolean;
}

export function HistoryButton({ available = false }: Props) {
  // Hide when unavailable — disabled clock adds noise in composer/dock (finding 47)
  if (!available) return null;
  return (
    <ToolbarIconButton
      label="View Changes Ctrl+Alt+Z"
      disabled={false}
      testId="catalyst-desc-toolbar-history"
    >
      <ClockIcon label="" />
    </ToolbarIconButton>
  );
}

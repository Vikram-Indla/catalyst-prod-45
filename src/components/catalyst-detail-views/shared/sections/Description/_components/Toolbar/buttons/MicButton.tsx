// eslint-disable-next-line no-restricted-imports
import MicrophoneIcon from '@atlaskit/icon/core/microphone';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function MicButton({ active = false, disabled = false, onClick }: Props) {
  return (
    <ToolbarIconButton
      label={active ? 'Stop voice recording' : 'Record voice'}
      active={active}
      disabled={disabled}
      onClick={onClick}
      testId="catalyst-desc-toolbar-mic"
    >
      <MicrophoneIcon label="" />
    </ToolbarIconButton>
  );
}

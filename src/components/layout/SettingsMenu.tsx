import { useNavigate } from 'react-router-dom';
import { IconButton } from '@atlaskit/button/new';
import SettingsIcon from '@atlaskit/icon/core/settings';

export function SettingsMenu() {
  const navigate = useNavigate();
  return (
    <IconButton
      label="Settings"
      appearance="subtle"
      onClick={() => navigate('/admin')}
      icon={SettingsIcon}
    />
  );
}

import { useNavigate } from 'react-router-dom';
import { IconButton } from '@atlaskit/button/new';
import SettingsIcon from '@atlaskit/icon/core/settings';

// The gear icon in the top nav routes directly to the admin console.
// Previously opened a popup menu; per product direction the button is now a
// direct navigation affordance to /admin.
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

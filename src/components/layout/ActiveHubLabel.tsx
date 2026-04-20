import { useLocation } from 'react-router-dom';
import { Text } from '@atlaskit/primitives';
import { getActiveHub } from '@/lib/hubs';

export function ActiveHubLabel() {
  const location = useLocation();
  const hub = getActiveHub(location.pathname);
  if (!hub) return null;
  return <Text size="medium" color="color.text.subtle">› {hub.name}</Text>;
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import { IconButton } from '@atlaskit/atlassian-navigation';
import AppSwitcherIcon from '@atlaskit/icon/glyph/app-switcher';
import { Box, xcss } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import { HUBS } from '@/lib/hubs';
import { HubTile } from './HubTile';

const gridStyles = xcss({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 'space.150',
  marginBlockStart: 'space.200',
});

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      label="Switch hubs"
      width={360}
      content={() => (
        <Box xcss={xcss({ padding: 'space.200' })}>
          <Heading level="h400">Catalyst</Heading>
          <Box xcss={gridStyles}>
            {HUBS.map((hub) => (
              <Box
                key={hub.id}
                onClick={(event) => { event.preventDefault(); navigate(hub.path); setOpen(false); }}
              >
                <HubTile color={hub.tileColor} glyph={hub.glyph} label={hub.label} href={hub.path} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
      trigger={(triggerProps) => (
        <Tooltip content="Switch hubs" position="bottom">
          <IconButton {...triggerProps} label="Switch hubs" tooltip="Switch hubs" isSelected={open} onClick={() => setOpen((value) => !value)} icon={<AppSwitcherIcon label="" />} />
        </Tooltip>
      )}
    />
  );
}

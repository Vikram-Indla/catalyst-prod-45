import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import { IconButton } from '@atlaskit/atlassian-navigation';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import AppSwitcherIcon from '@atlaskit/icon/glyph/app-switcher';
import Button from '@atlaskit/button';
import { LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, Flex, Stack, Text, xcss } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import { HUBS } from '@/lib/hubs';
import { HubTile } from './HubTile';
import { useUserRole } from '@/hooks/useUserRole';

const popupStyles = xcss({ width: 'size.1000' });
const headerStyles = xcss({ borderBottomWidth: 'border.width', borderBottomStyle: 'solid', borderBottomColor: 'color.border' });

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      label="Switch hubs"
      content={() => (
        <Box xcss={popupStyles}>
          <Box padding="space.200" xcss={headerStyles}>
            <Flex alignItems="center" justifyContent="space-between" gap="space.150">
              <Flex alignItems="center" gap="space.150">
                <HubTile label="MIM Catalyst Instance" backgroundColor="color.background.accent.green.subtler" initials="MI" />
                <Stack space="space.025"><Heading size="small">MIM Catalyst Instance</Heading><Text size="small" color="color.text.subtlest">Catalyst</Text></Stack>
              </Flex>
              <IconButton label="Instance switcher unavailable" tooltip="Instance switching unavailable" isDisabled icon={<ChevronDownIcon label="" />} />
            </Flex>
          </Box>
          <MenuGroup maxHeight="640px" minWidth="360px" spacing="cozy" menuLabel="Your hubs">
            <Section title="Your hubs">
              {HUBS.map((hub) => {
                const selected = hub.matcher(location.pathname);
                return (
                  <LinkItem
                    key={hub.id}
                    href={hub.route}
                    isSelected={selected}
                    iconBefore={<HubTile label={hub.name} backgroundColor={hub.tileColor} glyph={hub.glyph(hub.name)} />}
                    onClick={(event) => { event.preventDefault(); navigate(hub.route); setOpen(false); }}
                  >
                    {hub.name}
                  </LinkItem>
                );
              })}
            </Section>
            {isAdmin && <Section hasSeparator><Button appearance="subtle" shouldFitContainer onClick={() => { navigate('/admin/hubs'); setOpen(false); }}>Manage hubs</Button></Section>}
          </MenuGroup>
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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Tooltip from '@atlaskit/tooltip';
import { IconButton } from '@atlaskit/atlassian-navigation';
import AppSwitcherIcon from '@atlaskit/icon/glyph/app-switcher';
import HomeIcon from '@atlaskit/icon/glyph/home';
import OfficeBuildingIcon from '@atlaskit/icon/glyph/office-building';
import PortfolioIcon from '@atlaskit/icon/glyph/portfolio';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import ShipIcon from '@atlaskit/icon/glyph/ship';
import TaskIcon from '@atlaskit/icon/glyph/task';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import BookIcon from '@atlaskit/icon/glyph/book';
import { LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, Flex, xcss } from '@atlaskit/primitives';

const popupStyles = xcss({ width: '360px', paddingBlock: 'space.100' });

const iconFrameStyles = xcss({
  width: '32px',
  height: '32px',
  borderRadius: 'border.radius.100',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'color.text.inverse',
});

const iconStyles = {
  neutral: xcss({ backgroundColor: 'color.background.neutral.bold' }),
  purple: xcss({ backgroundColor: 'color.background.accent.purple.bolder' }),
  blue: xcss({ backgroundColor: 'color.background.accent.blue.bolder' }),
  teal: xcss({ backgroundColor: 'color.background.accent.teal.bolder' }),
  orange: xcss({ backgroundColor: 'color.background.accent.orange.bolder' }),
  green: xcss({ backgroundColor: 'color.background.accent.green.bolder' }),
  red: xcss({ backgroundColor: 'color.background.accent.red.bolder' }),
  yellow: xcss({ backgroundColor: 'color.background.accent.yellow.bolder' }),
  magenta: xcss({ backgroundColor: 'color.background.accent.magenta.bolder' }),
  lime: xcss({ backgroundColor: 'color.background.accent.lime.bolder' }),
} as const;

const hubItems = [
  { label: 'Home', href: '/for-you', icon: <HomeIcon label="" />, tone: 'neutral' },
  { label: 'StrategyHub', href: '/strategyhub', icon: <OfficeBuildingIcon label="" />, tone: 'purple' },
  { label: 'ProductHub', href: '/producthub', icon: <PortfolioIcon label="" />, tone: 'blue' },
  { label: 'ProjectHub', href: '/project-hub', icon: <FolderIcon label="" />, tone: 'teal' },
  { label: 'ReleaseHub', href: '/release-hub/command-center', icon: <ShipIcon label="" />, tone: 'orange' },
  { label: 'TestHub', href: '/testhub/dashboard', icon: <TaskIcon label="" />, tone: 'green' },
  { label: 'IncidentHub', href: '/incident-hub', icon: <WarningIcon label="" />, tone: 'red' },
  { label: 'TaskHub', href: '/taskhub/boards', icon: <CheckCircleIcon label="" />, tone: 'yellow' },
  { label: 'PlanHub', href: '/planhub', icon: <CalendarIcon label="" />, tone: 'magenta' },
  { label: 'WikiHub', href: '/wiki', icon: <BookIcon label="" />, tone: 'lime' },
] as const;

function HubIcon({ tone, icon }: { tone: (typeof hubItems)[number]['tone']; icon: React.ReactNode }) {
  return <Flex xcss={[iconFrameStyles, iconStyles[tone]]}>{icon}</Flex>;
}

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Popup
      isOpen={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      label="Switch hubs"
      content={() => (
        <Box xcss={popupStyles}>
          <MenuGroup minWidth="360px" maxHeight="640px" spacing="cozy" menuLabel="Catalyst hubs">
            <Section>
              {hubItems.map((hub) => (
                <LinkItem
                  key={hub.href}
                  href={hub.href}
                  iconBefore={<HubIcon tone={hub.tone} icon={hub.icon} />}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(hub.href);
                    setOpen(false);
                  }}
                >
                  {hub.label}
                </LinkItem>
              ))}
            </Section>
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

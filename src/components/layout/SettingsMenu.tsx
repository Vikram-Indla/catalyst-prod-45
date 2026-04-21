import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import { IconButton } from '@atlaskit/button/new';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import SearchIcon from '@atlaskit/icon/glyph/search';
import PersonIcon from '@atlaskit/icon/glyph/person';
import NotificationIcon from '@atlaskit/icon/glyph/notification';
import IssuesIcon from '@atlaskit/icon/glyph/issues';
import ShieldIcon from '@atlaskit/icon/glyph/shield';
import Textfield from '@atlaskit/textfield';
import { LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, xcss } from '@atlaskit/primitives';
import { useUserRole } from '@/hooks/useUserRole';

const popupStyles = xcss({ width: 'size.1000' });

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const items = useMemo(() => [
    { section: 'Personal Catalyst settings', label: 'General settings', description: 'Manage language, time zone, and other personal preferences', href: '/settings/general', icon: <PersonIcon label="" /> },
    { section: 'Personal Catalyst settings', label: 'Notification settings', description: 'Manage email and in-app notifications from Catalyst', href: '/settings/notifications', icon: <NotificationIcon label="" /> },
    ...(isAdmin ? [{ section: 'Catalyst admin settings', label: 'Work items', description: 'Configure work types, workflows, screens, fields, and more', href: '/admin/work-items', icon: <IssuesIcon label="" /> }] : []),
  ], [isAdmin]);
  const visible = items.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()));
  const sections = [...new Set(visible.map((item) => item.section))];

  return (
    <Popup isOpen={open} onClose={() => setOpen(false)} placement="bottom-end" label="Settings" content={() => (
      <Box xcss={popupStyles} padding="space.150">
        <Textfield isCompact placeholder="Search (⌘ + K)" elemBeforeInput={<SearchIcon label="" />} value={filter} onChange={(e) => setFilter((e.target as HTMLInputElement).value)} />
        <MenuGroup minWidth="400px" spacing="cozy" menuLabel="Settings menu">
          {sections.map((section) => <Section key={section} title={section}>{visible.filter((item) => item.section === section).map((item) => <LinkItem key={item.href} href={item.href} iconBefore={item.icon} description={item.description} onClick={(event) => { event.preventDefault(); navigate(item.href); setOpen(false); }}>{item.label}</LinkItem>)}</Section>)}
        </MenuGroup>
      </Box>
    )} trigger={(props) => <IconButton {...props} label="Settings" appearance="subtle" isSelected={open} onClick={() => setOpen((v) => !v)} icon={SettingsIcon} />} />
  );
}

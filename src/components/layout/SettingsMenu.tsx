import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import { IconButton } from '@atlaskit/button/new';
import SettingsIcon from '@atlaskit/icon/core/settings';
import SearchIcon from '@atlaskit/icon/core/search';
import PersonIcon from '@atlaskit/icon/core/person';
import NotificationIcon from '@atlaskit/icon/core/notification';
import IssueIcon from '@atlaskit/icon/core/issue';
import LockIcon from '@atlaskit/icon/core/lock-locked';
import Textfield from '@atlaskit/textfield';
import { LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box } from '@atlaskit/primitives';
import { useUserRole } from '@/hooks/useUserRole';

// Popup width was previously capped with xcss `width: 'size.1000'` (80px),
// contradicting MenuGroup's `minWidth="400px"` and forcing the browser to
// resolve two competing constraints. MenuGroup owns the width; Box just pads.
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const items = useMemo(() => [
    ...(isAdmin ? [{ section: 'Catalyst administration', label: 'Admin', description: 'Open the full administration console', href: '/admin', icon: <LockIcon label="" /> }] : []),
    { section: 'Personal Catalyst settings', label: 'General settings', description: 'Manage language, time zone, and other personal preferences', href: '/settings/general', icon: <PersonIcon label="" /> },
    { section: 'Personal Catalyst settings', label: 'Notification settings', description: 'Manage email and in-app notifications from Catalyst', href: '/settings/notifications', icon: <NotificationIcon label="" /> },
    ...(isAdmin ? [{ section: 'Catalyst admin settings', label: 'Work items', description: 'Configure work types, workflows, screens, fields, and more', href: '/admin/work-items', icon: <IssueIcon label="" /> }] : []),
  ], [isAdmin]);
  const visible = items.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()));
  const sections = [...new Set(visible.map((item) => item.section))];

  return (
    <Popup isOpen={open} onClose={() => setOpen(false)} placement="bottom-end" label="Settings" content={() => (
      <Box padding="space.150">
        <Textfield isCompact placeholder="Search (⌘ + K)" elemBeforeInput={<SearchIcon label="" />} value={filter} onChange={(e) => setFilter((e.target as HTMLInputElement).value)} />
        <MenuGroup minWidth="400px" spacing="cozy" menuLabel="Settings menu">
          {sections.map((section) => <Section key={section} title={section}>{visible.filter((item) => item.section === section).map((item) => <LinkItem key={item.href} href={item.href} iconBefore={item.icon} description={item.description} onClick={(event) => { event.preventDefault(); navigate(item.href); setOpen(false); }}>{item.label}</LinkItem>)}</Section>)}
        </MenuGroup>
      </Box>
    )} trigger={(props) => <IconButton {...props} label="Settings" appearance="subtle" isSelected={open} onClick={() => setOpen((v) => !v)} icon={SettingsIcon} />} />
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import { IconButton } from '@atlaskit/atlassian-navigation';
import Lozenge from '@atlaskit/lozenge';
import PersonIcon from '@atlaskit/icon/glyph/person';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import OpenIcon from '@atlaskit/icon/glyph/open';
import SignOutIcon from '@atlaskit/icon/glyph/sign-out';
import SwitcherIcon from '@atlaskit/icon/glyph/switcher';
import PremiumIcon from '@atlaskit/icon/glyph/premium';
import PeopleIcon from '@atlaskit/icon/glyph/people';
import { ButtonItem, LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, Flex, Stack, Text, xcss } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';

const popupStyles = xcss({ width: 'size.1000' });

interface ProfileMenuProps { name?: string | null; email?: string | null; avatarUrl?: string | null; }

export function ProfileMenu({ name, email, avatarUrl }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const displayName = name || email || 'User';
  const go = (path: string) => { navigate(path); setOpen(false); };
  const signOut = async () => { await supabase.auth.signOut({ scope: 'local' }); go('/auth'); };

  return (
    <Popup isOpen={open} onClose={() => setOpen(false)} placement="bottom-end" label="Profile" content={() => (
      <Box xcss={popupStyles}>
        <Box padding="space.200" backgroundColor="color.background.neutral.subtle">
          <Flex alignItems="center" gap="space.150"><Avatar size="large" src={avatarUrl ?? undefined} name={displayName} /><Stack space="space.025"><Heading size="small">{displayName}</Heading><Text size="small" color="color.text.subtlest">{email}</Text></Stack></Flex>
        </Box>
        <MenuGroup minWidth="320px" spacing="cozy" menuLabel="Profile menu">
          <Section><LinkItem href="/profile" iconBefore={<PersonIcon label="" />} onClick={(e) => { e.preventDefault(); go('/profile'); }}>Profile</LinkItem><LinkItem href="/settings" iconBefore={<SettingsIcon label="" />} onClick={(e) => { e.preventDefault(); go('/settings'); }}>Account settings</LinkItem><ButtonItem iconBefore={<SettingsIcon label="" />} onClick={() => setTheme('light')}>Theme: Light</ButtonItem><ButtonItem iconBefore={<SettingsIcon label="" />} onClick={() => setTheme('dark')}>Theme: Dark</ButtonItem><ButtonItem iconBefore={<SettingsIcon label="" />} onClick={() => setTheme('system')}>Theme: Match system</ButtonItem><LinkItem href="/quickstart" iconBefore={<OpenIcon label="" />} onClick={(e) => { e.preventDefault(); go('/quickstart'); }}>Open Quickstart</LinkItem></Section>
          <Section title="Upgrade" hasSeparator><LinkItem href="/upgrade" iconBefore={<PremiumIcon label="" />} iconAfter={<Lozenge appearance="new">FREE 30-DAY TRIAL</Lozenge>} onClick={(e) => { e.preventDefault(); go('/upgrade'); }}>Try the Premium plan</LinkItem></Section>
          <Section hasSeparator><LinkItem href="/integrations/slack" iconBefore={<PeopleIcon label="" />} onClick={(e) => { e.preventDefault(); go('/integrations/slack'); }}>Slack</LinkItem></Section>
          <Section hasSeparator><ButtonItem iconBefore={<SwitcherIcon label="" />}>Switch account</ButtonItem><ButtonItem iconBefore={<SignOutIcon label="" />} onClick={() => void signOut()}>Log out</ButtonItem></Section>
        </MenuGroup>
      </Box>
    )} trigger={(props) => (
      <Tooltip content="Profile" position="bottom">
        <IconButton {...props} label="Profile" tooltip="Profile" isSelected={open} onClick={() => setOpen((v) => !v)} icon={<Avatar size="small" src={avatarUrl ?? undefined} name={displayName} />} />
      </Tooltip>
    )} />
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Avatar from '@atlaskit/avatar';
import { IconButton } from '@atlaskit/button/new';

import PersonIcon from '@atlaskit/icon/core/person';
import SettingsIcon from '@atlaskit/icon/core/settings';
import SignOutIcon from '@atlaskit/icon/core/log-out';
import ThemeIcon from '@atlaskit/icon/core/theme';
import { ButtonItem, LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, Flex, Stack, Text } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { resolveAvatarUrl } from '@/lib/avatars';

/**
 * ProfileMenu — mirrors SettingsMenu's working pattern exactly:
 *  - IconButton trigger (Atlaskit Popup positions reliably against it)
 *  - Box padding="space.150" content shell
 *  - MenuGroup owns width via minWidth
 *
 * RCA: previous custom <button> trigger broke Popup measurement (the popup
 * mounted to a portal but rendered with zero size and was invisible).
 * IconButton is the only trigger pattern that consistently works with
 * @atlaskit/popup v4 in this codebase — verified against SettingsMenu.
 */
function AvatarIcon({
  avatarUrl,
  name,
}: {
  avatarUrl?: string;
  name: string;
}) {
  return (
    <span style={{ display: 'inline-flex', pointerEvents: 'none' }}>
      <Avatar size="small" src={avatarUrl} name={name} />
    </span>
  );
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const email = user?.email ?? '';
  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    email.split('@')[0] ||
    'User';
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    resolveAvatarUrl(name) ||
    undefined;

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/auth');
  };

  return (
    <Popup
      isOpen={open}
      onClose={() => {
        setOpen(false);
        setThemeOpen(false);
      }}
      placement="bottom-end"
      label="Profile"
      content={() => (
        <Box padding="space.150">
          <Box
            padding="space.200"
            backgroundColor="color.background.neutral.subtle"
          >
            <Flex alignItems="center" gap="space.150">
              <Avatar size="large" src={avatarUrl} name={name} />
              <Stack space="space.025">
                <Heading size="small">{name}</Heading>
                <Text size="small" color="color.text.subtlest">
                  {email}
                </Text>
              </Stack>
            </Flex>
          </Box>

          <MenuGroup minWidth="320px" spacing="cozy" menuLabel="Profile menu">
            <Section>
              <LinkItem
                href="/profile"
                iconBefore={<PersonIcon label="" />}
                onClick={(e) => {
                  e.preventDefault();
                  go('/profile');
                }}
              >
                Profile
              </LinkItem>
              <LinkItem
                href="/settings"
                iconBefore={<SettingsIcon label="" />}
                onClick={(e) => {
                  e.preventDefault();
                  go('/settings');
                }}
              >
                Account settings
              </LinkItem>

              <ButtonItem
                iconBefore={<ThemeIcon label="" />}
                onClick={() => setThemeOpen((v) => !v)}
              >
                Theme
              </ButtonItem>
              {themeOpen && (
                <Box paddingInlineStart="space.400">
                  <ButtonItem
                    isSelected={theme === 'light'}
                    onClick={() => setTheme('light')}
                  >
                    Light
                  </ButtonItem>
                  <ButtonItem
                    isSelected={theme === 'dark'}
                    onClick={() => setTheme('dark')}
                  >
                    Dark
                  </ButtonItem>
                  <ButtonItem
                    isSelected={theme === 'system'}
                    onClick={() => setTheme('system')}
                  >
                    Match system
                  </ButtonItem>
                </Box>
              )}
            </Section>

            <Section hasSeparator>
              <ButtonItem
                iconBefore={<SignOutIcon label="" />}
                onClick={() => void handleSignOut()}
              >
                Log out
              </ButtonItem>
            </Section>
          </MenuGroup>
        </Box>
      )}
      trigger={(triggerProps) => (
        <IconButton
          {...triggerProps}
          label="Profile"
          appearance="subtle"
          isSelected={open}
          onClick={() => setOpen((v) => !v)}
          icon={() => <AvatarIcon avatarUrl={avatarUrl} name={name} />}
        />
      )}
    />
  );
}

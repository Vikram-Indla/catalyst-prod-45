import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import { IconButton } from '@atlaskit/button/new';

import PersonIcon from '@atlaskit/icon/core/person';
import SettingsIcon from '@atlaskit/icon/core/settings';
import SignOutIcon from '@atlaskit/icon/core/log-out';
import ThemeIcon from '@atlaskit/icon/core/theme';
import { ButtonItem, LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, Flex, Stack, Text } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import Avatar from '@atlaskit/avatar';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { resolveAvatarUrl } from '@/lib/avatars';

/**
 * ProfileMenu — RCA Apr 2026 (final-final)
 *
 * Root cause of prior failures: passing a `useCallback`-created icon component
 * to <IconButton icon={...}>. The component identity changed every render when
 * `open` state toggled, causing IconButton to remount and Atlaskit Popup to
 * lose its anchor ref → popup rendered with zero size / off-screen.
 *
 * Fix: use a MODULE-SCOPE component reference for the icon, exactly like
 * SettingsMenu does with `icon={SettingsIcon}`. Avatar data flows in via a
 * module-level mutable ref (set per render) so the icon component stays stable.
 *
 * Mirrors SettingsMenu's structure 1:1:
 *  - <Popup placement="bottom-end" label=...>
 *  - <IconButton {...props} appearance="subtle" isSelected={open} icon={Stable} />
 *  - <Box padding="space.150"> shell
 *  - <MenuGroup minWidth="..."> owns width
 */

// Module-level holder for current avatar render data. Set on each render of
// ProfileMenu, read by the stable AvatarGlyph icon component.
const avatarState: { url?: string; initials: string } = { initials: 'U' };

// STABLE module-scope icon component — identity never changes, so IconButton
// never remounts, so Popup's anchor ref stays attached.
function AvatarGlyph() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#5243AA',
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'inherit',
        pointerEvents: 'none',
      }}
    >
      {avatarState.url ? (
        <img
          src={avatarState.url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{avatarState.initials}</span>
      )}
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

  const initials = useMemo(
    () =>
      name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U',
    [name],
  );

  // Update module-level state so the stable icon component reads fresh data
  // without changing its own identity.
  avatarState.url = avatarUrl;
  avatarState.initials = initials;

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
      trigger={(props) => (
        <IconButton
          {...props}
          label="Profile"
          appearance="subtle"
          isSelected={open}
          onClick={() => setOpen((v) => !v)}
          icon={AvatarGlyph}
        />
      )}
    />
  );
}

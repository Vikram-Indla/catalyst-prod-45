import { useState, useCallback } from 'react';
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
 * ProfileMenu — RCA Apr 2026 (final)
 *
 * Mirrors the working SettingsMenu pattern EXACTLY:
 *  - <Popup> with placement="bottom-end"
 *  - <IconButton> trigger with `icon={StableComponent}` (component reference)
 *  - <Box padding="space.150"> content shell
 *  - <MenuGroup minWidth="320px"> owns width
 *
 * The avatar is rendered via a STABLE module-scope component (not an inline
 * arrow) so Atlaskit IconButton's ref forwarding works. Inline arrow icons
 * cause IconButton to remount on every parent render, breaking Popup's
 * anchor measurement.
 */

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

  const initials =
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  // Stable icon component — does NOT close over `open` state, so the IconButton
  // ref stays stable across renders. (RCA: inline arrow icons cause anchor loss.)
  const AvatarGlyph = useCallback(
    () => (
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
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </span>
    ),
    [avatarUrl, initials],
  );

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
          icon={AvatarGlyph}
        />
      )}
    />
  );
}

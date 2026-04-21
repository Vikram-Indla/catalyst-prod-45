import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Avatar from '@atlaskit/avatar';

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
 * ProfileMenu — RCA Apr 2026
 *
 * PRIOR FAILURE: Wrapping `<Avatar>` inside an Atlaskit `IconButton` (or a
 * custom button) caused the popup to mount with zero anchor size. Atlaskit
 * `<Avatar>` renders its own interactive wrapper which breaks ref forwarding
 * and aria measurement when nested inside another button.
 *
 * FIX: Use a plain native <button> as the trigger, spread ALL triggerProps
 * onto it (this gives Popup the real anchor ref), and render a non-interactive
 * <Avatar presence="none"> with pointer-events:none so clicks always land on
 * the button. This matches Atlassian's AppSwitcher pattern.
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
      trigger={(triggerProps) => {
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();
        return (
          <button
            {...triggerProps}
            type="button"
            aria-label="Profile menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{
              all: 'unset',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: open ? '0 0 0 2px #0052CC' : 'none',
              transition: 'box-shadow 150ms ease',
              backgroundColor: '#5243AA',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              overflow: 'hidden',
              fontFamily: 'inherit',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            ) : (
              <span style={{ pointerEvents: 'none' }}>{initials}</span>
            )}
          </button>
        );
      }}
    />
  );
}

import { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import Avatar from '@atlaskit/avatar';

import PersonIcon from '@atlaskit/icon/glyph/person';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import SignOutIcon from '@atlaskit/icon/glyph/sign-out';
import VidPlayIcon from '@atlaskit/icon/glyph/vid-play';
import { ButtonItem, LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box, Flex, Stack, Text, xcss } from '@atlaskit/primitives';
import Heading from '@atlaskit/heading';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { resolveAvatarUrl } from '@/lib/avatars';

const popupStyles = xcss({ width: 'size.4000' });

type AvatarTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  avatarUrl?: string;
  name: string;
};

const AvatarTriggerButton = forwardRef<HTMLButtonElement, AvatarTriggerProps>(
  ({ avatarUrl, name, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label="Profile"
      {...rest}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 4,
        borderRadius: 999,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Avatar size="small" src={avatarUrl} name={name} />
    </button>
  )
);
AvatarTriggerButton.displayName = 'AvatarTriggerButton';

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

  const tooltipText = email ? `${name} • ${email}` : name;

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
        <Box xcss={popupStyles}>
          {/* Header — large avatar + name + email */}
          <Box padding="space.200" backgroundColor="color.background.neutral.subtle">
            <Flex alignItems="center" gap="space.150">
              <Avatar size="large" src={avatarUrl} name={name} />
              <Stack space="space.025">
                <Heading size="small">{name}</Heading>
                <Text size="small" color="color.text.subtlest">{email}</Text>
              </Stack>
            </Flex>
          </Box>

          <MenuGroup minWidth="320px" spacing="cozy" menuLabel="Profile menu">
            <Section>
              <LinkItem
                href="/profile"
                iconBefore={<PersonIcon label="" />}
                onClick={(e) => { e.preventDefault(); go('/profile'); }}
              >
                Profile
              </LinkItem>
              <LinkItem
                href="/settings"
                iconBefore={<SettingsIcon label="" />}
                onClick={(e) => { e.preventDefault(); go('/settings'); }}
              >
                Account settings
              </LinkItem>

              {/* Theme submenu — inline expandable */}
              <ButtonItem
                iconBefore={<VidPlayIcon label="" />}
                onClick={() => setThemeOpen((v) => !v)}
              >
                Theme
              </ButtonItem>
              {themeOpen && (
                <Box paddingInlineStart="space.400">
                  <ButtonItem isSelected={theme === 'light'} onClick={() => setTheme('light')}>
                    Light
                  </ButtonItem>
                  <ButtonItem isSelected={theme === 'dark'} onClick={() => setTheme('dark')}>
                    Dark
                  </ButtonItem>
                  <ButtonItem isSelected={theme === 'system'} onClick={() => setTheme('system')}>
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
        <AvatarTriggerButton
          {...triggerProps}
          title={tooltipText}
          avatarUrl={avatarUrl}
          name={name}
          onClick={() => setOpen((v) => !v)}
        />
      )}
    />
  );
}

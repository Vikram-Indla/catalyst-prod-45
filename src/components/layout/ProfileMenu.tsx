import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '@atlaskit/popup';
import { IconButton } from '@atlaskit/button/new';

import PersonIcon from '@atlaskit/icon/core/person';
import SettingsIcon from '@atlaskit/icon/core/settings';
import SignOutIcon from '@atlaskit/icon/core/log-out';
import ThemeIcon from '@atlaskit/icon/core/theme';
import { ButtonItem, LinkItem, MenuGroup, Section } from '@atlaskit/menu';
import { Box } from '@atlaskit/primitives';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { resolveAvatarUrl } from '@/lib/avatars';

/**
 * ProfileMenu — surgical rebuild Apr 2026
 *
 * Strict 1:1 mirror of SettingsMenu (which is known-working). Differences
 * from SettingsMenu kept to the absolute minimum:
 *   - Custom avatar icon component (module-scope, stable identity)
 *   - 4 menu items instead of N
 *   - Sign-out + theme handlers
 *
 * Removed (caused prior popup-open failures): Avatar inside content, Heading,
 * Stack, Flex, Text, nested Box. These are the suspects that broke render.
 * They can be added back once the bare popup is confirmed opening.
 */

// Module-level mutable state read by the stable AvatarGlyph component.
// Updated each render of ProfileMenu without changing icon component identity.
const avatarState: { url?: string; initials: string } = { initials: 'U' };

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

  const initials =
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  // Update module state for the stable icon component.
  avatarState.url = avatarUrl;
  avatarState.initials = initials;

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const onSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
    } finally {
      navigate('/auth');
    }
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
      content={() => {
        // Diagnostic: confirm popup content is being rendered. If you see the
        // trigger flash selected but never see this log, Atlaskit is bailing
        // before render — most likely the trigger ref is stale.
        // eslint-disable-next-line no-console
        console.log('[ProfileMenu] popup content rendered', {
          name,
          email,
          themeOpen,
        });
        return (
          <Box padding="space.150">
            <Box padding="space.150">
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#172B4D',
                  marginBottom: 2,
                }}
              >
                {name}
              </div>
              <div style={{ fontSize: 12, color: '#6B778C' }}>{email}</div>
            </Box>
            <MenuGroup
              minWidth="280px"
              spacing="cozy"
              menuLabel="Profile menu"
            >
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
                  onClick={() => void onSignOut()}
                >
                  Log out
                </ButtonItem>
              </Section>
            </MenuGroup>
          </Box>
        );
      }}
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

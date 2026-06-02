import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, User as UserIcon, Sun, Moon, Monitor, Palette } from '@/lib/atlaskit-icons';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/useTheme';
import { resolveAvatarUrl } from '@/lib/avatars';
import { token } from '@atlaskit/tokens';

// Atlassian brand purple avatar fallback — canonical Jira/Confluence identity colour.
const AVATAR_BRAND_PURPLE = token('color.background.brand.boldest', '#5243AA');

/**
 * ProfileMenu — Radix rebuild Apr 2026
 *
 * Why not Atlaskit Popup: after multiple deep-dive RCAs, Atlaskit's Popup
 * portal renders content (confirmed via console logs firing 6× per click)
 * but the floating layer is invisible / unmeasurable in our shell context.
 * Likely missing @atlaskit/layering provider. Investigation cost > benefit.
 *
 * Switched to Radix DropdownMenu (already used across the codebase via
 * src/components/ui/dropdown-menu.tsx) which:
 *  - Portals to document.body cleanly (no shell ancestor clipping)
 *  - Anchors reliably under the trigger
 *  - No ref-stability footguns
 *  - Works with any trigger element
 */

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  // Resource 360 routing logic (canAccessEnterprise / useMyLeadProjects /
  // r360Item) removed 2026-05-31 alongside the menu entry — see git blame
  // for the original three-way branch by user role.

  const email = user?.email ?? '';
  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    email.split('@')[0] ||
    'User';
  // Only use bundled local avatars — external CDN URLs (Google OAuth, Gravatar) are banned per CLAUDE.md G6.
  const avatarUrl = resolveAvatarUrl(name) || undefined;

  const initials =
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
    } finally {
      navigate('/auth');
    }
  };

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Profile menu"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '50%',
            outline: 'none',
            transition: 'box-shadow 120ms ease',
            boxShadow: open
              ? `0 0 0 2px ${token('color.border.focused', 'var(--cp-primary-60, #0052CC)')}`
              : '0 0 0 0 transparent',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: AVATAR_BRAND_PURPLE,
              color: token('color.text.inverse', '#FFFFFF'),
              fontSize: 11,
              fontWeight: 600,
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
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        style={{ width: 288, padding: 0, zIndex: 1000 }}
      >
        {/* Identity header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
            background: token('elevation.surface.sunken', '#F4F5F7'),
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: AVATAR_BRAND_PURPLE,
              color: token('color.text.inverse', '#FFFFFF'),
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: token('color.text.subtle', '#6B778C'),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {email}
            </div>
          </div>
        </div>

        <div style={{ padding: 4 }}>
          <DropdownMenuLabel
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: token('color.text.subtle', '#6B778C'),
            }}
          >
            Account
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              go('/profile');
            }}
            style={{ cursor: 'pointer' }}
          >
            <UserIcon style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
            <span>Profile</span>
          </DropdownMenuItem>
          {/* Resource 360 entry REMOVED 2026-05-31 — accessible via the
              For You "Resource 360°" tab and via per-row contextual actions.
              Profile menu was a redundant entry point cluttering the dropdown. */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              go('/settings');
            }}
            style={{ cursor: 'pointer' }}
          >
            <SettingsIcon style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
            <span>Account settings</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger style={{ cursor: 'pointer' }}>
              <Palette style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent style={{ zIndex: 1001 }}>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme('light');
                }}
                style={{ cursor: 'pointer' }}
              >
                <Sun style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
                Light
                {theme === 'light' && (
                  <span style={{ marginLeft: 'auto', color: token('color.text.brand', 'var(--cp-primary-60, #0052CC)') }}>✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme('dark');
                }}
                style={{ cursor: 'pointer' }}
              >
                <Moon style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
                Dark
                {theme === 'dark' && (
                  <span style={{ marginLeft: 'auto', color: token('color.text.brand', 'var(--cp-primary-60, #0052CC)') }}>✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme('system');
                }}
                style={{ cursor: 'pointer' }}
              >
                <Monitor style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
                Match system
                {theme === 'system' && (
                  <span style={{ marginLeft: 'auto', color: token('color.text.brand', 'var(--cp-primary-60, #0052CC)') }}>✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void handleSignOut();
            }}
            style={{ cursor: 'pointer' }}
          >
            <LogOut style={{ marginRight: 8, width: 16, height: 16, flexShrink: 0 }} />
            <span>Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

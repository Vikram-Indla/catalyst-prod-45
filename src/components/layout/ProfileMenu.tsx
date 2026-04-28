import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, User as UserIcon, Sun, Moon, Monitor, Palette } from 'lucide-react';

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

// Atlassian brand purple — kept as a literal because it is the canonical
// avatar fallback colour across both light and dark modes (Jira / Confluence
// parity). Do not migrate to a token; this is a brand identity hex.
const AVATAR_BRAND_PURPLE = '#5243AA';

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
              ? `0 0 0 2px ${token('color.border.focused', '#0052CC')}`
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
        className="w-72 p-0 z-[1000]"
      >
        {/* Identity header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
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
                color: token('color.text', '#172B4D'),
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
            className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: token('color.text.subtle', '#6B778C') }}
          >
            Account
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              go('/profile');
            }}
            className="cursor-pointer"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              go('/settings');
            }}
            className="cursor-pointer"
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Account settings</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Palette className="mr-2 h-4 w-4" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[1001]">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme('light');
                }}
                className="cursor-pointer"
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
                {theme === 'light' && (
                  <span className="ml-auto" style={{ color: token('color.text.brand', '#0052CC') }}>✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme('dark');
                }}
                className="cursor-pointer"
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
                {theme === 'dark' && (
                  <span className="ml-auto" style={{ color: token('color.text.brand', '#0052CC') }}>✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme('system');
                }}
                className="cursor-pointer"
              >
                <Monitor className="mr-2 h-4 w-4" />
                Match system
                {theme === 'system' && (
                  <span className="ml-auto" style={{ color: token('color.text.brand', '#0052CC') }}>✓</span>
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
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

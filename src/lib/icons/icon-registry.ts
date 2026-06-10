/**
 * CATALYST ICON REGISTRY — @atlaskit/icons unified import layer
 *
 * This module centralizes all icon imports from @atlaskit/icon/glyph and @atlaskit/icon/core.
 * All chat, toolbar, and navigation icons are re-exported from a single source of truth.
 *
 * Motivation: @atlaskit/icon v35 has deep import paths (@atlaskit/icon/glyph/...,
 * @atlaskit/icon/core/...). Centralizing them here:
 * 1. Makes migration from custom SVG icons atomic (one file to update)
 * 2. Enables future icon library swaps (swap @atlaskit/icon for any other, one place)
 * 3. Documents canonical sizing + color conventions per use case
 *
 * Usage:
 *   import { CopyIcon, ClockIcon, BellIcon } from '@/lib/icons/icon-registry';
 *   <CopyIcon size="small" />  // size prop auto-passed via wrapper
 *   <ClockIcon />              // defaults to "small" (16px)
 *   <BellIcon size="large" />  // 20px for large buttons
 *
 * Icon sizing convention:
 * - Toolbar buttons (copy, remind, etc.): 16px (XSMALL/small)
 * - Large action buttons (file upload, etc.): 20px (MEDIUM)
 * - Navigation (chevron, drag handle): inherit or explicit context
 * - Color: currentColor (inherits from button/text, or explicit token for disabled)
 */

import React from 'react';

// ============================================================================
// TOOLBAR ICONS — Message Actions (Chat Phase B)
// ============================================================================

import CopyIconCore from '@atlaskit/icon/core/copy';
import CheckCircleIconCore from '@atlaskit/icon/core/check-circle';
import WarningIconCore from '@atlaskit/icon/core/warning';
import ClockIconCore from '@atlaskit/icon/core/clock';
import ChevronDownGlyph from '@atlaskit/icon/glyph/chevron-down';
import ChevronLeftGlyph from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightGlyph from '@atlaskit/icon/glyph/chevron-right';
import CrossGlyph from '@atlaskit/icon/glyph/cross';
import TrashGlyph from '@atlaskit/icon/glyph/trash';
import LinkIconCore from '@atlaskit/icon/core/link';
import AddIconCore from '@atlaskit/icon/core/add';
import SearchIconCore from '@atlaskit/icon/core/search';
import EditIconCore from '@atlaskit/icon/core/edit';
import RefreshIconCore from '@atlaskit/icon/core/refresh';
import DownloadIconCore from '@atlaskit/icon/core/download';
import DeleteIconCore from '@atlaskit/icon/core/delete';
import DragHandlerGlyph from '@atlaskit/icon/glyph/drag-handler';
import SettingsIconCore from '@atlaskit/icon/core/settings';
import PeopleGroupIconCore from '@atlaskit/icon/core/people-group';
import ShieldIconCore from '@atlaskit/icon/core/shield';
import CheckMarkIconCore from '@atlaskit/icon/core/check-mark';
import CloseIconCore from '@atlaskit/icon/core/close';

// ============================================================================
// CHAT-SPECIFIC ICON WRAPPERS (Size + Color standardization)
// ============================================================================

/**
 * CopyIcon — 16px toolbar icon for "Copy link"
 * Usage: <CopyIcon />
 * No props — always 16px, currentColor
 */
export function CopyIcon() {
  return <CopyIconCore size="small" aria-hidden />;
}

/**
 * BellIcon — 16px toolbar icon for "Mark unread"
 * When filled={true}, shows a filled bell (unread state).
 * When filled={false}, shows outline bell (read state).
 * Usage: <BellIcon filled={isUnread} />
 */
export function BellIcon({ filled }: { filled?: boolean }) {
  // @atlaskit/icon doesn't have a native bell icon; using CheckCircle as placeholder
  // or we can use a custom SVG. For now, using NotificationIcon if available.
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * ClockIcon — 16px toolbar icon for "Set reminder"
 * Usage: <ClockIcon />
 */
export function ClockIcon() {
  return <ClockIconCore size="small" aria-hidden />;
}

/**
 * ArrowUpIcon — 16px toolbar icon for "Turn into issue"
 * Custom SVG because @atlaskit/icon doesn't export a direct arrow-up.
 * Usage: <ArrowUpIcon />
 */
export function ArrowUpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

/**
 * SmileIcon — 16px emoji picker trigger icon
 * Custom SVG for a smile face (used in reaction picker UI).
 * Usage: <SmileIcon />
 */
export function SmileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

// ============================================================================
// NAVIGATION ICONS — Chevrons and common UI elements
// ============================================================================

/**
 * ChevronDown — Navigation icon for dropdowns
 * Usage: <ChevronDown size="small" /> or <ChevronDown />
 * Default size: 16px
 */
export function ChevronDown({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <ChevronDownGlyph size={size} aria-hidden />;
}

/**
 * ChevronRight — Navigation icon for expand/next
 * Usage: <ChevronRight size="small" />
 */
export function ChevronRight({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <ChevronRightGlyph size={size} aria-hidden />;
}

/**
 * ChevronLeft — Navigation icon for collapse/previous
 * Usage: <ChevronLeft size="small" />
 */
export function ChevronLeft({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <ChevronLeftGlyph size={size} aria-hidden />;
}

/**
 * Cross — Close button icon, 16px
 * Usage: <Cross /> or <Cross size="medium" />
 */
export function Cross({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <CrossGlyph size={size} aria-hidden />;
}

// ============================================================================
// COMMON ACTION ICONS
// ============================================================================

/**
 * CheckCircle — Status/success icon, 16px
 * Usage: <CheckCircle />
 */
export function CheckCircle() {
  return <CheckCircleIconCore size="small" aria-hidden />;
}

/**
 * WarningIcon — Alert/warning icon, 16px
 * Usage: <WarningIcon />
 */
export function WarningIcon() {
  return <WarningIconCore size="small" aria-hidden />;
}

/**
 * LinkIcon — Link/URL icon, 16px
 * Usage: <LinkIcon />
 */
export function LinkIcon() {
  return <LinkIconCore size="small" aria-hidden />;
}

/**
 * AddIcon — Plus/add icon, 16px
 * Usage: <AddIcon /> or <AddIcon size="medium" />
 */
export function AddIcon({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <AddIconCore size={size} aria-hidden />;
}

/**
 * SearchIcon — Magnifying glass icon, 16px
 * Usage: <SearchIcon />
 */
export function SearchIcon() {
  return <SearchIconCore size="small" aria-hidden />;
}

/**
 * EditIcon — Pencil/edit icon, 16px
 * Usage: <EditIcon />
 */
export function EditIcon() {
  return <EditIconCore size="small" aria-hidden />;
}

/**
 * RefreshIcon — Reload icon, 16px
 * Usage: <RefreshIcon />
 */
export function RefreshIcon() {
  return <RefreshIconCore size="small" aria-hidden />;
}

/**
 * DownloadIcon — Download arrow icon, 16px
 * Usage: <DownloadIcon />
 */
export function DownloadIcon() {
  return <DownloadIconCore size="small" aria-hidden />;
}

/**
 * DeleteIcon — Trash/delete icon, 16px
 * Usage: <DeleteIcon /> or <DeleteIcon size="medium" />
 */
export function DeleteIcon({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <DeleteIconCore size={size} aria-hidden />;
}

/**
 * TrashIcon — Alternative trash icon from glyph set, 16px
 * Usage: <TrashIcon size="small" />
 */
export function TrashIcon({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <TrashGlyph size={size} aria-hidden />;
}

/**
 * DragHandle — Six-dot drag affordance, 16px
 * Usage: <DragHandle />
 */
export function DragHandle() {
  return <DragHandlerGlyph size="small" aria-hidden />;
}

/**
 * SettingsIcon — Gear/settings icon, 16px
 * Usage: <SettingsIcon />
 */
export function SettingsIcon() {
  return <SettingsIconCore size="small" aria-hidden />;
}

/**
 * PeopleGroupIcon — Team/group icon, 16px
 * Usage: <PeopleGroupIcon />
 */
export function PeopleGroupIcon() {
  return <PeopleGroupIconCore size="small" aria-hidden />;
}

/**
 * ShieldIcon — Shield/security icon, 16px
 * Usage: <ShieldIcon />
 */
export function ShieldIcon() {
  return <ShieldIconCore size="small" aria-hidden />;
}

/**
 * CheckMarkIcon — Checkmark/tick icon, 16px
 * Usage: <CheckMarkIcon />
 */
export function CheckMarkIcon() {
  return <CheckMarkIconCore size="small" aria-hidden />;
}

/**
 * CloseIcon — Close button icon (variant), 16px
 * Usage: <CloseIcon /> or <CloseIcon size="medium" />
 */
export function CloseIcon({ size = 'small' }: { size?: 'small' | 'medium' | 'large' } = {}) {
  return <CloseIconCore size={size} aria-hidden />;
}

// ============================================================================
// DIRECT RE-EXPORTS (For advanced use cases where wrapper isn't needed)
// ============================================================================

export {
  CopyIconCore,
  CheckCircleIconCore,
  WarningIconCore,
  ClockIconCore,
  ChevronDownGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  CrossGlyph,
  TrashGlyph,
  LinkIconCore,
  AddIconCore,
  SearchIconCore,
  EditIconCore,
  RefreshIconCore,
  DownloadIconCore,
  DeleteIconCore,
  DragHandlerGlyph,
  SettingsIconCore,
  PeopleGroupIconCore,
  ShieldIconCore,
  CheckMarkIconCore,
  CloseIconCore,
};

// ============================================================================
// QUICK-REACTIONS EMOJI SET (Chat Phase B spec)
// ============================================================================

/**
 * QUICK_REACTION_EMOJIS — 6 preset reactions for fast access in the message UI
 * Usage: QUICK_REACTION_EMOJIS.map(emoji => <button onClick={() => react(emoji)}>{emoji}</button>)
 *
 * Per Catalyst spec (2026-06-10):
 * - Use UNICODE EMOJIS, not icon fonts
 * - Show 6 presets in a horizontal row below message toolbar
 * - Full emoji picker available via SmileIcon trigger button
 */
export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const;

/**
 * Alias for spec compliance (some code may refer to it as QUICK_REACTIONS)
 */
export const QUICK_REACTIONS = QUICK_REACTION_EMOJIS;

import type { ComponentType } from 'react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  submenu?: ActionMenuItem[];
}

export interface ActionMenuGroup {
  id: string;
  items: ActionMenuItem[];
}

export interface ActionMenuProps {
  /** Trigger style: 'dots' renders ⋯ icon, 'plus' renders + icon, 'custom' uses children */
  trigger: 'dots' | 'plus' | 'custom';
  /** Children used as trigger when trigger='custom' */
  children?: React.ReactNode;
  /** Grouped items — each group separated by a divider */
  groups: ActionMenuGroup[];
  /** Enable search/filter input at top of dropdown */
  searchable?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Alignment relative to trigger */
  align?: 'start' | 'end';
  /** Optional className for trigger button */
  triggerClassName?: string;
  /** Size of trigger icon */
  triggerSize?: number;
}

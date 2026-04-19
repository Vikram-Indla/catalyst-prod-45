/**
 * Popup — Catalyst wrapper over @atlaskit/popup.
 *
 * The right tool for floating menus / popovers whose trigger is bespoke
 * (custom status chip, assignee avatar, field inline-edit shell). For
 * menus that share an Atlaskit DropdownMenu look, use DropdownMenu.
 *
 * Controlled API only — Popup in Catalyst is always controlled. Uncontrolled
 * usage produced too many edge cases around focus trapping and escape
 * handling, so the wrapper removes that path.
 */
import AkPopup from '@atlaskit/popup';
import { type ReactNode } from 'react';

export type PopupPlacement =
  | 'auto'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export interface PopupTriggerProps {
  /** Spread onto the DOM node acting as the trigger. */
  ref: (node: HTMLElement | null) => void;
  /** Aria-expanded, aria-haspopup, etc. — spread too. */
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

export interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  placement?: PopupPlacement;
  /** Trigger renderer — receives props to spread onto the anchor node. */
  trigger: (triggerProps: PopupTriggerProps) => ReactNode;
  /** Popup content renderer. */
  content: () => ReactNode;
  /** Disables Atlaskit's default focus trap (rare — only when the popup
   *  contains nested popups that manage their own focus). */
  shouldDisableFocusLock?: boolean;
  /** Stops click-outside from firing onClose. */
  shouldRenderToParent?: boolean;
  /** Max width in px. */
  maxWidth?: number;
  testId?: string;
}

export function Popup({
  isOpen,
  onClose,
  placement = 'bottom-start',
  trigger,
  content,
  shouldDisableFocusLock,
  shouldRenderToParent,
  maxWidth,
  testId,
}: PopupProps) {
  return (
    <AkPopup
      isOpen={isOpen}
      onClose={onClose}
      placement={placement}
      shouldDisableFocusLock={shouldDisableFocusLock}
      shouldRenderToParent={shouldRenderToParent}
      messageId={testId}
      trigger={(triggerProps) =>
        trigger({
          ref: triggerProps.ref as (node: HTMLElement | null) => void,
          'aria-controls': triggerProps['aria-controls'],
          'aria-expanded': triggerProps['aria-expanded'],
          'aria-haspopup': triggerProps['aria-haspopup'],
        })
      }
      content={content}
      {...(maxWidth ? { style: { maxWidth } } : {})}
      testId={testId}
    />
  );
}

// @ts-nocheck
/**
 * DropdownMenu — Catalyst wrapper over @atlaskit/dropdown-menu.
 *
 * For menus whose trigger is a standard button. For popovers with custom
 * triggers (avatar, status chip, inline cell), use Popup instead.
 *
 * Data-driven items are the canonical path. Anchor composition via the
 * children slot is supported for edge cases (ticket row overflow menu
 * with dividers and headings).
 */
import AkDropdownMenu, {
  DropdownItem as AkDropdownItem,
  DropdownItemGroup as AkDropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import { useRef, type ReactNode } from 'react';

export interface DropdownMenuItem {
  key: string;
  label: ReactNode;
  iconBefore?: ReactNode;
  iconAfter?: ReactNode;
  isDisabled?: boolean;
  isDanger?: boolean;
  description?: ReactNode;
  onClick?: () => void;
  testId?: string;
}

export interface DropdownMenuGroup {
  key: string;
  title?: ReactNode;
  items: DropdownMenuItem[];
}

export interface DropdownMenuProps {
  /** The trigger button — rendered as an Atlaskit "Loading Button" by default. */
  trigger: ReactNode | ((props: { isSelected: boolean }) => ReactNode);
  /** Item groups to render. Falls back to children slot if empty. */
  groups?: DropdownMenuGroup[];
  /** Advanced — direct JSX composition. Use groups first. */
  children?: ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  /**
   * Default true (renders into the trigger's parent). Set FALSE when the
   * trigger lives inside a `position: sticky` ancestor — popper's transform
   * never applies there and the menu paints at viewport (0,0) (live-debugged
   * 2026-07-06 on the Docex page header). Portaling to body positions
   * correctly regardless of the ancestor chain.
   */
  shouldRenderToParent?: boolean;
  /** Minimum width of the menu. */
  minWidth?: number;
  isLoading?: boolean;
  testId?: string;
  'aria-label'?: string;
}

export function DropdownMenu({
  trigger,
  groups,
  children,
  placement = 'bottom-start',
  shouldRenderToParent = true,
  minWidth,
  isLoading,
  testId,
  ...rest
}: DropdownMenuProps) {
  const triggerWrapRef = useRef<HTMLSpanElement>(null);

  // Popper-dormancy rescue (live-debugged 2026-07-06 on the Docex page):
  // in some mounts @atlaskit/popper's update loop never runs — the popup
  // keeps its pre-position inline style (`position: fixed; left: 0; top: 0`,
  // NO transform) and paints at the viewport origin. Two frames after open,
  // if that exact dormancy signature is present, position the popup from
  // the trigger rect ourselves. When popper is alive (transform present)
  // this is a no-op, so healthy consumers are untouched.
  const rescueDormantPopper = (attempt = 0) => {
    // Re-assert a few times: Atlaskit re-renders the popup right after open,
    // which can recreate the fixed element and drop a one-shot transform.
    if (attempt > 4) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // String triggers render Atlaskit's own button, which holds focus
        // when the menu opens — use it when no custom-trigger ref exists.
        // Anchor priority: the ref'd trigger wrapper (function triggers) —
        // string triggers should migrate to the function form to be
        // rescue-eligible with a precise anchor.
        const anchor = triggerWrapRef.current?.firstElementChild ?? triggerWrapRef.current;
        const menu = document.querySelector<HTMLElement>('[role="menu"]');
        const popEl = menu?.closest<HTMLElement>('[style*="position: fixed"]');
        if (!anchor || !menu || !popEl) {
          rescueDormantPopper(attempt + 1);
          return;
        }
        if (popEl.style.transform) return; // popper alive — never interfere
        const rect = anchor.getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        const menuWidth = popEl.getBoundingClientRect().width || 220;
        const alignEnd = placement.endsWith('end');
        const x = Math.max(8, Math.round(alignEnd ? rect.right - menuWidth : rect.left));
        const y = Math.round(placement.startsWith('top') ? rect.top - 8 : rect.bottom + 4);
        popEl.style.transform = `translate(${x}px, ${y}px)`;
        rescueDormantPopper(attempt + 1);
      }),
    );
  };

  return (
    <AkDropdownMenu
      trigger={
        typeof trigger === 'function'
          ? (triggerProps) => {
              const isSelected = Boolean((triggerProps as { isSelected?: boolean })?.isSelected);
              return (
                <span ref={triggerWrapRef} style={{ display: 'inline-block' }} {...(triggerProps as object)}>
                  {(trigger as (p: { isSelected: boolean }) => ReactNode)({ isSelected })}
                </span>
              );
            }
          : trigger
      }
      onOpenChange={({ isOpen }) => {
        if (isOpen) rescueDormantPopper();
      }}
      placement={placement}
      shouldRenderToParent={shouldRenderToParent}
      spacing="compact"
      isLoading={isLoading}
      testId={testId}
      label={rest['aria-label']}
      {...(minWidth ? { minWidth } : {})}
    >
      {groups && groups.length > 0
        ? groups.map((group) => (
            <AkDropdownItemGroup key={group.key} title={group.title}>
              {group.items.map((item) => (
                <AkDropdownItem
                  key={item.key}
                  isDisabled={item.isDisabled}
                  description={item.description}
                  elemBefore={item.iconBefore}
                  elemAfter={item.iconAfter}
                  onClick={item.onClick}
                  testId={item.testId}
                >
                  {item.label}
                </AkDropdownItem>
              ))}
            </AkDropdownItemGroup>
          ))
        : children}
    </AkDropdownMenu>
  );
}

export { AkDropdownItem as DropdownItem, AkDropdownItemGroup as DropdownItemGroup };
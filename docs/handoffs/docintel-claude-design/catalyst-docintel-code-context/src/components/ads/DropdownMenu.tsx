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
import { type ReactNode, type Ref } from 'react';

export interface DropdownMenuItem {
  key: string;
  label: ReactNode;
  iconBefore?: ReactNode;
  iconAfter?: ReactNode;
  isDisabled?: boolean;
  /** Renders the Atlaskit selected-item checkmark. */
  isSelected?: boolean;
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
  minWidth,
  isLoading,
  testId,
  ...rest
}: DropdownMenuProps) {
  return (
    <AkDropdownMenu
      trigger={
        typeof trigger === 'function'
          ? (triggerProps) => {
              // triggerRef must land on the span (popper anchor); the non-DOM
              // props must not leak onto it as attributes.
              const { triggerRef, isSelected, testId: triggerTestId, ...domProps } =
                (triggerProps ?? {}) as {
                  triggerRef?: Ref<HTMLElement>;
                  isSelected?: boolean;
                  testId?: string;
                } & Record<string, unknown>;
              return (
                <span ref={triggerRef} data-testid={triggerTestId} {...domProps}>
                  {(trigger as (p: { isSelected: boolean }) => ReactNode)({ isSelected: Boolean(isSelected) })}
                </span>
              );
            }
          : trigger
      }
      placement={placement}
      shouldRenderToParent
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
                  isSelected={item.isSelected}
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
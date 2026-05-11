"use client";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@catylast/icons";
import type { IconName } from "@catylast/icons";
import {
  createContext,
  forwardRef,
  Fragment,
  isValidElement,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";

import { cx } from "../utils/classNames";
import { Button } from "../Button/Button";
import * as styles from "./DropdownMenu.css";

// ============================================================================
// Public types
// ============================================================================

export type DropdownMenuSize = "small" | "medium" | "large";

export type DropdownItemAppearance = "default" | "primary" | "danger";

/** Anything renderable as a left-side icon — registered name or React node. */
export type DropdownItemIcon = IconName | ReactNode;

// ============================================================================
// Internal helpers
// ============================================================================

function renderIconSlot(
  slot: DropdownItemIcon | undefined,
  pixelSize: number,
): ReactNode {
  if (slot === undefined || slot === null || slot === false) return null;
  if (typeof slot === "string") {
    return <Icon name={slot as IconName} size={pixelSize} />;
  }
  return slot;
}

// Context lets nested items inherit `size` from the surrounding DropdownMenu
// without consumers having to thread the prop through every component.
type DropdownMenuContextValue = {
  size: DropdownMenuSize;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue>({
  size: "medium",
});

const ICON_PIXEL_SIZE: Record<DropdownMenuSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
};

// ============================================================================
// DropdownMenu (root)
// ============================================================================

export type DropdownMenuProps = {
  /**
   * Trigger content. Pass any node (commonly a `<Button>` or
   * `<IconButton>`). Pass a string to get a default `<Button>` trigger
   * with that label and a trailing chevron — useful for one-off menus
   * that don't need a custom button.
   */
  trigger?: ReactNode;
  /**
   * Internal trigger styling. Only used when `trigger` is a string.
   * Pass `"primary"` / `"subtle"` / `"default"` to flip the auto-built
   * Button's appearance. Custom node triggers (i.e. when `trigger` is a
   * React element) ignore this — style your own.
   * @default "default"
   */
  triggerAppearance?: "default" | "primary" | "subtle";
  /** Side the popup opens on. @default "bottom" */
  placement?:
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end";
  /** Disable opening the menu. */
  isDisabled?: boolean;
  /** Controlled open state. */
  isOpen?: boolean;
  /** Default open state (uncontrolled). */
  defaultOpen?: boolean;
  /** Fired when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Visual scale propagated to all items inside this menu via context.
   * @default "medium"
   */
  size?: DropdownMenuSize;
  /** Pixels between the trigger and the popup. @default 4 */
  sideOffset?: number;
  /** Pixels between the popup and the viewport edge before flipping. @default 8 */
  collisionPadding?: number;
  /** Class names merged with the popup root. */
  className?: string;
  /** Inline style on the popup root — useful for CSS variable overrides. */
  style?: CSSProperties;
  /** Items rendered inside the popup. */
  children?: ReactNode;
};

/**
 * The root container. Pass `trigger` plus any number of
 * `<DropdownItem>` / `<DropdownItemGroup>` / `<DropdownItemCheckbox>` /
 * `<DropdownItemRadioGroup>` children. Composes Radix DropdownMenu
 * underneath so keyboard nav, focus trapping, and a11y are handled
 * for free.
 */
export function DropdownMenu({
  trigger,
  triggerAppearance = "default",
  placement = "bottom",
  isDisabled = false,
  isOpen,
  defaultOpen,
  onOpenChange,
  size = "medium",
  sideOffset = 4,
  collisionPadding = 8,
  className,
  style,
  children,
}: DropdownMenuProps): ReactElement {
  const [side, align] = (() => {
    const [s, a] = placement.split("-");
    return [
      s as "top" | "right" | "bottom" | "left",
      (a ?? "center") as "start" | "end" | "center",
    ];
  })();

  // Build the trigger node. Strings get auto-wrapped in a Button with a
  // trailing chevron; React elements pass through untouched (so consumers
  // can use any custom button / link / chip as the trigger).
  const triggerNode = (() => {
    if (typeof trigger === "string") {
      return (
        <Button
          appearance={triggerAppearance}
          isDisabled={isDisabled}
          iconAfter="chevron-down"
        >
          {trigger}
        </Button>
      );
    }
    if (isValidElement(trigger)) return trigger;
    return null;
  })();

  return (
    <DropdownMenuContext.Provider value={{ size }}>
      <RadixMenu.Root
        modal={false}
        {...(isOpen !== undefined ? { open: isOpen } : {})}
        {...(defaultOpen !== undefined ? { defaultOpen } : {})}
        {...(onOpenChange !== undefined ? { onOpenChange } : {})}
      >
        {triggerNode && (
          <RadixMenu.Trigger asChild disabled={isDisabled}>
            {triggerNode}
          </RadixMenu.Trigger>
        )}
        <RadixMenu.Portal>
          <RadixMenu.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={collisionPadding}
            className={cx(styles.content, styles.size[size], className)}
            style={style}
          >
            {children}
          </RadixMenu.Content>
        </RadixMenu.Portal>
      </RadixMenu.Root>
    </DropdownMenuContext.Provider>
  );
}

// ============================================================================
// DropdownMenuTrigger — explicit trigger when not using the `trigger` prop
// ============================================================================

/**
 * Use this when you want full control over the trigger by composition
 * (e.g. a custom button outside the `trigger` prop pattern).
 *
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild>
 *     <Button>Custom trigger</Button>
 *   </DropdownMenuTrigger>
 *   <DropdownItem>...</DropdownItem>
 * </DropdownMenu>
 * ```
 */
export const DropdownMenuTrigger = RadixMenu.Trigger;

// ============================================================================
// DropdownItem — regular item
// ============================================================================

type DropdownItemOwnProps<E extends ElementType> = {
  /** Click / select handler. The menu closes automatically after click. */
  onClick?: (event: Event) => void;
  /** Icon (registered name or any node) shown to the left of the label. */
  iconBefore?: DropdownItemIcon;
  /** Trailing icon, badge, or shortcut hint shown on the right. */
  iconAfter?: ReactNode;
  /** Optional secondary line of text rendered below the label. */
  description?: ReactNode;
  /** Color preset. @default "default" */
  appearance?: DropdownItemAppearance;
  /** Disable interaction. */
  isDisabled?: boolean;
  /** Override the rendered tag — `as="a"` for a link, `as={Link}` for routers. */
  as?: E;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export type DropdownItemProps<E extends ElementType = "div"> =
  DropdownItemOwnProps<E> &
    Omit<ComponentPropsWithoutRef<E>, keyof DropdownItemOwnProps<E>>;

function DropdownItemImpl<E extends ElementType = "div">(
  {
    onClick,
    iconBefore,
    iconAfter,
    description,
    appearance = "default",
    isDisabled,
    as,
    className,
    children,
    ...rest
  }: DropdownItemProps<E>,
  ref: React.ForwardedRef<HTMLElement>,
): ReactElement {
  const { size } = useContext(DropdownMenuContext);
  const iconPx = ICON_PIXEL_SIZE[size];
  const iconNode = renderIconSlot(iconBefore, iconPx);

  const Component = (as ?? "div") as ElementType;

  return (
    <RadixMenu.Item
      ref={ref as React.Ref<never>}
      asChild
      {...(isDisabled !== undefined ? { disabled: isDisabled } : {})}
      onSelect={(e) => {
        if (onClick) onClick(e);
      }}
    >
      <Component
        className={cx(styles.item, styles.itemAppearance[appearance], className)}
        {...(rest as Record<string, unknown>)}
      >
        {iconNode && <span className={styles.itemIcon}>{iconNode}</span>}
        <span className={styles.itemBody}>
          <span className={styles.itemLabel}>{children}</span>
          {description && (
            <span className={styles.itemDescription}>{description}</span>
          )}
        </span>
        {iconAfter && <span className={styles.itemTrailing}>{iconAfter}</span>}
      </Component>
    </RadixMenu.Item>
  );
}

const DropdownItemForwardRef = forwardRef(DropdownItemImpl as never);

export const DropdownItem = DropdownItemForwardRef as unknown as <
  E extends ElementType = "div",
>(
  props: DropdownItemProps<E> & { ref?: React.Ref<HTMLElement> },
) => ReactElement;

// ============================================================================
// DropdownItemGroup — visually groups items with optional title + separator
// ============================================================================

export type DropdownItemGroupProps = {
  /** Optional uppercase label above the group. */
  title?: ReactNode;
  /** Render a divider line above this group. @default false */
  hasSeparator?: boolean;
  className?: string;
  children?: ReactNode;
};

export function DropdownItemGroup({
  title,
  hasSeparator = false,
  className,
  children,
}: DropdownItemGroupProps): ReactElement {
  return (
    <Fragment>
      {hasSeparator && <RadixMenu.Separator className={styles.separator} />}
      <RadixMenu.Group className={cx(styles.group, className)}>
        {title && (
          <RadixMenu.Label className={styles.groupTitle}>{title}</RadixMenu.Label>
        )}
        {children}
      </RadixMenu.Group>
    </Fragment>
  );
}

// ============================================================================
// DropdownItemCheckbox — toggleable checkbox item
// ============================================================================

export type DropdownItemCheckboxProps = {
  /** Controlled selected state. */
  isSelected?: boolean;
  /** Uncontrolled initial selected state. */
  defaultSelected?: boolean;
  /**
   * Fired when the user toggles the item. Receives the new boolean
   * value. The menu stays open after a click so users can toggle
   * multiple checkboxes in one session.
   */
  onClick?: (isSelected: boolean) => void;
  /** Optional secondary line of text rendered below the label. */
  description?: ReactNode;
  /** Color preset. @default "default" */
  appearance?: DropdownItemAppearance;
  /** Disable interaction. */
  isDisabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export const DropdownItemCheckbox = forwardRef<
  ElementRef<typeof RadixMenu.CheckboxItem>,
  DropdownItemCheckboxProps
>(function DropdownItemCheckbox(
  {
    isSelected,
    defaultSelected,
    onClick,
    description,
    appearance = "default",
    isDisabled,
    className,
    style,
    children,
  },
  ref,
) {
  const { size } = useContext(DropdownMenuContext);
  const iconPx = ICON_PIXEL_SIZE[size];

  // Reconcile controlled / uncontrolled into Radix's prop shape, only
  // passing whichever side the consumer actually wired up.
  const radixCheckedProps = (() => {
    if (isSelected !== undefined) return { checked: isSelected };
    if (defaultSelected !== undefined) return { defaultChecked: defaultSelected };
    return {};
  })();

  return (
    <RadixMenu.CheckboxItem
      ref={ref}
      {...(isDisabled !== undefined ? { disabled: isDisabled } : {})}
      {...radixCheckedProps}
      onSelect={(e) => {
        // Prevent the menu from auto-closing — checkable items are usually
        // toggled multiple times in a row.
        e.preventDefault();
      }}
      onCheckedChange={(next) => {
        if (typeof next === "boolean") onClick?.(next);
      }}
      className={cx(styles.item, styles.itemAppearance[appearance], className)}
      style={style}
    >
      <span className={styles.checkmarkSlot}>
        <RadixMenu.ItemIndicator>
          <Icon name="check" size={iconPx} />
        </RadixMenu.ItemIndicator>
      </span>
      <span className={styles.itemBody}>
        <span className={styles.itemLabel}>{children}</span>
        {description && (
          <span className={styles.itemDescription}>{description}</span>
        )}
      </span>
    </RadixMenu.CheckboxItem>
  );
});

// ============================================================================
// DropdownItemRadioGroup + DropdownItemRadio
// ============================================================================

export type DropdownItemRadioGroupProps = {
  /** Controlled selected `id`. */
  value?: string;
  /** Uncontrolled initial selected `id`. */
  defaultValue?: string;
  /** Fired when the selected radio changes. Receives the new `id`. */
  onChange?: (value: string) => void;
  /** Optional uppercase label above the group. */
  title?: ReactNode;
  /** Render a divider line above this group. @default false */
  hasSeparator?: boolean;
  className?: string;
  children?: ReactNode;
};

const RadioGroupContext = createContext<{
  value: string | undefined;
  onChange: (value: string) => void;
} | null>(null);

export function DropdownItemRadioGroup({
  value,
  defaultValue,
  onChange,
  title,
  hasSeparator = false,
  className,
  children,
}: DropdownItemRadioGroupProps): ReactElement {
  // Radix RadioGroup handles the controlled/uncontrolled split itself,
  // but we expose `onChange(value)` rather than forwarding the raw
  // event so consumers don't have to know about Radix's API.
  const groupId = useId();

  return (
    <Fragment>
      {hasSeparator && <RadixMenu.Separator className={styles.separator} />}
      <RadioGroupContext.Provider
        value={{ value, onChange: onChange ?? (() => {}) }}
      >
        <RadixMenu.RadioGroup
          {...(value !== undefined ? { value } : {})}
          {...(defaultValue !== undefined ? { defaultValue } : {})}
          {...(onChange !== undefined ? { onValueChange: onChange } : {})}
          className={cx(styles.group, className)}
        >
          {title && (
            <RadixMenu.Label
              id={`${groupId}-label`}
              className={styles.groupTitle}
            >
              {title}
            </RadixMenu.Label>
          )}
          {children}
        </RadixMenu.RadioGroup>
      </RadioGroupContext.Provider>
    </Fragment>
  );
}

export type DropdownItemRadioProps = {
  /** The unique value for this radio. Selected when it matches `value` on the group. */
  id: string;
  /** Optional secondary line of text rendered below the label. */
  description?: ReactNode;
  /** Disable interaction. */
  isDisabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export const DropdownItemRadio = forwardRef<
  ElementRef<typeof RadixMenu.RadioItem>,
  DropdownItemRadioProps
>(function DropdownItemRadio(
  { id, description, isDisabled, className, style, children },
  ref,
) {
  const { size } = useContext(DropdownMenuContext);
  const iconPx = ICON_PIXEL_SIZE[size];

  return (
    <RadixMenu.RadioItem
      ref={ref}
      value={id}
      {...(isDisabled !== undefined ? { disabled: isDisabled } : {})}
      onSelect={(e) => {
        // Don't auto-close — let consumers see the selection commit before
        // they decide whether to dismiss.
        e.preventDefault();
      }}
      className={cx(styles.item, className)}
      style={style}
    >
      <span className={styles.checkmarkSlot}>
        <RadixMenu.ItemIndicator>
          {/* A filled dot is the conventional radio indicator inside a menu — */}
          {/* small enough to fit the icon column without crowding the label. */}
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: `${Math.round(iconPx * 0.5)}px`,
              height: `${Math.round(iconPx * 0.5)}px`,
              borderRadius: "50%",
              background: "currentColor",
            }}
          />
        </RadixMenu.ItemIndicator>
      </span>
      <span className={styles.itemBody}>
        <span className={styles.itemLabel}>{children}</span>
        {description && (
          <span className={styles.itemDescription}>{description}</span>
        )}
      </span>
    </RadixMenu.RadioItem>
  );
});

// ============================================================================
// Sub-menu — re-exported with the same styling as the main content
// ============================================================================

export const DropdownMenuSub = RadixMenu.Sub;

export const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof RadixMenu.SubTrigger>,
  ComponentPropsWithoutRef<typeof RadixMenu.SubTrigger> & {
    iconBefore?: DropdownItemIcon;
    description?: ReactNode;
  }
>(function DropdownMenuSubTrigger(
  { className, iconBefore, description, children, ...rest },
  ref,
) {
  const { size } = useContext(DropdownMenuContext);
  const iconPx = ICON_PIXEL_SIZE[size];
  const iconNode = renderIconSlot(iconBefore, iconPx);

  return (
    <RadixMenu.SubTrigger
      ref={ref}
      className={cx(styles.item, className)}
      {...rest}
    >
      {iconNode && <span className={styles.itemIcon}>{iconNode}</span>}
      <span className={styles.itemBody}>
        <span className={styles.itemLabel}>{children}</span>
        {description && (
          <span className={styles.itemDescription}>{description}</span>
        )}
      </span>
      <span className={styles.subTriggerArrow}>
        <Icon name="chevron-right" size={14} />
      </span>
    </RadixMenu.SubTrigger>
  );
});

export const DropdownMenuSubContent = forwardRef<
  ElementRef<typeof RadixMenu.SubContent>,
  ComponentPropsWithoutRef<typeof RadixMenu.SubContent> & {
    size?: DropdownMenuSize;
  }
>(function DropdownMenuSubContent(
  {
    className,
    sideOffset = 4,
    collisionPadding = 8,
    size: sizeProp,
    ...rest
  },
  ref,
) {
  const ctx = useContext(DropdownMenuContext);
  const size = sizeProp ?? ctx.size;
  return (
    <RadixMenu.Portal>
      <RadixMenu.SubContent
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, styles.size[size], className)}
        {...rest}
      />
    </RadixMenu.Portal>
  );
});

// ============================================================================
// Visual separator — exposed for advanced layouts
// ============================================================================

export const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof RadixMenu.Separator>,
  ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function DropdownMenuSeparator({ className, ...rest }, ref) {
  return (
    <RadixMenu.Separator
      ref={ref}
      className={cx(styles.separator, className)}
      {...rest}
    />
  );
});

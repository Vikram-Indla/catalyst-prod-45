import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — Tabs
 *
 * Mirrors the Atlaskit Tabs composition:
 *   <Tabs id="..." defaultSelected={0} onChange={(idx) => ...}>
 *     <TabList>
 *       <Tab>One</Tab>
 *       <Tab>Two</Tab>
 *     </TabList>
 *     <TabPanel>Content one</TabPanel>
 *     <TabPanel>Content two</TabPanel>
 *   </Tabs>
 *
 * Uses 0-indexed numeric `selected` like Atlaskit (we map to Radix string ids internally).
 * Built on @radix-ui/react-tabs for keyboard support.
 */

interface TabsCtx {
  baseId: string;
}
const TabsContext = React.createContext<TabsCtx | null>(null);
const useTabsCtx = () => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("DS.Tabs subcomponents must be used inside <Tabs>.");
  return ctx;
};

export interface TabsProps {
  id?: string;
  selected?: number;
  defaultSelected?: number;
  onChange?: (index: number) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  id,
  selected,
  defaultSelected = 0,
  onChange,
  children,
  className,
}) => {
  const generated = React.useId();
  const baseId = id ?? generated;

  const valueOf = (i: number) => `${baseId}-${i}`;
  const indexOf = (v: string) => Number(v.split("-").pop());

  // Walk top-level children and inject __value into each <TabPanel /> in render order
  // so that TabPanel[i] pairs with Tab[i] inside <TabList>.
  let panelIndex = 0;
  const injected = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const displayName = (child.type as { displayName?: string })?.displayName;
    if (displayName === "DS.TabPanel") {
      const value = valueOf(panelIndex);
      panelIndex += 1;
      return React.cloneElement(child as React.ReactElement<{ __value?: string }>, {
        __value: value,
      });
    }
    return child;
  });

  return (
    <TabsContext.Provider value={{ baseId }}>
      <RadixTabs.Root
        value={selected != null ? valueOf(selected) : undefined}
        defaultValue={valueOf(defaultSelected)}
        onValueChange={(v) => onChange?.(indexOf(v))}
        className={cn("flex flex-col w-full", className)}
        activationMode="automatic"
      >
        {injected}
      </RadixTabs.Root>
    </TabsContext.Provider>
  );
};

export const TabList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const { baseId } = useTabsCtx();
  // Inject a sequential index into each <Tab> child so they map to the right Radix value.
  const childArray = React.Children.toArray(children);
  return (
    <RadixTabs.List
      className={cn(
        "flex items-stretch gap-[var(--ds-space-300)]",
        "border-b border-[var(--ds-color-border)]",
        "px-[var(--ds-space-050)]",
        className,
      )}
    >
      {childArray.map((child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<TabInternalProps>, {
              __value: `${baseId}-${i}`,
            })
          : child,
      )}
    </RadixTabs.List>
  );
};

interface TabInternalProps {
  __value?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
  className?: string;
}

export const Tab: React.FC<TabInternalProps> = ({ __value, children, isDisabled, className }) => {
  if (!__value) {
    // Used outside <TabList /> — just render a span so it doesn't crash.
    return <span>{children}</span>;
  }
  return (
    <RadixTabs.Trigger
      value={__value}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center",
        "px-[var(--ds-space-100)] py-[var(--ds-space-150)]",
        "text-[length:var(--ds-font-size-200)] font-[number:var(--ds-font-weight-medium)]",
        "text-[var(--ds-color-text-subtle)] hover:text-[var(--ds-color-text)]",
        "border-b-2 border-transparent -mb-[1px]",
        "data-[state=active]:text-[var(--ds-color-text-selected)] data-[state=active]:border-[var(--ds-color-border-selected)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-border-focused)]/25 rounded-t-[var(--ds-radius-100)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "transition-colors duration-[var(--ds-motion-duration-small)]",
        className,
      )}
    >
      {children}
    </RadixTabs.Trigger>
  );
};

interface TabPanelInternalProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * `TabPanel` order in JSX must match the order of `<Tab>` children inside `<TabList>`.
 * This mirrors Atlaskit's positional tab/panel pairing.
 */
export const TabPanel: React.FC<TabPanelInternalProps & { __value?: string }> = ({
  children,
  className,
  __value,
}) => {
  // The parent <Tabs> wraps panels, so we need to inject __value into them too.
  if (!__value) return <PanelInjector className={className}>{children}</PanelInjector>;
  return (
    <RadixTabs.Content
      value={__value}
      className={cn(
        "pt-[var(--ds-space-200)] outline-none",
        "text-[length:var(--ds-font-size-200)] text-[var(--ds-color-text)]",
        className,
      )}
    >
      {children}
    </RadixTabs.Content>
  );
};

/**
 * Panels rendered as direct children of <Tabs> are auto-indexed in render order,
 * skipping the <TabList /> child so list-position == panel-position == index.
 */
const PanelInjector: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  // We can't actually re-walk parent here — Tabs handles injection via context.
  // The pattern below is a no-op fallback; real injection happens in `TabsWithPanels`.
  return <div className={className}>{children}</div>;
};

/**
 * Convenience: <TabsWithPanels list={[...]} panels={[...]} /> — most apps prefer this
 * over manual composition because it removes the “must keep tab/panel arrays in sync”
 * footgun. Atlaskit ships both patterns.
 */
export interface TabsWithPanelsProps {
  list: { label: React.ReactNode; isDisabled?: boolean }[];
  panels: React.ReactNode[];
  selected?: number;
  defaultSelected?: number;
  onChange?: (index: number) => void;
  id?: string;
  className?: string;
}

export const TabsWithPanels: React.FC<TabsWithPanelsProps> = ({
  list,
  panels,
  selected,
  defaultSelected = 0,
  onChange,
  id,
  className,
}) => {
  const generated = React.useId();
  const baseId = id ?? generated;
  const valueOf = (i: number) => `${baseId}-${i}`;
  const indexOf = (v: string) => Number(v.split("-").pop());

  return (
    <RadixTabs.Root
      value={selected != null ? valueOf(selected) : undefined}
      defaultValue={valueOf(defaultSelected)}
      onValueChange={(v) => onChange?.(indexOf(v))}
      className={cn("flex flex-col w-full", className)}
      activationMode="automatic"
    >
      <RadixTabs.List
        className={cn(
          "flex items-stretch gap-[var(--ds-space-300)]",
          "border-b border-[var(--ds-color-border)]",
          "px-[var(--ds-space-050)]",
        )}
      >
        {list.map((item, i) => (
          <RadixTabs.Trigger
            key={i}
            value={valueOf(i)}
            disabled={item.isDisabled}
            className={cn(
              "relative inline-flex items-center justify-center",
              "px-[var(--ds-space-100)] py-[var(--ds-space-150)]",
              "text-[length:var(--ds-font-size-200)] font-[number:var(--ds-font-weight-medium)]",
              "text-[var(--ds-color-text-subtle)] hover:text-[var(--ds-color-text)]",
              "border-b-2 border-transparent -mb-[1px]",
              "data-[state=active]:text-[var(--ds-color-text-selected)] data-[state=active]:border-[var(--ds-color-border-selected)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-border-focused)]/25 rounded-t-[var(--ds-radius-100)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "transition-colors duration-[var(--ds-motion-duration-small)]",
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {panels.map((panel, i) => (
        <RadixTabs.Content
          key={i}
          value={valueOf(i)}
          className="pt-[var(--ds-space-200)] outline-none text-[length:var(--ds-font-size-200)] text-[var(--ds-color-text)]"
        >
          {panel}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
};

Tabs.displayName = "DS.Tabs";
TabList.displayName = "DS.TabList";
Tab.displayName = "DS.Tab";
TabPanel.displayName = "DS.TabPanel";
TabsWithPanels.displayName = "DS.TabsWithPanels";

/**
 * Breadcrumbs — Catalyst wrapper over @atlaskit/breadcrumbs.
 *
 * Data-driven API. Callers pass an array of `BreadcrumbItem` objects; the
 * wrapper maps each to the correct Atlaskit rendering (anchor / button /
 * terminal / custom node) and hides the Atlaskit JSX composition entirely
 * from product code.
 *
 * Why data-driven (not JSX composition)?
 *  - Keeps product code immune to Atlaskit's shape churn — items are the
 *    stable contract; the Atlaskit JSX is hidden.
 *  - Makes keyboard-nav + truncation behaviour uniform across every surface
 *    (Story View, Backlog, Linked-items modal, Incident detail).
 *
 * Rendering decision (in order — first match wins):
 *  1. `render`         escape hatch — caller supplies the full node
 *                      (used for popover triggers like AddParentPicker).
 *  2. `isCurrent`      terminal span with `aria-current="page"` — no link,
 *                      no click; the label for the page you are on.
 *  3. `href` + LinkComponent
 *                      render the href through an SPA router adapter
 *                      (typically React Router's <Link>).
 *  4. `href` alone     plain <a href>.
 *  5. `onClick` only   <button type="button"> — used for "+ Add parent"
 *                      and other action crumbs without a URL destination.
 *
 * Scoped polish (typography, separator, spacing) is intentionally NOT
 * baked in — product surfaces style the breadcrumbs to fit their
 * surrounding chrome. See the TicketBreadcrumbs surface for the canonical
 * Story-View polish block.
 */
import AkBreadcrumbs, { BreadcrumbsItem as AkBreadcrumbsItem } from '@atlaskit/breadcrumbs';
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { forwardTestId } from './internal/forwardTestId';

/* ─────────────────────────────────────────────────────────────────
 * Public types
 * ───────────────────────────────────────────────────────────────── */

export interface BreadcrumbItem {
  /** Unique key — stable across renders. */
  key: string;
  /**
   * Visible text. `string` is preferred for a11y (Atlaskit forwards to
   * aria-label); ReactNode is accepted so callers can compose icon+label
   * inline (the wrapper casts internally). When you pass a ReactNode, set
   * `ariaLabel` so assistive tech still gets a clean string.
   */
  text: ReactNode;
  /** Optional a11y label when `text` is a ReactNode. */
  ariaLabel?: string;
  /** Destination URL — preferred for right-click / open-in-new-tab. */
  href?: string;
  /** Click handler — typically pushes to the router or triggers a popover. */
  onClick?: (e: MouseEvent) => void;
  /** Icon node rendered before the label. Use Lucide; StatusLozenge not allowed. */
  iconBefore?: ReactNode;
  /** testId — forwarded as both `testId` (Atlaskit) and `data-testid`. */
  testId?: string;
  /**
   * Mark this crumb as the current page. Renders a non-interactive span
   * with `aria-current="page"` and no link wrapper. No `href`/`onClick`
   * are honoured when this is true.
   */
  isCurrent?: boolean;
  /**
   * Render escape hatch — returns the full node, replacing the default
   * anchor/button/span rendering. Use for surface-specific embeds like
   * popover triggers. Prefer the declarative fields above when possible.
   */
  render?: () => ReactNode;
}

/** Contract for a router-aware link component supplied by the caller. */
export type BreadcrumbLinkComponent = ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }
>;

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Max visible items before collapsing to ellipsis. Default: 4. */
  maxItems?: number;
  /** Callback when the ellipsis collapsed-items control is clicked. */
  onExpand?: () => void;
  /**
   * SPA router adapter. When supplied, items with `href` render through
   * this component (usually React Router's <Link>). When omitted, items
   * with `href` render as a plain <a> — full page reload on click.
   */
  LinkComponent?: BreadcrumbLinkComponent;
  testId?: string;
  'aria-label'?: string;
}

/* ─────────────────────────────────────────────────────────────────
 * Internal per-item components
 *
 * Each item's rendering mode is picked in renderItem() and the
 * corresponding forwardRef component is threaded into Atlaskit's
 * `component` prop. forwardRef is required — Atlaskit calls
 * React.cloneElement under the hood and passes a ref.
 * ───────────────────────────────────────────────────────────────── */

/** Button rendering — for action crumbs (onClick without href). */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode };
const ButtonCrumb = forwardRef<HTMLButtonElement, BtnProps>(function ButtonCrumb(
  { children, className, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Terminal rendering — aria-current=page; no link, no button. */
type TerminalProps = {
  children?: ReactNode;
  className?: string;
  'aria-label'?: string;
};
const TerminalCrumb = forwardRef<HTMLSpanElement, TerminalProps>(function TerminalCrumb(
  { children, className, 'aria-label': ariaLabel },
  ref,
) {
  return (
    <span ref={ref} aria-current="page" aria-label={ariaLabel} className={className}>
      {children}
    </span>
  );
});

/** Shared prop shape for the `render` escape-hatch wrapper. */
type OpaqueProps = { children?: ReactNode; className?: string };

/* ─────────────────────────────────────────────────────────────────
 * Public component
 * ───────────────────────────────────────────────────────────────── */

export function Breadcrumbs({
  items,
  maxItems = 4,
  onExpand,
  LinkComponent,
  testId,
  ...rest
}: BreadcrumbsProps) {
  return (
    <AkBreadcrumbs
      maxItems={maxItems}
      onExpand={onExpand}
      label={rest['aria-label'] ?? 'Breadcrumbs'}
      {...forwardTestId(testId)}
    >
      {items.map((item) => renderItem(item, LinkComponent))}
    </AkBreadcrumbs>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Rendering decision
 * ───────────────────────────────────────────────────────────────── */

function renderItem(item: BreadcrumbItem, LinkComponent?: BreadcrumbLinkComponent) {
  // 1. Escape hatch — caller owns the node.
  if (item.render) {
    const node = item.render();
    const OpaqueFactory = forwardRef<HTMLSpanElement, OpaqueProps>(function OpaqueFactory(
      { className },
      ref,
    ) {
      return (
        <span ref={ref} className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {node}
        </span>
      );
    });
    return (
      <AkBreadcrumbsItem
        key={item.key}
        text=""
        iconBefore={item.iconBefore}
        component={OpaqueFactory}
        {...forwardTestId(item.testId)}
      />
    );
  }

  // Cast text once — Atlaskit's d.ts says `string` but it renders any node.
  const textAsString = item.text as unknown as string;
  const itemTestId = forwardTestId(item.testId);

  // 2. Terminal crumb — aria-current.
  if (item.isCurrent) {
    const TerminalFactory = forwardRef<HTMLSpanElement, TerminalProps>(
      function TerminalFactory(props, ref) {
        return <TerminalCrumb {...props} aria-label={item.ariaLabel} ref={ref} />;
      },
    );
    return (
      <AkBreadcrumbsItem
        key={item.key}
        text={textAsString}
        iconBefore={item.iconBefore}
        component={TerminalFactory}
        {...itemTestId}
      />
    );
  }

  // 3. href + router adapter → SPA Link.
  if (item.href && LinkComponent) {
    const LinkFactory = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
      function LinkFactory(props, ref) {
        return (
          <LinkComponent
            {...props}
            href={item.href!}
            ref={ref as Ref<HTMLAnchorElement>}
            aria-label={item.ariaLabel}
          />
        );
      },
    );
    return (
      <AkBreadcrumbsItem
        key={item.key}
        href={item.href}
        text={textAsString}
        iconBefore={item.iconBefore}
        onClick={item.onClick}
        component={LinkFactory}
        {...itemTestId}
      />
    );
  }

  // 4. href only — plain anchor (no SPA routing).
  if (item.href) {
    return (
      <AkBreadcrumbsItem
        key={item.key}
        href={item.href}
        text={textAsString}
        iconBefore={item.iconBefore}
        onClick={item.onClick}
        {...itemTestId}
      />
    );
  }

  // 5. onClick-only — button.
  return (
    <AkBreadcrumbsItem
      key={item.key}
      text={textAsString}
      iconBefore={item.iconBefore}
      onClick={item.onClick}
      component={ButtonCrumb}
      {...itemTestId}
    />
  );
}


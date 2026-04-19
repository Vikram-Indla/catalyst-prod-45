/**
 * Breadcrumbs — Storybook canonical fixture.
 *
 * Each story exercises one branch of the rendering decision in
 * renderItem() (see Breadcrumbs.tsx):
 *
 *   1. Plain anchor         → BasicHref
 *   2. SPA router adapter   → WithRouterLink  (simulated adapter — no router needed)
 *   3. Button-only crumb    → WithActionCrumb ("+ Add parent" shape)
 *   4. Terminal crumb       → WithTerminal    (aria-current=page)
 *   5. Render escape hatch  → WithCustomRender (embeds an arbitrary node)
 *
 * TicketBreadcrumbsShape is the production composition — it mirrors what
 * the Story View's TicketBreadcrumbs wrapper renders, so it's the fixture
 * the visual-regression harness pins.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Breadcrumbs, type BreadcrumbLinkComponent } from '@/components/ads';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'ADS/Breadcrumbs',
  component: Breadcrumbs,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof Breadcrumbs>;

/* A minimal router-link stand-in for stories — renders a plain anchor
 * but proves the LinkComponent wiring through renderItem(). In product
 * code this is react-router-dom's <Link>. */
const StoryLink: BreadcrumbLinkComponent = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(function StoryLink(props, ref) {
  return <a {...props} ref={ref} data-router-link="true" />;
});

export const BasicHref: Story = {
  args: {
    items: [
      { key: 'proj', text: 'MOIM-INFRA', href: '/projects/moim-infra' },
      { key: 'epic', text: 'Q3 Onboarding', href: '/projects/moim-infra/epics/ep-12' },
      { key: 'story', text: 'BAU-5419', href: '/projects/moim-infra/story/bau-5419' },
    ],
  },
};

export const WithRouterLink: Story = {
  args: {
    LinkComponent: StoryLink,
    items: [
      { key: 'proj', text: 'MOIM-INFRA', href: '/projects/moim-infra' },
      { key: 'epic', text: 'Q3 Onboarding', href: '/projects/moim-infra/epics/ep-12' },
      { key: 'story', text: 'BAU-5419', href: '/projects/moim-infra/story/bau-5419' },
    ],
  },
};

export const WithActionCrumb: Story = {
  args: {
    items: [
      { key: 'add-parent', text: '+ Add parent', onClick: () => window.alert('Add parent clicked') },
      { key: 'story', text: 'BAU-5419', isCurrent: true },
    ],
  },
};

export const WithTerminal: Story = {
  args: {
    items: [
      { key: 'proj', text: 'MOIM-INFRA', href: '/projects/moim-infra' },
      { key: 'epic', text: 'Q3 Onboarding', href: '/projects/moim-infra/epics/ep-12' },
      { key: 'story', text: 'BAU-5419', isCurrent: true, ariaLabel: 'Current issue BAU-5419' },
    ],
  },
};

export const WithCustomRender: Story = {
  args: {
    items: [
      {
        key: 'popover',
        text: '',
        render: () => (
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: '1px dashed currentColor',
              borderRadius: 3,
              padding: '2px 6px',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            ✨ Custom render (popover trigger)
          </button>
        ),
      },
      { key: 'story', text: 'BAU-5419', isCurrent: true },
    ],
  },
};

/**
 * TicketBreadcrumbsShape — mirrors the production TicketBreadcrumbs surface.
 * Used as the visual-regression baseline for the Story View breadcrumb.
 * The Icon is a tiny coloured square stand-in; the real surface renders
 * IssueIcon canonical SVGs.
 */
const IconStub = ({ color }: { color: string }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      borderRadius: 3,
      background: color,
      flexShrink: 0,
    }}
  />
);

export const TicketBreadcrumbsShape: Story = {
  render: () => (
    <Breadcrumbs
      LinkComponent={StoryLink}
      items={[
        {
          key: 'parent',
          text: 'EPIC-102',
          iconBefore: <IconStub color="#904EE2" />,
          href: '/project-hub/MOIM-INFRA/issue/EPIC-102',
          ariaLabel: 'Parent EPIC-102',
        },
        {
          key: 'current',
          text: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <IconStub color="#63BA3C" />
              <span>BAU-5419</span>
            </span>
          ),
          ariaLabel: 'Current issue BAU-5419',
          isCurrent: true,
        },
      ]}
    />
  ),
};

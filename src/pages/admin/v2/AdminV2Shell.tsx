/**
 * AdminV2Shell — IA shell for /admin/v2.
 *
 * Six top-level sections mirroring the Jira admin settings tree:
 *
 *   System      → General, Security, Appearance, Announcements
 *   Work items  → Work types, Workflows, Screens, Custom fields, Statuses, Notifications
 *   Spaces      → Portfolios, Programs, Products, Themes
 *   Users       → List, Groups, Roles, Permissions
 *   Apps        → Jira sync, Slack
 *   Audit       → Action log
 *
 * Phase 0 enables Audit > Action log; Phase 1a/b/c enables Custom fields,
 * Statuses, and Work types under Work items. Disabled items render with
 * `aria-disabled="true"` so screen readers announce the dark-launch state.
 *
 * The whole shell is gated behind `useAdminV2Flag('admin_v2_enabled')`. When
 * the flag is off (default in Phase 0), an EmptyState explains the surface
 * is dark-launched and AdminGuard already prevented unauthorised access.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { type ReactNode } from 'react';
import { EmptyState, Heading } from '@/components/ads';
import { useAdminV2Flag } from '@/hooks/admin/useAdminV2Flag';

interface NavItem {
  label: string;
  to?: string; // omitted when disabled
  disabled?: boolean;
  /** Match descendant routes too — e.g. /admin/v2/work-items/workflows/:id
   *  should keep "Workflows" highlighted. Default false (exact-match). */
  prefixMatch?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'System',
    items: [
      { label: 'General', disabled: true },
      { label: 'Security', disabled: true },
      { label: 'Appearance', disabled: true },
      { label: 'Announcements', disabled: true },
    ],
  },
  {
    label: 'Work items',
    items: [
      { label: 'Work types', to: '/admin/v2/work-items/types' },
      { label: 'Workflows', to: '/admin/v2/work-items/workflows', prefixMatch: true },
      { label: 'Screens', disabled: true },
      { label: 'Custom fields', to: '/admin/v2/work-items/custom-fields' },
      { label: 'Statuses', to: '/admin/v2/work-items/statuses' },
      { label: 'Notifications', disabled: true },
    ],
  },
  {
    label: 'Spaces',
    items: [
      { label: 'Portfolios', disabled: true },
      { label: 'Programs', disabled: true },
      { label: 'Products', disabled: true },
      { label: 'Themes', disabled: true },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'List', disabled: true },
      { label: 'Groups', disabled: true },
      { label: 'Roles', disabled: true },
      { label: 'Permissions', disabled: true },
    ],
  },
  {
    label: 'Apps',
    items: [
      { label: 'Jira sync', disabled: true },
      { label: 'Slack', disabled: true },
    ],
  },
  {
    label: 'Audit',
    items: [{ label: 'Action log', to: '/admin/v2/audit' }],
  },
];

export default function AdminV2Shell() {
  const flagOn = useAdminV2Flag('admin_v2_enabled');

  if (!flagOn) {
    return (
      <div
        data-testid="admin-v2/shell/dark-launched"
        style={{
          padding: 'var(--ds-space-600, 48px) var(--ds-space-400, 24px)',
        }}
      >
        <EmptyState
          header="Admin v2 is dark-launched"
          description="The re-architected admin surface is gated behind a feature flag while Phase 0 hardens. Flip admin_v2_enabled in feature_flags to access it."
        />
      </div>
    );
  }

  return (
    <div
      data-testid="admin-v2/shell"
      style={{
        display: 'flex',
        minHeight: 'calc(100vh - 48px)',
        background: 'var(--ds-surface, #FFFFFF)',
      }}
    >
      <SideNav />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function SideNav() {
  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: '1px solid var(--ds-border, #DCDFE4)',
        padding: 'var(--ds-space-300, 16px) 0',
        background: 'var(--ds-surface, #FFFFFF)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '0 var(--ds-space-300, 16px) var(--ds-space-200, 12px)',
        }}
      >
        <Heading as="h2" size="small">
          Admin v2
        </Heading>
      </div>
      {SECTIONS.map((section) => (
        <SectionBlock key={section.label} section={section} />
      ))}
    </aside>
  );
}

function SectionBlock({ section }: { section: NavSection }) {
  return (
    <div style={{ padding: 'var(--ds-space-150, 10px) 0' }}>
      <div
        style={{
          padding: '0 var(--ds-space-300, 16px)',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: 'var(--ds-text-subtlest, #626F86)',
          marginBottom: 'var(--ds-space-100, 8px)',
        }}
      >
        {section.label}
      </div>
      {section.items.map((item) => (
        <NavRow key={item.label} item={item} />
      ))}
    </div>
  );
}

function NavRow({ item }: { item: NavItem }) {
  if (item.disabled || !item.to) {
    return (
      <DisabledRow>
        <span>{item.label}</span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ds-text-subtlest, #626F86)',
            fontWeight: 500,
          }}
        >
          Soon
        </span>
      </DisabledRow>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={!item.prefixMatch}
      style={({ isActive }) => ({
        display: 'block',
        padding: 'var(--ds-space-100, 8px) var(--ds-space-300, 16px)',
        fontSize: 14,
        color: isActive
          ? 'var(--ds-text-selected, #0C66E4)'
          : 'var(--ds-text, #172B4D)',
        background: isActive
          ? 'var(--ds-background-selected, #E9F2FF)'
          : 'transparent',
        borderLeft: isActive
          ? '2px solid var(--ds-border-selected, #0C66E4)'
          : '2px solid transparent',
        textDecoration: 'none',
        fontWeight: isActive ? 600 : 400,
      })}
    >
      {item.label}
    </NavLink>
  );
}

function DisabledRow({ children }: { children: ReactNode }) {
  return (
    <div
      aria-disabled="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--ds-space-100, 8px) var(--ds-space-300, 16px)',
        fontSize: 14,
        color: 'var(--ds-text-disabled, #8590A2)',
        cursor: 'not-allowed',
      }}
    >
      {children}
    </div>
  );
}

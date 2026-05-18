/**
 * Admin Overview Metrics Sources:
 * ──────────────────────────────────────────────────────────
 * usersCount         -> useUsers() from src/hooks/useUsers.ts (profiles table)
 * integrationsCount  -> integration_connectors table (src/pages/admin/Integrations.tsx pattern)
 * auditEventsCount   -> activity_logs table (src/pages/admin/Activity.tsx pattern)
 * departmentsCount   -> useDepartments() from src/hooks/useDepartmentsAndOwners.ts
 * businessOwnersCount-> useBusinessOwners() from src/hooks/useDepartmentsAndOwners.ts
 * teamsCount         -> useTeams() from src/hooks/useTeams.ts
 * programsCount      -> programs table (src/pages/admin/OrgSetup.tsx pattern)
 * recentActivity     -> useRecentRooms() from src/hooks/useRecentRooms.ts
 * adminChanges       -> activity_logs table filtered to admin entity types
 *
 * NO seeded/demo data. All counts are from real database.
 *
 * ADS-compliant: all colors use var(--ds-*) tokens. No Tailwind color classes.
 * Dead links fixed 2026-05-09 Wave 2:
 *   /admin/teams        → /admin/departments
 *   /admin/jira-config  → /admin/workhub/jira-connection
 *   /admin/activity     → /admin/workhub/sync-logs (audit card + "View all")
 *   /admin/security     → /admin/roles-permissions (no security page exists)
 */

import { AdminGuard } from '@/components/admin/AdminGuard';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
import { Link } from 'react-router-dom';
import SearchIcon from '@atlaskit/icon/core/search';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import ShieldIcon from '@atlaskit/icon/core/shield';
import ChartTrendIcon from '@atlaskit/icon/core/chart-trend';
import LinkIcon from '@atlaskit/icon/core/link';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import SettingsIcon from '@atlaskit/icon/core/settings';
import DatabaseIcon from '@atlaskit/icon/core/database';
import ClockIcon from '@atlaskit/icon/core/clock';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import { useState } from 'react';
import { useAdminOverviewMetrics, useRecentAdminChanges, useRecentRooms } from '@/hooks/useAdminOverviewMetrics';
import { formatDistanceToNow } from 'date-fns';

/** ADS token map — all colors via var(--ds-*) with light-mode fallbacks. */
const T = {
  surface:        'var(--ds-surface, #FFFFFF)',
  border:         'var(--ds-border, #DCDFE4)',
  borderLayout:   'var(--ds-border-layout, #EBECF0)',
  borderSelected: 'var(--ds-border-selected, #0C66E4)',
  text:           'var(--ds-text, var(--cp-text-primary, #172B4D))',
  textSubtle:     'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))',
  textSubtlest:   'var(--ds-text-subtlest, #626F86)',
  textBrand:      'var(--ds-text-brand, #0C66E4)',
  bgPage:         'var(--ds-background-accent-gray-subtlest, #F7F8F9)',
  bgNeutralHover: 'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgBrandSubtle:  'var(--ds-background-selected, #E9F2FF)',
  iconBrand:      'var(--ds-icon-brand, #0C66E4)',
  iconSubtle:     'var(--ds-icon-subtle, var(--cp-text-secondary, #44546F))',
};

/** Quick actions — all paths registered in REGISTERED_ADMIN_ROUTES. */
const quickActions = [
  { label: 'Invite user',     icon: PersonAddIcon,   path: '/admin/access' },
  { label: 'Create role',     icon: ShieldIcon,      path: '/admin/roles-permissions' },
  { label: 'Sync logs',       icon: ChartTrendIcon,  path: '/admin/workhub/sync-logs' },
  { label: 'Jira connection', icon: LinkIcon,        path: '/admin/workhub/jira-connection' },
];

export default function AdminOverview() {
  const [searchQuery, setSearchQuery]     = useState('');
  const [hoveredCard, setHoveredCard]     = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom]     = useState<string | null>(null);

  const metrics = useAdminOverviewMetrics();
  const { data: recentChanges, isLoading: changesLoading } = useRecentAdminChanges(5);
  const { recentRooms, loading: roomsLoading } = useRecentRooms({ limit: 4 });

  /**
   * Pocket cards — all paths registered in REGISTERED_ADMIN_ROUTES.
   * Security card → /admin/roles-permissions (no /admin/security page exists).
   */
  const pocketCards = [
    {
      id: 'users-access',
      title: 'Users & Access',
      description: 'Manage users, roles, and permissions',
      icon: PeopleGroupIcon,
      path: '/admin/access',
      count: metrics.usersCount,
      countLabel: 'users',
    },
    {
      id: 'configuration',
      title: 'Configuration',
      description: 'System settings and preferences',
      icon: SettingsIcon,
      path: '/admin/modules-packages',
      count: metrics.settingsCount,
      countLabel: 'settings',
    },
    {
      id: 'reference-data',
      title: 'Reference Data',
      description: 'Teams, programs, and master data',
      icon: DatabaseIcon,
      path: '/admin/departments',
      count: metrics.referenceDataCount,
      countLabel: 'records',
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'External connections and imports',
      icon: LinkIcon,
      path: '/admin/workhub/jira-connection',
      count: metrics.integrationsCount,
      countLabel: 'active',
    },
    {
      id: 'audit-usage',
      title: 'Audit & Usage',
      description: 'Activity logs and usage analytics',
      icon: ChartTrendIcon,
      path: '/admin/workhub/sync-logs',
      count: metrics.auditEventsCount,
      countLabel: 'events',
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Security settings and policies',
      icon: ShieldIcon,
      path: '/admin/roles-permissions',
      count: metrics.securityPoliciesCount,
      countLabel: 'policies',
    },
  ];

  const formatActionLabel = (action: string, entityType: string): string => {
    const actionMap: Record<string, string> = {
      INSERT: 'Created',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
    };
    const entityMap: Record<string, string> = {
      user_roles:              'User role',
      profiles:                'User profile',
      integration_connectors:  'Integration',
      teams:                   'Team',
      programs:                'Program',
      departments:             'Department',
      business_owners:         'Business owner',
      product_roles:           'Product role',
      auth_settings:           'Auth setting',
    };
    return `${actionMap[action] || action} ${entityMap[entityType] || entityType}`;
  };

  return (
    <AdminGuard>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgPage }}>

        {/* Header */}
        <div style={{
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${T.borderLayout}`,
          background: T.surface,
          padding: '0 24px',
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: T.text, lineHeight: '24px' }}>
              Admin Overview
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '14px', color: T.textSubtle }}>
              System configuration and administration hub
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Global Search */}
          <div style={{ maxWidth: '576px', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{ display: 'flex', color: T.iconSubtle }}><SearchIcon label="" size="small" /></span>
            </div>
            <div style={{ paddingLeft: '32px' }}>
              <Textfield
                value={searchQuery}
                onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                placeholder="Search settings, users, integrations..."
                aria-label="Search admin settings"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isHovered = hoveredAction === action.label;
              return (
                <Link
                  key={action.label}
                  to={action.path}
                  onMouseEnter={() => setHoveredAction(action.label)}
                  onMouseLeave={() => setHoveredAction(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '3px',
                    border: `1px solid ${T.border}`,
                    background: isHovered ? T.bgNeutralHover : T.surface,
                    color: T.text,
                    fontSize: '14px',
                    fontWeight: 400,
                    textDecoration: 'none',
                    transition: 'background 0.1s',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', color: T.iconSubtle }}><Icon label="" size="small" /></span>
                  {action.label}
                </Link>
              );
            })}
          </div>

          {/* Pocket Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {pocketCards.map((pocket) => {
              const Icon = pocket.icon;
              const isHovered = hoveredCard === pocket.id;
              return (
                <Link
                  key={pocket.id}
                  to={pocket.path}
                  onMouseEnter={() => setHoveredCard(pocket.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: T.surface,
                    border: `1px solid ${isHovered ? T.borderSelected : T.border}`,
                    borderRadius: '3px',
                    padding: '16px',
                    cursor: 'pointer',
                    height: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}>
                    {/* Icon + count row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '3px',
                        background: T.bgBrandSubtle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ display: 'inline-flex', color: T.iconBrand }}><Icon label="" size="medium" /></span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {metrics.isLoading ? (
                          <Spinner size="medium" />
                        ) : (
                          <>
                            <span style={{ fontSize: '24px', fontWeight: 700, color: T.text, lineHeight: 1 }}>
                              {pocket.count}
                            </span>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: T.textSubtlest }}>
                              {pocket.countLabel}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Title + description */}
                    <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: T.text }}>
                      {pocket.title}
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: T.textSubtle }}>
                      {pocket.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bottom Row: Recently Visited + Recent Admin Changes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px',
          }}>

            {/* Recently Visited */}
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '3px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ display: 'inline-flex', color: T.iconSubtle }}><ClockIcon label="" size="small" /></span>
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: T.text }}>Recently Visited</h2>
              </div>
              <div>
                {roomsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <Spinner size="medium" />
                  </div>
                ) : recentRooms.length > 0 ? (
                  recentRooms.map((room) => (
                    <Link
                      key={room.id}
                      to={room.room_path}
                      onMouseEnter={() => setHoveredRoom(room.id)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        margin: '0 -8px',
                        borderRadius: '3px',
                        background: hoveredRoom === room.id ? T.bgNeutralHover : 'transparent',
                        textDecoration: 'none',
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: T.text }}>{room.room_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: T.textSubtle }}>
                          {formatDistanceToNow(new Date(room.last_accessed_at), { addSuffix: true })}
                        </span>
                        <span style={{ display: 'inline-flex', color: T.textSubtlest, opacity: hoveredRoom === room.id ? 1 : 0, transition: 'opacity 0.1s' }}>
                          <ArrowRightIcon label="" size="small" />
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: T.textSubtle, textAlign: 'center', padding: '16px 0' }}>
                    No recent activity yet
                  </p>
                )}
              </div>
            </div>

            {/* Recent Admin Changes */}
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '3px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: T.iconSubtle, display: 'flex' }}><ChartTrendIcon label="" size="small" /></span>
                  <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: T.text }}>Recent Admin Changes</h2>
                </div>
                <Link
                  to="/admin/workhub/sync-logs"
                  style={{ fontSize: '12px', color: T.textBrand, textDecoration: 'none' }}
                >
                  View all
                </Link>
              </div>
              <div>
                {changesLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <Spinner size="medium" />
                  </div>
                ) : recentChanges && recentChanges.length > 0 ? (
                  recentChanges.map((change, idx) => (
                    <div
                      key={change.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: idx < recentChanges.length - 1
                          ? `1px solid ${T.borderLayout}`
                          : 'none',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          color: T.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {formatActionLabel(change.action, change.entity_type)}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: T.textSubtle }}>
                          {change.entity_type} • {change.entity_id.slice(0, 8)}...
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', color: T.textSubtle, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {change.created_at
                          ? formatDistanceToNow(new Date(change.created_at), { addSuffix: true })
                          : '-'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: '14px', color: T.textSubtle, textAlign: 'center', padding: '16px 0' }}>
                    No admin changes yet
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AdminGuard>
  );
}

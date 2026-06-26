import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import SettingsIcon from '@atlaskit/icon/core/settings';
import DashboardIcon from '@atlaskit/icon/core/dashboard';
import HomeIcon from '@atlaskit/icon/core/home';
import DatabaseIcon from '@atlaskit/icon/core/database';
import ShieldIcon from '@atlaskit/icon/core/shield';
import PaintPaletteIcon from '@atlaskit/icon/core/paint-palette';
import StarIcon from '@atlaskit/icon/core/star-starred';
import FieldDropdownIcon from '@atlaskit/icon/core/field-dropdown';

const T = {
  text:          'var(--ds-text, #172B4D)',
  textSubtle:    'var(--ds-text-subtle, #44546F)',
  textSubtlest:  'var(--ds-text-subtlest, #626F86)',
  textBrand:     'var(--ds-link, #0C66E4)',
  bgHover:       'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgSelected:    'var(--ds-background-selected, #DFFCF0)',
  border:        'var(--ds-border, #DCDFE4)',
  icon:          'var(--ds-icon, #44546F)',
  iconBrand:     'var(--ds-icon-brand, #0C66E4)',
};

interface SidebarIconProps {
  label: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<SidebarIconProps>;
  id: string;
}

interface CollapsibleSection {
  id: string;
  label: string;
  icon: React.ComponentType<SidebarIconProps>;
  items: NavItem[];
}

const navItems: NavItem[] = [
  { id: 'overview',      label: 'Overview',       path: '/admin/overview',     icon: HomeIcon       },
  { id: 'users-access',  label: 'Users & Access', path: '/admin/access',       icon: ShieldIcon     },
  { id: 'roles',         label: 'Roles',          path: '/admin/roles',        icon: ShieldIcon      },
  { id: 'permissions',   label: 'Permissions',    path: '/admin/permissions',  icon: SettingsIcon    },
];

const collapsibleSections: CollapsibleSection[] = [
  {
    id: 'jira-connection',
    label: 'Jira Connection',
    icon: DatabaseIcon,
    items: [
      { id: 'jira-hub', label: 'Jira Settings', path: '/admin/workhub/jira-connection', icon: DatabaseIcon },
      { id: 'hierarchy-mapping', label: 'Hierarchy Mapping', path: '/admin/hierarchy-mapping', icon: DatabaseIcon },
    ],
  },
  {
    id: 'design-system',
    label: 'Design System',
    icon: PaintPaletteIcon,
    items: [
      { id: 'icons-avatars', label: 'Icons & Avatars', path: '/admin/icons', icon: PaintPaletteIcon },
      { id: 'components', label: 'Components', path: '/admin/components', icon: PaintPaletteIcon },
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: SettingsIcon,
    items: [
      { id: 'status-transitions', label: 'Status & Transitions', path: '/admin/workflows', icon: SettingsIcon },
    ],
  },
  {
    id: 'ai-governance',
    label: 'AI Governance',
    icon: StarIcon,
    items: [
      { id: 'ai-translations', label: 'Translation logs', path: '/admin/ai-governance/translations', icon: StarIcon },
    ],
  },
  {
    id: 'work-items',
    label: 'Work items',
    icon: FieldDropdownIcon,
    items: [
      { id: 'fields-registry', label: 'Fields', path: '/admin/fields', icon: FieldDropdownIcon },
      { id: 'field-layouts', label: 'Field layouts', path: '/admin/fields/layout', icon: FieldDropdownIcon },
    ],
  },
  {
    id: 'test-hub',
    label: 'Test Hub',
    icon: FieldDropdownIcon,
    items: [
      { id: 'test-priorities',    label: 'Case priorities',  path: '/admin/test/priorities',    icon: FieldDropdownIcon },
      { id: 'test-case-types',    label: 'Case types',       path: '/admin/test/case-types',    icon: FieldDropdownIcon },
      { id: 'test-case-statuses', label: 'Case statuses',    path: '/admin/test/case-statuses', icon: FieldDropdownIcon },
      { id: 'test-run-statuses',  label: 'Run statuses',     path: '/admin/test/run-statuses',  icon: FieldDropdownIcon },
      { id: 'test-permissions',   label: 'Permissions',      path: '/admin/test/permissions',   icon: FieldDropdownIcon },
      { id: 'test-columns',           label: 'Customize columns',   path: '/admin/test/columns',            icon: FieldDropdownIcon },
      { id: 'test-custom-fields',     label: 'Custom fields',       path: '/admin/test/custom-fields',      icon: FieldDropdownIcon },
      { id: 'test-preferences',       label: 'General preferences', path: '/admin/test/preferences',        icon: SettingsIcon },
      { id: 'test-report-prefs',      label: 'Report preferences',  path: '/admin/test/report-preferences', icon: SettingsIcon },
      { id: 'test-notifications',     label: 'Email notifications', path: '/admin/test/notifications',      icon: SettingsIcon },
      { id: 'test-email-prefs',       label: 'Email preferences',   path: '/admin/test/email-preferences',  icon: SettingsIcon },
      { id: 'test-advanced',          label: 'Advanced options',     path: '/admin/test/advanced',           icon: SettingsIcon },
      { id: 'test-import',            label: 'Import settings',      path: '/admin/test/import',             icon: SettingsIcon },
      { id: 'test-storage',           label: 'Storage manager',      path: '/admin/test/storage',            icon: DatabaseIcon },
      { id: 'test-audit-log',         label: 'Audit log',            path: '/admin/test/audit-log',          icon: SettingsIcon },
      { id: 'test-ai-usage',          label: 'AI usage summary',     path: '/admin/test/ai-usage',           icon: StarIcon },
    ],
  },
];

/**
 * AdminSidebar — Main navigation for admin section
 *
 * Features:
 * - Main nav items with hover/active states
 * - Collapsible sections (Design System, etc.)
 * - Active path detection for highlighting
 * - Chevron icons for expand/collapse state
 */
export function AdminSidebar() {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'design-system': true,
    'jira-connection': false,
    'workflows': false,
    'ai-governance': false,
    'work-items': true,
    'test-hub': true,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const isPathActive = (path: string) => location.pathname === path;
  const isPathInSubtree = (sectionId: string) => {
    const section = collapsibleSections.find((s) => s.id === sectionId);
    if (!section) return false;
    return section.items.some((item) => isPathActive(item.path));
  };

  return (
    <nav style={{ padding: '12px 0' }}>
      {/* Main navigation items */}
      <div style={{ marginBottom: '12px' }}>
        {navItems.map((item) => {
          const isActive = isPathActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                color: isActive ? T.textBrand : T.text,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? T.bgSelected : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = T.bgHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{ display: 'inline-flex', color: isActive ? T.iconBrand : T.icon }}>
                <Icon label="" size="small" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Collapsible sections */}
      {collapsibleSections.map((section) => {
        const isExpanded = expandedSections[section.id] ?? false;
        const isActive = isPathInSubtree(section.id);
        const Icon = section.icon;
        const ChevronIcon = isExpanded ? ChevronDownIcon : ChevronRightIcon;

        return (
          <div key={section.id}>
            {/* Section header with collapse toggle */}
            <button
              onClick={() => toggleSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                padding: '8px 16px',
                border: 'none',
                background: isActive ? T.bgSelected : 'transparent',
                color: isActive ? T.text : T.textSubtlest,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = T.bgHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{ display: 'inline-flex', color: isActive ? T.iconBrand : T.icon }}>
                <ChevronIcon label="" size="small" />
              </span>
              <span style={{ display: 'inline-flex', color: isActive ? T.iconBrand : T.icon }}>
                <Icon label="" size="small" />
              </span>
              <span>{section.label}</span>
            </button>

            {/* Submenu items (hidden if collapsed) */}
            {isExpanded && (
              <div style={{ paddingLeft: '8px' }}>
                {section.items.map((item) => {
                  const isItemActive = isPathActive(item.path);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 16px',
                        marginLeft: '16px',
                        color: isItemActive ? T.textBrand : T.textSubtle,
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: isItemActive ? 600 : 400,
                        background: isItemActive ? T.bgSelected : 'transparent',
                        borderLeft: isItemActive ? `3px solid ${T.iconBrand}` : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isItemActive) {
                          (e.currentTarget as HTMLElement).style.background = T.bgHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isItemActive) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

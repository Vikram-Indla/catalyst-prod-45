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

const T = {
  text:          'var(--ds-text, #172B4D)',
  textSubtle:    'var(--ds-text-subtle, #44546F)',
  textSubtlest:  'var(--ds-text-subtlest, #626F86)',
  bgHover:       'var(--ds-background-neutral-hovered, #F1F2F4)',
  bgSelected:    'var(--ds-background-selected, #DFFCF0)',
  border:        'var(--ds-border, #DCDFE4)',
  icon:          'var(--ds-icon, #44546F)',
  iconBrand:     'var(--ds-icon-brand, #0C66E4)',
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  id: string;
}

interface CollapsibleSection {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: NavItem[];
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/admin/overview', icon: HomeIcon },
  { id: 'jira-hub', label: 'Jira Hub', path: '/admin/workhub/jira-connection', icon: DatabaseIcon },
  { id: 'configuration', label: 'Configuration', path: '/admin/overview', icon: SettingsIcon },
  { id: 'reference-data', label: 'Reference Data', path: '/admin/departments', icon: DatabaseIcon },
  { id: 'users-access', label: 'Users & Access', path: '/admin/access', icon: ShieldIcon },
];

const collapsibleSections: CollapsibleSection[] = [
  {
    id: 'ai-governance',
    label: 'AI Governance',
    icon: StarIcon,
    items: [
      { id: 'ai-translations', label: 'Translation logs', path: '/admin/ai-governance/translations', icon: StarIcon },
    ],
  },
  {
    id: 'design-system',
    label: 'Design System',
    icon: PaintPaletteIcon,
    items: [
      { id: 'components', label: 'Components', path: '/admin/components', icon: PaintPaletteIcon },
      { id: 'icons', label: 'Icons', path: '/admin/icons', icon: PaintPaletteIcon },
      { id: 'avatars', label: 'Avatars', path: '/admin/avatars', icon: PaintPaletteIcon },
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
    'ai-governance': true,  // AI Governance expanded by default
    'design-system': true,  // Design System expanded by default
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
                color: isActive ? T.text : T.textSubtle,
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
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

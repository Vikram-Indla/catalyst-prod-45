/**
 * FilterTemplateGallery (O5) — hub-aware template picker
 *
 * Renders a grid of template cards grouped by category.
 * Clicking a card calls onSelect(template.jql) so the parent
 * can pre-fill the JQL editor or save modal.
 */
import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import PersonIcon         from '@atlaskit/icon/core/person';
import PeopleGroupIcon    from '@atlaskit/icon/core/people-group';
import PriorityHighestIcon from '@atlaskit/icon/core/priority-highest';
import CalendarIcon       from '@atlaskit/icon/core/calendar';
import BugIcon            from '@atlaskit/icon/core/bug';
import FilterIcon         from '@atlaskit/icon/core/filter';
import {
  getFilterTemplates,
  TEMPLATE_CATEGORIES,
  type HubTemplateScope,
  type FilterTemplate,
} from '@/lib/filters/filterTemplates';

interface Props {
  hubScope: HubTemplateScope;
  projectKey?: string;
  onSelect: (jql: string, templateName: string) => void;
}

/** Atlaskit icon per category — no emoji */
const CATEGORY_ICON: Record<FilterTemplate['category'], React.ReactNode> = {
  'my-work':  <PersonIcon          label="" size="small" />,
  'team':     <PeopleGroupIcon     label="" size="small" />,
  'priority': <PriorityHighestIcon label="" size="small" />,
  'dates':    <CalendarIcon        label="" size="small" />,
  'quality':  <BugIcon             label="" size="small" />,
};

/** Accent color swatch per category (ADS tokens) */
const CATEGORY_COLOR: Record<FilterTemplate['category'], string> = {
  'my-work':  token('color.icon.brand',    'var(--ds-link)'),
  'team':     token('color.icon.success',  'var(--ds-background-success-bold)'),
  'priority': token('color.icon.danger',   'var(--ds-text-danger)'),
  'dates':    token('color.icon.warning',  'var(--ds-text-warning)'),
  'quality':  token('color.icon.accent.purple', 'var(--ds-background-discovery-bold)'),
};

type Cat = FilterTemplate['category'] | 'all';

export function FilterTemplateGallery({ hubScope, projectKey, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<Cat>('all');

  const templates = getFilterTemplates(
    hubScope,
    projectKey,
    activeCategory === 'all' ? undefined : activeCategory
  );

  return (
    <div>
      {/* Category pills — Atlaskit-styled, no emoji */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}>
        {(['all', ...TEMPLATE_CATEGORIES.map(c => c.id)] as const).map(cat => {
          const label = cat === 'all'
            ? 'All templates'
            : TEMPLATE_CATEGORIES.find(c => c.id === cat)?.label ?? cat;
          const isActive = cat === activeCategory;
          return (
            <Button
              key={cat}
              appearance="subtle"
              spacing="compact"
              isSelected={isActive}
              onClick={() => setActiveCategory(cat as Cat)}
            >
              {cat !== 'all' && (
                <span style={{ color: CATEGORY_COLOR[cat as FilterTemplate['category']] }}>
                  {CATEGORY_ICON[cat as FilterTemplate['category']]}
                </span>
              )}
              {cat === 'all' && (
                <span style={{ color: token('color.icon') }}>
                  <FilterIcon label="" size="small" />
                </span>
              )}
              {label}
            </Button>
          );
        })}
      </div>

      {/* Template cards grid */}
      {templates.length === 0 ? (
        <div style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: token('color.text.subtlest'),
          fontSize: 'var(--ds-font-size-300)',
        }}>
          No templates in this category.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {templates.map(t => (
            <div
              key={t.id}
              style={{
                background: `var(--ds-surface)`,
                border: `1px solid ${token('color.border')}`,
                borderRadius: 4,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'box-shadow 120ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `var(--ds-shadow-raised)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              {/* Card header: category icon + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  background: `var(--ds-background-neutral)`,
                  color: CATEGORY_COLOR[t.category],
                  flexShrink: 0,
                }}>
                  {CATEGORY_ICON[t.category]}
                </span>
                <span style={{
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: token('font.weight.semibold'),
                  color: token('color.text'),
                  lineHeight: 1.3,
                }}>
                  {t.name}
                </span>
              </div>

              <p style={{
                margin: 0,
                fontSize: 'var(--ds-font-size-200)',
                color: token('color.text.subtle'),
                lineHeight: 1.4,
              }}>
                {t.description}
              </p>

              {/* JQL preview — monospace, sunken */}
              <div style={{
                fontSize: 'var(--ds-font-size-100)',
                fontFamily: 'var(--ds-font-family-monospace, monospace)',
                color: token('color.text.subtlest'),
                background: `var(--ds-surface-sunken)`,
                borderRadius: 3,
                padding: '4px 8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {t.jql}
              </div>

              <Button
                appearance="subtle"
                onClick={() => onSelect(t.jql, t.name)}
                spacing="compact"
              >
                Use this filter
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

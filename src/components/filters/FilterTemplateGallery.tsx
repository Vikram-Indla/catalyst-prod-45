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

const CATEGORY_ICONS: Record<FilterTemplate['category'], string> = {
  'my-work':  '👤',
  'team':     '👥',
  'priority': '🔴',
  'dates':    '📅',
  'quality':  '🐛',
};

export function FilterTemplateGallery({ hubScope, projectKey, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<FilterTemplate['category'] | 'all'>('all');

  const templates = getFilterTemplates(
    hubScope,
    projectKey,
    activeCategory === 'all' ? undefined : activeCategory
  );

  return (
    <div>
      {/* Category filter chips */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}>
        {(['all', ...TEMPLATE_CATEGORIES.map(c => c.id)] as const).map(cat => {
          const label = cat === 'all'
            ? 'All'
            : TEMPLATE_CATEGORIES.find(c => c.id === cat)?.label ?? cat;
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as FilterTemplate['category'] | 'all')}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                border: `1px solid ${isActive ? token('color.border.selected') : token('color.border')}`,
                background: isActive ? `var(--ds-background-selected, #E9F2FE)` : `var(--ds-surface, #FFFFFF)`,
                color: isActive ? token('color.text.selected') : token('color.text.subtle'),
                fontSize: 12,
                fontWeight: isActive ? token('font.weight.semibold') : token('font.weight.regular'),
                cursor: 'pointer',
              }}
            >
              {cat !== 'all' && CATEGORY_ICONS[cat as FilterTemplate['category']] + ' '}
              {label}
            </button>
          );
        })}
      </div>

      {/* Template cards grid */}
      {templates.length === 0 ? (
        <p style={{ fontSize: 13, color: token('color.text.subtlest'), padding: '16px 0' }}>
          No templates in this category.
        </p>
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
                background: `var(--ds-surface, #FFFFFF)`,
                border: `1px solid ${token('color.border')}`,
                borderRadius: 4,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: token('font.weight.semibold'),
                color: token('color.text'),
              }}>
                {CATEGORY_ICONS[t.category]} {t.name}
              </div>

              <p style={{
                margin: 0,
                fontSize: 12,
                color: token('color.text.subtle'),
                lineHeight: 1.4,
              }}>
                {t.description}
              </p>

              <div style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: token('color.text.subtlest'),
                background: `var(--ds-surface-sunken, #F7F8F9)`,
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

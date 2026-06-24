/**
 * WidgetGalleryModal — Right-side inline panel (Jira "Add a Gadget" parity).
 *
 * Jun 08, 2026 — Migrated from @atlaskit/drawer to inline sidebar panel.
 * Jira's "Add a Gadget" renders as an in-page right sidebar (~400px) with:
 *   - "Add a Gadget" header + close X
 *   - Search input
 *   - Category filter chips (All, Delivery, Quality, Team)
 *   - Gadget cards with title + description + toggle button
 */
import { useState, useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import { Search, X } from '@/lib/atlaskit-icons';
import { IconButton as AkIconButton } from '@atlaskit/button/new';
import { Button } from '@/components/ads';
import { WIDGET_REGISTRY, WIDGET_GROUPS, getWidgetRegistry } from './widget-registry';

interface WidgetGalleryModalProps {
  open: boolean;
  onClose: () => void;
  widgets: { id: string; visible: boolean }[];
  onToggleVisibility: (widgetId: string) => void;
  onReset: () => void;
  /** 2026-06-15: mode-aware. Product/incident hide widgets that don't apply. */
  mode?: 'project' | 'product' | 'incident';
}

export default function WidgetGalleryModal({
  open,
  onClose,
  widgets,
  onToggleVisibility,
  onReset,
  mode = 'project',
}: WidgetGalleryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const visibilityMap = new Map(widgets.map((w) => [w.id, w.visible]));

  const filteredWidgets = useMemo(() => {
    let list = getWidgetRegistry(mode);
    if (activeCategory) {
      list = list.filter((w) => w.group === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.subtitle ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCategory, searchQuery, mode]);

  const categories = [
    { key: null, label: 'All', count: WIDGET_REGISTRY.length },
    ...WIDGET_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      count: WIDGET_REGISTRY.filter((w) => w.group === g.key).length,
    })),
  ];

  if (!open) return null;

  return (
    <div
      data-testid="widget-gallery-panel"
      style={{
        width: 400,
        minWidth: 400,
        maxWidth: 400,
        height: '100%',
        borderLeft: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
        background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 8px',
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        }}
      >
        <span
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: token('color.text', 'var(--ds-text, #172B4D)'),
          }}
        >
          Add a Gadget
        </span>
        <AkIconButton
          label="Close gallery"
          icon={() => <X size={16} />}
          appearance="subtle"
          spacing="compact"
          onClick={onClose}
        />
      </div>

      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* Search */}
        <Textfield
          placeholder="Search gadgets"
          elemBeforeInput={
            <span style={{ paddingLeft: 8, display: 'inline-flex', color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
              <Search size={16} />
            </span>
          }
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          testId="gadget-search"
        />

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key ?? 'all'}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  background: isActive
                    ? token('color.background.selected', 'var(--ds-background-selected, #E9F2FF)')
                    : token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
                  color: isActive
                    ? token('color.text.selected', 'var(--ds-link, #0C66E4)')
                    : token('color.text', 'var(--ds-text, #172B4D)'),
                  transition: 'background 120ms ease',
                }}
              >
                {cat.label}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 653,
                    color: isActive
                      ? token('color.text.selected', 'var(--ds-link, #0C66E4)')
                      : token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                  }}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gadget list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredWidgets.map((widget) => {
            const isVisible = visibilityMap.get(widget.id) ?? true;
            return (
              <div
                key={widget.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 8px',
                  borderRadius: 4,
                  border: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                  background: token('elevation.surface', 'var(--ds-surface, #FFFFFF)'),
                }}
              >
                {/* Icon placeholder */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 4,
                    background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 20,
                    color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                  }}
                >
                  {widget.group === 'delivery' ? '📊' : widget.group === 'quality' ? '🛡' : '👥'}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: token('color.text', 'var(--ds-text, #172B4D)'),
                      marginBottom: 2,
                    }}
                  >
                    {widget.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                      marginBottom: 2,
                    }}
                  >
                    By Catalyst
                  </div>
                  {widget.subtitle && (
                    <div
                      style={{
                        fontSize: 14,
                        color: token('color.text.subtle', 'var(--ds-icon, #44546F)'),
                        lineHeight: '20px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {widget.subtitle}
                    </div>
                  )}
                  {/* Category tags */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
                        color: token('color.text.subtle', 'var(--ds-icon, #44546F)'),
                      }}
                    >
                      {widget.group === 'delivery' ? 'Delivery' : widget.group === 'quality' ? 'Quality' : 'Team'}
                    </span>
                  </div>
                </div>

                {/* Add/Remove button */}
                <Button
                  appearance={isVisible ? 'subtle' : 'primary'}
                  spacing="compact"
                  onClick={() => onToggleVisibility(widget.id)}
                  testId={`gadget-toggle-${widget.id}`}
                >
                  {isVisible ? 'Remove' : 'Add'}
                </Button>
              </div>
            );
          })}

          {filteredWidgets.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                fontSize: 14,
              }}
            >
              No gadgets match your search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

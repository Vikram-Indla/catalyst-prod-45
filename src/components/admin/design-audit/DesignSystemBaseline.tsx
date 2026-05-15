/**
 * Design System Baseline Component
 * Displays the locked design tokens as source of truth
 */

import type { ComponentType } from 'react';
import { useState } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import { Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import BoardIcon from '@atlaskit/icon/core/board';
import BoardsIcon from '@atlaskit/icon/core/boards';
import ChartBarIcon from '@atlaskit/icon/core/chart-bar';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CheckboxUncheckedIcon from '@atlaskit/icon/core/checkbox-unchecked';
import CopyIcon from '@atlaskit/icon/core/copy';
import LockLockedIcon from '@atlaskit/icon/core/lock-locked';
import PaintPaletteIcon from '@atlaskit/icon/core/paint-palette';
import SettingsIcon from '@atlaskit/icon/core/settings';
import TagIcon from '@atlaskit/icon/core/tag';
import TextIcon from '@atlaskit/icon/core/text';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { 
  baselineTokens, 
  componentSpecs, 
  tokenCategories,
  getBaselineVersion,
  getBaselineDate,
} from '@/lib/designAudit/designSystemBaseline';

const iconMap: Record<string, ComponentType<{ label: string; size?: string }>> = {
  Palette: PaintPaletteIcon,
  Type: TextIcon,
  Layers: BoardsIcon,
  Ruler: SettingsIcon,
  Layout: BoardIcon,
  Tag: TagIcon,
  Square: CheckboxUncheckedIcon,
  BarChart3: ChartBarIcon,
};

export function DesignSystemBaseline() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['brand', 'spacing', 'layout']);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const copyToken = (cssVar: string) => {
    navigator.clipboard.writeText(`var(${cssVar})`);
    setCopiedToken(cssVar);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const groupedTokens = tokenCategories.map(cat => ({
    ...cat,
    tokens: baselineTokens.filter(t => t.category.id === cat.id),
  }));

  return (
    <div className="space-y-6">
      {/* Baseline Header */}
      <div style={{ background: 'var(--ds-background-information, #DEEBFF22)', border: '1px solid var(--ds-border-information, #4C9AFF55)', borderRadius: '3px', padding: '16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
              <LockLockedIcon label="" size="small" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Design System Baseline</h3>
              <p className="text-xs text-muted-foreground">
                Version {getBaselineVersion()} · Locked {getBaselineDate()}
              </p>
            </div>
          </div>
          <Lozenge appearance="inprogress">Locked</Lozenge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Categories */}
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
            <h3 className="text-base flex items-center gap-2" style={{ fontWeight: 500, margin: 0 }}>
              <PaintPaletteIcon label="" size="small" />
              Design Tokens ({baselineTokens.length})
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Semantic tokens defined in index.css</p>
          </div>
          <div>
            <ScrollArea className="h-[400px]">
              {groupedTokens.map(category => {
                const Icon = iconMap[category.icon] || PaintPaletteIcon;
                const isExpanded = expandedCategories.includes(category.id);

                return (
                  <div key={category.id} className="border-b last:border-b-0">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon label="" size="small" />
                      ) : (
                        <ChevronRightIcon label="" size="small" />
                      )}
                      <span className="text-brand-primary" style={{ display: 'flex' }}>
                        <Icon label="" size="small" />
                      </span>
                      <span className="font-medium text-sm">{category.name}</span>
                      <span className="ml-auto">
                        <Lozenge appearance="default">{String(category.tokens.length)}</Lozenge>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 pt-1 space-y-1.5 bg-secondary/20">
                        {category.tokens.map(token => (
                          <div
                            key={token.cssVar}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-background/50 group"
                          >
                            <div className="flex items-center gap-2">
                              {/* Color swatch for color tokens */}
                              {(category.id === 'brand' || category.id === 'text' || category.id === 'status' || category.id === 'palette') && (
                                <div
                                  className="h-4 w-4 rounded border border-border"
                                  style={{ backgroundColor: token.value }}
                                />
                              )}
                              <div>
                                <div className="text-xs font-medium">{token.name}</div>
                                <code className="text-[10px] text-muted-foreground">{token.cssVar}</code>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">{token.value}</code>
                              <span className="opacity-0 group-hover:opacity-100">
                                <IconButton
                                  appearance="subtle"
                                  icon={copiedToken === token.cssVar ? CheckMarkIcon : CopyIcon}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToken(token.cssVar);
                                  }}
                                label="" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </ScrollArea>
          </div>
        </div>

        {/* Component Specifications */}
        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
            <h3 className="text-base flex items-center gap-2" style={{ fontWeight: 500, margin: 0 }}>
              <BoardIcon label="" size="small" />
              Component Specs ({componentSpecs.length})
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Target measurements for UI components</p>
          </div>
          <div>
            <ScrollArea className="h-[400px]">
              {componentSpecs.map(spec => (
                <div key={spec.name} className="border-b last:border-b-0 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{spec.name}</h4>
                    <code className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {spec.file}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {spec.specs.map(item => (
                      <div key={item.property} className="flex justify-between text-xs py-1 px-2 bg-secondary/30 rounded">
                        <span className="text-muted-foreground">{item.property}:</span>
                        <span className="font-medium">{item.expected}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Color Swatches Preview */}
      <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--ds-border-layout, #EBECF0)' }}>
          <h3 className="text-base" style={{ fontWeight: 500, margin: 0 }}>Golden Hour Chart Palette</h3>
          <p style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #626F86)', margin: '4px 0 0' }}>Mandatory palette for all charts, graphs, and data visualizations</p>
        </div>
        <div style={{ padding: '24px' }}>
          <div className="flex gap-3 flex-wrap">
            {baselineTokens
              .filter(t => t.category.id === 'palette')
              .map(token => (
                <div key={token.cssVar} className="text-center">
                  <div
                    className="h-12 w-12 rounded-lg border border-border mb-1"
                    style={{ backgroundColor: token.value }}
                  />
                  <div className="text-xs font-medium">{token.name.split(' (')[0]}</div>
                  <div className="text-[10px] text-muted-foreground">{token.value}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

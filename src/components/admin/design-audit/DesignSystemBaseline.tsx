/**
 * Design System Baseline Component
 * Displays the locked design tokens as source of truth
 */

import { useState } from 'react';
import { 
  Palette, Type, Layers, Ruler, Layout, Tag, Square, BarChart3, 
  ChevronDown, ChevronRight, Copy, Check, Lock 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  baselineTokens, 
  componentSpecs, 
  tokenCategories,
  getBaselineVersion,
  getBaselineDate,
} from '@/lib/designAudit/designSystemBaseline';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Type, Layers, Ruler, Layout, Tag, Square, BarChart3,
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
      <Card className="border-brand-gold/30 bg-brand-gold/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-brand-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Design System Baseline</h3>
                <p className="text-xs text-muted-foreground">
                  Version {getBaselineVersion()} · Locked {getBaselineDate()}
                </p>
              </div>
            </div>
            <Badge className="bg-brand-gold text-white">Locked</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Categories */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-brand-gold" />
              Design Tokens ({baselineTokens.length})
            </CardTitle>
            <CardDescription>Semantic tokens defined in index.css</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {groupedTokens.map(category => {
                const Icon = iconMap[category.icon] || Palette;
                const isExpanded = expandedCategories.includes(category.id);
                
                return (
                  <div key={category.id} className="border-b last:border-b-0">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Icon className="h-4 w-4 text-brand-gold" />
                      <span className="font-medium text-sm">{category.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {category.tokens.length}
                      </Badge>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToken(token.cssVar);
                                }}
                              >
                                {copiedToken === token.cssVar ? (
                                  <Check className="h-3 w-3 text-success" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Component Specifications */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layout className="h-4 w-4 text-brand-gold" />
              Component Specs ({componentSpecs.length})
            </CardTitle>
            <CardDescription>Target measurements for UI components</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
      </div>

      {/* Color Swatches Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Golden Hour Chart Palette</CardTitle>
          <CardDescription>Mandatory palette for all charts, graphs, and data visualizations</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

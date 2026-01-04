/**
 * Prompt 1: Smart View Auto-Selection
 * Auto-select optimal view based on resource count
 */

export type ViewType = 'cards' | 'table' | 'timeline' | 'heatmap';

export interface ViewRecommendation {
  recommended: ViewType;
  reason: string;
  performance: 'optimal' | 'acceptable' | 'degraded';
}

export function getRecommendedView(resourceCount: number): ViewRecommendation {
  if (resourceCount <= 50) {
    return { 
      recommended: 'cards', 
      reason: 'Visual cards work great for your team size',
      performance: 'optimal'
    };
  }
  if (resourceCount <= 150) {
    return { 
      recommended: 'table', 
      reason: 'Table view offers better density for 50-150 resources',
      performance: 'optimal'
    };
  }
  return {
    recommended: 'heatmap',
    reason: 'Heatmap provides best overview for 150+ resources',
    performance: 'optimal'
  };
}

export function getViewPerformanceWarning(resourceCount: number, currentView: ViewType): string | null {
  if (currentView === 'cards' && resourceCount > 100) {
    return `Cards view may be slow with ${resourceCount} resources. Consider switching to Table or Heatmap.`;
  }
  if (currentView === 'timeline' && resourceCount > 200) {
    return `Timeline may lag with ${resourceCount} resources. Heatmap recommended for better performance.`;
  }
  return null;
}

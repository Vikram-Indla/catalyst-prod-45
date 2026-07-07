/**
 * useStrataSwitcher — Product-level switcher hook for Catalyst/STRATA
 *
 * Allows users to switch between Catalyst and STRATA at the application level.
 * Shows current product in the hub switcher UI and provides navigation.
 *
 * CAT-STRATA-ISOLATE-20260707-001
 */

import { useCallback, useState, useEffect } from 'react';

export type Product = 'CATALYST' | 'STRATA';

interface StrataConfig {
  current: Product;
  canSwitch: boolean;
  switchPath: (product: Product) => string;
  productName: string;
  description: string;
}

/**
 * Get the current product from APP_PRODUCT environment variable.
 * Falls back to CATALYST if not set (for backward compatibility during transition).
 */
function getCurrentProduct(): Product {
  try {
    const appProduct = import.meta.env.VITE_APP_PRODUCT as string | undefined;
    if (appProduct === 'STRATA') return 'STRATA';
    return 'CATALYST';
  } catch {
    return 'CATALYST';
  }
}

/**
 * Hook to manage product switching between Catalyst and STRATA.
 *
 * Returns current product info and navigation method.
 *
 * Usage:
 * ```tsx
 * const { current, switchTo, productName } = useStrataSwitcher();
 *
 * return (
 *   <button onClick={() => switchTo('STRATA')}>
 *     Switch to {productName}
 *   </button>
 * );
 * ```
 */
export function useStrataSwitcher(): StrataConfig & { switchTo: (product: Product) => void } {
  const [current, setCurrent] = useState<Product>(getCurrentProduct());

  // Monitor APP_PRODUCT changes (e.g., when env changes after mount)
  useEffect(() => {
    const checkProduct = () => {
      const newProduct = getCurrentProduct();
      if (newProduct !== current) {
        setCurrent(newProduct);
      }
    };

    // Check on interval (every 5 seconds) in case env changes
    const interval = setInterval(checkProduct, 5000);
    return () => clearInterval(interval);
  }, [current]);

  const getProductName = useCallback((product: Product): string => {
    return product === 'STRATA' ? 'STRATA' : 'Catalyst';
  }, []);

  const getDescription = useCallback((product: Product): string => {
    if (product === 'STRATA') {
      return 'STRATA - Strategic execution platform';
    }
    return 'Catalyst - Project and portfolio management';
  }, []);

  const switchPath = useCallback((product: Product): string => {
    // When switching products, redirect to the appropriate hub
    if (product === 'STRATA') {
      return '/strata';
    }
    return '/project-hub'; // Default Catalyst entry point
  }, []);

  const switchTo = useCallback((product: Product) => {
    if (product === current) return; // Already on this product

    // Navigate to the product's entry point
    const path = switchPath(product);
    window.location.href = path;
  }, [current, switchPath]);

  return {
    current,
    canSwitch: true, // Always allow switching between products
    switchPath,
    productName: getProductName(current),
    description: getDescription(current),
    switchTo,
  };
}

/**
 * Hook to get list of available products for switching.
 * Returns both Catalyst and STRATA with their metadata.
 */
export function useAvailableProducts() {
  return [
    {
      id: 'catalyst',
      name: 'Catalyst',
      key: 'CATALYST' as Product,
      description: 'Project and portfolio management',
      icon: '📊',
      path: '/project-hub',
    },
    {
      id: 'strata',
      name: 'STRATA',
      key: 'STRATA' as Product,
      description: 'Strategic execution platform',
      icon: '🎯',
      path: '/strata',
    },
  ];
}

/**
 * Hook to get product-specific feature set.
 * Returns features available in current product.
 */
export function useProductFeatures(product: Product = getCurrentProduct()) {
  const catalystFeatures = [
    'project-management',
    'portfolio-planning',
    'resource-allocation',
    'release-planning',
    'workstream-tracking',
    'team-collaboration',
  ];

  const strataFeatures = [
    'strategy-definition',
    'scorecard-tracking',
    'kpi-measurement',
    'execution-linkage',
    'value-realization',
    'governance',
    'evidence-collection',
    'portfolio-portfolio',
  ];

  return {
    available: product === 'STRATA' ? strataFeatures : catalystFeatures,
    isFeatureEnabled: (feature: string) => {
      if (product === 'STRATA') {
        return strataFeatures.includes(feature);
      }
      return catalystFeatures.includes(feature);
    },
  };
}

/**
 * Hook to format product display text for UI.
 */
export function useProductDisplay(product: Product = getCurrentProduct()) {
  return {
    displayName: product === 'STRATA' ? 'STRATA' : 'Catalyst',
    shortName: product === 'STRATA' ? 'ST' : 'C',
    emoji: product === 'STRATA' ? '🎯' : '📊',
    color: product === 'STRATA' ? 'blue' : 'purple',
    className: product === 'STRATA' ? 'strata-theme' : 'catalyst-theme',
  };
}

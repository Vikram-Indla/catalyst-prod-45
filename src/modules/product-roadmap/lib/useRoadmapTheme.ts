/**
 * Hook to get the correct design tokens based on current theme
 */

import { useTheme } from '@/hooks/useTheme';
import { catalystTokens } from './design-tokens';

export function useRoadmapTheme() {
  const { isDark } = useTheme();
  
  return {
    isDark,
    tokens: isDark ? catalystTokens.dark : catalystTokens.light,
    brand: catalystTokens.brand,
    status: catalystTokens.status,
    secondary: catalystTokens.secondary,
  };
}

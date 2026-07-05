import { useTheme } from '@/hooks/useTheme';

export function useIsDark(): boolean {
  return useTheme().isDark;
}

import { useTheme } from 'next-themes';

export function useIsDark(): boolean {
  const { theme, resolvedTheme } = useTheme();
  return (resolvedTheme ?? theme) === 'dark';
}

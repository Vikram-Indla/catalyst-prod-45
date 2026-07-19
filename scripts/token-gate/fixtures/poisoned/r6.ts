// R6 fixture — customColors passed to setGlobalTheme(). Not imported by the app.
declare function setGlobalTheme(opts: Record<string, unknown>): Promise<void>;

export function poisonTheme() {
  return setGlobalTheme({
    colorMode: 'auto',
    customColors: { brandAccent: 'var(--ds-background-brand-bold)' },
  });
}

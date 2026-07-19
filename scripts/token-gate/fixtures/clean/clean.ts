// Clean fixture (TS side) — zero findings expected. Not imported by the app.
declare function token(id: string, fallback?: string): string;

export const cleanStyle = {
  color: 'var(--ds-text)',
  backgroundColor: 'var(--ds-surface-raised)',
  font: 'var(--ds-font-body)',
  borderRadius: token('radius.small', '4px'),
};

// R11 fixture — token() call with an ADS token id that doesn't exist. Not imported by the app.
declare function token(id: string, fallback?: string): string;

export function poisonedStyle() {
  return { borderRadius: token('border.radius', '4px') };
}

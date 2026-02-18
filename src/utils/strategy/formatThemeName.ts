/**
 * Standardized short names for strategic themes.
 * Used across all widgets to ensure consistency.
 * Max 18 characters for widget labels.
 */
const THEME_SHORT_NAMES: Record<string, string> = {
  'Digital Transformation': 'Digital Transform.',
  'Workforce Development': 'Workforce Dev.',
  'Supply Chain Excellence': 'Supply Chain',
  'Sustainability & ESG': 'Sustainability',
};

export function formatThemeName(fullName: string, maxLength?: number): string {
  // First check our standardized short names
  const shortName = THEME_SHORT_NAMES[fullName];
  if (shortName) return shortName;

  // Fallback: truncate with ellipsis
  if (maxLength && fullName.length > maxLength) {
    return fullName.slice(0, maxLength - 1).trim() + '.';
  }

  return fullName;
}

/**
 * Truncate a full name to "FirstName LastInitial." format.
 * e.g. "Sarah Chen" → "Sarah C.", "Mohammed Al-Sayed" → "Mohammed A."
 */
export function formatShortName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

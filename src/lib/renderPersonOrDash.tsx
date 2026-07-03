/**
 * Zero-assumption identity rendering: returns the person's display name, or
 * null when unknown — callers render a dash/nothing, never a fabricated name.
 */
export interface PersonOrDashInput {
  full_name?: string | null;
  display_name?: string | null;
  name?: string | null;
  email?: string | null;
}

export function renderPersonOrDash(person: PersonOrDashInput | null | undefined): string | null {
  if (!person) return null;
  return person.full_name || person.display_name || person.name || person.email || null;
}

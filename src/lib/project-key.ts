/**
 * padProjectKey — nav display rule: a project key shown in the sidebar header
 * is always at least 3 characters.
 *
 * Jira permits 2-character project keys (e.g. "IN" for Inspection Project).
 * The real key stays the source of truth everywhere else; this is a purely
 * cosmetic display code. When the key is shorter than 3 chars, extend it with
 * the next letters of the project name so the code stays recognisable
 * ("IN" + "Inspection" -> "INS"). Keys of 3+ chars are returned as-is
 * (truncated to 3 so longer keys still fit the fixed-width badge).
 */
export function padProjectKey(key: string, name?: string | null): string {
  const k = (key ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (k.length >= 3) return k.slice(0, 3);

  const nameLetters = (name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Append the letters that follow the key prefix in the name, so we grow the
  // key rather than overwrite it ("IN" + "INSPECTION" -> append "SPECTION").
  const tail = nameLetters.startsWith(k) ? nameLetters.slice(k.length) : nameLetters;

  let code = (k + tail).slice(0, 3);
  while (code.length < 3) code += 'X';
  return code;
}

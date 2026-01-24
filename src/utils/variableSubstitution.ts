/**
 * Variable Substitution Utilities for Data-Driven Testing
 * Substitutes {variable} placeholders with values from data row snapshots
 */

/**
 * Substitutes {variable} placeholders with values from data row
 *
 * @param template - String containing {variable} placeholders
 * @param data - Key-value pairs from data row
 * @returns Substituted string with original placeholders preserved for missing keys
 */
export function substituteVariables(
  template: string | null | undefined,
  data: Record<string, any> | null | undefined
): string {
  if (!template) return '';
  if (!data || Object.keys(data).length === 0) return template;

  // Match {variableName} pattern
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

  return template.replace(pattern, (match, variableName) => {
    const value = data[variableName];

    if (value === undefined || value === null) {
      // Keep original placeholder if no matching data
      return match;
    }

    return String(value);
  });
}

/**
 * Extracts all variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = pattern.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Highlights substituted portions in a string for UI display
 * Returns array of segments with isSubstituted flag
 */
export interface TextSegment {
  text: string;
  isSubstituted: boolean;
  variableName?: string;
}

export function getSubstitutedSegments(
  template: string,
  data: Record<string, any>
): TextSegment[] {
  if (!template) return [];
  if (!data || Object.keys(data).length === 0) {
    return [{ text: template, isSubstituted: false }];
  }

  const segments: TextSegment[] = [];
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(template)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: template.slice(lastIndex, match.index),
        isSubstituted: false,
      });
    }

    const variableName = match[1];
    const value = data[variableName];

    if (value !== undefined && value !== null) {
      segments.push({
        text: String(value),
        isSubstituted: true,
        variableName,
      });
    } else {
      // Keep original placeholder
      segments.push({
        text: match[0],
        isSubstituted: false,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < template.length) {
    segments.push({
      text: template.slice(lastIndex),
      isSubstituted: false,
    });
  }

  return segments;
}

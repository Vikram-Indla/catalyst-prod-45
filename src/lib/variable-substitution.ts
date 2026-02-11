/**
 * G20: Variable substitution utilities for Data-Driven Testing
 */

const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/** Extract unique variable names from text */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  const matches = new Set<string>();
  let match;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    matches.add(match[1]);
  }
  VARIABLE_PATTERN.lastIndex = 0;
  return Array.from(matches);
}

/** Extract variables from all steps */
export function extractVariablesFromSteps(
  steps: Array<{ action?: string; expected_result?: string; test_data?: string | null }>
): string[] {
  const all = new Set<string>();
  for (const step of steps) {
    extractVariables(step.action || '').forEach(v => all.add(v));
    extractVariables(step.expected_result || '').forEach(v => all.add(v));
    extractVariables(step.test_data || '').forEach(v => all.add(v));
  }
  return Array.from(all);
}

/** Substitute variables with values */
export function substituteVariables(text: string, data: Record<string, any>): string {
  if (!text || !data) return text;
  return text.replace(VARIABLE_PATTERN, (match, varName) => {
    return varName in data ? String(data[varName]) : match;
  });
}

/** Validate data coverage: check if all variables in steps are covered by dataset columns */
export function validateDataCoverage(
  steps: Array<{ action?: string; expected_result?: string; test_data?: string | null }>,
  columns: string[]
): { covered: string[]; missing: string[] } {
  const variables = extractVariablesFromSteps(steps);
  const columnSet = new Set(columns);
  const covered = variables.filter(v => columnSet.has(v));
  const missing = variables.filter(v => !columnSet.has(v));
  return { covered, missing };
}

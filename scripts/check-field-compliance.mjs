#!/usr/bin/env node
/**
 * check-field-compliance — CI gate for the canonical field registry.
 *
 * Reads FIELD_MANIFESTS from src/canonical/field-registry.ts (via regex parse —
 * no TS compilation required) and exits 1 if:
 *   • Any field has adsCompliance 'non-compliant'
 *   • Any --cp-jira-* variable in src/tokens/jira-parity-overrides.css lacks
 *     a JIRA-PARITY annotation comment with a date (YYYY-MM-DD)
 *
 * Add to CI lint step:
 *   node scripts/check-field-compliance.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── 1. Check FIELD_MANIFESTS for non-compliant fields ────────────────────────

const registryPath = resolve(root, 'src/canonical/field-registry.ts');
const registrySource = readFileSync(registryPath, 'utf8');

// Extract all adsCompliance values from the source
const complianceMatches = [...registrySource.matchAll(/adsCompliance:\s*'([^']+)'/g)];

let fieldFailures = 0;
for (const match of complianceMatches) {
  const tier = match[1];
  if (tier === 'non-compliant') {
    // Find the surrounding field ID for the error message
    const before = registrySource.slice(0, match.index);
    const fieldIdMatch = before.match(/\[FIELD_ID\.([^\]]+)\]\s*:\s*\{[^}]*$/s);
    const fieldName = fieldIdMatch ? fieldIdMatch[1] : '(unknown field)';
    console.error(`✗ FIELD ${fieldName} is marked non-compliant with no justification.`);
    console.error(`  Fix: change adsCompliance to 'bypass' and add a dated // ADS-ISSUE: comment,`);
    console.error(`  or resolve the compliance gap and change to 'compliant'.`);
    fieldFailures++;
  }
}

if (fieldFailures === 0) {
  console.log(`✓ FIELD_MANIFESTS: all ${complianceMatches.length} fields are compliant or bypass.`);
}

// ── 2. Check jira-parity-overrides.css for unannotated --cp-jira-* vars ──────

const parityPath = resolve(root, 'src/tokens/jira-parity-overrides.css');
const paritySource = readFileSync(parityPath, 'utf8');

const lines = paritySource.split('\n');
const DATE_RE = /20\d{2}-\d{2}-\d{2}/;
const VAR_RE = /^\s*(--cp-jira-[^:]+):/;

let cssFailures = 0;
for (let i = 0; i < lines.length; i++) {
  const varMatch = lines[i].match(VAR_RE);
  if (!varMatch) continue;
  const varName = varMatch[1].trim();

  // Look for a JIRA-PARITY comment in the two lines above
  const context = lines.slice(Math.max(0, i - 2), i).join('\n');
  const hasAnnotation = context.includes('JIRA-PARITY:') && DATE_RE.test(context);

  if (!hasAnnotation) {
    console.error(`✗ CSS var ${varName} (line ${i + 1}) has no JIRA-PARITY annotation with a date.`);
    console.error(`  Fix: add a comment directly above it:`);
    console.error(`  /* JIRA-PARITY: probed YYYY-MM-DD <source> — <ADS token>=<ADS value>, actual=<measured> */`);
    cssFailures++;
  }
}

if (cssFailures === 0) {
  const varCount = [...paritySource.matchAll(/--cp-jira-[^:]+:/g)].length;
  console.log(`✓ jira-parity-overrides.css: all ${varCount} --cp-jira-* vars are annotated.`);
}

// ── Exit ──────────────────────────────────────────────────────────────────────

const total = fieldFailures + cssFailures;
if (total > 0) {
  console.error(`\n${total} compliance violation(s) found.`);
  process.exit(1);
}

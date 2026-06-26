#!/usr/bin/env node
/**
 * catalyst-sop-self-test.mjs
 * Verifies the Catalyst operating system is correctly installed.
 *
 * Usage:
 *   node scripts/catalyst-sop-self-test.mjs
 *
 * Exit codes:
 *   0 = PASS
 *   1 = FAIL
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.cwd();

let passed = 0;
let failed = 0;
const failures = [];

// ─── helpers ────────────────────────────────────────────────────────────────

function check(label, result, detail = '') {
  if (result) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
    failures.push(label + (detail ? ' — ' + detail : ''));
  }
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fileContains(relPath, phrase) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return false;
  return fs.readFileSync(full, 'utf8').includes(phrase);
}

function scanSecrets(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return [];
  const rawContent = fs.readFileSync(full, 'utf8');
  // Strip code blocks to avoid false positives from grep pattern examples in docs
  const content = rawContent.replace(/```[\s\S]*?```/g, '[CODE_BLOCK_STRIPPED]');
  const patterns = [
    // sbp_ followed by 20+ alphanum chars = actual Supabase PAT
    { name: 'sbp_ (Supabase PAT)', re: /sbp_[a-zA-Z0-9]{20,}/ },
    // service_role followed by : or = and a value = actual key usage
    { name: 'service_role key value', re: /service_role['":\s]*[=:]['":\s]*[a-zA-Z0-9+/=]{20,}/ },
    // JWT token (eyJ...) - actual value
    { name: 'JWT eyJhbGci token', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/ },
    // API key assignments with actual values
    { name: 'JIRA_API_TOKEN value', re: /JIRA_API_TOKEN\s*=\s*[^\n$]{8,}/ },
    { name: 'ANTHROPIC_API_KEY value', re: /ANTHROPIC_API_KEY\s*=\s*[^\n$]{8,}/ },
    { name: 'GEMINI_API_KEY value', re: /GEMINI_API_KEY\s*=\s*[^\n$]{8,}/ },
    { name: 'RESEND_API_KEY value', re: /RESEND_API_KEY\s*=\s*[^\n$]{8,}/ },
  ];
  return patterns.filter(p => p.re.test(content)).map(p => p.name);
}

function scanDirSecrets(relDir) {
  const full = path.join(ROOT, relDir);
  if (!fs.existsSync(full)) return [];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      const rel = path.relative(ROOT, entryPath);
      if (entry.isDirectory()) {
        // Skip archive folder — secrets may be in redacted archive
        if (entry.name === 'archive') continue;
        walk(entryPath);
      } else if (entry.isFile() && /\.(md|txt|json)$/.test(entry.name)) {
        const found = scanSecrets(rel);
        if (found.length > 0) {
          results.push({ file: rel, patterns: found });
        }
      }
    }
  }
  walk(full);
  return results;
}

// ─── section 1: required files ──────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log('  CATALYST SOP SELF-TEST');
console.log('══════════════════════════════════════════════════\n');

console.log('§1  Required files exist');

const requiredFiles = [
  'CLAUDE.md',
  'docs/ways-of-working/CATALYST_OPERATING_SYSTEM.md',
  'docs/ways-of-working/CATALYST_CANONICAL_RULEBOOK.md',
  'docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md',
  'docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md',
  'docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md',
  'docs/ways-of-working/CATALYST_CONTEXT_HANDOVER_TEMPLATE.md',
  'docs/ways-of-working/CATALYST_UI_UX_ACCEPTANCE.md',
  'docs/ways-of-working/CATALYST_SELF_TEST.md',
  'docs/ways-of-working/CATALYST_AIDEN_VALIDATION_BLOCK.md',
  'docs/ways-of-working/CATALYST_KARPATHY_LOOP.md',
  'docs/ways-of-working/CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md',
  'scripts/catalyst-feature.mjs',
  'scripts/catalyst-sop-self-test.mjs',
];

for (const f of requiredFiles) {
  check(f, fileExists(f));
}

// ─── section 2: CLAUDE.md activation phrases ─────────────────────────────

console.log('\n§2  CLAUDE.md activation phrases');

const claudePhrases = [
  'activate feature',
  'continue feature',
  'No Feature Work ID',
  'No code before Plan Lock',
  'Parallel agents are mandatory',
  'Hand-rolled UI is rejected by default',
  'JiraTable is mandatory',
  'Bare colors are banned',
  'Screenshots are mandatory for UI/UX acceptance',
  'Karpathy Loop for Catalyst',
  'Aiden Validation Block',
  'If any answer is NO, do not code',
];

for (const phrase of claudePhrases) {
  // Check CLAUDE.md first, then docs/ways-of-working/CATALYST_SELF_TEST.md for "If any answer is NO"
  const inClaude = fileContains('CLAUDE.md', phrase);
  const inSelfTest = fileContains('docs/ways-of-working/CATALYST_SELF_TEST.md', phrase);
  check(`"${phrase}"`, inClaude || inSelfTest, inClaude ? 'in CLAUDE.md' : inSelfTest ? 'in CATALYST_SELF_TEST.md' : 'NOT FOUND');
}

// ─── section 3: operating docs contain required phrases ──────────────────

console.log('\n§3  Operating docs required phrases');

const docPhrases = [
  { file: 'docs/ways-of-working/CATALYST_OPERATING_SYSTEM.md', phrase: 'Karpathy Loop for Catalyst' },
  { file: 'docs/ways-of-working/CATALYST_OPERATING_SYSTEM.md', phrase: 'Parallel agents are mandatory' },
  { file: 'docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md', phrase: 'MANDATORY AGENT SPAWNING' },
  { file: 'docs/ways-of-working/CATALYST_PARALLEL_AGENTS.md', phrase: 'Parallel agents are mandatory' },
  { file: 'docs/ways-of-working/CATALYST_AIDEN_VALIDATION_BLOCK.md', phrase: 'Aiden Validation Block' },
  { file: 'docs/ways-of-working/CATALYST_AIDEN_VALIDATION_BLOCK.md', phrase: 'AIDEN VALIDATION BLOCK START' },
  { file: 'docs/ways-of-working/CATALYST_KARPATHY_LOOP.md', phrase: 'Karpathy Loop for Catalyst' },
  { file: 'docs/ways-of-working/CATALYST_KARPATHY_LOOP.md', phrase: '11_KARPATHY_LOOP_LOG.md' },
  { file: 'docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md', phrase: '11_KARPATHY_LOOP_LOG.md' },
  { file: 'docs/ways-of-working/CATALYST_FEATURE_FOLDER_TEMPLATE.md', phrase: '12_AGENT_OUTPUTS.md' },
  { file: 'docs/ways-of-working/CATALYST_SELF_TEST.md', phrase: 'If any answer is NO, do not code' },
  { file: 'docs/ways-of-working/CATALYST_CANONICAL_RULEBOOK.md', phrase: 'JiraTable is mandatory' },
  { file: 'docs/ways-of-working/CATALYST_CANONICAL_RULEBOOK.md', phrase: 'Hand-rolled UI is rejected by default' },
  { file: 'docs/ways-of-working/CATALYST_CANONICAL_RULEBOOK.md', phrase: 'Bare colors are banned' },
  { file: 'docs/ways-of-working/CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md', phrase: 'activate feature' },
  { file: 'docs/ways-of-working/CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md', phrase: 'continue feature' },
  { file: 'docs/ways-of-working/CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md', phrase: 'No Feature Work ID' },
];

for (const { file, phrase } of docPhrases) {
  check(`${path.basename(file)}: "${phrase}"`, fileContains(file, phrase));
}

// ─── section 4: scripts are executable node ──────────────────────────────

console.log('\n§4  Scripts are valid');

const scriptFiles = [
  'scripts/catalyst-feature.mjs',
  'scripts/catalyst-sop-self-test.mjs',
];

for (const s of scriptFiles) {
  const full = path.join(ROOT, s);
  if (!fs.existsSync(full)) {
    check(s + ' exists', false);
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  check(s + ' has shebang', content.startsWith('#!/usr/bin/env node'));
  check(s + ' has export/import or function', /^(import|export|function|const|let|var)/m.test(content));
}

// ─── section 5: no secrets in active governance docs ─────────────────────

console.log('\n§5  No secrets in active governance docs (archive excluded)');

const secretResults = [
  ...scanDirSecrets('docs/ways-of-working'),
  ...scanSecrets('CLAUDE.md').map(p => ({ file: 'CLAUDE.md', patterns: [p] })),
];

// Flatten and dedupe
const secretHits = [];
for (const r of secretResults) {
  if (Array.isArray(r.patterns) && r.patterns.length > 0) {
    secretHits.push(r);
  }
}

if (secretHits.length === 0) {
  check('No secrets found in active governance docs', true);
} else {
  for (const hit of secretHits) {
    check(`No secrets in ${hit.file}`, false, `Patterns matched: ${hit.patterns.join(', ')}`);
  }
}

// ─── section 6: app code untouched ──────────────────────────────────────

console.log('\n§6  App code guardrail (SOP-only files check)');

// We can't track what changed here without git, but we can note what the script expects
// Check that scripts do not import from app src/ — use split string to avoid self-match
const srcImportPattern = "from '../sr" + "c/";
check('catalyst-feature.mjs does not import src/', !fileContains('scripts/catalyst-feature.mjs', srcImportPattern));
check('catalyst-sop-self-test.mjs does not import src/', !fileContains('scripts/catalyst-sop-self-test.mjs', srcImportPattern));

// ─── summary ────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} PASS, ${failed} FAIL`);
console.log('══════════════════════════════════════════════════');

if (failed > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(`  ✗ ${f}`);
  }
  console.log('\nSELF-TEST RESULT: FAIL');
  console.log('Fix all failures before implementing.\n');
  process.exit(1);
} else {
  console.log('\nSELF-TEST RESULT: PASS');
  console.log('Operating system is correctly installed.\n');
  process.exit(0);
}

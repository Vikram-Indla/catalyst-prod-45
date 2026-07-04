#!/usr/bin/env node

/**
 * CATALYST DESIGN SYSTEM — Banned Fallback-Hex Guardrail
 * CAT-AUDIT-0100 (CAT-AUDIT-FULLSWEEP-20260703-001)
 *
 * scripts/no-hardcoded-colors.cjs deliberately WHITELISTS hex/rgba/hsla values
 * used as the fallback argument of var(--ds-*, #hex) or token('x', '#hex') —
 * CLAUDE.md bans exactly this pattern ("hex fallbacks in var(--ds-*, #fallback)
 * — use token-only, no fallback hex"). That whitelist is why `lint:colors`
 * reports 0 violations while ~2,304 of these occurrences exist in the repo.
 *
 * This script counts ONLY that whitelisted category, so it can be ratcheted
 * (down-only) via ads-fallback-hex-gate.cjs without touching the existing
 * lint:colors baseline or its allow-list behavior.
 *
 * Usage:
 *   node scripts/no-fallback-hex.cjs
 *
 * Exit codes:
 *   0 - no fallback-hex occurrences found
 *   1 - fallback-hex occurrences found (informational — gating is done by
 *       ads-fallback-hex-gate.cjs, not this script's exit code)
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['src'];
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.css', '.scss'];

const EXCLUDED_FILES = [
  'src/index.css',
  'src/modules/task10/styles/task10.css',
  'src/modules/task10/styles/task10-v2.css',
  'src/modules/task10/styles/task10-detail.css',
];

const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build'];

// A color literal (hex, rgb/rgba, hsl/hsla with numeric args) sitting as the
// fallback argument of var(--ds-*, ...) or token('...', ...).
const FALLBACK_HEX_PATTERNS = [
  // var(--ds-something, #hex) / var(--cp-something, #hex)
  /var\(\s*--[a-zA-Z0-9-]+\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\(\s*\d[^)]*\))/g,
  // token('color.x', '#hex') / token("color.x", 'rgba(...)')
  /token\(\s*['"][^'"]+['"]\s*,\s*['"](#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\(\s*\d[^)]*\))['"]/g,
];

let violations = [];

function isExcludedDir(dirPath) {
  return EXCLUDED_DIRS.some(excluded =>
    dirPath.includes(path.sep + excluded) || dirPath.startsWith(excluded)
  );
}

function isExcludedFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return EXCLUDED_FILES.some(excluded => normalized.endsWith(excluded));
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    if (/ads-scanner:ignore-line/.test(line)) return;
    if (lineIndex > 0 && /ads-scanner:ignore-next-line/.test(lines[lineIndex - 1])) return;

    FALLBACK_HEX_PATTERNS.forEach(pattern => {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(line)) !== null) {
        violations.push({
          file: filePath,
          line: lineIndex + 1,
          match: m[0].slice(0, 80),
        });
      }
    });
  });
}

function scanDirectory(dirPath) {
  if (isExcludedDir(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.includes(ext) && !isExcludedFile(fullPath)) {
        scanFile(fullPath);
      }
    }
  });
}

console.log('🔍 Scanning for banned fallback-hex (var(--ds-*, #hex) / token(\'x\', \'#hex\'))...\n');

SCAN_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) scanDirectory(dir);
});

if (violations.length === 0) {
  console.log('✅ No fallback-hex found.\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${violations.length} fallback-hex occurrence(s):\n`);
  const byFile = {};
  violations.forEach(v => {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  });
  Object.keys(byFile).forEach(file => {
    console.log(`📁 ${file} (${byFile[file].length})`);
  });
  console.log('\n💡 Fix: strip the fallback to token-only, e.g. var(--ds-x, #hex) → var(--ds-x).\n');
  process.exit(1);
}

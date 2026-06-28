#!/usr/bin/env node

/**
 * CATALYST DESIGN SYSTEM — Hard-Coded Color Guardrail
 * 
 * This script scans the codebase for hard-coded colors (hex, rgb, rgba, hsl, hsla)
 * that are NOT inside src/index.css (where token definitions live).
 * 
 * Usage:
 *   node scripts/no-hardcoded-colors.cjs
 * 
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations found
 */

const fs = require('fs');
const path = require('path');

// Files/directories to scan
const SCAN_DIRS = ['src'];
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.css', '.scss'];

// Files to exclude (token definition files and ring-fenced modules)
const EXCLUDED_FILES = [
  'src/index.css',
  'scripts/no-hardcoded-colors.cjs',
  // Task10 module - ring-fenced CSS with isolated design tokens
  'src/modules/task10/styles/task10.css',
  'src/modules/task10/styles/task10-v2.css',
  'src/modules/task10/styles/task10-detail.css',
];

// Directories to exclude
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
];

// Patterns to detect hard-coded colors
const COLOR_PATTERNS = [
  // Hex colors: #fff, #ffffff, #ffffffff
  /#[0-9a-fA-F]{3,8}\b/g,
  // rgb/rgba
  /\brgba?\s*\([^)]+\)/gi,
  // hsl/hsla with actual values (not CSS variables)
  /\bhsla?\s*\(\s*\d+[^)]*\)/gi,
];

// Allowed patterns — only raw color functions wrapping a CSS variable are OK,
// e.g. hsl(var(--hue), 50%, 50%). A bare hex/rgb INSIDE a var() fallback is
// NOT allowed: var(--ds-token, #hex) is explicitly banned by CLAUDE.md.
const ALLOWED_PATTERNS = [
  /hsl\s*\(\s*var\s*\(/i,         // hsl(var(--...))
  /hsla\s*\(\s*var\s*\(/i,        // hsla(var(--...))
  /rgb\s*\(\s*var\s*\(/i,         // rgb(var(--...))
  /rgba\s*\(\s*var\s*\(/i,        // rgba(var(--...))
];

// Context patterns that indicate the color is in a comment
const COMMENT_PATTERNS = [
  /^\s*\/\//,                      // Single line comment
  /^\s*\*/,                        // Multi-line comment continuation
  /\/\*.*\*\//,                    // Inline comment
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

function isInComment(line, match, lineIndex, lines) {
  // Check if line starts with comment
  if (COMMENT_PATTERNS.some(pattern => pattern.test(line))) {
    return true;
  }
  
  // Check if we're inside a multi-line comment
  let inMultiLineComment = false;
  for (let i = 0; i <= lineIndex; i++) {
    const l = lines[i];
    const openCount = (l.match(/\/\*/g) || []).length;
    const closeCount = (l.match(/\*\//g) || []).length;
    
    if (i === lineIndex) {
      // Check if match is before any */ on this line
      const matchIndex = line.indexOf(match);
      const closeIndex = line.indexOf('*/');
      if (inMultiLineComment && (closeIndex === -1 || matchIndex < closeIndex)) {
        return true;
      }
    }
    
    inMultiLineComment = inMultiLineComment ? 
      (closeCount <= openCount) : 
      (openCount > closeCount);
  }
  
  return false;
}

// Returns true if the match at `matchIndex` sits inside an unclosed
// `var(...)` or `token(...)` call — i.e. the color is a *fallback* argument
// (`var(--ds-x, #hex)` or `token('color.x', '#hex')`). These are the canonical
// ADS patterns and are compliant, regardless of how long the token name is.
function isInsideFallbackCall(line, matchIndex) {
  const before = line.slice(0, matchIndex);
  // Match a `var(`/`token(` opener not preceded by an identifier char, so it
  // fires inside Tailwind arbitraries (`shadow-[..._var(--ds-x, ...)]`) but not
  // inside a longer word (e.g. `mytoken(`).
  const openerRegex = /(?<![a-zA-Z0-9])(?:var|token)\s*\(/gi;
  let lastOpenerEnd = -1;
  let m;
  while ((m = openerRegex.exec(before)) !== null) {
    lastOpenerEnd = m.index + m[0].length;
  }
  if (lastOpenerEnd === -1) {
    return false;
  }
  // The call must still be open at the match position: walk the parens between
  // the opener and the match; if depth returns to 0 the call closed first.
  let depth = 1;
  for (let i = lastOpenerEnd; i < before.length; i++) {
    const ch = before[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0) return false;
  }
  return depth > 0;
}

function isAllowedUsage(line, match) {
  // var(--ds-token, #hex) is explicitly BANNED — hex fallbacks inside var() are
  // violations, not exemptions. Only raw color functions wrapping a CSS var()
  // (e.g. hsl(var(--hue), 50%, 50%)) are allowed.
  const matchIndex = line.indexOf(match);
  const context = line.slice(Math.max(0, matchIndex - 20), matchIndex + match.length + 20);

  return ALLOWED_PATTERNS.some(pattern => pattern.test(context));
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    // Escape hatches for intentional, documented exceptions (e.g. Jira-parity
    // bypass hexes with no ADS-token equivalent):
    //   `// ads-scanner:ignore-line`       on the same line
    //   `// ads-scanner:ignore-next-line`  on the line above
    if (/ads-scanner:ignore-line/.test(line)) {
      return;
    }
    if (lineIndex > 0 && /ads-scanner:ignore-next-line/.test(lines[lineIndex - 1])) {
      return;
    }

    COLOR_PATTERNS.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Skip if in comment
          if (isInComment(line, match, lineIndex, lines)) {
            return;
          }
          
          // Skip if using CSS variables
          if (isAllowedUsage(line, match)) {
            return;
          }
          
          // Skip if it's a CSS variable definition (--something: value)
          if (line.includes('--') && line.includes(':')) {
            return;
          }
          
          violations.push({
            file: filePath,
            line: lineIndex + 1,
            color: match,
            context: line.trim().slice(0, 100),
          });
        });
      }
    });
  });
}

function scanDirectory(dirPath) {
  if (isExcludedDir(dirPath)) {
    return;
  }
  
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

// Main execution
console.log('🔍 Scanning for hard-coded colors...\n');

SCAN_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
});

if (violations.length === 0) {
  console.log('✅ No hard-coded colors found! Design system is clean.\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${violations.length} hard-coded color violation(s):\n`);
  
  // Group by file
  const byFile = {};
  violations.forEach(v => {
    if (!byFile[v.file]) {
      byFile[v.file] = [];
    }
    byFile[v.file].push(v);
  });
  
  Object.keys(byFile).forEach(file => {
    console.log(`📁 ${file}`);
    byFile[file].forEach(v => {
      console.log(`   Line ${v.line}: ${v.color}`);
      console.log(`   Context: ${v.context}`);
      console.log('');
    });
  });
  
  console.log('\n💡 Fix: Replace hard-coded colors with design system tokens.');
  console.log('   Examples:');
  console.log('   - Use: text-text-primary, bg-surface-0, border-border-default');
  console.log('   - Use: c-title, c-kpi, c-body for typography');
  console.log('   - Add missing tokens to src/index.css if needed\n');
  
  process.exit(1);
}

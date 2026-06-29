#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const VALID_GRID = [0, 4, 8, 12, 16, 24, 32, 40, 48];
const SCAN_DIR = 'src';
const SCAN_EXTS = ['.tsx', '.ts', '.css'];

function nearestGridValue(val) {
  const num = parseInt(val, 10);
  if (isNaN(num)) return val;
  return VALID_GRID.reduce((prev, curr) =>
    Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
  );
}

function walk(dir) {
  let changes = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.next', 'dist'].includes(entry.name)) {
      changes += walk(fullPath);
    } else if (SCAN_EXTS.includes(path.extname(entry.name))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const orig = content;
      
      // Match ONLY px spacing on padding/margin/gap/gutter — mirrors the
      // canonical SpacingGridValidator (design-governance/rules/spacing-grid-
      // validator.js). The `px` unit is mandatory and positioning coordinates
      // (top/bottom/left/right/inset) are intentionally excluded: those are
      // geometry, not spacing, and snapping them corrupts layouts such as the
      // R360 ring view (regression d76b5d62c, fixed 2026-06-29). Requiring the
      // `px` unit also guarantees unitless and % values are never touched.
      content = content.replace(/\b(padding|margin|gap|gutter)([a-zA-Z-]*)\s*:\s*['"]?(\d+)px['"]?/gi, (match, prop, suffix, val) => {
        if (val > 0) {
          const gridVal = nearestGridValue(val);
          if (gridVal != val) {
            changes++;
            return match.replace(`${val}px`, `${gridVal}px`);
          }
        }
        return match;
      });
      
      if (content !== orig) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
  return changes;
}

console.log('🔧 Spacing Codemod...');
const changes = walk(SCAN_DIR);
console.log(`✅ Fixed ${changes} spacing violations`);

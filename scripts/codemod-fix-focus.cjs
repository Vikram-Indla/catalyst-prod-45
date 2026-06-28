#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SCAN_DIR = 'src';
const SCAN_EXTS = ['.tsx', '.ts', '.css'];

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
      
      // Replace outline: none with proper focus ring
      content = content.replace(/outline\s*:\s*none/gi, 'outline: 2px solid var(--ds-border-focused)');
      content = content.replace(/outline\s*:\s*0(?![0-9])/gi, 'outline: 2px solid var(--ds-border-focused)');
      
      if (content !== orig) {
        const count = (orig.match(/outline\s*:\s*(?:none|0)/gi) || []).length;
        changes += count;
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
  return changes;
}

console.log('🔧 Focus Ring Codemod...');
const changes = walk(SCAN_DIR);
console.log(`✅ Fixed ${changes} focus ring violations`);

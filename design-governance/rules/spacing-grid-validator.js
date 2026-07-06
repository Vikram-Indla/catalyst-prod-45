/**
 * Spacing Grid Validator
 * Ensures all spacing uses the canonical 4px/8px/16px/24px/32px grid
 */

import fs from 'fs';
import path from 'path';

class SpacingGridValidator {
  constructor() {
    this.violations = [];
    // Canonical Catalyst grid {0,4,8,12,16,24,32,40,48} — aligned with
    // ads-token-scanner's VALID_GRID (2026-05-19 audit-fraud fix). 12px was
    // missing here, flagging legal values across the codebase.
    this.validSpacings = ['4px', '8px', '12px', '16px', '24px', '32px', '40px', '48px', '0px', '0'];
    this.validSpacingsRem = ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem', '2.5rem', '3rem'];
    // Positioning offsets (top/bottom/left/right/inset) are coordinates, not
    // spacing — a 1px badge offset is not a grid violation. Spacing props only.
    this.spacingProperties = ['padding', 'margin', 'gap', 'gutter'];
  }

  scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.css')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Ignore-marker support — see ads-token-scanner for the contract.
    if (content.includes('ads-scanner:ignore-file')) {
      return;
    }

    let inBlockComment = false;

    lines.forEach((line, index) => {
      if (index > 0 && lines[index - 1].includes('ads-scanner:ignore-next-line')) {
        return;
      }
      // Skip /* ... */ block-comment lines.
      const trimmed = line.trim();
      const opensBlock = line.includes('/*') && !line.includes('*/');
      const closesBlock = line.includes('*/') && !line.includes('/*');
      const isStandaloneBlockLine = trimmed.startsWith('*') || trimmed.startsWith('/*');
      if (inBlockComment || isStandaloneBlockLine) {
        if (closesBlock) inBlockComment = false;
        else if (opensBlock) inBlockComment = true;
        return;
      }
      if (opensBlock) inBlockComment = true;
      // Strip var(...) expressions before matching — px values inside ADS
      // token fallbacks (e.g. var(--ds-space-075, 6px)) are the canonical
      // pattern, not violations (same fix as ads-token-scanner, 2026-05-19).
      const scanLine = line.replace(/var\([^)]*\)/g, 'var()');
      this.spacingProperties.forEach(prop => {
        // Match inline style values like padding: 5px, margin: 10px, etc.
        const regex = new RegExp(`${prop}[^:]*:\\s*([0-9]+)px`, 'g');
        let match;

        while ((match = regex.exec(scanLine)) !== null) {
          const value = `${match[1]}px`;

          // Skip matches inside a string literal — px mentioned in prose /
          // guidance strings (e.g. Storybook docs "16px table rows") is not
          // real spacing. Heuristic: an odd number of quotes precedes the match.
          const before = scanLine.slice(0, match.index);
          const inString = ((before.match(/'/g) || []).length % 2 === 1)
            || ((before.match(/"/g) || []).length % 2 === 1)
            || ((before.match(/`/g) || []).length % 2 === 1);
          if (inString) continue;

          if (!this.validSpacings.includes(value) && !line.trim().startsWith('//')) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'INVALID_SPACING',
              property: prop,
              value: value,
              content: line.trim().substring(0, 80),
              fix: `Use valid spacing: 4px, 8px, 16px, 24px, 32px`
            });
          }
        }
      });
    });
  }

  scanDirectory(dirPath) {
    const files = this.walkDir(dirPath);
    files.forEach(file => this.scanFile(file));
    return this.violations;
  }

  walkDir(dirPath) {
    const files = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...this.walkDir(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    });

    return files;
  }

  report() {
    if (this.violations.length === 0) {
      console.log('✅ Spacing Grid Validator: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }

    console.log(`⚠️  Spacing Grid Validator: ${this.violations.length} violations found\n`);
    this.violations.slice(0, 10).forEach(v => {
      console.log(`  [${v.type}] ${path.basename(v.file)}:${v.line}`);
      console.log(`    Invalid: ${v.property}: ${v.value}`);
      console.log(`    Fix: ${v.fix}\n`);
    });

    if (this.violations.length > 10) {
      console.log(`  ... and ${this.violations.length - 10} more violations`);
    }

    return { passed: false, violations: this.violations };
  }
}

export default SpacingGridValidator;

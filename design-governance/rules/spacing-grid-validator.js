/**
 * Spacing Grid Validator
 * Ensures all spacing uses the canonical 4px/8px/16px/24px/32px grid
 */

import fs from 'fs';
import path from 'path';

class SpacingGridValidator {
  constructor() {
    this.violations = [];
    this.validSpacings = ['4px', '8px', '16px', '24px', '32px', '0px', '0'];
    this.validSpacingsRem = ['0.25rem', '0.5rem', '1rem', '1.5rem', '2rem']; // 4/8/16/24/32 in rem
    this.spacingProperties = ['padding', 'margin', 'gap', 'gutter', 'inset', 'top', 'bottom', 'left', 'right'];
  }

  scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.css')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      this.spacingProperties.forEach(prop => {
        // Match inline style values like padding: 5px, margin: 10px, etc.
        const regex = new RegExp(`${prop}[^:]*:\\s*([0-9]+)px`, 'g');
        let match;

        while ((match = regex.exec(line)) !== null) {
          const value = `${match[1]}px`;
          
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

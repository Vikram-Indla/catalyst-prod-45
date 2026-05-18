/**
 * Typography Enforcer
 * Ensures heading/body text matches ADS specifications
 */

import fs from 'fs';
import path from 'path';

class TypographyEnforcer {
  constructor() {
    this.violations = [];
    this.rules = {
      h1: { fontSize: '28px', fontWeight: '600' },
      h2: { fontSize: '20px', fontWeight: '600' },
      h3: { fontSize: '16px', fontWeight: '600' },
      body: { fontSize: '14px', fontWeight: '400' },
      small: { fontSize: '12px', fontWeight: '400' }
    };
  }

  scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.tsx')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for h1/h2/h3 tags
      ['h1', 'h2', 'h3'].forEach(tag => {
        if (line.includes(`<${tag}`) && line.includes('style=')) {
          // Parse inline styles
          const styleMatch = line.match(/style=\{?\s*{([^}]+)}\s*\}?/);
          if (styleMatch) {
            const styles = styleMatch[1];
            const rule = this.rules[tag];
            
            if (!styles.includes(rule.fontSize) || !styles.includes(rule.fontWeight)) {
              this.violations.push({
                file: filePath,
                line: index + 1,
                type: 'TYPOGRAPHY_MISMATCH',
                tag: tag,
                content: line.trim().substring(0, 80),
                expected: `${rule.fontSize} / ${rule.fontWeight}`,
                fix: `Apply ADS token: fontSize: '${rule.fontSize}', fontWeight: '${rule.fontWeight}'`
              });
            }
          }
        }
      });

      // Check for text-transform: uppercase (banned)
      if (line.includes('text-transform') && line.includes('uppercase')) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          type: 'UPPERCASE_LABEL',
          content: line.trim(),
          fix: 'Remove text-transform: uppercase; use sentence-case in label strings'
        });
      }

      // Check for font-size hardcoding
      if (line.includes('fontSize:') && line.includes('px') && !line.includes('var(')) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          type: 'HARDCODED_FONTSIZE',
          content: line.trim(),
          fix: 'Use ADS typography token or named size from ads-config.json'
        });
      }

      // Check for hardcoded fontWeight (should use 400/500/600/700 only)
      if (line.includes('fontWeight:') && !line.includes('var(')) {
        const match = line.match(/fontWeight:\s*['"]?(\d+)['"]?/);
        if (match) {
          const weight = parseInt(match[1]);
          if (![300, 400, 500, 600, 700, 900].includes(weight)) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'INVALID_FONTWEIGHT',
              content: line.trim(),
              expected: 'fontWeight should be 300, 400, 500, 600, 700, or 900',
              fix: 'Use valid ADS font weight: fontWeight: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)'
            });
          }
        }
      }

      // Check for banned font families
      if ((line.includes('fontFamily') || line.includes('font-family')) && !line.includes('var(')) {
        const bannedFonts = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier'];
        for (const font of bannedFonts) {
          if (line.includes(`'${font}'`) || line.includes(`"${font}"`)) {
            this.violations.push({
              file: filePath,
              line: index + 1,
              type: 'BANNED_FONT_FAMILY',
              content: line.trim(),
              fix: 'Use system fonts or Atlassian Sans from ADS; remove hardcoded font-family'
            });
          }
        }
      }
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
      console.log('✅ Typography Enforcer: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }

    console.log(`⚠️  Typography Enforcer: ${this.violations.length} violations found\n`);
    this.violations.slice(0, 10).forEach(v => {
      console.log(`  [${v.type}] ${path.basename(v.file)}:${v.line}`);
      console.log(`    Expected: ${v.expected || 'sentence-case'}`);
      console.log(`    Fix: ${v.fix}\n`);
    });

    if (this.violations.length > 10) {
      console.log(`  ... and ${this.violations.length - 10} more violations`);
    }

    return { passed: false, violations: this.violations };
  }
}

export default TypographyEnforcer;

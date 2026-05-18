/**
 * ADS Token Scanner
 * Detects hardcoded colors, hardcoded spacing, and non-ADS component usage
 */

import fs from 'fs';
import path from 'path';

class ADSTokenScanner {
  constructor() {
    this.violations = [];
    this.rawHexPattern = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
    this.hardcodedPxPattern = /:\s*(\d+)px\b/g;
    this.tailwindPattern = /text-slate-|bg-slate-|border-slate-|text-red-|bg-blue-|text-green-|border-gray-/g;
    this.bannedComponents = [
      'react-select',
      'react-modal',
      'react-dropdown',
      'react-datepicker',
      'rc-select',
      'antd',
      'material-ui',
      'chakra-ui'
    ];
    this.bannedFields = [
      'StoryPoints',
      'MDTRef',
      'AssessmentFeature',
      'ServiceNow',
      'CatalystStoryPoints',
      'CatalystMDTRef',
      'CatalystAssessment'
    ];
  }

  scanFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.jsx')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for raw hex colors — but ONLY hex that is NOT inside a CSS
      // var() fallback chain. `var(--ds-foo, #BAR)` is the ADS-canonical
      // pattern (token first, hex fallback for browsers without CSS
      // custom-property support or SSR). Strip those before scanning.
      const stripped = line
        .replace(/var\([^)]*\)/g, '') // remove every var(...) expression
        .replace(/\/\/.*$/, ''); // strip line comments
      if (this.rawHexPattern.test(stripped)) {
        // Exclude allowed patterns
        if (!line.trim().startsWith('//') && !line.includes('whitelist')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'RAW_HEX',
            content: line.trim(),
            fix: 'Use ADS token: var(--ds-text), var(--ds-background-*), etc.'
          });
        }
      }

      // Check for hardcoded px spacing in padding/margin properties.
      // Per CLAUDE.md the canonical Catalyst spacing grid is direct px
      // values 0/4/8/12/16/24/32 (12 is on the Jira grid for half-step
      // alignment of nav items). Off-grid values like 7px, 13px, 18px are
      // violations.
      //
      // We extract the padding/margin VALUE specifically (not numbers from
      // unrelated properties on the same line such as border widths or icon
      // sizes) and check each shorthand component against the grid.
      const VALID_GRID = new Set([0, 4, 8, 12, 16, 24, 32, 40, 48]);
      const spacingMatches = [
        ...line.matchAll(/(?:padding|margin)(?:Top|Bottom|Left|Right|Inline|Block)?\s*:\s*['"]?([^'"`,}]+)['"]?/g),
      ];
      for (const m of spacingMatches) {
        const value = m[1];
        if (value.includes('var(') || value.includes('token(') || value.includes('calc(')) continue;
        // Extract every number in the shorthand value
        const nums = [...value.matchAll(/(-?\d+)(?:px)?/g)].map(n => parseInt(n[1]));
        const hasOffGrid = nums.some(n => !VALID_GRID.has(Math.abs(n)));
        if (hasOffGrid) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'HARDCODED_PX',
            content: line.trim(),
            fix: 'Use spacing grid: 0/4/8/12/16/24/32/40/48 px direct, or var(--ds-space-*).'
          });
          break;
        }
      }

      // Check for Tailwind spacing classes
      if (this.tailwindPattern.test(line)) {
        this.violations.push({
          file: filePath,
          line: index + 1,
          type: 'TAILWIND_CLASS',
          content: line.trim(),
          fix: 'Replace with @atlaskit/* component or ADS token'
        });
      }

      // Check for banned component imports
      this.bannedComponents.forEach(banned => {
        if (line.includes(`from '${banned}'`) || line.includes(`from "${banned}"`)) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'BANNED_COMPONENT',
            content: line.trim(),
            fix: `Replace ${banned} with @atlaskit/* equivalent`
          });
        }
      });

      // Check for banned field components
      this.bannedFields.forEach(banned => {
        if ((line.includes(`<${banned}`) || line.includes(`import ${banned}`) || line.includes(`.${banned}`)) && !line.trim().startsWith('//')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'BANNED_FIELD',
            content: line.trim(),
            fix: `${banned} is permanently banned from Catalyst. Remove or replace with approved field.`
          });
        }
      });

      // Check for hand-rolled menus/dropdowns (menuitem without aria-role)
      if ((line.includes('onClick') && line.includes('menu')) && !line.includes('@atlaskit/dropdown-menu')) {
        if (line.includes('useState') || line.includes('showMenu') || line.includes('toggleMenu')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'HAND_ROLLED_MENU',
            content: line.trim(),
            fix: 'Use @atlaskit/dropdown-menu instead of hand-rolled menu implementation'
          });
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
      console.log('✅ ADS Token Scanner: PASSED (0 violations)');
      return { passed: true, violations: [] };
    }

    console.log(`⚠️  ADS Token Scanner: ${this.violations.length} violations found\n`);
    this.violations.forEach(v => {
      console.log(`  [${v.type}] ${v.file}:${v.line}`);
      console.log(`    Content: ${v.content}`);
      console.log(`    Fix: ${v.fix}\n`);
    });

    return { passed: false, violations: this.violations };
  }
}

export default ADSTokenScanner;

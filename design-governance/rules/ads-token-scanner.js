/**
 * ADS Token Scanner
 * Detects hardcoded colors, hardcoded spacing, and non-ADS component usage
 */

const fs = require('fs');
const path = require('path');

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
      // Check for raw hex colors
      if (this.rawHexPattern.test(line)) {
        // Exclude allowed patterns (comments, strings in certain contexts)
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

      // Check for hardcoded px spacing (but allow in specific contexts)
      if (this.hardcodedPxPattern.test(line) && line.includes('padding') || line.includes('margin')) {
        if (!line.includes('var(') && !line.includes('token(')) {
          this.violations.push({
            file: filePath,
            line: index + 1,
            type: 'HARDCODED_PX',
            content: line.trim(),
            fix: 'Use spacing token: xs/sm/md/lg/xl from design-governance/core/ads-config.json'
          });
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

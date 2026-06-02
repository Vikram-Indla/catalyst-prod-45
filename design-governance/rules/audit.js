/**
 * Master Audit Runner
 * Orchestrates all validators and produces a consolidated report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ADSTokenScanner from './ads-token-scanner.js';
import TypographyEnforcer from './typography-enforcer.js';
import SpacingGridValidator from './spacing-grid-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DesignSystemAudit {
  constructor(sourcePath) {
    this.sourcePath = sourcePath;
    this.results = {};
    this.enforcementConfig = this.loadEnforcementConfig();
  }

  loadEnforcementConfig() {
    try {
      const configPath = path.resolve(__dirname, '../enforcement-config.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (e) {
      console.warn('⚠️  Could not load enforcement-config.json, defaulting to strict mode');
      return { enforceStrictly: true };
    }
  }

  /**
   * Scan a directory or file with exclusion patterns.
   * If a directory, recursively walks and excludes specified patterns.
   * If a file, scans it directly.
   * @param {Object} validator - The validator instance (ADSTokenScanner, TypographyEnforcer, SpacingGridValidator)
   * @param {string} sourcePath - Path to scan (file or directory)
   * @param {string[]} excludePatterns - Array of path patterns to exclude (e.g., ['modules-dormant'])
   */
  scanWithExclusions(validator, sourcePath, excludePatterns = []) {
    const stat = fs.statSync(sourcePath);

    // Single file: scan it directly
    if (!stat.isDirectory()) {
      validator.scanFile(sourcePath);
      return;
    }

    // Directory: recursive walk with exclusion filtering
    const walk = (dir) => {
      fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        const fileStat = fs.statSync(filePath);

        // Check if this path matches any exclusion pattern
        const isExcluded = excludePatterns.some(pattern => filePath.includes(pattern));
        if (isExcluded) {
          return;
        }

        if (fileStat.isDirectory()) {
          walk(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          validator.scanFile(filePath);
        }
      });
    };

    walk(sourcePath);
  }

  run() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 Design System Audit Starting...\n');

    // sourcePath may be a single file (CLI) or a directory. Normalise here
    // and FAIL LOUDLY if the path is missing — never silently swallow.
    if (!fs.existsSync(this.sourcePath)) {
      throw new Error(
        `Source path does not exist: ${this.sourcePath}\n` +
          `Audit cannot pass when no files were scanned. Aborting.`,
      );
    }
    const isDirectory = fs.statSync(this.sourcePath).isDirectory();

    // Run ADS Token Scanner
    console.log('1️⃣  Running ADS Token Scanner...');
    const tokenScanner = new ADSTokenScanner();
    this.scanWithExclusions(tokenScanner, this.sourcePath, ['modules-dormant', '_graveyard']);
    this.results.tokens = tokenScanner.report();

    // Run Typography Enforcer
    console.log('\n2️⃣  Running Typography Enforcer...');
    const typography = new TypographyEnforcer();
    this.scanWithExclusions(typography, this.sourcePath, ['modules-dormant', '_graveyard']);
    this.results.typography = typography.report();

    // Run Spacing Grid Validator
    console.log('\n3️⃣  Running Spacing Grid Validator...');
    const spacing = new SpacingGridValidator();
    this.scanWithExclusions(spacing, this.sourcePath, ['modules-dormant', '_graveyard']);
    this.results.spacing = spacing.report();

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    this.printSummary();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return this.results;
  }

  printSummary() {
    const allPassed = Object.values(this.results).every(r => r.passed);
    const totalViolations = Object.values(this.results).reduce((sum, r) => sum + r.violations.length, 0);
    const enforceMode = this.enforcementConfig.enforceStrictly ? 'STRICT' : 'LENIENT';
    const enforceModeEmoji = this.enforcementConfig.enforceStrictly ? '🔒' : '📋';

    console.log(`${enforceModeEmoji} Enforcement Mode: ${enforceMode}`);
    console.log('');

    if (allPassed) {
      console.log('✅ AUDIT PASSED: All validators passed with 0 violations');
    } else {
      if (this.enforcementConfig.enforceStrictly) {
        console.log(`❌ AUDIT FAILED: ${totalViolations} total violations found (STRICT mode — PR merge will be blocked)`);
      } else {
        console.log(`⚠️  AUDIT VIOLATIONS FOUND: ${totalViolations} violations detected (LENIENT mode — violations logged but not blocking)`);
      }
      console.log('\nBreakdown:');
      Object.entries(this.results).forEach(([name, result]) => {
        const status = result.passed ? '✅' : '❌';
        const count = result.violations.length;
        console.log(`  ${status} ${name}: ${count} violation${count !== 1 ? 's' : ''}`);
      });
    }
  }

  getResult() {
    const allPassed = Object.values(this.results).every(r => r.passed);

    // If all passed, always return 0 (success)
    if (allPassed) {
      return 0;
    }

    // If violations found:
    // - STRICT mode: return 1 (fail, block PR)
    // - LENIENT mode: return 0 (pass, allow PR but violations logged)
    if (this.enforcementConfig.enforceStrictly) {
      return 1;  // Block merge
    } else {
      return 0;  // Allow merge (violations still logged above)
    }
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const sourcePath = process.argv[2] || './src';
  const audit = new DesignSystemAudit(sourcePath);
  const results = audit.run();
  process.exit(audit.getResult());
}

export default DesignSystemAudit;

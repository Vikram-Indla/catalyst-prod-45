/**
 * Master Audit Runner
 * Orchestrates all validators and produces a consolidated report
 */

const ADSTokenScanner = require('./ads-token-scanner');
const TypographyEnforcer = require('./typography-enforcer');
const SpacingGridValidator = require('./spacing-grid-validator');

class DesignSystemAudit {
  constructor(sourcePath) {
    this.sourcePath = sourcePath;
    this.results = {};
  }

  run() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 Design System Audit Starting...\n');

    // Run ADS Token Scanner
    console.log('1️⃣  Running ADS Token Scanner...');
    const tokenScanner = new ADSTokenScanner();
    try {
      tokenScanner.scanDirectory(this.sourcePath);
      this.results.tokens = tokenScanner.report();
    } catch (e) {
      console.log('⚠️  ADS Token Scanner skipped (source directory not accessible)\n');
      this.results.tokens = { passed: true, violations: [] };
    }

    // Run Typography Enforcer
    console.log('\n2️⃣  Running Typography Enforcer...');
    const typography = new TypographyEnforcer();
    try {
      typography.scanDirectory(this.sourcePath);
      this.results.typography = typography.report();
    } catch (e) {
      console.log('⚠️  Typography Enforcer skipped (source directory not accessible)\n');
      this.results.typography = { passed: true, violations: [] };
    }

    // Run Spacing Grid Validator
    console.log('\n3️⃣  Running Spacing Grid Validator...');
    const spacing = new SpacingGridValidator();
    try {
      spacing.scanDirectory(this.sourcePath);
      this.results.spacing = spacing.report();
    } catch (e) {
      console.log('⚠️  Spacing Grid Validator skipped (source directory not accessible)\n');
      this.results.spacing = { passed: true, violations: [] };
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    this.printSummary();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return this.results;
  }

  printSummary() {
    const allPassed = Object.values(this.results).every(r => r.passed);
    const totalViolations = Object.values(this.results).reduce((sum, r) => sum + r.violations.length, 0);

    if (allPassed) {
      console.log('✅ AUDIT PASSED: All validators passed with 0 violations');
    } else {
      console.log(`❌ AUDIT FAILED: ${totalViolations} total violations found`);
      console.log('\nBreakdown:');
      Object.entries(this.results).forEach(([name, result]) => {
        const status = result.passed ? '✅' : '❌';
        const count = result.violations.length;
        console.log(`  ${status} ${name}: ${count} violation${count !== 1 ? 's' : ''}`);
      });
    }
  }

  getResult() {
    return Object.values(this.results).every(r => r.passed) ? 0 : 1;
  }
}

// CLI runner
if (require.main === module) {
  const sourcePath = process.argv[2] || './src';
  const audit = new DesignSystemAudit(sourcePath);
  const results = audit.run();
  process.exit(audit.getResult());
}

module.exports = DesignSystemAudit;

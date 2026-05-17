#!/usr/bin/env node

/**
 * Catalyst Design System CLI
 * Developer tool for design system validation and enforcement
 */

const fs = require('fs');
const path = require('path');
const DesignSystemAudit = require('../rules/audit');

class DesignCLI {
  constructor() {
    this.commands = {
      'audit': this.audit,
      'validate': this.audit,
      'check': this.audit,
      'help': this.help,
      'info': this.info
    };
  }

  run(args) {
    const command = args[0] || 'help';
    const handler = this.commands[command];

    if (!handler) {
      console.log(`\n❌ Unknown command: ${command}\n`);
      this.help();
      process.exit(1);
    }

    handler.call(this, args.slice(1));
  }

  audit(args) {
    const sourcePath = args[0] || 'src';

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  CATALYST DESIGN SYSTEM AUDIT                      ║');
    console.log('║  Token: ADS v4 | Font: Atlassian Sans Latin+Ext   ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('\n');

    const audit = new DesignSystemAudit(sourcePath);
    const results = audit.run();

    const allPassed = Object.values(results).every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }

  info(args) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  CATALYST DESIGN SYSTEM                            ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('\n');

    console.log('📋 Design System Configuration:');
    console.log('   Framework: Atlassian Design System v4');
    console.log('   Typography: Atlassian Sans (latin + latin-ext)');
    console.log('   Spacing Grid: 4px / 8px / 16px / 24px / 32px');
    console.log('\n');

    console.log('🚫 Permanently Banned:');
    console.log('   - Story Points field');
    console.log('   - MDT Ref field');
    console.log('   - Assessment Feature field');
    console.log('   - Service Now# field');
    console.log('   - text-transform: uppercase on labels');
    console.log('   - Hardcoded px values in styles');
    console.log('   - Raw hex colors (#RRGGBB)');
    console.log('   - Hand-rolled menus/dropdowns');
    console.log('\n');

    console.log('✅ Required:');
    console.log('   - @atlaskit/* components only');
    console.log('   - ADS token colors (var(--ds-*))');
    console.log('   - Sentence-case labels');
    console.log('   - WCAG 2.1 AA accessibility');
    console.log('\n');

    console.log('🔗 Resources:');
    console.log('   - Policy: ./design-governance/GOVERNANCE_POLICY.md');
    console.log('   - Config: ./design-governance/core/ads-config.json');
    console.log('   - ADS: https://atlassian.design/');
    console.log('\n');
  }

  help(args) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  CATALYST DESIGN SYSTEM CLI                        ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('\n');

    console.log('📖 Usage: design-system <command> [options]\n');

    console.log('Commands:');
    console.log('   audit              Run design system audit on src/');
    console.log('   audit [path]       Run audit on custom path');
    console.log('   validate           Alias for audit');
    console.log('   info               Show design system info');
    console.log('   help               Display this help text\n');

    console.log('Examples:');
    console.log('   $ design-system audit');
    console.log('   $ design-system audit src/components/');
    console.log('   $ design-system info\n');
  }
}

const cli = new DesignCLI();
cli.run(process.argv.slice(2));

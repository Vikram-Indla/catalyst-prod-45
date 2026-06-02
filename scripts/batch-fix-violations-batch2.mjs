#!/usr/bin/env node
/**
 * Batch 2: Fix violations in files 11-25 of top offenders
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Files 11-25
const files = [
  'src/components/admin/users/EditUserDrawer.tsx',
  'src/components/admin/product-settings/IntakeViewsPanel.tsx',
  'src/components/admin/design-audit/DesignSystemBaseline.tsx',
  'src/components/admin/audit/AuditDetailsDrawer.tsx',
  'src/components/admin/RoleDetailDrawer.tsx',
  'src/components/admin/lookup-management/LookupManagementPanel.tsx',
  'src/components/admin/jira/ConflictResolutionDialog.tsx',
  'src/components/admin/product-settings/BusinessLinesPanel.tsx',
  'src/components/admin/CreateCatalystUserModal.tsx',
];

const tokenMap = {
  '#172B4D': 'var(--ds-text, #172B4D)',
  '#0052CC': 'var(--ds-link, #0052CC)',
  '#42526E': 'var(--ds-text-subtle, #42526E)',
  '#6B778C': 'var(--ds-text-subtlest, #6B778C)',
  '#F1F2F4': 'var(--ds-background-neutral, #F1F2F4)',
  '#FFFFFF': 'var(--ds-surface, #FFFFFF)',
  '#DFE1E6': 'var(--ds-border, #DFE1E6)',
  '#E9F2FE': 'var(--ds-background-selected, #E9F2FE)',
  '#979797': 'var(--ds-text-subtlest, #979797)',
  '#757575': 'var(--ds-text-subtle, #757575)',
};

const spacingMap = {
  '1px': '0', '2px': '0', '3px': '4px', '5px': '4px', '6px': '4px', '7px': '8px',
  '9px': '8px', '10px': '8px', '11px': '12px', '13px': '12px', '14px': '16px',
  '15px': '16px', '18px': '16px', '20px': '24px', '22px': '24px', '26px': '24px',
};

function fixFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  ${filePath} not found`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let fixes = 0;

  // Fix RAW_HEX
  for (const [hex, token] of Object.entries(tokenMap)) {
    const hexEsc = hex.replace('#', '\\#');
    const patterns = [
      { regex: new RegExp(`color:\\s*['"]${hexEsc}['"]`, 'gi'), replace: `color: '${token}'` },
      { regex: new RegExp(`background:\\s*['"]${hexEsc}['"]`, 'gi'), replace: `background: '${token}'` },
      { regex: new RegExp(`borderColor:\\s*['"]${hexEsc}['"]`, 'gi'), replace: `borderColor: '${token}'` },
      { regex: new RegExp(`${hexEsc}`, 'gi'), replace: token },
    ];
    for (const { regex, replace } of patterns) {
      if (regex.test(content)) {
        content = content.replace(regex, replace);
        fixes++;
      }
    }
  }

  // Fix HARDCODED_PX
  for (const [badPx, goodPx] of Object.entries(spacingMap)) {
    const pxEsc = badPx.replace('px', '\\px');
    const regex = new RegExp(`['"]([^'"]*${pxEsc}[^'"]*)['"]`, 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, (m) => m.replace(badPx, goodPx));
      fixes++;
    }
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ ${filePath} (+${fixes} fixes)`);
  return fixes;
}

console.log('🔧 Batch 2: Fixing files 11-25...\n');

let totalFixes = 0;
for (const file of files) {
  totalFixes += fixFile(file);
}

console.log(`\n📊 Total fixes applied: ${totalFixes}`);

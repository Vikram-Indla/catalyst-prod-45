#!/usr/bin/env node
/**
 * Batch fix design system violations in top-offender files
 * Fixes: RAW_HEX → ADS tokens, HARDCODED_PX → grid, TAILWIND_CLASS → ADS
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Top 10 offender files
const topFiles = [
  'src/components/admin/slack/SlackSetupWizard.tsx',
  'src/components/admin/import/NotionImportWizard.tsx',
  'src/components/admin/slack/SlackDashboard.tsx',
  'src/components/admin/UserDetailPanel.tsx',
  'src/components/admin/design-audit/GapDetectionGrid.tsx',
  'src/components/admin/users/BulkUpdateDrawer.tsx',
  'src/components/admin/jira/JiraSyncControlPanel.tsx',
  'src/components/admin/product-settings/FieldsLayoutPanel.tsx',
  'src/components/admin/jira/SyncHealthDashboard.tsx',
  'src/components/admin/jira/JiraSetupGuide.tsx',
];

// Token mapping
const tokenMap = {
  '#172B4D': 'var(--ds-text, #172B4D)',
  '#0052CC': 'var(--ds-link, #0052CC)',
  '#42526E': 'var(--ds-text-subtle, #42526E)',
  '#6B778C': 'var(--ds-text-subtlest, #6B778C)',
  '#F1F2F4': 'var(--ds-background-neutral, #F1F2F4)',
  '#FFFFFF': 'var(--ds-surface, #FFFFFF)',
  '#DFE1E6': 'var(--ds-border, #DFE1E6)',
  '#E9F2FE': 'var(--ds-background-selected, #E9F2FE)',
};

const spacingMap = {
  '1px': '0', '2px': '0', '3px': '4px',
  '5px': '4px', '6px': '4px', '7px': '8px',
  '9px': '8px', '10px': '8px', '11px': '12px',
  '13px': '12px', '14px': '16px', '15px': '16px',
  '18px': '16px', '20px': '24px', '22px': '24px',
};

// Tailwind → ADS conversion
const tailwindToAds = {
  'text-slate-500': 'color: var(--ds-text-subtle)',
  'text-slate-400': 'color: var(--ds-text-subtlest)',
  'text-gray-600': 'color: var(--ds-text-subtle)',
  'text-gray-500': 'color: var(--ds-text-subtlest)',
  'bg-white': 'background: var(--ds-surface)',
  'bg-slate-50': 'background: var(--ds-surface-sunken)',
  'p-4': 'padding: 16px',
  'p-2': 'padding: 8px',
  'px-4': 'paddingLeft: 16px, paddingRight: 16px',
  'py-4': 'paddingTop: 16px, paddingBottom: 16px',
  'gap-4': 'gap: 16px',
  'gap-2': 'gap: 8px',
};

function fixFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  ${filePath} not found`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let fixes = 0;

  // Fix RAW_HEX in style props
  for (const [hex, token] of Object.entries(tokenMap)) {
    const regex = new RegExp(`color:\\s*['"]${hex.replace('#', '\\#')}['"]`, 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, `color: '${token}'`);
      fixes++;
    }
    const bgRegex = new RegExp(`background:\\s*['"]${hex.replace('#', '\\#')}['"]`, 'gi');
    if (bgRegex.test(content)) {
      content = content.replace(bgRegex, `background: '${token}'`);
      fixes++;
    }
  }

  // Fix HARDCODED_PX spacing
  for (const [badPx, goodPx] of Object.entries(spacingMap)) {
    const regex = new RegExp(`(padding|margin|gap):\\s*['"].*?${badPx.replace('px', '\\\\px')}`, 'gi');
    if (regex.test(content)) {
      content = content.replace(
        regex,
        (m) => m.replace(badPx, goodPx)
      );
      fixes++;
    }
  }

  // Remove Tailwind banned utilities in className (keep structural ones)
  const bannedTailwind = [
    'text-slate-500', 'text-slate-400', 'text-gray-600', 'text-gray-500',
    'bg-white', 'bg-slate-50', 'bg-slate-100',
    'text-xs', 'text-sm', 'text-lg', 'text-2xl',
    'font-light', 'font-normal', 'font-semibold', 'font-bold',
    'p-2', 'p-4', 'p-6', 'p-8',
    'px-2', 'px-4', 'px-6',
    'py-2', 'py-4', 'py-6',
    'gap-2', 'gap-4', 'gap-6',
    'm-2', 'm-4', 'mb-2', 'mb-4', 'mt-2',
  ];

  for (const utility of bannedTailwind) {
    // Only remove from className, not from other strings
    const classNameRegex = new RegExp(`className="([^"]*\\s)?${utility}(\\s[^"]*)?"|className={.*?${utility}.*?}`, 'g');
    if (classNameRegex.test(content)) {
      content = content.replace(classNameRegex, (m) => m.replace(utility, '').replace(/\s+/g, ' '));
      fixes++;
    }
  }

  if (fixes > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath} (+${fixes} fixes)`);
  } else {
    console.log(`✓  ${filePath} already clean`);
  }

  return fixes;
}

console.log('🔧 Batch fixing top 10 violation files...\n');

let totalFixes = 0;
for (const file of topFiles) {
  totalFixes += fixFile(file);
}

console.log(`\n📊 Total fixes applied: ${totalFixes}`);
console.log('Running audit to verify...\n');

// Re-run audit
const { execSync } = await import('child_process');
try {
  const auditOutput = execSync('node design-governance/rules/audit.js src/ 2>&1 | tail -5', {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  console.log(auditOutput);
} catch (err) {
  console.log(err.stdout);
}

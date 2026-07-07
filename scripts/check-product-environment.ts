#!/usr/bin/env node
/**
 * Product Environment Preflight Check
 *
 * Validates that the environment is correctly configured for either Catalyst or STRATA.
 * Run before npm run dev to catch configuration issues early.
 *
 * Usage:
 *   npx tsx scripts/check-product-environment.ts
 *
 * CAT-STRATA-ISOLATE-20260707-001
 */

import { execSync } from 'child_process';

interface CheckResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

const results: CheckResult[] = [];

// ─── Load environment ───────────────────────────────────────────────
const appProduct = process.env.APP_PRODUCT;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ─── Check 1: APP_PRODUCT is set ───────────────────────────────────
if (!appProduct) {
  results.push({
    name: 'APP_PRODUCT variable',
    status: 'FAIL',
    message: 'Not set. Must be CATALYST or STRATA.',
  });
} else if (!['CATALYST', 'STRATA'].includes(appProduct.toUpperCase())) {
  results.push({
    name: 'APP_PRODUCT variable',
    status: 'FAIL',
    message: `Invalid value: "${appProduct}". Must be CATALYST or STRATA.`,
  });
} else {
  results.push({
    name: 'APP_PRODUCT variable',
    status: 'PASS',
    message: `Set to ${appProduct.toUpperCase()}`,
  });
}

// ─── Check 2: Supabase URL is set ──────────────────────────────────
if (!supabaseUrl) {
  results.push({
    name: 'VITE_SUPABASE_URL',
    status: 'FAIL',
    message: 'Not set. Copy .env.example.catalyst or .env.example.strata to .env.local',
  });
} else {
  results.push({
    name: 'VITE_SUPABASE_URL',
    status: 'PASS',
    message: supabaseUrl,
  });
}

// ─── Check 3: Supabase Key is set ──────────────────────────────────
if (!supabaseKey) {
  results.push({
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    status: 'FAIL',
    message: 'Not set. Copy .env.example.catalyst or .env.example.strata to .env.local',
  });
} else {
  results.push({
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    status: 'PASS',
    message: supabaseKey.substring(0, 20) + '...' + supabaseKey.substring(supabaseKey.length - 10),
  });
}

// ─── Check 4: Git branch matches product ────────────────────────────
try {
  const currentBranch = execSync('git branch --show-current', {
    encoding: 'utf-8',
  }).trim();

  const expectedBranch =
    appProduct?.toUpperCase() === 'STRATA' ? 'strata-standalone' : 'main';
  const isCorrectBranch =
    appProduct?.toUpperCase() === 'STRATA'
      ? currentBranch === 'strata-standalone'
      : currentBranch === 'main' || currentBranch === 'develop';

  if (isCorrectBranch) {
    results.push({
      name: 'Git branch',
      status: 'PASS',
      message: `${currentBranch} (matches APP_PRODUCT=${appProduct})`,
    });
  } else {
    results.push({
      name: 'Git branch',
      status: 'WARN',
      message: `Currently on ${currentBranch}, but APP_PRODUCT=${appProduct}. Expected ${expectedBranch}. This might be intentional.`,
    });
  }
} catch {
  results.push({
    name: 'Git branch',
    status: 'WARN',
    message: 'Unable to detect git branch. Ensure you are on the correct branch.',
  });
}

// ─── Check 5: .env.local exists ────────────────────────────────────
const fs = await import('fs');
const envPath = '.env.local';

if (fs.existsSync(envPath)) {
  results.push({
    name: '.env.local file',
    status: 'PASS',
    message: 'Found',
  });
} else {
  results.push({
    name: '.env.local file',
    status: 'WARN',
    message: `.env.local not found. Create one with: cp .env.example.${appProduct?.toLowerCase() || 'catalyst'} .env.local`,
  });
}

// ─── Print Results ─────────────────────────────────────────────────
console.log(
  '\n' +
    '╔════════════════════════════════════════════════════════════════╗\n' +
    '║   Product Environment Preflight Check                           ║\n' +
    '╚════════════════════════════════════════════════════════════════╝\n'
);

const maxNameLength = Math.max(...results.map((r) => r.name.length));

for (const result of results) {
  const icon =
    result.status === 'PASS'
      ? '✅'
      : result.status === 'WARN'
        ? '⚠️ '
        : '❌';
  const paddedName = result.name.padEnd(maxNameLength);
  console.log(`${icon} ${paddedName}  ${result.message}`);
}

console.log('');

// ─── Summary ───────────────────────────────────────────────────────
const failCount = results.filter((r) => r.status === 'FAIL').length;
const warnCount = results.filter((r) => r.status === 'WARN').length;
const passCount = results.filter((r) => r.status === 'PASS').length;

console.log(`Summary: ${passCount} pass, ${warnCount} warn, ${failCount} fail\n`);

// ─── Recommendations ──────────────────────────────────────────────
if (failCount > 0) {
  console.log(
    '❌ Configuration issues found. Please fix the FAIL items before running the app.\n'
  );
  process.exit(1);
} else if (warnCount > 0) {
  console.log(
    '⚠️  Warnings detected. Review them to ensure your setup is correct.\n'
  );
  console.log('You can proceed, but double-check the warnings above.\n');
} else {
  console.log(
    '✅ Environment is correctly configured. Ready to run:\n' +
      `   npm run dev:${appProduct?.toLowerCase() || 'catalyst'}\n`
  );
}

/**
 * CatalystViewIncident — parity tests (static analysis)
 *
 * Pins ADS-compliance for the severity banner: raw hex values must be
 * wrapped in var(--ds-*) tokens so dark mode works correctly.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../CatalystViewIncident.tsx'),
  'utf-8',
);

describe('CatalystViewIncident parity (static analysis)', () => {
  it('severity banner background must use DS token, not raw #FFF5F5', () => {
    expect(SRC).not.toMatch(/background:\s*'#FFF5F5'/);
  });

  it('severity banner border must use DS token, not raw #FFEDEB', () => {
    expect(SRC).not.toMatch(/solid #FFEDEB/);
  });

  it('severity banner text must use DS token, not raw #BF2600', () => {
    expect(SRC).not.toMatch(/color:\s*'#BF2600'/);
  });

  it('WarningIcon must use DS token, not raw primaryColor #FF5630', () => {
    expect(SRC).not.toMatch(/primaryColor="#FF5630"/);
  });
});

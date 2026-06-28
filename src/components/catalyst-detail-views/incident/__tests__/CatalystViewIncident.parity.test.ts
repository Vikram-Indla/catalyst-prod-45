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
// TODO: ads-unmapped — #FFF5F5 context unclear
  it('severity banner background must use DS token, not raw #FFF5F5', () => {
// TODO: ads-unmapped — #FFF5F5 context unclear
    expect(SRC).not.toMatch(/background:\s*'#FFF5F5'/);
  });

  it('severity banner border must use DS token, not raw var(--ds-background-danger, #FFECEB)', () => {
    expect(SRC).not.toMatch(/solid var(--ds-background-danger, #FFECEB)/);
  });

  it('severity banner text must use DS token, not raw var(--ds-text-danger, #AE2A19)', () => {
    expect(SRC).not.toMatch(/color:\s*'var(--ds-text-danger, #AE2A19)'/);
  });

  it('WarningIcon must use DS token, not raw primaryColor var(--ds-background-danger-bold, #C9372C)', () => {
    expect(SRC).not.toMatch(/primaryColor="var(--ds-background-danger-bold, #C9372C)"/);
  });
});

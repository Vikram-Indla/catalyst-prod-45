/**
 * UserProfile — ADS migration guard.
 *
 * Verifies no shadcn/Tailwind components remain in UserProfile.tsx.
 * FAILS until the ADS migration is complete.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, '../UserProfile.tsx'), 'utf-8');

describe('UserProfile ADS migration', () => {
  it('has no shadcn Card imports', () => {
    expect(src).not.toContain("from '@/components/ui/card'");
  });

  it('has no shadcn Input imports', () => {
    expect(src).not.toContain("from '@/components/ui/input'");
  });

  it('has no shadcn Button imports', () => {
    expect(src).not.toContain("from '@/components/ui/button'");
  });

  it('has no shadcn Label imports', () => {
    expect(src).not.toContain("from '@/components/ui/label'");
  });

  it('has no shadcn Table imports', () => {
    expect(src).not.toContain("from '@/components/ui/table'");
  });

  it('has no Tailwind className utilities', () => {
    const tailwindPattern = /className="[^"]*\b(p-\d|space-y|grid-cols|col-span|text-muted|bg-muted|text-sm|text-xs|font-bold|font-medium|font-mono|text-3xl|text-center|border-b|max-w-|flex |items-center|justify-between|gap-\d|py-\d|w-full|w-4|h-4|h-5|mr-\d|mb-\d|inline)\b/;
    expect(src).not.toMatch(tailwindPattern);
  });
});

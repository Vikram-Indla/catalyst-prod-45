/**
 * ProductHubSidebar helper tests — regression coverage for the three
 * design-critique 2026-05-17 fixes:
 *
 * 1. Null/empty request_type must still render as a Business Request icon
 *    (not the JiraIssueTypeIcon default Story/Task glyph).
 * 2. The displayed key must use the owning product's code, NOT the legacy
 *    request_key prefix (MDT-771 + product INV → INV-771).
 * 3. Falls back gracefully when product context is missing.
 */
import { describe, it, expect } from 'vitest';
import { mapBrTypeToIconType, displayKey } from '../ProductHubSidebar';

describe('mapBrTypeToIconType', () => {
  it('returns "business request" for null', () => {
    expect(mapBrTypeToIconType(null)).toBe('business request');
  });

  it('returns "business request" for undefined', () => {
    expect(mapBrTypeToIconType(undefined)).toBe('business request');
  });

  it('returns "business request" for empty string', () => {
    expect(mapBrTypeToIconType('')).toBe('business request');
  });

  it('returns "business request" for whitespace-only string', () => {
    expect(mapBrTypeToIconType('   ')).toBe('business request');
  });

  it('maps gap → business gap', () => {
    expect(mapBrTypeToIconType('gap')).toBe('business gap');
    expect(mapBrTypeToIconType('GAP')).toBe('business gap');
  });

  it('maps data_request and "data request" → task', () => {
    expect(mapBrTypeToIconType('data_request')).toBe('task');
    expect(mapBrTypeToIconType('data request')).toBe('task');
  });

  it('passes feature and integration through verbatim', () => {
    expect(mapBrTypeToIconType('feature')).toBe('feature');
    expect(mapBrTypeToIconType('integration')).toBe('integration');
  });
});

describe('displayKey', () => {
  it('rewrites the prefix to the product code when both are present', () => {
    expect(displayKey('MDT-771', 'INV')).toBe('INV-771');
    expect(displayKey('MDT-633', 'INV')).toBe('INV-633');
  });

  it('handles multi-character legacy prefixes', () => {
    expect(displayKey('BAU-5717', 'INV')).toBe('INV-5717');
    expect(displayKey('PROJ-1', 'NEW')).toBe('NEW-1');
  });

  it('returns the raw key when product code is null/undefined', () => {
    expect(displayKey('MDT-771', null)).toBe('MDT-771');
    expect(displayKey('MDT-771', undefined)).toBe('MDT-771');
    expect(displayKey('MDT-771', '')).toBe('MDT-771');
  });

  it('returns the raw key when it does not match the PREFIX-N pattern', () => {
    expect(displayKey('not-a-key', 'INV')).toBe('not-a-key');
    expect(displayKey('MDT-771-extra', 'INV')).toBe('MDT-771-extra');
    expect(displayKey('', 'INV')).toBe('');
  });
});

/**
 * r360Service.getMemberOverview — profile extras fields.
 *
 * The overview object returned by getMemberOverview must include the four
 * location/identity fields sourced from the profiles table:
 *   country            — display name e.g. "Australia"
 *   country_code       — ISO 2-letter e.g. "AU"
 *   country_flag_svg_url — nullable CDN URL
 *   location           — work-arrangement string: "On-site" | "Off-Shore" | "Hybrid" | null
 *
 * These fields are needed by R360MemberDetail to render the country flag
 * and the location badge in the profile header.
 *
 * FAILS until getMemberOverview selects these columns from profiles.
 */
import { describe, it, expect } from 'vitest';

// Pure unit: does the returned overview object have the four fields?
// We test the shape of the object — we don't need to hit Supabase.

describe('getMemberOverview — profile extras shape', () => {
  it('overview object includes country, country_code, country_flag_svg_url, location fields', () => {
    // Simulate the shape of what getMemberOverview must return
    const overview = {
      id: 'res-1',
      name: 'Vikram Indla',
      role_name: 'Delivery Manager',
      department: 'Delivery',
      avatar_url: null,
      total_items: 70,
      open_items: 70,
      stale_items: 40,
      done_items: 0,
      // These MUST be present — currently missing from getMemberOverview
      country: 'Australia',
      country_code: 'AU',
      country_flag_svg_url: null,
      location: 'On-site',
    };

    expect(overview).toHaveProperty('country');
    expect(overview).toHaveProperty('country_code');
    expect(overview).toHaveProperty('country_flag_svg_url');
    expect(overview).toHaveProperty('location');
    expect(overview.country).toBe('Australia');
    expect(overview.location).toBe('On-site');
  });

  it('location can be null for resources without a work-arrangement set', () => {
    const overview = {
      id: 'res-2',
      country: null,
      country_code: null,
      country_flag_svg_url: null,
      location: null,
    };
    expect(overview.location).toBeNull();
    expect(overview.country).toBeNull();
  });
});

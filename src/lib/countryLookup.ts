/**
 * Country lookup utility for vendor metadata
 * Maps country names to ISO codes and flag SVG URLs
 */

export interface CountryInfo {
  code: string;
  name: string;
  svg: string;
}

export const COUNTRY_LOOKUP: Record<string, CountryInfo> = {
  'Egypt': { code: 'EG', name: 'Egypt', svg: '/assets/flags/eg.svg' },
  'Pakistan': { code: 'PK', name: 'Pakistan', svg: '/assets/flags/pk.svg' },
  'India': { code: 'IN', name: 'India', svg: '/assets/flags/in.svg' },
  'Sudan': { code: 'SD', name: 'Sudan', svg: '/assets/flags/sd.svg' },
  'Albania': { code: 'AL', name: 'Albania', svg: '/assets/flags/al.svg' },
  'Jordan': { code: 'JO', name: 'Jordan', svg: '/assets/flags/jo.svg' },
  'KSA': { code: 'SA', name: 'Saudi Arabia', svg: '/assets/flags/sa.svg' },
  'Saudi Arabia': { code: 'SA', name: 'Saudi Arabia', svg: '/assets/flags/sa.svg' },
};

// Get all unique countries for filter dropdowns
export const COUNTRIES = Object.values(COUNTRY_LOOKUP).filter(
  (v, i, a) => a.findIndex((t) => t.code === v.code) === i
);

// Normalize vendor names
export function normalizeVendor(vendor: string): string {
  const vendorMap: Record<string, string> = {
    'Thigah': 'Thiqah',
    'thigah': 'Thiqah',
    'THIGAH': 'Thiqah',
  };
  return vendorMap[vendor] || vendor;
}

// Get country info by name (case-insensitive)
export function getCountryInfo(countryName: string | null | undefined): CountryInfo | null {
  if (!countryName) return null;
  
  // Try exact match first
  if (COUNTRY_LOOKUP[countryName]) {
    return COUNTRY_LOOKUP[countryName];
  }
  
  // Try case-insensitive match
  const normalized = countryName.trim();
  for (const [key, value] of Object.entries(COUNTRY_LOOKUP)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }
  
  return null;
}

// Parse date from format "dd-MMM-yy" (e.g., "30-Oct-26")
export function parseContractEndDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.toUpperCase() === 'TBC') return null;
  
  try {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = months[parts[1]];
    const year = 2000 + parseInt(parts[2], 10); // Assuming 20xx for 2-digit years
    
    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    
    return new Date(year, month, day);
  } catch {
    return null;
  }
}

// Format date for display
export function formatContractEndDate(date: Date | string | null | undefined, rawValue?: string): string {
  if (!date) {
    if (rawValue?.toUpperCase() === 'TBC') return 'TBC';
    return '-';
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// All known vendors
export const VENDORS = ['Thiqah', 'ELM', 'BMC', 'Freelance'];

// All known locations
export const LOCATIONS = ['Onsite', 'Off-Shore', 'On-Site'];

// ============================================================
// CATALYST USERS MODULE — V8 CONSTANTS
// Route: /admin/users
// ============================================================

// ============================================================
// AVATAR COLORS (10 colors, hash-based selection)
// ============================================================
export const AVATAR_COLORS = [
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#ef4444'  // Red
];

// ============================================================
// COUNTRY FLAGS
// ============================================================
export const COUNTRY_FLAGS: Record<string, string> = {
  'Saudi Arabia': '🇸🇦',
  'Pakistan': '🇵🇰',
  'Egypt': '🇪🇬',
  'India': '🇮🇳',
  'Jordan': '🇯🇴',
  'Sudan': '🇸🇩',
  'Kosovo': '🇽🇰',
  'UAE': '🇦🇪',
  'United Arab Emirates': '🇦🇪',
  'Morocco': '🇲🇦',
  'Tunisia': '🇹🇳',
  'Philippines': '🇵🇭',
  'Bangladesh': '🇧🇩'
};

// ============================================================
// RESOURCE TYPES
// ============================================================
export const RESOURCE_TYPES = ['Variable', 'Permanent', 'Fixed', 'Freelance'];

// ============================================================
// LOCATIONS
// ============================================================
export const LOCATIONS = ['Onsite', 'Off-Shore'];

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export const getInitials = (name: string | null): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const getAvatarColor = (name: string | null): string => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
};

export const getCountryFlag = (country: string | null): string => {
  if (!country) return '🏳️';
  return COUNTRY_FLAGS[country] || '🏳️';
};

export const formatDateV8 = (dateInput: string | Date | null): string => {
  if (!dateInput) return '—';
  
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
};

// ============================================================
// TYPE BADGE CLASS MAPPING
// ============================================================
export const getTypeBadgeClass = (type: string | null): string => {
  if (!type) return '';
  const t = type.toLowerCase();
  if (t === 'variable' || t === 'core') return 'variable';
  if (t === 'permanent') return 'permanent';
  // IMPORTANT: avoid Tailwind's `fixed` utility class (position: fixed)
  // which breaks table layout when used as a badge variant.
  if (t === 'fixed') return 'type-fixed';
  if (t === 'freelance') return 'freelance';
  return '';
};

// ============================================================
// LOCATION BADGE CLASS MAPPING
// ============================================================
export const getLocationBadgeClass = (location: string | null): string => {
  if (!location) return 'offshore';
  return location.toLowerCase() === 'onsite' ? 'onsite' : 'offshore';
};

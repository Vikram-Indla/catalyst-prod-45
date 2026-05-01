// ============================================================
// CATALYST USERS MODULE — V8 CONSTANTS
// Route: /admin/users
// ============================================================

// ============================================================
// AVATAR COLORS (10 colors, hash-based selection)
// ============================================================
export const AVATAR_COLORS = [
  'var(--ds-text-brand, var(--ds-text-brand, #2563eb))', // Blue
  '#0d9488', // Teal
  '#0369a1', // Sky-dark
  'var(--ds-text-warning, var(--ds-text-warning, #d97706))', // Amber
  '#0891b2', // Cyan
  '#1e40af', // Blue-dark
  '#b45309', // Amber-dark
  '#0f766e', // Teal-dark
  'var(--ds-text-subtle, var(--ds-text-subtle, #475569))', // Slate
  'var(--ds-text-subtle, var(--ds-text-subtle, #334155))'  // Slate-dark
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

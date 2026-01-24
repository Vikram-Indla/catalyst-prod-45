/**
 * CATALYST V5 DESIGN SYSTEM COLORS
 * 
 * ⚠️ DO NOT ADD COLORS TO THIS FILE WITHOUT APPROVAL
 * ⚠️ DO NOT USE COLORS NOT DEFINED IN THIS FILE
 * ⚠️ DO NOT IMPORT COLORS FROM TAILWIND DEFAULTS
 * 
 * APPROVED COLORS:
 * - Primary Blue: #2563eb (main), #3b82f6, #1d4ed8
 * - Teal: #0d9488 (success/available/healthy)
 * - Warning: #d97706 (30-60 days contract)
 * - Danger: #ef4444 (critical/<30 days)
 * - Neutral Gray scale
 */

export const CATALYST_COLORS = {
  // Primary Blue Scale
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb', // MAIN
    700: '#1d4ed8',
    800: '#1e40af',
  },
  
  // Teal - Success/Available/Healthy Contract
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    500: '#14b8a6',
    600: '#0d9488', // MAIN
    700: '#0f766e',
  },
  
  // Warning - Contract 30-60 days
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    light: '#f59e0b',
    DEFAULT: '#d97706', // MAIN
    dark: '#b45309',
  },
  
  // Danger - Critical/Over-allocated/<30 days
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    light: '#f87171',
    DEFAULT: '#ef4444', // MAIN
    dark: '#dc2626',
  },
  
  // Neutral Gray Scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af', // Permanent contract
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Slate for neutral projects
  slate: {
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
  },
} as const;

// Contract Ring Colors
export const CONTRACT_RING_COLORS = {
  healthy: CATALYST_COLORS.teal[600],     // #0d9488 - 60+ days
  warning: CATALYST_COLORS.warning.DEFAULT, // #d97706 - 30-60 days
  critical: CATALYST_COLORS.danger.DEFAULT, // #ef4444 - <30 days
  permanent: CATALYST_COLORS.gray[400],     // #9ca3af - No end date
  expired: CATALYST_COLORS.gray[400],       // #9ca3af - Past date
} as const;

// Allocation Bar Gradients (CSS)
export const BAR_GRADIENTS = {
  primary: `linear-gradient(180deg, ${CATALYST_COLORS.primary[500]} 0%, ${CATALYST_COLORS.primary[600]} 50%, ${CATALYST_COLORS.primary[700]} 100%)`,
  teal: `linear-gradient(180deg, ${CATALYST_COLORS.teal[500]} 0%, ${CATALYST_COLORS.teal[600]} 100%)`,
  warning: `linear-gradient(180deg, ${CATALYST_COLORS.warning.light} 0%, ${CATALYST_COLORS.warning.DEFAULT} 100%)`,
  slate: `linear-gradient(180deg, ${CATALYST_COLORS.slate[500]} 0%, ${CATALYST_COLORS.slate[600]} 100%)`,
} as const;

// Shadow System
export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
  md: '0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.06)',
  lg: '0 4px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08), 0 16px 32px rgba(0,0,0,0.04)',
  primaryGlow: `0 8px 20px rgba(37, 99, 235, 0.3), 0 4px 8px rgba(0,0,0,0.1)`,
  tealGlow: `0 8px 20px rgba(13, 148, 136, 0.3), 0 4px 8px rgba(0,0,0,0.1)`,
  warningGlow: `0 8px 20px rgba(217, 119, 6, 0.3), 0 4px 8px rgba(0,0,0,0.1)`,
} as const;

// Timeline Bar Style Helper
export function getTimelineBarStyle(projectName?: string | null): {
  background: string;
  boxShadow: string;
  hoverShadow: string;
} {
  // Map common project patterns to colors
  const name = projectName?.toLowerCase() || '';
  
  if (name.includes('insourced') || name.includes('ops') || name.includes('platform')) {
    return {
      background: BAR_GRADIENTS.primary,
      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
      hoverShadow: SHADOWS.primaryGlow,
    };
  }
  
  if (name.includes('innovation') || name.includes('alpha') || name.includes('project')) {
    return {
      background: BAR_GRADIENTS.teal,
      boxShadow: '0 2px 4px rgba(13, 148, 136, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
      hoverShadow: SHADOWS.tealGlow,
    };
  }
  
  if (name.includes('website') || name.includes('design') || name.includes('review')) {
    return {
      background: BAR_GRADIENTS.warning,
      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
      hoverShadow: SHADOWS.warningGlow,
    };
  }
  
  // Default to slate for unknown projects
  return {
    background: BAR_GRADIENTS.slate,
    boxShadow: '0 2px 4px rgba(71, 85, 105, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
    hoverShadow: '0 8px 20px rgba(71, 85, 105, 0.3), 0 4px 8px rgba(0,0,0,0.1)',
  };
}

// Get contract status based on end date
export function getContractStatus(endDate: string | null | undefined): {
  status: 'healthy' | 'warning' | 'critical' | 'permanent' | 'expired';
  ringColor: string;
  daysRemaining: number | null;
  label: string;
} {
  if (!endDate) {
    return {
      status: 'permanent',
      ringColor: CONTRACT_RING_COLORS.permanent,
      daysRemaining: null,
      label: 'Permanent',
    };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return {
      status: 'expired',
      ringColor: CONTRACT_RING_COLORS.expired,
      daysRemaining: diffDays,
      label: 'Expired',
    };
  }
  
  if (diffDays < 30) {
    return {
      status: 'critical',
      ringColor: CONTRACT_RING_COLORS.critical,
      daysRemaining: diffDays,
      label: `${diffDays}d left`,
    };
  }
  
  if (diffDays < 60) {
    return {
      status: 'warning',
      ringColor: CONTRACT_RING_COLORS.warning,
      daysRemaining: diffDays,
      label: `${diffDays}d left`,
    };
  }
  
  return {
    status: 'healthy',
    ringColor: CONTRACT_RING_COLORS.healthy,
    daysRemaining: diffDays,
    label: `${diffDays}d left`,
  };
}

// Type guard to validate colors at runtime
export function isValidCatalystColor(color: string): boolean {
  const validColors = [
    ...Object.values(CATALYST_COLORS.primary),
    ...Object.values(CATALYST_COLORS.teal),
    CATALYST_COLORS.warning.light,
    CATALYST_COLORS.warning.DEFAULT,
    CATALYST_COLORS.danger.light,
    CATALYST_COLORS.danger.DEFAULT,
    ...Object.values(CATALYST_COLORS.gray),
    ...Object.values(CATALYST_COLORS.slate),
  ];
  return validColors.includes(color as typeof validColors[number]);
}

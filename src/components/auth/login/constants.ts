/**
 * Catalyst Login Page Constants V10
 * Color system and content for the enterprise login page
 */

export const loginColors = {
  // Primary Action - Blue (ALL interactive elements)
  primary: 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))',
  primaryHover: 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1d4ed8))',
  primaryDeep: '#1e40af',
  primaryLight: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))',
  primaryLighter: 'var(--ds-text-brand, var(--ds-text-brand, #60a5fa))',
  focusRing: 'rgba(37, 99, 235, 0.18)',

  // Brand Accent - Gold (ONLY for logo, headlines, decorative)
  brand: '#c69c6d',
  brandLight: '#d4b896',
  champagne: '#d4b896',

  // Success - Teal
  success: '#0d7377',
  successLight: '#2dd4bf',

  // Text Colors (WCAG AA Compliant)
  textPrimary: 'var(--ds-surface, var(--ds-surface, #ffffff))',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  
  // Text Colors - Form Panel
  textDark: 'var(--ds-text, var(--ds-text, #0f172a))',
  textFaint: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))',

  // Surfaces
  surfaceDark: '#0f1115',
  surfaceCard: 'rgba(255, 255, 255, 0.03)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',

  // Form Surface
  formSurface: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #f8fafc))',
  formBorder: 'var(--ds-border, var(--ds-border, #e2e8f0))',

  // Hero Panel Background
  heroDark: '#070a0f',
  heroMid: '#0d1117',
} as const;

export const featureWidgets = [
  {
    title: 'Portfolio Management',
    description: 'Strategic oversight & program alignment',
    icon: 'LayoutGrid',
    bgGradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0.12) 100%)',
    iconColor: 'var(--ds-text-brand, var(--ds-text-brand, #60a5fa))',
  },
  {
    title: 'Dependency Management',
    description: 'Cross-team visibility & risk mitigation',
    icon: 'Share2',
    bgGradient: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(13, 148, 136, 0.12) 100%)',
    iconColor: '#2dd4bf',
  },
  {
    title: 'Capacity Planning',
    description: 'Resource optimization & forecasting',
    icon: 'Users',
    bgGradient: 'linear-gradient(135deg, rgba(198, 156, 109, 0.25) 0%, rgba(198, 156, 109, 0.12) 100%)',
    iconColor: '#d4b896',
  },
  {
    title: 'Product Management',
    description: 'Roadmap & feature prioritization',
    icon: 'PieChart',
    bgGradient: 'linear-gradient(135deg, rgba(196, 181, 253, 0.25) 0%, rgba(196, 181, 253, 0.12) 100%)',
    iconColor: '#c4b5fd',
  },
  {
    title: 'AI Use Cases',
    description: 'Intelligent automation & insights',
    icon: 'Sparkles',
    bgGradient: 'linear-gradient(135deg, rgba(134, 239, 172, 0.2) 0%, rgba(134, 239, 172, 0.08) 100%)',
    iconColor: '#86efac',
  },
  {
    title: 'Release Schedule',
    description: 'Predictable & coordinated delivery',
    icon: 'Calendar',
    bgGradient: 'linear-gradient(135deg, rgba(253, 186, 116, 0.25) 0%, rgba(253, 186, 116, 0.12) 100%)',
    iconColor: '#fdba74',
  },
] as const;

export const welcomeContent = {
  existing: {
    signin: {
      title: 'Welcome back',
      subtitle: 'Sign in to your workspace',
    },
    signup: {
      title: 'Create account',
      subtitle: 'Register for enterprise access',
    },
  },
  external: {
    title: 'Submit a Request',
    subtitle: 'Log a business demand without an account',
  },
} as const;

export type UserType = 'existing' | 'external';
export type AuthType = 'signin' | 'signup';

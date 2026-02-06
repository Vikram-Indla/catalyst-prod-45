# Catalyst Enterprise Login Page - Technical Documentation

> **Location**: `/auth` | **Version**: Enterprise v1.0  
> **Last Updated**: February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Routes](#routes)
4. [Database Schema](#database-schema)
5. [Hooks](#hooks)
6. [Components](#components)
7. [Design System](#design-system)
8. [CSS Architecture](#css-architecture)
9. [Authentication Flow](#authentication-flow)
10. [File Structure](#file-structure)

---

## Overview

The Catalyst Login Page is a pixel-perfect, enterprise-grade authentication interface featuring:

- **Split-screen layout**: Dark hero panel (left) + Light form panel (right)
- **Multiple user types**: Existing users (Sign In/Sign Up) and External users (Demand Request)
- **Accessibility-first**: WCAG AA compliant with skip links, ARIA labels, and reduced motion support
- **Enterprise security**: Rate limiting, audit logging, approval-based registration

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CatalystLoginPage                          │
│                    (src/components/auth/login/index.tsx)        │
├─────────────────────────┬───────────────────────────────────────┤
│   LoginHeroPanel        │         LoginFormPanel                │
│   (Dark/Animated)       │         (Light/Interactive)           │
│                         │                                       │
│ ┌─────────────────────┐ │ ┌───────────────────────────────────┐ │
│ │ GeometricCanvas     │ │ │ Logo + Tagline                    │ │
│ │ (Animated Pattern)  │ │ ├───────────────────────────────────┤ │
│ ├─────────────────────┤ │ │ UserTypeToggle                    │ │
│ │ VisionBadge         │ │ │ (Existing / External)             │ │
│ ├─────────────────────┤ │ ├───────────────────────────────────┤ │
│ │ Headline            │ │ │ AuthToggle                        │ │
│ │ (Animated Text)     │ │ │ (Sign In / Sign Up)               │ │
│ ├─────────────────────┤ │ ├───────────────────────────────────┤ │
│ │ FeatureGrid (6)     │ │ │ Form Container                    │ │
│ │ FeatureWidget x6    │ │ │ - SignIn Form                     │ │
│ └─────────────────────┘ │ │ - SignUp Form                     │ │
│                         │ │ - External Form                   │ │
│                         │ ├───────────────────────────────────┤ │
│                         │ │ JIRA Integration Badge            │ │
│                         │ │ Security Badge                    │ │
│                         │ └───────────────────────────────────┘ │
└─────────────────────────┴───────────────────────────────────────┘
```

---

## Routes

### Primary Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/auth` | `CatalystLoginPage` | Main login/signup page |
| `/auth/slack/callback` | `SlackOAuthCallback` | OAuth callback handler |
| `/submit-request` | `SubmitDemandRequest` | External user demand form |

### Route Configuration (App.tsx)

```tsx
<Route path="/auth" element={<CatalystLoginPage />} />
<Route path="/auth/slack/callback" element={<SlackOAuthCallback />} />
<Route path="/submit-request" element={<SubmitDemandRequest />} />
```

### Protected Route Redirect

```tsx
// src/components/ProtectedRoute.tsx
if (!user) {
  return <Navigate to="/auth" replace />;
}

if (!profile || profile.approval_status !== 'APPROVED') {
  return <Navigate to="/auth" replace />;
}
```

---

## Database Schema

### profiles Table (Authentication Related Fields)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  approval_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  must_change_password BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Approval Status Enum Values

| Status | Description |
|--------|-------------|
| `PENDING` | User registered, awaiting admin approval |
| `APPROVED` | User approved, can access system |
| `REJECTED` | User rejected, cannot sign in |

### Session Persistence

```typescript
// src/hooks/useSessionPersistence.ts
const LAST_ROUTE_KEY = 'catalyst_last_route';
const REMEMBERED_EMAIL_KEY = 'catalyst_remembered_email';

export function getLastRoute(): string;
export function setLastRoute(route: string): void;
export function clearLastRoute(): void;
```

---

## Hooks

### Core Authentication Hook

#### `useAuth()` - src/lib/auth.tsx

Primary authentication context providing user state and auth operations.

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

// Usage
const { user, signIn, signUp, signOut, loading } = useAuth();
```

**Features:**
- Session validation on mount
- Stale session detection and cleanup
- Integration with `login-with-audit` edge function
- Integration with `signup-with-approval` edge function

### Login State Hook

#### `useLoginState()` - src/components/auth/login/useLoginState.ts

Manages UI state for login form toggles and visibility.

```typescript
interface LoginStateReturn {
  // State
  userType: 'existing' | 'external';
  authType: 'signin' | 'signup';
  isSubmitting: boolean;
  submitSuccess: boolean;
  
  // Actions
  handleUserTypeChange: (type: UserType) => void;
  handleAuthTypeChange: (type: AuthType) => void;
  resetSubmitState: () => void;
  
  // Computed visibility flags
  showAuthToggle: boolean;      // true when userType === 'existing'
  showJiraSection: boolean;     // true when userType === 'existing'
  showSignInForm: boolean;      // existing + signin
  showSignUpForm: boolean;      // existing + signup
  showExternalForm: boolean;    // external
}
```

### Session Persistence Hook

#### `useSessionPersistence` - src/hooks/useSessionPersistence.ts

Manages last visited route for post-login redirect.

```typescript
export function getLastRoute(): string;
export function setLastRoute(route: string): void;
export function clearLastRoute(): void;
```

---

## Components

### File Structure

```
src/components/auth/login/
├── index.tsx              # CatalystLoginPage (main export)
├── constants.ts           # Colors, feature widgets, welcome content
├── useLoginState.ts       # Login state management hook
├── login-styles.css       # Complete CSS stylesheet
│
├── LoginHeroPanel.tsx     # Left panel - dark theme
├── LoginFormPanel.tsx     # Right panel - light theme
│
├── AuthToggle.tsx         # Sign In / Sign Up toggle
├── UserTypeToggle.tsx     # Existing / External toggle
├── WelcomeSection.tsx     # Dynamic welcome message
│
├── LoginSignInForm.tsx    # Sign in form (email/password)
├── LoginSignUpForm.tsx    # Sign up form (name/email/password)
├── LoginExternalForm.tsx  # External user form
│
├── LoginInput.tsx         # Styled text input
├── LoginCheckbox.tsx      # Styled checkbox
├── LoginButton.tsx        # Styled button with variants
│
├── LoginLogo.tsx          # Catalyst logo with tagline
├── JiraBadge.tsx          # JIRA integration badge
├── SecurityBadge.tsx      # Enterprise secured badge
│
├── Headline.tsx           # Animated headline
├── VisionBadge.tsx        # "Enterprise Excellence" badge
├── FeatureGrid.tsx        # 2x3 feature widget grid
├── FeatureWidget.tsx      # Individual feature card
└── GeometricCanvas.tsx    # Animated geometric pattern
```

### Component Hierarchy

```tsx
<CatalystLoginPage>
  ├── <LoginHeroPanel aria-hidden="true">
  │   ├── <GeometricCanvas />
  │   ├── <VisionBadge />
  │   ├── <Headline />
  │   └── <FeatureGrid>
  │       └── <FeatureWidget /> × 6
  │
  └── <LoginFormPanel id="main-form">
      ├── Logo Section
      ├── <UserTypeToggle />
      ├── <AuthToggle /> (conditional)
      ├── <WelcomeSection />
      ├── Sign In Form (conditional)
      ├── Sign Up Form (conditional)
      ├── External Form (conditional)
      ├── <JiraBadge /> (conditional)
      └── <SecurityBadge />
</CatalystLoginPage>
```

---

## Design System

### Color Tokens

```typescript
// src/components/auth/login/constants.ts
export const loginColors = {
  // Primary Action - Blue (ALL interactive elements)
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#3b82f6',
  primaryLighter: '#60a5fa',
  focusRing: 'rgba(37, 99, 235, 0.5)',

  // Brand Accent - Gold (ONLY for logo, headlines, decorative)
  brand: '#c69c6d',
  brandLight: '#d4b896',
  champagne: '#d4b896',

  // Success - Teal
  success: '#0d9488',
  successLight: '#2dd4bf',

  // Text Colors (WCAG AA Compliant)
  textPrimary: '#ffffff',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',

  // Surfaces
  surfaceDark: '#0f1115',
  surfaceCard: 'rgba(255, 255, 255, 0.03)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',

  // Hero Panel Background
  heroDark: '#070a0f',
  heroMid: '#0d1117',
};
```

### Feature Widgets Configuration

```typescript
export const featureWidgets = [
  {
    title: 'Portfolio Management',
    description: 'Strategic oversight & program alignment',
    icon: 'LayoutGrid',
    bgGradient: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0.12) 100%)',
    iconColor: '#60a5fa',
  },
  {
    title: 'Dependency Management',
    description: 'Cross-team visibility & risk mitigation',
    icon: 'Share2',
    bgGradient: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(13, 148, 136, 0.12) 100%)',
    iconColor: '#2dd4bf',
  },
  // ... 4 more widgets
];
```

### Welcome Content

```typescript
export const welcomeContent = {
  existing: {
    signin: {
      title: 'Welcome back',
      subtitle: 'Enter your credentials to access your account',
    },
    signup: {
      title: 'Create an account',
      subtitle: 'Fill in your details to get started',
    },
  },
  external: {
    title: 'Submit a Request',
    subtitle: 'Log your business demand without an account',
  },
};
```

### Typography

| Element | Size | Weight | Font Family |
|---------|------|--------|-------------|
| Logo | 2.125rem | 800 | Plus Jakarta Sans |
| Headline | clamp(2.5rem, 4vw, 3.25rem) | 800 | Plus Jakarta Sans |
| Welcome Title | 1.375rem | 700 | Plus Jakarta Sans |
| Form Label | 0.8125rem | 600 | Plus Jakarta Sans |
| Form Input | 0.9375rem | 400 | Plus Jakarta Sans |
| Button | 0.9375rem | 700 | Plus Jakarta Sans |

---

## CSS Architecture

### CSS Variables (login-styles.css)

```css
:root {
  /* Primary Action */
  --login-primary: #2563eb;
  --login-primary-hover: #1d4ed8;
  --login-primary-light: #3b82f6;
  --login-focus-ring: rgba(37, 99, 235, 0.5);
  
  /* Brand */
  --login-brand: #2563eb;
  --login-brand-light: #3b82f6;
  --login-champagne: #60a5fa;
  
  /* Success */
  --login-success: #0d9488;
  --login-success-light: #2dd4bf;
  
  /* Hero Panel (Dark) */
  --login-text-primary: #ffffff;
  --login-text-secondary: #d1d5db;
  --login-text-muted: #9ca3af;
  --login-surface-dark: #0f1115;
  --login-surface-card: rgba(255, 255, 255, 0.03);
  --login-border-subtle: rgba(255, 255, 255, 0.08);
  --login-border-medium: rgba(255, 255, 255, 0.15);
  
  /* Form Panel (Light) */
  --login-form-bg: #ffffff;
  --login-form-text-primary: #0f172a;
  --login-form-text-secondary: #475569;
  --login-form-text-muted: #64748b;
  --login-form-surface: #f8fafc;
  --login-form-border: #e2e8f0;
  --login-form-border-hover: #cbd5e1;
}
```

### Layout Structure

```css
.login-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

.hero-panel {
  background: linear-gradient(160deg, #070a0f 0%, #0d1117 40%, #0a0e14 100%);
  padding: 2.5rem 4rem 2.5rem 3.5rem;
}

.form-panel {
  background: var(--login-form-bg);
  padding: 2rem 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Animation Keyframes

```css
/* Badge reveal */
@keyframes badgeReveal {
  to { opacity: 1; transform: translateY(0); }
}

/* Headline reveal */
@keyframes headlineReveal {
  to { opacity: 1; transform: translateY(0) rotateX(0); }
}

/* Shimmer effect */
@keyframes shimmer {
  0%, 100% { background-position: 0% center; }
  50% { background-position: 100% center; }
}

/* Form elements slide up */
@keyframes formSlideUp {
  to { opacity: 1; transform: translateY(0); }
}

/* Dust particles */
@keyframes dustFloat {
  0%, 100% { opacity: 0; transform: translate(0, 0) scale(1); }
  20% { opacity: 0.6; }
  50% { opacity: 0.4; transform: translate(30px, -50px) scale(1.5); }
}
```

### Responsive Breakpoints

```css
@media (max-width: 1100px) {
  .hero-panel { padding: 2rem 2.5rem; }
  .feature-grid { gap: 0.75rem; }
}

@media (max-width: 900px) {
  .login-container { grid-template-columns: 1fr; }
  .hero-panel { display: none; }
  .form-panel { min-height: 100vh; }
}

@media (max-width: 480px) {
  .form-panel { padding: 1.5rem; }
  .form-wrapper { max-width: 100%; }
}
```

### Accessibility

```css
/* Skip Link */
.login-skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--login-primary);
  color: white;
  padding: 8px 16px;
  z-index: 100;
}

.login-skip-link:focus {
  top: 0;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .login-container *,
  .login-container *::before,
  .login-container *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  
  .dust-particle,
  .pattern-canvas {
    display: none !important;
  }
}
```

---

## Authentication Flow

### Sign In Flow

```
┌─────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  User       │───>│ login-with-audit     │───>│ Supabase Auth   │
│  Submits    │    │ (Edge Function)      │    │ signInWithPass  │
│  Form       │    │ - Rate limiting      │    └─────────────────┘
└─────────────┘    │ - Audit logging      │            │
                   │ - Status validation  │            ▼
                   └──────────────────────┘    ┌─────────────────┐
                            │                  │ Check Profile   │
                            │                  │ approval_status │
                            ▼                  └─────────────────┘
                   ┌──────────────────────┐            │
                   │ Response Codes:      │            ▼
                   │ - SUCCESS            │   ┌─────────────────────┐
                   │ - PENDING_APPROVAL   │   │ must_change_password│
                   │ - BLOCKED            │   │ check               │
                   │ - INVALID_CREDS      │   └─────────────────────┘
                   └──────────────────────┘            │
                                                       ▼
                                              ┌─────────────────────┐
                                              │ Redirect to:        │
                                              │ - Force Reset Page  │
                                              │ - Last Route        │
                                              │ - /for-you          │
                                              └─────────────────────┘
```

### Sign Up Flow

```
┌─────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  User       │───>│ signup-with-approval │───>│ Create Auth     │
│  Submits    │    │ (Edge Function)      │    │ User + Profile  │
│  Form       │    │ - Email validation   │    │ (PENDING)       │
└─────────────┘    │ - Duplicate check    │    └─────────────────┘
                   │ - Rate limiting      │            │
                   └──────────────────────┘            ▼
                            │                  ┌─────────────────┐
                            ▼                  │ Show Pending    │
                   ┌──────────────────────┐    │ Message         │
                   │ Response Codes:      │    └─────────────────┘
                   │ - SUCCESS (pending)  │
                   │ - EMAIL_EXISTS_*     │    Admin approves ──>
                   │ - RATE_LIMITED       │    User can sign in
                   └──────────────────────┘
```

### Error Handling

| Code | Message | Action |
|------|---------|--------|
| `PENDING_APPROVAL` | "Your account is pending approval." | Show pending state |
| `BLOCKED` | "Unable to sign in." | Generic block |
| `EMAIL_EXISTS_APPROVED` | "This email is already registered." | Redirect to sign in |
| `EMAIL_EXISTS_PENDING` | "Your registration is pending approval." | Show info |
| `RATE_LIMITED` | "Too many attempts." | Show cooldown |

---

## File Structure

```
src/
├── lib/
│   └── auth.tsx                      # AuthProvider + useAuth hook
│
├── hooks/
│   ├── useAuth.ts                    # Simple auth hook (read-only)
│   └── useSessionPersistence.ts      # Last route persistence
│
├── components/
│   ├── auth/
│   │   ├── login/
│   │   │   ├── index.tsx             # Main page component
│   │   │   ├── constants.ts          # Design tokens & content
│   │   │   ├── useLoginState.ts      # State management
│   │   │   ├── login-styles.css      # Complete stylesheet
│   │   │   ├── LoginHeroPanel.tsx    # Left dark panel
│   │   │   ├── LoginFormPanel.tsx    # Right light panel
│   │   │   ├── GeometricCanvas.tsx   # Animated canvas
│   │   │   └── ... (15 more files)
│   │   │
│   │   ├── ForcePasswordReset.tsx    # First-login reset form
│   │   ├── PasswordInput.tsx         # Password field component
│   │   └── SignInForm.tsx            # Legacy form component
│   │
│   └── ProtectedRoute.tsx            # Auth guard component
│
├── pages/
│   └── Auth.tsx                      # Legacy auth page (deprecated)
│
└── App.tsx                           # Route definitions
```

---

## Edge Functions

### login-with-audit

**Purpose**: Secure sign-in with rate limiting and audit logging

```typescript
// supabase/functions/login-with-audit/index.ts
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  session?: Session;
  error?: string;
  code?: 'SUCCESS' | 'PENDING_APPROVAL' | 'BLOCKED' | 'INVALID_CREDENTIALS';
}
```

### signup-with-approval

**Purpose**: Registration with approval workflow

```typescript
// supabase/functions/signup-with-approval/index.ts
interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
}

interface SignupResponse {
  success: boolean;
  error?: string;
  code?: 'SUCCESS' | 'EMAIL_EXISTS_APPROVED' | 'EMAIL_EXISTS_PENDING' | 'RATE_LIMITED';
}
```

---

## Design Decisions

### Why Split-Screen Layout?
- Enterprise branding opportunity on hero panel
- Clear visual hierarchy separating marketing from action
- Better mobile experience (hero panel hidden)

### Why Light Form Panel?
- Memory directive: Login page enforced to light mode
- Better form readability and accessibility
- Contrast with dark hero creates visual interest

### Why CSS-in-File vs Tailwind?
- Complex animations require keyframe definitions
- Isolation from global styles
- Pixel-perfect control over enterprise design

### Why Edge Functions for Auth?
- Server-side rate limiting
- Secure audit logging
- Approval workflow logic separation
- Protection against client-side tampering

---

## Related Memory Directives

1. **layout/login-light-mode-enforcement**: Form panel always light mode
2. **style/global-light-mode-lock**: App locked to light mode overall
3. **auth/module-access-matrix-enterprise-spec**: Post-login module access

---

*Documentation generated for Catalyst Enterprise v1.0*

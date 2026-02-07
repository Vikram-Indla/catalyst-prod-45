# Catalyst Enterprise Login Page V10

## Technical & Functional Documentation

> **Route**: `/auth` | **Version**: V10 Institutional  
> **Last Updated**: February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Flows](#user-flows)
4. [Component Structure](#component-structure)
5. [State Management](#state-management)
6. [Authentication Logic](#authentication-logic)
7. [Security Features](#security-features)
8. [Styling System](#styling-system)
9. [Accessibility](#accessibility)
10. [API Integration](#api-integration)
11. [Error Handling](#error-handling)

---

## Overview

The Catalyst Enterprise Login Page is a **split-screen authentication interface** designed for enterprise portfolio management applications.

### Supported User Flows

| User Type | Action | Description |
|-----------|--------|-------------|
| **Existing User** | Sign In | Authenticate with email/password |
| **Existing User** | Sign Up | Register for enterprise access (pending approval) |
| **External User** | Submit Request | Log a business demand without an account |

### Design Philosophy

- **Institutional Aesthetic**: Blue gradient hero with Islamic geometric pattern
- **Light Form Panel**: High-contrast form for WCAG AA compliance
- **Enterprise-Grade Security**: Approval workflow, audit logging, rate limiting
- **V10 Typography**: Sora for branding, Inter for UI elements

---

## Architecture

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                      CatalystLoginPage                          │
│                    (src/components/auth/login/index.tsx)        │
├─────────────────────────┬───────────────────────────────────────┤
│   LoginHeroPanel        │         LoginFormPanel                │
│   (Blue/Institutional)  │         (Light/Interactive)           │
│                         │                                       │
│ ┌─────────────────────┐ │ ┌───────────────────────────────────┐ │
│ │ Islamic Geometric   │ │ │ UserTypeToggle                    │ │
│ │ Pattern (SVG)       │ │ │ (Existing / External)             │ │
│ ├─────────────────────┤ │ ├───────────────────────────────────┤ │
│ │ Catalyst Logo       │ │ │ AuthToggle                        │ │
│ │ (100px Hub)         │ │ │ (Sign In / Sign Up)               │ │
│ ├─────────────────────┤ │ ├───────────────────────────────────┤ │
│ │ Wordmark: Catalyst  │ │ │ WelcomeSection                    │ │
│ │ (Sora 800, 3rem)    │ │ │ (Dynamic title/subtitle)          │ │
│ ├─────────────────────┤ │ ├───────────────────────────────────┤ │
│ │ Sub-brand           │ │ │ Form Container                    │ │
│ │ Enterprise PM       │ │ │ - SignIn Form                     │ │
│ ├─────────────────────┤ │ │ - SignUp Form                     │ │
│ │ Tagline             │ │ │ - External Form                   │ │
│ │ Strategic alignment │ │ ├───────────────────────────────────┤ │
│ │ Intelligent delivery│ │ │ JIRA Badge + Security Badge       │ │
│ └─────────────────────┘ │ └───────────────────────────────────┘ │
└─────────────────────────┴───────────────────────────────────────┘
```

### File Structure

```
src/components/auth/login/
├── index.tsx                 # Main page component (CatalystLoginPage)
├── constants.ts              # Colors, feature widgets, content strings
├── useLoginState.ts          # State management hook
├── login-styles.css          # V10 styling system (683 lines)
│
├── LoginHeroPanel.tsx        # Left panel - branding & Islamic pattern
├── LoginFormPanel.tsx        # Right panel - forms & toggles (524 lines)
│
├── LoginSignInForm.tsx       # Sign-in form (legacy/alternative)
├── LoginSignUpForm.tsx       # Sign-up form (legacy/alternative)
├── LoginExternalForm.tsx     # External request form
│
├── UserTypeToggle.tsx        # Existing/External toggle (animated pill)
├── AuthToggle.tsx            # Sign In/Sign Up toggle
├── WelcomeSection.tsx        # Dynamic headline component
│
├── LoginInput.tsx            # Input field component
├── LoginCheckbox.tsx         # Checkbox component
├── LoginButton.tsx           # Submit button component
│
├── FeatureGrid.tsx           # Feature widgets display
├── FeatureWidget.tsx         # Individual feature card
├── JiraBadge.tsx             # JIRA integration badge
├── SecurityBadge.tsx         # Security indicator
├── VisionBadge.tsx           # Vision statement
└── GeometricCanvas.tsx       # Canvas-based pattern (alternative)
```

### Dependency Graph

```
CatalystLoginPage
├── useAuth (lib/auth.tsx)
├── useLoginState (local hook)
├── useSessionPersistence (hooks/)
├── ForcePasswordReset (auth/)
│
├── LoginHeroPanel
│   ├── CatalystLogo (inline SVG)
│   └── IslamicPattern (inline SVG)
│
└── LoginFormPanel
    ├── Icons (inline SVG set)
    ├── Toggle Groups
    ├── WelcomeSection (inline)
    ├── SignInForm (inline)
    ├── SignUpForm (inline)
    ├── ExternalForm (inline)
    └── Success/Error States
```

---

## User Flows

### Flow 1: Existing User Sign In

```
┌──────────────────┐
│ Load /auth       │
└────────┬─────────┘
         ▼
┌──────────────────┐    Yes    ┌────────────────────────┐
│ User already     ├──────────►│ Check must_change_     │
│ authenticated?   │           │ password flag          │
└────────┬─────────┘           └──────────┬─────────────┘
         │ No                             │
         ▼                                ▼
┌──────────────────┐           ┌────────────────────────┐
│ Show Sign In     │           │ Password reset needed? │
│ Form             │           └────┬─────────┬─────────┘
└────────┬─────────┘                │ Yes     │ No
         │                          ▼         ▼
         │            ┌─────────────────┐  ┌────────────────┐
         │            │ Force Password  │  │ Check approval │
         │            │ Reset Screen    │  │ status         │
         │            └─────────────────┘  └────┬───────────┘
         ▼                                      │
┌──────────────────┐                           ▼
│ Enter email &    │           ┌────────────────────────────┐
│ password         │           │ APPROVED → Redirect to app │
└────────┬─────────┘           │ PENDING → Show message     │
         │                     │ REJECTED → Show error      │
         ▼                     └────────────────────────────┘
┌──────────────────┐
│ Submit form      │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Success    Error
    │         │
    ▼         ▼
 Redirect   Show error message
```

### Flow 2: Existing User Sign Up

```
┌─────────────────────┐
│ Toggle to Sign Up   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Enter name, email,  │
│ password, confirm   │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Submit registration │
└──────────┬──────────┘
           │
   ┌───────┴───────┐
   ▼               ▼
Success          Error
   │               │
   ▼               ▼
┌─────────────┐  ┌─────────────────────────────────┐
│ Show pending│  │ EMAIL_EXISTS_APPROVED →         │
│ message     │  │   "Already registered"          │
└─────────────┘  │ EMAIL_EXISTS_PENDING →          │
                 │   "Pending approval"            │
                 │ RATE_LIMITED →                  │
                 │   "Too many attempts"           │
                 │ ACCOUNT_DISABLED →              │
                 │   "Contact support"             │
                 └─────────────────────────────────┘
```

### Flow 3: External User Request

```
┌─────────────────────┐
│ Toggle to External  │
│ User                │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Show request info   │
│ "No account needed" │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Click "Log Demand   │
│ Request"            │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Navigate to         │
│ /submit-request     │
└─────────────────────┘
```

---

## Component Structure

### CatalystLoginPage (index.tsx)

**Purpose**: Main orchestrator handling authentication state and routing.

**Key Responsibilities**:
- Session management via `useAuth` context
- Password reset detection (`must_change_password` flag)
- Approval status verification (`PENDING`, `APPROVED`, `REJECTED`)
- Route persistence (`catalyst_last_route`)
- Loading/transition states
- Error message display

**State Variables**:
```typescript
const [isLoading, setIsLoading] = useState(false);           // Form submission
const [loginError, setLoginError] = useState<string | null>(); // Error display
const [mustChangePassword, setMustChangePassword] = useState(false);
const [currentUserId, setCurrentUserId] = useState<string | null>();
const [showPendingMessage, setShowPendingMessage] = useState(false);
const [isTransitioning, setIsTransitioning] = useState(false);
```

**Render States**:
1. **Transitioning/Loading**: Spinner with "Signing you in..."
2. **Pending Message**: Registration submitted confirmation
3. **Force Password Reset**: Password change form
4. **Normal**: Split-screen with hero + form panels

---

### LoginHeroPanel

**Purpose**: Left-side branding panel with institutional design.

**Visual Elements**:

| Element | Specification |
|---------|---------------|
| Background | Blue gradient (175°): `#1d4ed8 → #2563eb → #1e40af` |
| Pattern | Islamic 8-point star tessellation (SVG pattern) |
| Logo | Catalyst Convergence Hub - 100px white SVG |
| Wordmark | "Catalyst" - Sora 800, 3rem, white |
| Sub-brand | "Enterprise Portfolio Management" - uppercase, 0.72rem, 70% opacity |
| Rule | 48px horizontal line, 35% white gradient |
| Tagline | "Strategic alignment. Intelligent delivery." - 1.15rem, 85% opacity |
| Footer | Copyright with 2px decorative line |

**Pattern Structure**:
```typescript
// Islamic Geometric Pattern - 8-point star tessellation
const s = 60; // cell size
const h = s / 2;
const q = s / 4;

// Star path
d={`M ${h} 0 L ${h+q} ${q} L ${s} ${h} L ${h+q} ${h+q} L ${h} ${s} L ${q} ${h+q} L 0 ${h} L ${q} ${q} Z`}

// Inner diamond
d={`M ${h} ${q} L ${h+q} ${h} L ${h} ${h+q} L ${q} ${h} Z`}
```

---

### LoginFormPanel

**Purpose**: Right-side form container with all authentication forms.

**Props Interface**:
```typescript
interface LoginFormPanelProps {
  userType: 'existing' | 'external';
  authType: 'signin' | 'signup';
  onUserTypeChange: (type: UserType) => void;
  onAuthTypeChange: (type: AuthType) => void;
  onSignIn: (email: string, password: string, rememberMe: boolean) => Promise<{ error?: Error | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error?: Error | null }>;
  onExternalSubmit: () => void;
  loading: boolean;
  error?: string | null;
}
```

**Form States**:
```typescript
// Sign In
const [signinEmail, setSigninEmail] = useState('');
const [signinPassword, setSigninPassword] = useState('');
const [showSigninPassword, setShowSigninPassword] = useState(false);
const [rememberMe, setRememberMe] = useState(false);

// Sign Up
const [signupFullName, setSignupFullName] = useState('');
const [signupEmail, setSignupEmail] = useState('');
const [signupPassword, setSignupPassword] = useState('');
const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
const [showSignupPassword, setShowSignupPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

// External
const [externalName, setExternalName] = useState('');
const [externalEmail, setExternalEmail] = useState('');
const [externalOrg, setExternalOrg] = useState('');
const [externalDesc, setExternalDesc] = useState('');
```

**Visibility Rules**:
```typescript
const showAuthToggle = userType === 'existing';
const showJiraSection = userType === 'existing';
const showSignIn = userType === 'existing' && authType === 'signin';
const showSignUp = userType === 'existing' && authType === 'signup';
const showExternal = userType === 'external';
```

---

## State Management

### useLoginState Hook

**Location**: `src/components/auth/login/useLoginState.ts`

**Purpose**: Centralized state for user type and auth type toggles.

```typescript
export function useLoginState() {
  const [userType, setUserType] = useState<UserType>('existing');
  const [authType, setAuthType] = useState<AuthType>('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleUserTypeChange = useCallback((type: UserType) => {
    setUserType(type);
    setSubmitSuccess(false);
  }, []);

  const handleAuthTypeChange = useCallback((type: AuthType) => {
    setAuthType(type);
    setSubmitSuccess(false);
  }, []);

  // Visibility rules
  const showAuthToggle = userType === 'existing';
  const showJiraSection = userType === 'existing';
  const showSignInForm = userType === 'existing' && authType === 'signin';
  const showSignUpForm = userType === 'existing' && authType === 'signup';
  const showExternalForm = userType === 'external';

  return { /* all state and handlers */ };
}
```

### Session Persistence

**Key**: `catalyst_last_route`  
**Purpose**: Remember user's intended destination before auth redirect

```typescript
// On successful auth
const lastRoute = getLastRoute();
navigate(lastRoute, { replace: true });
clearLastRoute();
```

### Remember Me

**Key**: `catalyst_remembered_email`  
**Purpose**: Persist email for returning users

```typescript
// On mount
useEffect(() => {
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
  if (rememberedEmail) {
    setSigninEmail(rememberedEmail);
    setRememberMe(true);
  }
}, []);

// On successful sign in
if (rememberMe) {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, signinEmail);
} else {
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
```

---

## Authentication Logic

### Auth Context (lib/auth.tsx)

**Purpose**: React Context providing authentication methods.

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}
```

### Sign In Implementation

```typescript
const signIn = async (email: string, password: string) => {
  // Uses secure edge function with rate limiting and audit logging
  const { data, error } = await supabase.functions.invoke('login-with-audit', {
    body: { email: email.toLowerCase().trim(), password },
  });

  // Handle response codes
  if (data?.code === 'PENDING_APPROVAL') {
    return { error: { message: data.error }, isPending: true };
  }
  
  if (data?.code === 'BLOCKED') {
    return { error: { message: data.error }, isBlocked: true };
  }

  // Set session on success
  if (data.session) {
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }
  
  return { error: null };
};
```

### Sign Up Implementation

```typescript
const signUp = async (email: string, password: string, fullName?: string) => {
  // Direct fetch to edge function for approval workflow
  const response = await fetch(`${supabaseUrl}/functions/v1/signup-with-approval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName || email,
    }),
  });

  const data = await response.json();

  if (data?.success === true) {
    // Sign out immediately - user must wait for approval
    await supabase.auth.signOut();
    return { error: null, isPending: true };
  }

  return { error: { message: data.error, code: data.code }, code: data.code };
};
```

### Profile Status Check

```typescript
const checkMustChangePassword = async (userId: string): Promise<boolean> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password, approval_status')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.approval_status !== 'APPROVED') {
    return false;
  }

  return profile.must_change_password === true;
};
```

---

## Security Features

### Rate Limiting
- Implemented in edge functions (`login-with-audit`, `signup-with-approval`)
- Returns `RATE_LIMITED` code on excessive attempts

### Audit Logging
- All sign-in attempts logged via `login-with-audit` edge function
- Tracks: email, timestamp, IP, success/failure

### Approval Workflow
- New registrations default to `PENDING` status
- Admin must approve in User Management module
- Rejected users have cooldown period before re-registration

### Password Security
- Minimum 8 characters (client-side validation)
- Force password reset flag for admin-created accounts
- Passwords never stored in localStorage

### Session Validation
```typescript
// Verify session is still valid by checking with the server
const { data: { user }, error: userError } = await supabase.auth.getUser();

if (userError || !user) {
  // Session is stale - clear it
  console.warn('Stale session detected, clearing...');
  await supabase.auth.signOut();
}
```

---

## Styling System

### CSS Variables (login-styles.css)

```css
:root {
  /* Primary Action - Blue */
  --login-primary: #2563eb;
  --login-primary-hover: #1d4ed8;
  --login-primary-deep: #1e40af;
  --login-focus-ring: rgba(37, 99, 235, 0.18);
  
  /* Success - Teal */
  --login-success: #0d7377;
  
  /* Text Colors - Form Panel */
  --login-text-dark: #0f172a;
  --login-text-secondary: #334155;
  --login-text-muted: #64748b;
  --login-text-faint: #94a3b8;
  
  /* Form Surface */
  --login-form-surface: #f8fafc;
  --login-form-border: #e2e8f0;
}
```

### Layout Grid

```css
.login-container {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 50/50 split */
  min-height: 100vh;
  font-family: 'Sora', 'Plus Jakarta Sans', -apple-system, sans-serif;
  background: #fff;
}
```

### Hero Panel Styling

```css
.hero-panel-v10 {
  position: relative;
  background: linear-gradient(175deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 3rem 3rem 4.5rem;
  text-align: center;
}

.hero-wordmark {
  font-family: 'Sora', sans-serif;
  font-size: 3rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
}

.hero-tagline {
  font-family: 'Sora', sans-serif;
  font-size: 1.15rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.7;
}
```

### Typography Specifications

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Hero Wordmark | Sora | 3rem | 800 |
| Hero Sub-brand | Sora | 0.72rem | 500 |
| Hero Tagline | Sora | 1.15rem | 400 |
| Welcome Title | Sora | 1.35rem | 700 |
| Welcome Subtitle | Inherit | 0.84rem | 400 |
| Input Labels | Inherit | 0.8rem | 600 |
| Input Fields | Inherit | 0.9rem | 400 |
| Submit Button | Inherit | 0.9rem | 650 |
| Toggle Buttons | Inherit | 0.84rem | 500/600 |

### Animation Keyframes

```css
@keyframes heroFadeIn {
  to { opacity: 1; }
}

@keyframes formReveal {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Form Input Styling

```css
.input-field-v10 {
  width: 100%;
  padding: 12px 13px 12px 42px;
  font-size: 0.9rem;
  color: var(--login-text-dark);
  background: #fff;
  border: 1.5px solid var(--login-form-border);
  border-radius: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-field-v10:focus {
  border-color: var(--login-primary);
  box-shadow: 0 0 0 3px var(--login-focus-ring);
}
```

### Submit Button

```css
.submit-btn-v10 {
  width: 100%;
  padding: 13px 24px;
  font-size: 0.9rem;
  font-weight: 650;
  color: #fff;
  background: linear-gradient(135deg, var(--login-primary), var(--login-primary-hover));
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.18);
}

.submit-btn-v10:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--login-primary-hover), var(--login-primary-deep));
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
}
```

---

## Accessibility

### Skip Link

```html
<a href="#main-form" className="login-skip-link">Skip to login form</a>
```

### ARIA Attributes

| Element | Attribute | Purpose |
|---------|-----------|---------|
| Toggle groups | `role="tablist"` | Announce as tab interface |
| Toggle buttons | `role="tab"`, `aria-selected` | Tab selection state |
| Form panel | `id="main-form"` | Skip link target |
| Error messages | `role="alert"` | Announce errors |
| Password toggles | `aria-label` | Describe action |
| Hero panel | `aria-hidden="true"` | Hide decorative content |

### Screen Reader Support

```tsx
<h2 id="signin-heading" className="sr-only">Sign in form</h2>
```

### Reduced Motion

```typescript
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Disable animations when user prefers reduced motion
transition={{ 
  duration: prefersReducedMotion ? 0.01 : 0.5, 
  delay: prefersReducedMotion ? 0 : delay 
}}
```

### Focus Management

- All interactive elements focusable
- Tab order follows visual layout
- Focus rings on all inputs (3px blue ring)
- Password visibility toggle accessible

---

## API Integration

### Edge Functions Used

| Function | Purpose | Method |
|----------|---------|--------|
| `login-with-audit` | Secure sign-in with rate limiting and audit logging | `supabase.functions.invoke()` |
| `signup-with-approval` | Registration with approval workflow | Direct `fetch()` |

### Database Tables

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase auth (managed) |
| `profiles` | User profile data, approval status, password reset flag |

### Profile Schema (relevant fields)

```sql
profiles (
  id UUID PRIMARY KEY,              -- Links to auth.users
  full_name TEXT,
  email TEXT,
  approval_status TEXT,             -- PENDING | APPROVED | REJECTED
  must_change_password BOOLEAN,     -- Force password reset
  is_enabled BOOLEAN,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## Error Handling

### Error Messages Map

| Code | Message | Context |
|------|---------|---------|
| `EMAIL_EXISTS_APPROVED` | "This email is already registered. Please sign in." | Sign up |
| `EMAIL_EXISTS_PENDING` | "Your registration is pending approval." | Sign up |
| `EMAIL_EXISTS_REJECTED_COOLDOWN` | "Your request was rejected. Please try again later." | Sign up |
| `ACCOUNT_DISABLED` | "This account has been disabled. Please contact support." | Sign up |
| `RATE_LIMITED` | "Too many attempts. Please try again later." | Sign in/up |
| `PENDING_APPROVAL` | "Your account is pending approval." | Sign in |
| `BLOCKED` | "Unable to sign in." | Sign in |
| `PARSE_ERROR` | "Something went wrong. Please try again." | Network |
| `SERVER_ERROR` | "Something went wrong. Please try again." | 5xx response |
| Default | "The email or password you entered is incorrect." | Sign in |

### Error Display

```css
.error-message-v10 {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
}
```

---

## Responsive Behavior

### Breakpoints (recommended)

```css
/* Tablet: Reduce padding */
@media (max-width: 1100px) {
  .hero-panel-v10 { padding: 2rem 2.5rem; }
}

/* Mobile: Stack panels vertically */
@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
  }
  .hero-panel-v10 {
    display: none; /* or min-height: 35vh */
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .form-panel-v10 { padding: 1.5rem; }
}
```

**Note**: Current implementation is desktop-first.

---

## Constants Reference

### Color Tokens (constants.ts)

```typescript
export const loginColors = {
  // Primary Action - Blue (ALL interactive elements)
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryDeep: '#1e40af',
  primaryLight: '#3b82f6',
  primaryLighter: '#60a5fa',
  focusRing: 'rgba(37, 99, 235, 0.18)',

  // Brand Accent - Gold (ONLY for logo, headlines, decorative)
  brand: '#c69c6d',
  brandLight: '#d4b896',
  champagne: '#d4b896',

  // Success - Teal
  success: '#0d7377',
  successLight: '#2dd4bf',

  // Text Colors (WCAG AA Compliant)
  textPrimary: '#ffffff',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  
  // Text Colors - Form Panel
  textDark: '#0f172a',
  textFaint: '#94a3b8',

  // Surfaces
  surfaceDark: '#0f1115',
  surfaceCard: 'rgba(255, 255, 255, 0.03)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderMedium: 'rgba(255, 255, 255, 0.15)',

  // Form Surface
  formSurface: '#f8fafc',
  formBorder: '#e2e8f0',

  // Hero Panel Background
  heroDark: '#070a0f',
  heroMid: '#0d1117',
};
```

### Welcome Content

```typescript
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
};
```

### Feature Widgets

```typescript
export const featureWidgets = [
  { title: 'Portfolio Management', description: 'Strategic oversight & program alignment', icon: 'LayoutGrid' },
  { title: 'Dependency Management', description: 'Cross-team visibility & risk mitigation', icon: 'Share2' },
  { title: 'Capacity Planning', description: 'Resource optimization & forecasting', icon: 'Users' },
  { title: 'Product Management', description: 'Roadmap & feature prioritization', icon: 'PieChart' },
  { title: 'AI Use Cases', description: 'Intelligent automation & insights', icon: 'Sparkles' },
  { title: 'Release Schedule', description: 'Predictable & coordinated delivery', icon: 'Calendar' },
];
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V10 | Feb 2026 | Islamic geometric pattern, institutional blue theme, split-screen layout, Sora typography |
| V9 | 2024 | Dark theme with gold accents |
| V8 | 2024 | Feature widget grid |

---

*Documentation for Catalyst Enterprise Portfolio Management System*  
*Route: /auth | Component: CatalystLoginPage*

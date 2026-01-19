# Catalyst Sidebar Component — Platform-Wide Specification

> **Version:** 1.0  
> **Component:** Global Navigation Sidebar  
> **Platform:** Catalyst — Saudi Ministry of Industry  
> **Design System:** Catalyst V5

---

## 1. Overview

The Catalyst Sidebar is the primary navigation component used across all modules. It provides contextual navigation based on the current section (Releases, Testing, Strategy, etc.) while maintaining a consistent visual language and interaction pattern.

---

## 2. Visual Design Tokens

### 2.1 Colors

```css
/* Sidebar Color Palette */
--sidebar-bg: #1e293b;              /* slate-800 - Main background */
--sidebar-bg-hover: #334155;         /* slate-700 - Hover state */
--sidebar-bg-active: #3b82f6;        /* blue-500 - Active item accent */
--sidebar-bg-active-subtle: rgba(59, 130, 246, 0.15); /* Active background */
--sidebar-text: #94a3b8;             /* slate-400 - Default text */
--sidebar-text-hover: #e2e8f0;       /* slate-200 - Hover text */
--sidebar-text-active: #ffffff;      /* white - Active text */
--sidebar-border: #334155;           /* slate-700 - Dividers */
--sidebar-section-text: #64748b;     /* slate-500 - Section headers */

/* Badge Colors */
--badge-primary: #2563eb;            /* Primary blue */
--badge-danger: #ef4444;             /* Red for alerts */
--badge-warning: #d97706;            /* Amber for warnings */
--badge-success: #0d9488;            /* Teal for success */
```

### 2.2 Typography

```css
/* Font Family - MUST match entire platform */
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--sidebar-font-context: 14px;        /* Context label (e.g., "Releases") */
--sidebar-font-section: 11px;        /* Section headers (uppercase) */
--sidebar-font-item: 14px;           /* Navigation items */
--sidebar-font-badge: 11px;          /* Badge numbers */

/* Font Weights */
--sidebar-weight-normal: 400;
--sidebar-weight-medium: 500;
--sidebar-weight-semibold: 600;

/* Letter Spacing */
--sidebar-section-tracking: 0.05em;  /* Section headers uppercase tracking */
```

### 2.3 Spacing

```css
/* Sidebar Dimensions */
--sidebar-width-expanded: 240px;     /* 15rem / w-60 */
--sidebar-width-collapsed: 64px;     /* 4rem / w-16 */
--sidebar-header-height: 56px;       /* 3.5rem / h-14 */

/* Internal Spacing */
--sidebar-padding-x: 12px;           /* Horizontal padding */
--sidebar-padding-y: 16px;           /* Vertical section padding */
--sidebar-item-padding-x: 12px;      /* Nav item horizontal */
--sidebar-item-padding-y: 8px;       /* Nav item vertical */
--sidebar-item-gap: 12px;            /* Icon to text gap */
--sidebar-section-gap: 24px;         /* Between sections */
--sidebar-icon-size: 20px;           /* Icon dimensions */
```

### 2.4 Border Radius

```css
--sidebar-radius-item: 8px;          /* Nav items */
--sidebar-radius-badge: 9999px;      /* Pill badges (full round) */
--sidebar-radius-context: 6px;       /* Context icon */
```

---

## 3. Component Structure

### 3.1 HTML Structure

```html
<aside id="catalyst-sidebar" class="catalyst-sidebar" data-collapsed="false">
  
  <!-- Sidebar Header -->
  <div class="sidebar-header">
    <div class="sidebar-context">
      <div class="context-icon" style="background-color: var(--context-color)">
        <!-- 2-letter abbreviation -->
        <span>RL</span>
      </div>
      <span class="context-label">Releases</span>
    </div>
    <button class="sidebar-collapse-btn" aria-label="Collapse sidebar">
      <svg><!-- Collapse icon --></svg>
    </button>
  </div>
  
  <!-- Sidebar Navigation -->
  <nav class="sidebar-nav">
    
    <!-- Section -->
    <div class="nav-section">
      <div class="section-header">Dashboards</div>
      
      <!-- Nav Item - Standard -->
      <a href="/releases/command-center" class="nav-item">
        <svg class="nav-icon"><!-- Icon --></svg>
        <span class="nav-label">Command Center</span>
      </a>
      
      <!-- Nav Item - With Badge -->
      <a href="/releases/my-scope" class="nav-item">
        <svg class="nav-icon"><!-- Icon --></svg>
        <span class="nav-label">My Test Scope</span>
        <span class="nav-badge nav-badge--primary">5</span>
      </a>
      
      <!-- Nav Item - Active -->
      <a href="/releases/compare" class="nav-item nav-item--active">
        <svg class="nav-icon"><!-- Icon --></svg>
        <span class="nav-label">Release Compare</span>
      </a>
      
    </div>
    
  </nav>
  
</aside>
```

### 3.2 React Component Structure

```tsx
// CatalystSidebar.tsx
interface SidebarProps {
  context: SidebarContext;
  sections: SidebarSection[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface SidebarContext {
  id: string;           // e.g., "releases", "testing", "strategy"
  label: string;        // e.g., "Releases"
  abbreviation: string; // e.g., "RL"
  color: string;        // e.g., "#2563eb"
}

interface SidebarSection {
  id: string;
  label: string;        // Section header text
  items: SidebarItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: {
    count: number;
    variant: 'primary' | 'danger' | 'warning' | 'success';
  };
  isActive?: boolean;
}
```

---

## 4. Contexts & Configurations

### 4.1 Available Contexts

| Context | Abbreviation | Color | Primary Sections |
|---------|--------------|-------|------------------|
| **Releases** | RL | `#2563eb` (blue) | Dashboards, Releases, Test Planning, Analytics & AI |
| **Testing** | TS | `#0d9488` (teal) | Test Suites, Execution, Reports, Configuration |
| **Strategy** | ST | `#7c3aed` (violet) | OKRs, Initiatives, Roadmaps, Portfolios |
| **Operations** | OP | `#d97706` (amber) | Deployments, Environments, Monitoring, Incidents |
| **Planner** | PL | `#0891b2` (cyan) | Sprints, Backlog, Capacity, Timeline |
| **Admin** | AD | `#64748b` (slate) | Users, Roles, Settings, Audit Log |

### 4.2 Releases Context Configuration

```typescript
const releasesContext: SidebarContext = {
  id: 'releases',
  label: 'Releases',
  abbreviation: 'RL',
  color: '#2563eb'
};

const releasesSections: SidebarSection[] = [
  {
    id: 'dashboards',
    label: 'Dashboards',
    items: [
      { id: 'command-center', label: 'Command Center', href: '/releases/command-center', icon: <CommandCenterIcon /> },
      { id: 'release-dashboard', label: 'Release Dashboard', href: '/releases/dashboard', icon: <DashboardIcon /> },
      { id: 'my-test-scope', label: 'My Test Scope', href: '/releases/my-scope', icon: <ScopeIcon />, badge: { count: 5, variant: 'primary' } },
    ]
  },
  {
    id: 'releases',
    label: 'Releases',
    items: [
      { id: 'all-releases', label: 'All Releases', href: '/releases', icon: <ReleasesIcon /> },
      { id: 'calendar-view', label: 'Calendar View', href: '/releases/calendar', icon: <CalendarIcon /> },
      { id: 'release-compare', label: 'Release Compare', href: '/releases/compare', icon: <CompareIcon /> },
    ]
  },
  {
    id: 'test-planning',
    label: 'Test Planning',
    items: [
      { id: 'test-plans', label: 'Test Plans', href: '/tests/plans', icon: <TestPlanIcon /> },
      { id: 'test-cases', label: 'Test Cases', href: '/tests/cases', icon: <TestCaseIcon /> },
      { id: 'test-cycles', label: 'Test Cycles', href: '/tests/cycles', icon: <CycleIcon /> },
      { id: 'test-execution', label: 'Test Execution', href: '/tests/execution', icon: <ExecutionIcon /> },
      { id: 'defects', label: 'Defects', href: '/defects', icon: <DefectIcon />, badge: { count: 8, variant: 'danger' } },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics & AI',
    items: [
      { id: 'ask-ai', label: 'Ask AI', href: '/ai/ask', icon: <AIIcon /> },
      { id: 'coverage-reports', label: 'Coverage Reports', href: '/reports/coverage', icon: <CoverageIcon /> },
      { id: 'quality-gates', label: 'Quality Gates', href: '/quality/gates', icon: <QualityGateIcon /> },
      { id: 'rtm', label: 'RTM', href: '/reports/rtm', icon: <RTMIcon /> },
    ]
  }
];
```

---

## 5. CSS Implementation

### 5.1 Base Styles

```css
/* ========================================
   CATALYST SIDEBAR - BASE STYLES
   ======================================== */

.catalyst-sidebar {
  width: var(--sidebar-width-expanded);
  height: 100vh;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Collapsed State */
.catalyst-sidebar[data-collapsed="true"] {
  width: var(--sidebar-width-collapsed);
}

.catalyst-sidebar[data-collapsed="true"] .nav-label,
.catalyst-sidebar[data-collapsed="true"] .section-header,
.catalyst-sidebar[data-collapsed="true"] .context-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.catalyst-sidebar[data-collapsed="true"] .nav-item {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.catalyst-sidebar[data-collapsed="true"] .nav-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  font-size: 10px;
}
```

### 5.2 Header Styles

```css
/* ========================================
   SIDEBAR HEADER
   ======================================== */

.sidebar-header {
  height: var(--sidebar-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sidebar-padding-x);
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}

.sidebar-context {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.context-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--sidebar-radius-context);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  font-weight: var(--sidebar-weight-semibold);
  flex-shrink: 0;
}

.context-label {
  font-size: var(--sidebar-font-context);
  font-weight: var(--sidebar-weight-medium);
  color: var(--sidebar-text-active);
  white-space: nowrap;
  transition: opacity 0.2s, width 0.2s;
}

.sidebar-collapse-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--sidebar-text);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.sidebar-collapse-btn:hover {
  background-color: var(--sidebar-bg-hover);
  color: var(--sidebar-text-hover);
}

.sidebar-collapse-btn svg {
  width: 20px;
  height: 20px;
}
```

### 5.3 Navigation Styles

```css
/* ========================================
   SIDEBAR NAVIGATION
   ======================================== */

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--sidebar-padding-y) var(--sidebar-padding-x);
}

/* Custom Scrollbar */
.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background-color: var(--sidebar-border);
  border-radius: 3px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background-color: var(--sidebar-text);
}

/* Section */
.nav-section {
  margin-bottom: var(--sidebar-section-gap);
}

.nav-section:last-child {
  margin-bottom: 0;
}

.section-header {
  font-size: var(--sidebar-font-section);
  font-weight: var(--sidebar-weight-medium);
  color: var(--sidebar-section-text);
  text-transform: uppercase;
  letter-spacing: var(--sidebar-section-tracking);
  padding: 0 var(--sidebar-item-padding-x);
  margin-bottom: 8px;
  white-space: nowrap;
  transition: opacity 0.2s, width 0.2s;
}

/* Nav Item */
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--sidebar-item-gap);
  padding: var(--sidebar-item-padding-y) var(--sidebar-item-padding-x);
  border-radius: var(--sidebar-radius-item);
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: var(--sidebar-font-item);
  font-weight: var(--sidebar-weight-normal);
  transition: background-color 0.15s, color 0.15s, padding-left 0.15s;
  position: relative;
  cursor: pointer;
}

.nav-item:hover {
  background-color: var(--sidebar-bg-hover);
  color: var(--sidebar-text-hover);
  padding-left: calc(var(--sidebar-item-padding-x) + 4px);
}

.nav-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sidebar-bg-active);
}

/* Nav Item - Active State */
.nav-item--active {
  background: linear-gradient(90deg, var(--sidebar-bg-active) 0%, var(--sidebar-bg-active-subtle) 100%);
  color: var(--sidebar-text-active);
  font-weight: var(--sidebar-weight-medium);
}

.nav-item--active:hover {
  padding-left: var(--sidebar-item-padding-x); /* Don't shift active item */
}

/* Nav Icon */
.nav-icon {
  width: var(--sidebar-icon-size);
  height: var(--sidebar-icon-size);
  flex-shrink: 0;
}

/* Nav Label */
.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.2s, width 0.2s;
}

/* Nav Badge */
.nav-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--sidebar-radius-badge);
  font-size: var(--sidebar-font-badge);
  font-weight: var(--sidebar-weight-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.nav-badge--primary {
  background-color: var(--badge-primary);
  color: white;
}

.nav-badge--danger {
  background-color: var(--badge-danger);
  color: white;
}

.nav-badge--warning {
  background-color: var(--badge-warning);
  color: white;
}

.nav-badge--success {
  background-color: var(--badge-success);
  color: white;
}
```

---

## 6. Tailwind CSS Implementation

### 6.1 Utility Classes

```html
<!-- Sidebar Container -->
<aside class="w-60 h-screen bg-slate-800 flex flex-col flex-shrink-0 transition-all duration-300">

  <!-- Header -->
  <div class="h-14 flex items-center justify-between px-3 border-b border-slate-700">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">RL</div>
      <span class="text-white font-medium text-sm">Releases</span>
    </div>
    <button class="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
      </svg>
    </button>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 scrollbar-thin">
    
    <!-- Section -->
    <div class="mb-6">
      <div class="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-2">Dashboards</div>
      
      <!-- Standard Item -->
      <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 hover:pl-4 transition-all">
        <svg class="w-5 h-5 flex-shrink-0"><!-- icon --></svg>
        <span class="text-sm truncate">Command Center</span>
      </a>
      
      <!-- Item with Badge -->
      <a href="#" class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 hover:pl-4 transition-all">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 flex-shrink-0"><!-- icon --></svg>
          <span class="text-sm truncate">My Test Scope</span>
        </div>
        <span class="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">5</span>
      </a>
      
      <!-- Active Item -->
      <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-blue-600/20">
        <svg class="w-5 h-5 flex-shrink-0"><!-- icon --></svg>
        <span class="text-sm truncate">Release Compare</span>
      </a>
      
    </div>
    
  </nav>
</aside>
```

### 6.2 Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#1e293b',
          hover: '#334155',
          active: '#3b82f6',
          text: '#94a3b8',
          'text-hover': '#e2e8f0',
          'text-active': '#ffffff',
          border: '#334155',
        }
      },
      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
      }
    }
  }
}
```

---

## 7. Icons Reference

### 7.1 Standard Navigation Icons (Heroicons Outline)

```tsx
// Icon components - 20x20, stroke-width: 2

// Command Center
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
</svg>

// Dashboard
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
</svg>

// Test Scope / Clipboard Check
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
</svg>

// Releases / Archive
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
</svg>

// Calendar
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
</svg>

// Compare / Chart Bar
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
</svg>

// Test Plans / Clipboard
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
</svg>

// Test Cases / Document
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>

// Test Cycles / Refresh
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
</svg>

// Test Execution / Play
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>

// Defects / Exclamation Circle
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>

// Ask AI / Lightbulb
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
</svg>

// Coverage Reports / Document Report
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
</svg>

// Quality Gates / Shield Check
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
</svg>

// RTM / Grid
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
</svg>

// Collapse / Chevron Double Left
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
</svg>
```

---

## 8. Interaction States

### 8.1 State Transitions

| State | Background | Text | Border | Transition |
|-------|------------|------|--------|------------|
| **Default** | transparent | `#94a3b8` | none | — |
| **Hover** | `#334155` | `#e2e8f0` | none | 150ms ease |
| **Active** | gradient blue | `#ffffff` | none | 150ms ease |
| **Focus** | transparent | current | 2px blue ring | 150ms ease |
| **Disabled** | transparent | `#475569` | none | — |

### 8.2 Micro-interactions

```css
/* Hover indent effect */
.nav-item:hover:not(.nav-item--active) {
  padding-left: calc(var(--sidebar-item-padding-x) + 4px);
}

/* Badge pulse on update */
@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.nav-badge--updated {
  animation: badgePulse 0.3s ease-out;
}

/* Collapse rotation */
.sidebar-collapse-btn svg {
  transition: transform 0.3s ease;
}

[data-collapsed="true"] .sidebar-collapse-btn svg {
  transform: rotate(180deg);
}
```

---

## 9. Accessibility

### 9.1 ARIA Attributes

```html
<aside 
  id="catalyst-sidebar"
  role="navigation"
  aria-label="Main navigation"
>
  <button 
    class="sidebar-collapse-btn"
    aria-expanded="true"
    aria-controls="catalyst-sidebar"
    aria-label="Collapse sidebar"
  >
  
  <nav aria-label="Releases navigation">
    <div role="group" aria-labelledby="section-dashboards">
      <div id="section-dashboards" class="section-header">Dashboards</div>
      <a href="..." aria-current="page">Release Compare</a>
    </div>
  </nav>
</aside>
```

### 9.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next item |
| `Shift+Tab` | Move focus to previous item |
| `Enter` / `Space` | Activate focused item |
| `[` | Collapse sidebar (global shortcut) |
| `]` | Expand sidebar (global shortcut) |

---

## 10. Responsive Behavior

### 10.1 Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `≥1280px` | Full sidebar, always visible |
| `1024px - 1279px` | Collapsed by default, expandable |
| `<1024px` | Hidden, hamburger menu trigger |

### 10.2 Mobile Overlay

```css
@media (max-width: 1023px) {
  .catalyst-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .catalyst-sidebar[data-open="true"] {
    transform: translateX(0);
  }
  
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  
  .sidebar-overlay[data-open="true"] {
    opacity: 1;
    pointer-events: auto;
  }
}
```

---

## 11. Usage Examples

### 11.1 React Implementation

```tsx
// App.tsx
import { CatalystSidebar } from '@/components/CatalystSidebar';
import { releasesContext, releasesSections } from '@/config/sidebar';

export function App() {
  const [collapsed, setCollapsed] = useState(false);
  const currentPath = usePathname();
  
  // Mark active item based on current route
  const sectionsWithActive = releasesSections.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      isActive: currentPath === item.href
    }))
  }));
  
  return (
    <div className="flex h-screen">
      <CatalystSidebar
        context={releasesContext}
        sections={sectionsWithActive}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <main className="flex-1 overflow-auto">
        {/* Page content */}
      </main>
    </div>
  );
}
```

### 11.2 Context Switching

```tsx
// When user navigates to a different module
const contexts = {
  releases: { id: 'releases', label: 'Releases', abbreviation: 'RL', color: '#2563eb' },
  testing: { id: 'testing', label: 'Testing', abbreviation: 'TS', color: '#0d9488' },
  strategy: { id: 'strategy', label: 'Strategy', abbreviation: 'ST', color: '#7c3aed' },
};

// Sidebar automatically updates based on route
const context = route.startsWith('/releases') ? contexts.releases
              : route.startsWith('/tests') ? contexts.testing
              : route.startsWith('/strategy') ? contexts.strategy
              : contexts.releases;
```

---

## 12. Quality Checklist

### 12.1 Visual Verification

- [ ] Font is Inter across all elements
- [ ] Colors match Catalyst V5 palette exactly
- [ ] Active state gradient renders correctly
- [ ] Badges align properly with text
- [ ] Icons are 20×20 and properly centered
- [ ] Hover indent animation is smooth
- [ ] Collapsed state hides text properly
- [ ] Scrollbar matches dark theme

### 12.2 Functional Verification

- [ ] All navigation links work
- [ ] Active state follows current route
- [ ] Collapse/expand toggle works
- [ ] Badge counts update reactively
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Mobile overlay works

### 12.3 Accessibility Verification

- [ ] ARIA labels present
- [ ] `aria-current="page"` on active item
- [ ] Focus trap in mobile overlay
- [ ] Color contrast ≥4.5:1
- [ ] Screen reader announces sections

---

## Summary

This specification provides everything needed to implement a consistent sidebar navigation across all Catalyst modules:

| Aspect | Included |
|--------|----------|
| Design Tokens | ✅ Colors, typography, spacing, radii |
| Component Structure | ✅ HTML + React interfaces |
| CSS Implementation | ✅ Full styles with states |
| Tailwind Classes | ✅ Complete utility mapping |
| Icons | ✅ All SVG icons documented |
| Interactions | ✅ Hover, active, focus, animations |
| Accessibility | ✅ ARIA, keyboard nav |
| Responsive | ✅ Desktop, tablet, mobile |
| Contexts | ✅ All 6 module configurations |

**Font:** Inter (consistent with entire Catalyst platform)
**Theme:** Dark slate (`#1e293b`) with blue accents (`#3b82f6`)

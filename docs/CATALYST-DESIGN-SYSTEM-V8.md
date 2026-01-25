# CATALYST DESIGN SYSTEM V8

## Complete Specification — Typography, Colors, Spacing & Animations

**Date:** January 25, 2026  
**Status:** APPROVED FOR PRODUCTION

---

# 1. FOUNDATIONS

## 1.1 Color Palette

### Primary Brand Colors

```css
/* INSOURCED - Blue */
--insourced: #2563eb;
--insourced-dark: #1d4ed8;
--insourced-light: #dbeafe;
--insourced-bg: #eff6ff;

/* COSOURCED - Purple */
--cosourced: #7c3aed;
--cosourced-dark: #6d28d9;
--cosourced-light: #ede9fe;
--cosourced-bg: #f5f3ff;

/* OUTSOURCED - Teal */
--outsourced: #0d9488;
--outsourced-dark: #0f766e;
--outsourced-light: #ccfbf1;
--outsourced-bg: #f0fdfa;
```

### Semantic Colors

```css
/* Success */
--success: #059669;
--success-light: #d1fae5;

/* Warning */
--warning: #d97706;
--warning-light: #fef3c7;

/* Danger */
--danger: #dc2626;
--danger-light: #fee2e2;
```

### Neutrals — CRITICAL FOR CONTRAST

```css
/* Backgrounds */
--bg-page: #f1f5f9;
--bg-surface: #ffffff;
--bg-muted: #f8fafc;

/* Text - HIGH CONTRAST */
--text-primary: #0f172a;
--text-secondary: #334155;
--text-muted: #64748b;
--text-light: #94a3b8;

/* Borders - VISIBLE */
--border: #e2e8f0;
--border-strong: #cbd5e1;
```

### ⛔ BANNED COLORS — Never Use

```css
/* Golden Hour Palette - BANNED */
#C69C6D  /* NO */
#5C7C5C  /* NO */
#8B7355  /* NO */
#D4B896  /* NO */

/* Ghost Grays - BANNED for text */
#cbd5e1  /* Too light for text */
#e2e8f0  /* Too light for text */
#f1f5f9  /* Invisible for text */
```

---

## 1.2 Typography

### Font Families

```css
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

### Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Size | Weight | Font | Line Height | Letter Spacing | Color |
|---------|------|--------|------|-------------|----------------|-------|
| Page Title | 20px | 700 | Inter | 1.3 | -0.01em | --text-primary |
| Section Title | 16px | 700 | Inter | 1.4 | 0 | --text-primary |
| Card Value (Large) | 40px | 800 | JetBrains Mono | 1 | -0.02em | Type color |
| Card Value (Modal) | 48px | 800 | JetBrains Mono | 1 | -0.02em | Type color |
| Card Title | 11px | 700 | Inter | 1.3 | 0.05em | --text-muted |
| Body Text | 14px | 400 | Inter | 1.5 | 0 | --text-secondary |
| Body Bold | 14px | 600 | Inter | 1.5 | 0 | --text-primary |
| Small Text | 13px | 400 | Inter | 1.5 | 0 | --text-secondary |
| Muted Text | 13px | 400 | Inter | 1.5 | 0 | --text-muted |
| Label | 11px | 700 | Inter | 1.3 | 0.08em | --text-muted |
| Badge | 11px | 600-700 | Inter | 1 | 0 | Varies |
| Table Header | 10px | 700 | Inter | 1.3 | 0.06em | --text-muted |
| Table Cell | 14px | 400 | Inter | 1.4 | 0 | --text-primary |
| Budget Number | 14px | 600 | JetBrains Mono | 1.2 | 0 | Type color |
| Footer Total | 18px | 700 | JetBrains Mono | 1.2 | 0 | Type color |

### Text Transform Rules

| Context | Transform |
|---------|-----------|
| Section labels | UPPERCASE |
| Table headers | UPPERCASE |
| Card type labels | UPPERCASE |
| Badge text | Title Case |
| Status badges | Title Case |
| Everything else | Sentence case |

---

## 1.3 Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Component Spacing

| Component | Padding | Gap |
|-----------|---------|-----|
| Header | 0 32px | 24px |
| Toolbar | 16px 32px | 16px |
| Main content | 24px 32px | 24px |
| Summary card | 24px | — |
| Table header | 20px 24px | — |
| Table cell | 16px 20px | — |
| Modal header | 24px 32px | — |
| Modal body | 32px | — |
| Badge | 5px 12px | — |
| Button | 10px 16px | 8px |

---

## 1.4 Border Radius

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-3xl: 20px;
--radius-full: 9999px;
```

---

## 1.5 Shadows — REAL DEPTH

```css
/* Subtle elevation */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05), 
             0 1px 3px rgba(0,0,0,0.1);

/* Card elevation */
--shadow-md: 0 4px 6px rgba(0,0,0,0.07), 
             0 2px 4px rgba(0,0,0,0.06);

/* Lifted elements (hover) */
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 
             0 4px 6px rgba(0,0,0,0.05);

/* Modal, dropdowns */
--shadow-xl: 0 20px 25px rgba(0,0,0,0.1), 
             0 10px 10px rgba(0,0,0,0.04);

/* Primary button glow */
--shadow-primary: 0 4px 14px rgba(37, 99, 235, 0.4);
--shadow-primary-hover: 0 6px 20px rgba(37, 99, 235, 0.5);

/* Dark button glow */
--shadow-dark: 0 4px 14px rgba(15, 23, 42, 0.3);
--shadow-dark-hover: 0 8px 25px rgba(15, 23, 42, 0.4);
```

---

# 2. ANIMATIONS & TRANSITIONS

## 2.1 Transition Defaults

```css
/* Standard transition for all interactive elements */
transition: all 0.15s ease;

/* Slower transitions for larger movements */
transition: all 0.2s ease;

/* Transform-specific */
transition: transform 0.2s ease, box-shadow 0.2s ease;
```

## 2.2 Micro-Interactions

### Button Hover — Lift Effect

```css
.btn {
    transition: all 0.15s ease;
}

.btn:hover {
    background: var(--bg-muted);
    border-color: var(--text-muted);
    color: var(--text-primary);
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-primary-hover);
}
```

### Card Hover — Lift & Shadow

```css
.summary-card {
    transition: all 0.2s ease;
    cursor: pointer;
}

.summary-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}
```

### Department Tab Hover

```css
.dept-tab {
    transition: all 0.15s ease;
}

.dept-tab:hover {
    border-color: var(--insourced);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}
```

### Table Row Hover

```css
tbody tr {
    transition: background 0.1s ease;
}

tbody tr:hover {
    background: var(--insourced-bg);
}
```

### Executive Summary Button — Premium Lift

```css
.exec-btn {
    transition: all 0.2s ease;
}

.exec-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-dark-hover);
}
```

## 2.3 Live Status Pulse Animation

```css
@keyframes pulse {
    0%, 100% { 
        opacity: 1; 
        transform: scale(1); 
    }
    50% { 
        opacity: 0.7; 
        transform: scale(0.9); 
    }
}

.status-dot {
    width: 8px;
    height: 8px;
    background: var(--success);
    border-radius: 50%;
    animation: pulse 2s infinite ease-in-out;
}
```

## 2.4 Modal Animations

### Overlay Fade In

```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-overlay.active {
    animation: fadeIn 0.2s ease;
}
```

### Modal Scale In

```css
@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.modal-overlay.active .modal {
    animation: scaleIn 0.25s ease;
}
```

## 2.5 Slide Dot Transition

```css
.slide-dot {
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background: var(--border-strong);
    cursor: pointer;
    transition: all 0.2s ease;
}

.slide-dot.active {
    width: 32px;
    background: var(--insourced);
}
```

## 2.6 Badge Hover Scale

```css
.card-badge {
    transition: transform 0.15s ease;
}

.card-badge:hover {
    transform: scale(1.05);
}
```

## 2.7 Focus Ring Animation

```css
@keyframes focusRing {
    0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
    70% { box-shadow: 0 0 0 4px rgba(37, 99, 235, 0); }
    100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}

button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
}
```

## 2.8 Skeleton Loading

```css
@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

.skeleton {
    background: linear-gradient(
        90deg,
        var(--bg-muted) 25%,
        var(--bg-surface) 50%,
        var(--bg-muted) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-md);
}
```

## 2.9 Number Count Up (JavaScript)

```javascript
function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quad
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        
        const current = start + (range * easeProgress);
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}
```

---

# 3. COMPONENT SPECIFICATIONS

## 3.1 Header

```css
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 64px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
}
```

## 3.2 Summary Card — CRITICAL

```css
.summary-card {
    background: var(--bg-surface);
    border-radius: 16px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
    cursor: pointer;
}

/* TOP BORDER - MUST BE 5px AND VISIBLE */
.summary-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
}

.summary-card.insourced::before { background: var(--insourced); }
.summary-card.cosourced::before { background: var(--cosourced); }
.summary-card.outsourced::before { background: var(--outsourced); }

.summary-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}
```

## 3.3 Department Tab

```css
.dept-tab {
    padding: 16px 24px;
    background: var(--bg-surface);
    border: 2px solid var(--border);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 140px;
    text-align: center;
    box-shadow: var(--shadow-sm);
}

.dept-tab:hover {
    border-color: var(--insourced);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.dept-tab.active {
    border-color: var(--insourced);
    background: var(--insourced-bg);
}
```

## 3.4 Navigation Tab

```css
.tabs {
    display: flex;
    gap: 4px;
    background: var(--bg-page);
    padding: 4px;
    border-radius: 12px;
}

.tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    border-radius: 8px;
    cursor: pointer;
    border: none;
    background: transparent;
    transition: all 0.15s ease;
}

.tab:hover {
    color: var(--text-secondary);
    background: var(--bg-surface);
}

.tab.active {
    background: var(--insourced);
    color: white;
    font-weight: 600;
    box-shadow: var(--shadow-sm);
}
```

## 3.5 Executive Summary Button — MUST BE PROMINENT

```css
.exec-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    border: none;
    border-radius: 10px;
    color: white;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: var(--shadow-dark);
    transition: all 0.2s ease;
}

.exec-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-dark-hover);
}

.exec-btn svg {
    width: 18px;
    height: 18px;
}
```

## 3.6 Primary Button

```css
.btn-primary {
    background: linear-gradient(135deg, var(--insourced), var(--insourced-dark));
    border: none;
    color: white;
    box-shadow: var(--shadow-primary);
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-primary-hover);
}
```

## 3.7 Type Badge

```css
.type-badge {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

.type-badge.insourced {
    background: var(--insourced-light);
    color: var(--insourced);
}

.type-badge.cosourced {
    background: var(--cosourced-light);
    color: var(--cosourced);
}

.type-badge.outsourced {
    background: var(--outsourced-light);
    color: var(--outsourced);
}
```

## 3.8 Status Badge

```css
.status-badge {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

.status-badge.in-progress {
    background: var(--insourced-light);
    color: var(--insourced);
}

.status-badge.completed {
    background: var(--success-light);
    color: var(--success);
}

.status-badge.on-hold {
    background: var(--warning-light);
    color: var(--warning);
}
```

## 3.9 Payment Badge

```css
.payment-badge {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
}

.payment-badge.na {
    background: var(--bg-page);
    color: var(--text-muted);
}

.payment-badge.on-track {
    background: var(--success-light);
    color: var(--success);
}

.payment-badge.unpaid {
    background: var(--danger);
    color: white;
}
```

## 3.10 Quality Alert Panel

```css
.quality-panel {
    background: var(--warning-light);
    border: 2px solid #fbbf24;
    border-radius: 12px;
    padding: 20px 24px;
}

.quality-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 700;
    color: #92400e;
}

.quality-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #78350f;
}
```

## 3.11 Modal

```css
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-overlay.active {
    display: flex;
    animation: fadeIn 0.2s ease;
}

.modal {
    background: var(--bg-surface);
    border-radius: 20px;
    width: 95%;
    max-width: 1100px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: var(--shadow-xl);
    animation: scaleIn 0.25s ease;
}
```

---

# 4. ICONOGRAPHY

## 4.1 Icon Specifications

| Context | Size | Stroke Width | Color |
|---------|------|--------------|-------|
| Button icon | 16px | 2px | currentColor |
| Tab icon | 16px | 2px | currentColor |
| Info icon | 18px | 2px | Accent color |
| Alert icon | 18px | 2px | Warning color |
| Small indicator | 14px | 2px | currentColor |

## 4.2 Common Icons (Heroicons)

```html
<!-- Refresh -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
</svg>

<!-- Export/Upload -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
</svg>

<!-- Present/Screen -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8m-4-4v4"/>
</svg>

<!-- Chart -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
</svg>

<!-- Info Circle -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>

<!-- Warning Triangle -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>

<!-- Eye Off (Hide) -->
<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
</svg>
```

---

# 5. RESPONSIVE BREAKPOINTS

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

# 6. ACCESSIBILITY REQUIREMENTS

## 6.1 Color Contrast (WCAG 2.1 AA)

| Text Type | Minimum Ratio | Our Ratio |
|-----------|---------------|-----------|
| Body text | 4.5:1 | 12.6:1 ✅ |
| Large text (18px+) | 3:1 | 12.6:1 ✅ |
| UI components | 3:1 | 4.6:1 ✅ |
| Muted text | 4.5:1 | 4.8:1 ✅ |

## 6.2 Focus States

```css
:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
}

button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
}
```

## 6.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

# 7. COMPLETE CSS VARIABLES EXPORT

```css
:root {
    /* Backgrounds */
    --bg-page: #f1f5f9;
    --bg-surface: #ffffff;
    --bg-muted: #f8fafc;
    
    /* Text - HIGH CONTRAST */
    --text-primary: #0f172a;
    --text-secondary: #334155;
    --text-muted: #64748b;
    --text-light: #94a3b8;
    
    /* Borders - VISIBLE */
    --border: #e2e8f0;
    --border-strong: #cbd5e1;
    
    /* Insourced - Blue */
    --insourced: #2563eb;
    --insourced-dark: #1d4ed8;
    --insourced-light: #dbeafe;
    --insourced-bg: #eff6ff;
    
    /* Cosourced - Purple */
    --cosourced: #7c3aed;
    --cosourced-dark: #6d28d9;
    --cosourced-light: #ede9fe;
    --cosourced-bg: #f5f3ff;
    
    /* Outsourced - Teal */
    --outsourced: #0d9488;
    --outsourced-dark: #0f766e;
    --outsourced-light: #ccfbf1;
    --outsourced-bg: #f0fdfa;
    
    /* Status */
    --success: #059669;
    --success-light: #d1fae5;
    --warning: #d97706;
    --warning-light: #fef3c7;
    --danger: #dc2626;
    --danger-light: #fee2e2;
    
    /* Fonts */
    --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    
    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
    --shadow-xl: 0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);
    --shadow-primary: 0 4px 14px rgba(37, 99, 235, 0.4);
    --shadow-primary-hover: 0 6px 20px rgba(37, 99, 235, 0.5);
    --shadow-dark: 0 4px 14px rgba(15, 23, 42, 0.3);
    --shadow-dark-hover: 0 8px 25px rgba(15, 23, 42, 0.4);
    
    /* Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 10px;
    --radius-xl: 12px;
    --radius-2xl: 16px;
    --radius-3xl: 20px;
    --radius-full: 9999px;
    
    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-7: 28px;
    --space-8: 32px;
    --space-10: 40px;
    --space-12: 48px;
}
```

---

# 8. IMPLEMENTATION CHECKLIST

## Critical (Must Have)

- [ ] All text passes WCAG AA contrast (4.5:1 minimum)
- [ ] Card top borders are 5px solid, full color
- [ ] Card values use JetBrains Mono 800 weight
- [ ] Card values are 40px (modal: 48px)
- [ ] Shadows visible on all cards
- [ ] Button hover states include transform
- [ ] Status text is Title Case ("In Progress", not "in_progress")
- [ ] Payment text is Title Case ("N/A", not "not_applicable")
- [ ] Executive Summary button has dark gradient with glow
- [ ] Modal has scale animation on open

## High Priority

- [ ] Department tabs lift on hover
- [ ] Table rows highlight on hover
- [ ] Live status dot pulses
- [ ] Focus states visible on all interactive elements
- [ ] Reduced motion query implemented

## Nice to Have

- [ ] Skeleton loading states
- [ ] Number count-up animations
- [ ] Badge scale on hover

---

# 9. TEXT FORMATTING RULES

## Status Values

| Database Value | Display Value |
|----------------|---------------|
| `in_progress` | In Progress |
| `completed` | Completed |
| `on_hold` | On Hold |
| `not_started` | Not Started |

## Payment Values

| Database Value | Display Value |
|----------------|---------------|
| `not_applicable` | N/A |
| `unpaid` | Unpaid |
| `on_track` | On Track |
| `overdue` | Overdue |

## Number Formatting

| Type | Format | Example |
|------|--------|---------|
| Budget (millions) | X.XXM | 4.34M |
| Budget (thousands) | XXXK | 598K |
| Budget (table) | X,XXX,XXX | 1,742,345 |
| Percentage | XX% | 100% |
| Count | X | 9 |

---

# 10. FILE STRUCTURE

```
/styles
├── variables.css      # All CSS custom properties
├── typography.css     # Font definitions and type scale
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── badges.css
│   ├── tables.css
│   ├── modals.css
│   └── tabs.css
├── animations.css     # All keyframes and transitions
└── utilities.css      # Helper classes
```

---

**END OF DESIGN SYSTEM SPECIFICATION**

# CATALYST THEME — LOVABLE AI PROMPT
## Production-Ready Implementation Guide

---

## OVERVIEW

Apply a custom "Catalyst" theme to this application. This theme follows a hybrid approach:
- **Dark branded header** for logo area (TurnQy identity)
- **White navigation** with Atlassian blue selected states  
- **Jira Align-style content** with pure white backgrounds and maximum readability

Target market: GCC/Saudi Arabia enterprise. Design for 8-hour daily workbench use.

---

## CSS CUSTOM PROPERTIES (Design Tokens)

Add these CSS variables to your root/global styles:

```css
:root {
    /* === BRAND TOKENS === */
    --brand-dark: #1A1A1A;
    --brand-gold: #C69C6D;
    --brand-gold-light: #D4AF37;
    
    /* === PRIMARY (Atlassian Blue) === */
    --color-primary: #0052CC;
    --color-primary-hover: #0065FF;
    --color-primary-pressed: #0747A6;
    
    /* === BACKGROUNDS === */
    --bg-page: #F4F5F7;
    --bg-surface: #FFFFFF;
    --bg-surface-hover: #FAFBFC;
    --bg-selected: #DEEBFF;
    --bg-hover: #EBECF0;
    
    /* === TEXT === */
    --text-primary: #172B4D;
    --text-secondary: #6B778C;
    --text-tertiary: #97A0AF;
    --text-inverse: #FFFFFF;
    
    /* === BORDERS === */
    --border-default: #DFE1E6;
    --border-strong: #C1C7D0;
    --border-focus: #4C9AFF;
    
    /* === SEMANTIC COLORS === */
    --color-success: #36B37E;
    --color-success-bg: #E3FCEF;
    --color-success-text: #006644;
    
    --color-warning: #FFAB00;
    --color-warning-bg: #FFFAE6;
    --color-warning-text: #FF8B00;
    
    --color-error: #FF5630;
    --color-error-bg: #FFEBE6;
    --color-error-text: #BF2600;
    
    /* === TYPOGRAPHY === */
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', Ubuntu, 'Helvetica Neue', sans-serif;
    
    /* === SPACING === */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    
    /* === RADIUS === */
    --radius-sm: 3px;
    --radius-md: 6px;
    --radius-lg: 8px;
}
```

---

## COMPONENT STYLING RULES

### 1. SIDEBAR STRUCTURE

The sidebar has TWO distinct zones:

#### Logo Header (Dark Branded)
```css
.logo-header {
    background: var(--brand-dark);  /* #1A1A1A */
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo-mark {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--brand-gold) 0%, var(--brand-gold-light) 100%);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    color: var(--brand-dark);
}

.logo-text {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-inverse);  /* White */
    letter-spacing: -0.02em;
}

/* The "C" in Catalyst should be gold */
.logo-text .c {
    color: var(--brand-gold);
}
```

#### Navigation Container (White)
```css
.nav-container {
    background: var(--bg-surface);  /* #FFFFFF */
    border-right: 1px solid var(--border-default);
    flex: 1;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.1s ease;
}

.nav-item:hover {
    background: var(--bg-hover);  /* #EBECF0 */
    color: var(--text-primary);
}

.nav-item.active {
    background: var(--bg-selected);  /* #DEEBFF - Atlassian blue tint */
    color: var(--color-primary);     /* #0052CC - Atlassian blue */
}
```

---

### 2. MAIN CONTENT AREA

```css
.main-content {
    background: var(--bg-page);  /* #F4F5F7 */
    min-height: 100vh;
}

.page-header {
    background: var(--bg-surface);  /* #FFFFFF */
    border-bottom: 1px solid var(--border-default);
    padding: 20px 32px;
}

.page-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);  /* #172B4D */
    letter-spacing: -0.02em;
}

.breadcrumb {
    font-size: 12px;
    color: var(--text-secondary);
}

.breadcrumb a {
    color: var(--color-primary);
    text-decoration: none;
}
```

---

### 3. BUTTONS

```css
/* Primary Button - Atlassian Blue */
.btn-primary {
    background: var(--color-primary);  /* #0052CC */
    color: var(--text-inverse);
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 500;
    border: none;
}

.btn-primary:hover {
    background: var(--color-primary-hover);  /* #0065FF */
}

.btn-primary:active {
    background: var(--color-primary-pressed);  /* #0747A6 */
}

/* Secondary Button */
.btn-secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 500;
}

.btn-secondary:hover {
    background: var(--bg-hover);
}

/* Focus Ring */
.btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--border-focus);
}
```

---

### 4. CARDS & SURFACES

```css
.card {
    background: var(--bg-surface);  /* #FFFFFF */
    border: 1px solid var(--border-default);  /* #DFE1E6 */
    border-radius: var(--radius-md);
    padding: 20px;
}

/* Stat cards */
.stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
}

/* Use semantic colors for stat values */
.stat-value.success { color: var(--color-success); }  /* #36B37E */
.stat-value.warning { color: var(--color-warning); }  /* #FFAB00 */

/* Gold accent ONLY for premium KPIs */
.stat-value.accent { color: var(--brand-gold); }  /* #C69C6D */
```

---

### 5. TABLES

```css
table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-surface);
}

th {
    text-align: left;
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--bg-page);  /* #F4F5F7 */
    border-bottom: 1px solid var(--border-default);
}

td {
    padding: 14px 16px;
    font-size: 14px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-default);
}

tbody tr:hover {
    background: var(--bg-surface-hover);  /* #FAFBFC */
}

tbody tr.selected {
    background: var(--bg-selected);  /* #DEEBFF */
}
```

---

### 6. BADGES & STATUS

```css
.badge {
    display: inline-flex;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.badge-success {
    background: var(--color-success-bg);  /* #E3FCEF */
    color: var(--color-success-text);     /* #006644 */
}

.badge-warning {
    background: var(--color-warning-bg);  /* #FFFAE6 */
    color: var(--color-warning-text);     /* #FF8B00 */
}

.badge-error {
    background: var(--color-error-bg);    /* #FFEBE6 */
    color: var(--color-error-text);       /* #BF2600 */
}
```

---

### 7. PRIORITY TAGS

```css
.priority {
    display: inline-flex;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
}

.priority-critical {
    background: var(--brand-dark);   /* #1A1A1A */
    color: var(--text-inverse);      /* White */
}

.priority-high {
    background: var(--brand-gold);   /* #C69C6D */
    color: var(--brand-dark);        /* #1A1A1A */
}

.priority-medium {
    background: var(--bg-hover);     /* #EBECF0 */
    color: var(--text-primary);
}

.priority-low {
    background: var(--bg-page);      /* #F4F5F7 */
    color: var(--text-secondary);
}
```

---

### 8. TABS

```css
.tabs {
    display: flex;
    border-bottom: 2px solid var(--border-default);
}

.tab {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
}

.tab:hover {
    color: var(--text-primary);
}

.tab.active {
    color: var(--color-primary);  /* #0052CC */
}

.tab.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-primary);  /* #0052CC */
}
```

---

### 9. FORM INPUTS

```css
.form-input,
.form-select {
    padding: 10px 12px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-family: var(--font-family);
    background: var(--bg-surface);
    color: var(--text-primary);
}

.form-input:focus,
.form-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
}

.form-input::placeholder {
    color: var(--text-tertiary);
}

.form-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
    display: block;
}
```

---

### 10. PROGRESS BARS

```css
.progress-track {
    height: 6px;
    background: var(--bg-hover);  /* #EBECF0 */
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--color-primary);  /* #0052CC */
    border-radius: 3px;
    transition: width 0.3s ease;
}

/* Gold progress for premium metrics only */
.progress-fill.accent {
    background: var(--brand-gold);
}
```

---

## CRITICAL RULES

1. **DO NOT** use gold (#C69C6D) for text on light backgrounds — contrast is insufficient
2. **DO NOT** use warm tints in content areas — keep them pure white (#FFFFFF)
3. **DO** use Atlassian blue (#0052CC) for all interactive elements (buttons, links, selected states)
4. **DO** use gold ONLY for: logo mark, logo "C", premium KPI badges, and priority-high tags
5. **DO** maintain Atlassian's semantic colors (green/yellow/red) for status indicators
6. **DO** keep the dark (#1A1A1A) header ONLY for the logo area
7. **DO** use white (#FFFFFF) navigation with blue selected states

---

## TYPOGRAPHY

Use Inter font family (or system fonts as fallback). Font weights:
- **700** — Headings, stat values, logo
- **600** — Page titles, section headings, labels
- **500** — Nav items, buttons, table headers
- **400** — Body text, table cells

Font sizes:
- Page title: 24px
- Section title: 16px
- Body/Table: 14px
- Labels/Breadcrumbs: 12px
- Badges/Uppercase: 11px

---

## ACCESSIBILITY

- All text meets WCAG AA contrast (4.5:1 minimum)
- Focus states use visible blue ring (#4C9AFF)
- Interactive elements have clear hover/active states
- Form inputs have associated labels

---

## BRAND SUMMARY

| Element | Color | Usage |
|---------|-------|-------|
| Logo Header BG | #1A1A1A | Dark container for logo only |
| Logo Mark | Gold gradient | "C" icon with gold fill |
| Logo "C" | #C69C6D | First letter of "Catalyst" |
| Logo "atalyst" | #FFFFFF | Rest of wordmark |
| Navigation BG | #FFFFFF | White sidebar |
| Nav Selected | #DEEBFF + #0052CC | Blue tint bg + blue text |
| Content BG | #FFFFFF | All content areas |
| Page Canvas | #F4F5F7 | Behind cards |
| Primary Action | #0052CC | All buttons and links |
| Text | #172B4D | Body and headings |

---

This theme is designed for multi-year enterprise use. It prioritizes readability and Jira Align familiarity while maintaining clear TurnQy brand identity through the gold "C" logo treatment.

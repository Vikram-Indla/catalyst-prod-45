# Catalyst Logo Asset Mapping Guide

**Date:** 2026-05-12  
**Source:** `/Users/vikramindla/Downloads/Catalyst logos/`

---

## 📦 Asset Inventory

### Primary Logo Assets
| Asset | File | Size | Type | Purpose |
|-------|------|------|------|---------|
| **Logo Mark (Light)** | `logo-mark-light.svg` | 8KB | SVG | Single mark on light backgrounds |
| **Logo Mark (Dark)** | `logo-mark-dark.svg` | 8KB | SVG | Single mark on dark backgrounds |
| **Logo Mark (Light BG)** | `logo-mark-light-bg.png` | 14KB | PNG | Mark with light background |
| **Logo Mark (Dark BG)** | `logo-mark-dark-bg.png` | 14KB | PNG | Mark with dark background |
| **Full Logo (Light)** | `logo-primary-light.svg` | 8.5KB | SVG | Full logo on light backgrounds |
| **Full Logo (Dark)** | `logo-primary-dark.svg` | 8.5KB | SVG | Full logo on dark backgrounds |
| **Full Logo (Light BG)** | `logo-light-bg.png` | 28KB | PNG | Full logo with light background |
| **Full Logo (Dark BG)** | `logo-dark-bg.png` | 27KB | PNG | Full logo with dark background |

### Favicon Assets (favicon_io/)
| Asset | File | Dimensions | Type | Purpose |
|-------|------|-----------|------|---------|
| **Favicon ICO** | `favicon.ico` | 16×16–256×256 | ICO | Browser tab (multi-resolution) |
| **Favicon PNG 32** | `favicon-32x32.png` | 32×32 | PNG | Browser tab |
| **Favicon PNG 16** | `favicon-16x16.png` | 16×16 | PNG | Browser tab |
| **Apple Touch Icon** | `apple-touch-icon.png` | 180×180 | PNG | iOS home screen |
| **Android Chrome** | `android-chrome-192x192.png` | 192×192 | PNG | Android app launcher |
| **Android Chrome** | `android-chrome-512x512.png` | 512×512 | PNG | Android splash screen |
| **Web Manifest** | `site.webmanifest` | – | JSON | PWA config |

---

## 🎨 Logo Variants Overview

### Mark vs. Full Logo
- **Mark Only**: Single icon symbol (recommended for small spaces, favicons, app icons)
- **Full Logo**: Includes wordmark text alongside the mark (recommended for headers, large displays)

### Dark/Light Mode Strategy
- **Light Mode (Light Backgrounds)**: Use `logo-primary-light.svg` (blue mark)
- **Dark Mode (Dark Backgrounds)**: Use `logo-primary-dark.svg` (white mark)
- **PNG with Background**: Use when transparency isn't available (email signatures, exports)

---

## 📍 Recommended Usage Map

### 1. **Navbar / Header**
**Current:** `catalyst-logo-dark.svg` (light mode) + `catalyst-logo-white.svg` (dark mode)  
**Recommendation:** Replace with **`logo-primary-light.svg`** (light) and **`logo-primary-dark.svg`** (dark)  
**Rationale:** Cleaner, officially designed logo variants  
**Size:** 32px height (md size in Logo component)

### 2. **Favicon (Browser Tab)**
**Current:** `/public/favicon.svg` + `/public/favicon-dark.svg`  
**Recommendation:** Replace with **`favicon_io/favicon.ico`**  
**Rationale:** 
- Single universal favicon works for both light/dark browser tabs
- Multi-resolution ICO covers all device pixel densities
- Modern browser recolor support makes it theme-aware
**Files to deploy:**
- `/public/favicon.ico` → `favicon_io/favicon.ico`
- `/public/apple-touch-icon.png` → `favicon_io/apple-touch-icon.png`
- `/public/manifest.json` → update with `favicon_io/site.webmanifest` content

### 3. **PWA App Icons (Android/iOS)**
**Recommendation:** Use from `favicon_io/`
- iOS home screen: **`apple-touch-icon.png`** (180×180)
- Android launcher (main): **`android-chrome-192x192.png`** (192×192)
- Android splash/large displays: **`android-chrome-512x512.png`** (512×512)

**manifest.json update:**
```json
{
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "theme_color": "#1868DB",
  "background_color": "#FFFFFF"
}
```

### 4. **Logo Mark (Icon Only)**
**Current:** None standardized  
**Recommendation:** 
- Light mode: **`logo-mark-light.svg`** (blue mark on transparent)
- Dark mode: **`logo-mark-dark.svg`** (white mark on transparent)  
**Use cases:**
- Sidebar collapsed state (small icon)
- Social media profile picture
- App icon in taskbar
- Avatar thumbnails in UI

### 5. **Email Signatures / Print**
**Recommendation:** Use PNG variants with background
- Light backgrounds: **`logo-light-bg.png`**
- Dark backgrounds: **`logo-dark-bg.png`**  
**Rationale:** PNG preserves background, no transparency issues in email clients

### 6. **Social Media / OG Image**
**Recommendation:** 
- Square: **`logo-mark-dark.svg`** (with custom white background for light platforms, dark background for dark platforms)
- Wide: **`logo-light-bg.png`** (for LinkedIn, Twitter headers)

### 7. **Loading Screens / Placeholders**
**Recommendation:** **`logo-mark-light.svg`** (light) / **`logo-mark-dark.svg`** (dark)  
**Size:** 64–128px  
**Animation:** Fade in on load

---

## 🔧 Implementation Plan

### Phase 1: Favicon Replacement
```bash
# Deploy to public/
cp favicon_io/favicon.ico → public/favicon.ico
cp favicon_io/apple-touch-icon.png → public/apple-touch-icon.png
cp favicon_io/android-chrome-192x192.png → public/android-chrome-192x192.png
cp favicon_io/android-chrome-512x512.png → public/android-chrome-512x512.png

# Update public/index.html
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### Phase 2: Update Logo Component
**File:** `src/components/brand/Logo.tsx`
```tsx
// Replace imports
import logoLight from "@/assets/logo-primary-light.svg";
import logoDark from "@/assets/logo-primary-dark.svg";
import logoMarkLight from "@/assets/logo-mark-light.svg";
import logoMarkDark from "@/assets/logo-mark-dark.svg";

// The component already handles theme switching correctly
// No changes needed to logic, just swap the source files
```

### Phase 3: Copy Assets to `/src/assets/`
```bash
cp logo-primary-light.svg → src/assets/logo-primary-light.svg
cp logo-primary-dark.svg → src/assets/logo-primary-dark.svg
cp logo-mark-light.svg → src/assets/logo-mark-light.svg
cp logo-mark-dark.svg → src/assets/logo-mark-dark.svg
```

### Phase 4: Clean Up Legacy Assets
After confirming new logos work:
```bash
rm src/assets/catalyst-logo-dark.svg (old)
rm src/assets/catalyst-logo-white.svg (old)
```

---

## 📐 Size Guidelines

| Component | Light Mode Size | Dark Mode Size | Location |
|-----------|-----------------|----------------|----------|
| **Navbar/Header** | 32–40px | 32–40px | `CatalystNavbar` |
| **Sidebar Logo** | 24–32px | 24–32px | `Sidebar` (expanded) |
| **Sidebar Icon** | 20px | 20px | `Sidebar` (collapsed) |
| **Favicon** | 16–32px | Auto (system) | Browser tab |
| **Loading Spinner** | 64–128px | 64–128px | Full-screen loader |
| **Email Signature** | 150–200px | 150–200px | Static export |
| **Social OG Image** | 1200×630px | 1200×630px | Meta tags |

---

## 🌓 Dark/Light Mode Behavior

### Current Logo Component Logic
```typescript
const isDark = useTheme();
const currentLogo = isDark ? logoDark : logoLight;
```

**✅ Works correctly if we update:**
- `logoDark` → `logo-primary-dark.svg` (white on transparent)
- `logoLight` → `logo-primary-light.svg` (blue on transparent)

### Favicon Behavior
- Modern browsers auto-recolor SVG favicons based on `prefers-color-scheme`
- PNG favicons (ICO) are static; the mark design works on both light/dark
- **Recommendation:** Stick with ICO for maximum compatibility

---

## 📋 Validation Checklist

- [ ] Favicon displays correctly in browser tab (light/dark)
- [ ] Apple touch icon shows on iOS home screen
- [ ] Android PWA icon appears in launcher
- [ ] Navbar logo renders at 32px (light & dark mode)
- [ ] Sidebar icon (collapsed) shows at 20px
- [ ] Email signature PNGs render with correct background
- [ ] Social OG image renders correctly in preview
- [ ] No broken image links in HTML head
- [ ] `public/manifest.json` updated with correct icon paths
- [ ] Old logo assets removed from `/src/assets/`

---

## 🎯 Summary

| **Use Case** | **File** | **Format** | **Dark Mode** |
|--------------|----------|-----------|---------------|
| Navbar Header | `logo-primary-light.svg` | SVG | `logo-primary-dark.svg` |
| Sidebar Logo | `logo-primary-light.svg` | SVG | `logo-primary-dark.svg` |
| Sidebar Collapsed | `logo-mark-light.svg` | SVG | `logo-mark-dark.svg` |
| Favicon | `favicon.ico` | ICO | Auto-detected |
| iOS App Icon | `apple-touch-icon.png` | PNG | Fixed |
| Android App Icon | `android-chrome-512x512.png` | PNG | Fixed |
| Email Signature | `logo-light-bg.png` | PNG | `logo-dark-bg.png` |
| Social OG | `logo-light-bg.png` | PNG | `logo-dark-bg.png` |

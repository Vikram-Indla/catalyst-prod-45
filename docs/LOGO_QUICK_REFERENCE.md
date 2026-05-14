# Catalyst Logo Quick Reference Card

## 🎯 At a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│  CATALYST LOGO REPLACEMENT STRATEGY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📍 NAVBAR / MAIN HEADER                                        │
│     Light Mode: logo-primary-light.svg (Blue mark)              │
│     Dark Mode:  logo-primary-dark.svg (White mark)              │
│     Size: 32-40px                                               │
│     Type: SVG (scalable)                                        │
│                                                                 │
│  📱 SIDEBAR (EXPANDED)                                          │
│     Same as navbar                                              │
│     Size: 24-32px                                               │
│                                                                 │
│  🔄 SIDEBAR (COLLAPSED)                                         │
│     Light: logo-mark-light.svg (Icon only)                      │
│     Dark:  logo-mark-dark.svg (Icon only)                       │
│     Size: 20px                                                  │
│     Type: SVG                                                   │
│                                                                 │
│  🌐 FAVICON / BROWSER TAB                                       │
│     File: favicon.ico (Multi-resolution)                        │
│     Auto-detects light/dark mode                                │
│     Deploy to: /public/favicon.ico                              │
│                                                                 │
│  📲 iOS APP ICON                                                │
│     File: apple-touch-icon.png                                  │
│     Size: 180×180px                                             │
│     Deploy to: /public/apple-touch-icon.png                     │
│                                                                 │
│  🤖 ANDROID APP ICON                                            │
│     Small: android-chrome-192x192.png (192×192)                 │
│     Large: android-chrome-512x512.png (512×512)                 │
│     Deploy to: /public/android-chrome-*.png                     │
│                                                                 │
│  📧 EMAIL SIGNATURE                                             │
│     Light BG: logo-light-bg.png                                 │
│     Dark BG:  logo-dark-bg.png                                  │
│     Size: 150-200px width                                       │
│                                                                 │
│  📱 SOCIAL MEDIA / OG IMAGE                                     │
│     File: logo-light-bg.png (for 1200×630 export)               │
│     Light BG primary, prepare dark variant                      │
│     Size: 1200×630px                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Files to Deploy

### Favicon Set
```
From Downloads/Catalyst logos/favicon_io/:
  ✓ favicon.ico                    → /public/
  ✓ apple-touch-icon.png           → /public/
  ✓ android-chrome-192x192.png     → /public/
  ✓ android-chrome-512x512.png     → /public/
```

### SVG Logos (for src/assets)
```
From Downloads/Catalyst logos/:
  ✓ logo-primary-light.svg         → /src/assets/
  ✓ logo-primary-dark.svg          → /src/assets/
  ✓ logo-mark-light.svg            → /src/assets/
  ✓ logo-mark-dark.svg             → /src/assets/
```

### PNG Logos (for exports/email)
```
From Downloads/Catalyst logos/:
  ✓ logo-light-bg.png              → /src/assets/
  ✓ logo-dark-bg.png               → /src/assets/
```

---

## 🔄 Dark Mode Mapping

| Component | Light Mode | Dark Mode |
|-----------|-----------|-----------|
| **Full Logo** | logo-primary-light.svg | logo-primary-dark.svg |
| **Mark Only** | logo-mark-light.svg | logo-mark-dark.svg |
| **PNG Export** | logo-light-bg.png | logo-dark-bg.png |
| **Favicon** | favicon.ico (auto) | favicon.ico (auto) |

---

## ✅ Implementation Checklist

```
PHASE 1: Copy Assets
  [ ] Copy favicon files to /public/
  [ ] Copy SVG logos to /src/assets/
  [ ] Copy PNG logos to /src/assets/
  
PHASE 2: Update HTML Head
  [ ] Update favicon.ico path in index.html
  [ ] Add apple-touch-icon.png link
  [ ] Update manifest.json with Android icon paths
  
PHASE 3: Update Components
  [ ] Update Logo.tsx imports (4 SVG files)
  [ ] Verify navbar renders correctly
  [ ] Test sidebar expanded/collapsed
  [ ] Verify dark mode switching
  
PHASE 4: Test All Surfaces
  [ ] Browser tab favicon (light & dark mode)
  [ ] iOS home screen icon
  [ ] Android launcher icon
  [ ] Navbar/sidebar logos
  [ ] Loading screens
  [ ] Email signature exports
  
PHASE 5: Clean Up
  [ ] Remove old catalyst-logo-dark.svg
  [ ] Remove old catalyst-logo-white.svg
  [ ] Delete other legacy logo files in /src/assets/
```

---

## 📐 Size Reference

**Mark Icon:**
- Favicon: 16×16 to 512×512 (auto-scaled)
- Sidebar collapsed: 20px
- Loading spinner: 64–128px
- Avatar thumbnail: 32–48px

**Full Logo:**
- Navbar: 32–40px height
- Sidebar expanded: 24–32px height
- Large displays: 64–96px height
- Email signature: 150–200px width

---

## 🎨 Color Values

**Blue Mark (Light Background):** #1868DB (primary teal/blue)  
**White Mark (Dark Background):** #FFFFFF (pure white)  
**Background (PWA):** #FFFFFF (white)  
**Theme Color (PWA):** #1868DB (blue)

---

## 📝 Notes

1. **SVG is preferred** for web logos (scalable, smaller file size)
2. **PNG with background** needed for email clients (no transparency support)
3. **Favicon ICO** handles both light/dark auto-detection in modern browsers
4. **Android maskable** icons allow OS to apply their own background shape
5. **No wordmark needed** in mark-only versions (already in navbar next to mark)


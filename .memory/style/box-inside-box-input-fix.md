# Memory: style/box-inside-box-input-fix
Updated: now

## Problem
Input elements inside styled containers often display a visible nested rectangle ("box-inside-box" artifact) due to browser default styles, autofill backgrounds, or CSS specificity conflicts. This creates an unprofessional double-border appearance.

## Root Causes
1. Browser default input styling (borders, shadows, focus rings)
2. WebKit autofill inset box-shadow that paints a background
3. Tailwind classes being overridden by browser defaults
4. Input focus states adding visible rings

## Nuclear Fix (Aggressive Reset)

### Tailwind Classes (with !important)
```tsx
className="flex-1 min-w-0 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 !bg-transparent !border-0 !p-0 !outline-none !shadow-none !ring-0 focus:!outline-none focus:!shadow-none focus:!ring-0"
```

### Inline Styles (WebKit/Moz overrides)
```tsx
style={{
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  backgroundColor: 'transparent',
  // Kill autofill background paint
  WebkitBoxShadow: '0 0 0 1000px transparent inset',
}}
```

## Complete Example
```tsx
<div className="flex items-center gap-3 px-5 py-3.5 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-500/10 transition-all">
  <Search size={18} className="text-slate-400 flex-shrink-0" />
  <input
    type="text"
    placeholder="Search..."
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="flex-1 min-w-0 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 !bg-transparent !border-0 !p-0 !outline-none !shadow-none !ring-0 focus:!outline-none focus:!shadow-none focus:!ring-0"
    style={{
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
      backgroundColor: 'transparent',
      WebkitBoxShadow: '0 0 0 1000px transparent inset',
    }}
  />
</div>
```

## Key Points
1. Use Tailwind `!important` utilities (`!bg-transparent`, `!border-0`, etc.)
2. Include `focus:!` variants to prevent focus states from adding visible styles
3. Use inline `WebkitBoxShadow` with transparent inset to kill autofill backgrounds
4. Apply `appearance: none` to remove native browser styling
5. All focus styling should be on the **outer container** (`focus-within:`), never on the input itself

# STRATA Switcher Integration Guide

**Feature:** Product-level switcher for Catalyst/STRATA  
**Files:** `src/hooks/useStrataSwitcher.ts`, `src/components/layout/StrataSwitcher.tsx`  
**CAT-STRATA-ISOLATE-20260707-001**

---

## Overview

The STRATA Switcher provides a UI component and hooks to allow users to switch between Catalyst and STRATA products at the application level. 

**Features:**
- ✅ Visual product selector in the header
- ✅ Shows current product (Catalyst or STRATA)
- ✅ One-click switching between products
- ✅ Product-specific features and content
- ✅ Persistent state tracking
- ✅ Full integration with existing ContextSwitcher

---

## Components & Hooks

### `useStrataSwitcher()` Hook

Main hook for product switching logic.

**Returns:**
```typescript
{
  current: 'CATALYST' | 'STRATA',          // Current product
  canSwitch: boolean,                       // Can user switch (always true)
  switchPath: (product) => string,          // Get path for product
  productName: string,                      // Display name
  description: string,                      // Product description
  switchTo: (product) => void,              // Switch to product
}
```

**Usage:**
```tsx
import { useStrataSwitcher } from '@/hooks/useStrataSwitcher';

function MyComponent() {
  const { current, productName, switchTo } = useStrataSwitcher();
  
  return (
    <div>
      Current: {productName}
      <button onClick={() => switchTo('STRATA')}>
        Switch to STRATA
      </button>
    </div>
  );
}
```

### `useAvailableProducts()` Hook

Get list of available products for selection.

**Returns:**
```typescript
[
  {
    id: 'catalyst',
    name: 'Catalyst',
    key: 'CATALYST',
    description: 'Project and portfolio management',
    icon: '📊',
    path: '/project-hub',
  },
  {
    id: 'strata',
    name: 'STRATA',
    key: 'STRATA',
    description: 'Strategic execution platform',
    icon: '🎯',
    path: '/strata',
  },
]
```

### `useProductFeatures(product)` Hook

Get product-specific features.

**Usage:**
```tsx
const { available, isFeatureEnabled } = useProductFeatures();

if (isFeatureEnabled('strategy-definition')) {
  // Show STRATA-specific UI
}
```

### `useProductDisplay(product)` Hook

Get product display metadata for consistent styling.

**Returns:**
```typescript
{
  displayName: 'STRATA',                    // Full name
  shortName: 'ST',                          // 2-char abbreviation
  emoji: '🎯',                              // Icon emoji
  color: 'blue',                            // Theme color
  className: 'strata-theme',                // CSS class
}
```

### `<StrataSwitcher />` Component

UI component for the header product selector.

**Usage:**
```tsx
import { StrataSwitcher } from '@/components/layout/StrataSwitcher';

// In CatalystHeader.tsx, add:
<StrataSwitcher />
```

**Features:**
- Portal-rendered dropdown (not clipped by overflow:hidden)
- Click-outside detection to close
- Keyboard-friendly
- Responsive positioning
- Accessibility labels

---

## Integration Steps

### Step 1: Add StrataSwitcher to Header

**File:** `src/components/layout/CatalystHeader.tsx`

Add the component to your header, typically between GlobalSearch and the logo cluster:

```tsx
import { StrataSwitcher } from '@/components/layout/StrataSwitcher';

export function CatalystHeader() {
  return (
    <header>
      {/* ... existing header content ... */}
      <GlobalSearch />
      <StrataSwitcher />  {/* ← Add here */}
      {/* ... rest of header ... */}
    </header>
  );
}
```

### Step 2: Wrap STRATA Routes

Ensure STRATA routes are properly gated with product checks:

**File:** `src/App.tsx`

```tsx
// Check if product is STRATA before rendering STRATA routes
import { useStrataSwitcher } from '@/hooks/useStrataSwitcher';

function AppRoutes() {
  const { current } = useStrataSwitcher();
  
  return (
    <Routes>
      {/* Catalyst routes */}
      <Route path="/project-hub/*" element={<ProjectHub />} />
      
      {/* STRATA routes (only when APP_PRODUCT=STRATA) */}
      {current === 'STRATA' && (
        <Route path="/strata/*" element={<StrataMod />} />
      )}
    </Routes>
  );
}
```

### Step 3: Feature Gating (Optional)

Gate product-specific features using the hook:

```tsx
import { useProductFeatures } from '@/hooks/useStrataSwitcher';

function FeatureComponent() {
  const { isFeatureEnabled } = useProductFeatures();
  
  if (!isFeatureEnabled('strategy-definition')) {
    return null; // Not available in Catalyst
  }
  
  return <StrategyDefinitionUI />;
}
```

---

## User Experience

### Switching Products

1. User clicks on "Catalyst" or "STRATA" button in header
2. Dropdown menu appears showing available products
3. User selects a product
4. Page reloads with `APP_PRODUCT` set to new value
5. User is redirected to the product's entry point:
   - **Catalyst** → `/project-hub`
   - **STRATA** → `/strata`

### Visual Indicators

- Current product shown in header button (with emoji)
- Dropdown highlights active product with "Active" badge
- Styling adapts to product theme (catalyst-theme vs strata-theme)

### Data Isolation

- Product switcher respects environment variable separation
- Switching products doesn't share local state
- Each product has its own navigation context

---

## Advanced Usage

### Conditional Rendering by Product

```tsx
import { useStrataSwitcher } from '@/hooks/useStrataSwitcher';

function ConditionalContent() {
  const { current } = useStrataSwitcher();
  
  return (
    <>
      {current === 'CATALYST' && <CatalystSpecificUI />}
      {current === 'STRATA' && <StrataSpecificUI />}
    </>
  );
}
```

### Product-Aware Navigation

```tsx
import { useStrataSwitcher } from '@/hooks/useStrataSwitcher';
import { useNavigate } from 'react-router-dom';

function SmartNav() {
  const { switchPath } = useStrataSwitcher();
  const navigate = useNavigate();
  
  const goToProduct = (product: 'CATALYST' | 'STRATA') => {
    const path = switchPath(product);
    navigate(path);
  };
  
  return <button onClick={() => goToProduct('STRATA')}>Go to STRATA</button>;
}
```

### Feature Detection

```tsx
import { useProductFeatures } from '@/hooks/useStrataSwitcher';

function SmartComponent() {
  const { isFeatureEnabled } = useProductFeatures();
  
  const canShowStrategy = isFeatureEnabled('strategy-definition');
  const canShowScorecard = isFeatureEnabled('scorecard-tracking');
  
  return (
    <>
      {canShowStrategy && <StrategySection />}
      {canShowScorecard && <ScorecardSection />}
    </>
  );
}
```

---

## Environment Integration

The switcher reads from `VITE_APP_PRODUCT` environment variable:

```bash
# Development
APP_PRODUCT=CATALYST npm run dev:catalyst
APP_PRODUCT=STRATA npm run dev:strata

# .env files
# .env.example.catalyst → APP_PRODUCT=CATALYST
# .env.example.strata → APP_PRODUCT=STRATA
```

When user switches via UI, page redirects to product's entry point (which requires correct `.env.local` setup).

---

## Testing

### Unit Test Example

```tsx
import { renderHook, act } from '@testing-library/react';
import { useStrataSwitcher } from '@/hooks/useStrataSwitcher';

test('useStrataSwitcher switches products', () => {
  const { result } = renderHook(() => useStrataSwitcher());
  
  expect(result.current.current).toBe('CATALYST');
  
  act(() => {
    result.current.switchTo('STRATA');
  });
  
  // Note: switchTo causes navigation, so actual product change
  // requires full integration test with routing
});
```

### Integration Test Example

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrataSwitcher } from '@/components/layout/StrataSwitcher';

test('StrataSwitcher opens and allows selection', async () => {
  const { getByText } = render(<StrataSwitcher />);
  
  const button = getByText(/Catalyst|STRATA/);
  await userEvent.click(button);
  
  const strataOption = getByText('STRATA');
  expect(strataOption).toBeVisible();
  
  await userEvent.click(strataOption);
  // Navigation should occur
});
```

---

## Styling & Customization

### CSS Classes

Products can be styled with theme-specific classes:

```css
/* Catalyst theme */
.catalyst-theme {
  --product-color: #purple;
  --product-icon: 📊;
}

/* STRATA theme */
.strata-theme {
  --product-color: #blue;
  --product-icon: 🎯;
}
```

### Color Tokens

Uses Atlassian Design System tokens for consistency:
- `token('color.background.neutral')`
- `token('color.background.selected')`
- `token('color.border')`
- `token('shadow.overlay')`

---

## Troubleshooting

### Switcher Not Appearing

1. **Check integration:** Is `<StrataSwitcher />` mounted in header?
2. **Check imports:** Are hooks imported correctly?
3. **Check APP_PRODUCT:** Verify environment variable is set

### Switching Not Working

1. **Check environment:** Ensure `.env.local` has correct `APP_PRODUCT`
2. **Check routes:** Verify product routes are registered
3. **Check guards:** Check ModuleGuard on product routes

### Wrong Product Shows

1. **Clear localStorage:** `localStorage.clear()`
2. **Check environment:** Verify `VITE_APP_PRODUCT` matches expected value
3. **Check startup guard:** Confirm `productEnvironmentGuard` is running

---

## Future Enhancements

- [ ] Product preferences in user profile
- [ ] Keyboard shortcut (⌘+1 for Catalyst, ⌘+2 for STRATA)
- [ ] Product favorites/pinning
- [ ] Breadcrumb integration showing current product
- [ ] Product-specific sidebars/navigation
- [ ] Cross-product notifications

---

**CAT-STRATA-ISOLATE-20260707-001**  
**Last Updated:** 2026-07-07

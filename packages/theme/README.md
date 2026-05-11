# @catylast/theme

ThemeProvider, `useTheme` hook, ThemeScope, and a small init-script helper
for the Catylast component library. Drives the `data-theme` attribute that
`@catylast/tokens` resolves against.

## Install

```bash
# pnpm
pnpm add @catylast/theme @catylast/tokens

# npm
npm install @catylast/theme @catylast/tokens

# yarn
yarn add @catylast/theme @catylast/tokens
```

## Use — top-level

Wrap your app in a single `ThemeProvider`. By default it sets
`data-theme` on `<html>`.

```tsx
import "@catylast/tokens/tokens.css";
import { ThemeProvider } from "@catylast/theme";

export function App({ children }) {
  return (
    <ThemeProvider defaultMode="system" storageKey="catylast-theme">
      {children}
    </ThemeProvider>
  );
}
```

## Use — read or change the theme

```tsx
import { useTheme } from "@catylast/theme";

function ThemeMenu() {
  const { mode, resolvedMode, setMode } = useTheme();
  return (
    <select value={mode} onChange={(e) => setMode(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System ({resolvedMode})</option>
    </select>
  );
}
```

`mode` is whatever the user picked (may be `"system"`). `resolvedMode` is the
real theme being rendered (`"light"` or `"dark"`).

## Use — scoped override

Use `ThemeScope` when you need a subtree to render in a different theme than
the rest of the app (for example, a dark-themed media block on a light page).

```tsx
import { ThemeScope } from "@catylast/theme";

<ThemeScope mode="dark">
  <Card />
</ThemeScope>;
```

## FOUC prevention

If your app does server-side rendering or a static-HTML first paint, inline a
small script in the document `<head>` so the theme is applied before React
hydrates:

```tsx
import { createInitScript } from "@catylast/theme";

const script = createInitScript({
  storageKey: "catylast-theme",
  defaultMode: "system",
});

// Render this in your <head> via dangerouslySetInnerHTML or your framework's
// equivalent.
<script dangerouslySetInnerHTML={{ __html: script }} />;
```

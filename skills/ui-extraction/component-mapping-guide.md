# Atlaskit Component Mapping Guide

**Use this reference to map every UI element to an Atlaskit component.**

See SKILL.md for overview. This document provides detailed mapping patterns and examples.

---

## Hierarchy: Component Selection Order

1. **Catalyst canonical component** (highest priority) — Does Catalyst already have this?
2. **Catalyst wrapper around Atlaskit** — Catalyst-specific wrapper?
3. **Atlaskit component** (primary source) — @atlaskit packages
4. **Custom component** (only with explicit approval) — Last resort

---

## Common Patterns & Mapping

### BUTTONS

**Pattern: Primary action button (blue)**
```tsx
✅ CORRECT:
import Button from '@atlaskit/button';
<Button appearance="primary" onClick={handleClick}>Create</Button>

❌ WRONG:
<div onClick={handleClick} style={{ background: '#0052CC' }}>Create</div>
```

**Pattern: Secondary action button (grey)**
```tsx
✅ CORRECT:
<Button appearance="default" onClick={handleClick}>Cancel</Button>
```

**Pattern: Destructive action button (red)**
```tsx
✅ CORRECT:
<Button appearance="danger" onClick={handleClick}>Delete</Button>
```

**Atlaskit Props:**
- `appearance`: primary | default | danger | subtle
- `size`: small | medium | large | xl
- `isDisabled`: boolean
- `iconBefore`: ReactNode
- `onClick`: handler

---

### INPUTS & TEXTFIELDS

**Pattern: Search input**
```tsx
✅ CORRECT:
import Textfield from '@atlaskit/textfield';
<Textfield
  placeholder="Search"
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

**Atlaskit Props:**
- `type`: text | email | date | password | number
- `placeholder`: string
- `value`: string
- `onChange`: handler
- `isDisabled`: boolean
- `required`: boolean

---

### DROPDOWNS & SELECT

**Pattern: Status filter dropdown**
```tsx
✅ CORRECT (Simple):
<select onChange={handleFilter}>
  <option value="RELEASED">Released</option>
  <option value="UNRELEASED">Unreleased</option>
</select>

✅ CORRECT (Full Atlaskit):
import Select from '@atlaskit/select';
const options = [
  { value: 'RELEASED', label: 'Released' },
];
<Select options={options} onChange={(option) => handleFilter(option.value)} />
```

---

### MODALS & DIALOGS

**Pattern: Create dialog**
```tsx
✅ CORRECT:
import ModalDialog from '@atlaskit/modal-dialog';
<ModalDialog
  heading="Create Release"
  onClose={handleClose}
  actions={[
    { text: 'Cancel', onClick: handleClose },
    { text: 'Create', onClick: handleCreate },
  ]}
>
  <Textfield label="Release name" />
</ModalDialog>
```

---

### STATUS BADGES & LOZENGES

**Pattern: Status label**
```tsx
✅ CORRECT:
import Lozenge from '@atlaskit/lozenge';
<Lozenge appearance="default">Released</Lozenge>

// Or with color coding:
<Lozenge appearance={status === 'RELEASED' ? 'success' : 'default'}>
  {status}
</Lozenge>
```

**Appearance options:** default | success | removed | inprogress | new

---

### TABLES

**Pattern: Data table**
```tsx
✅ CORRECT (Catalyst canonical - JiraTable):
import { JiraTable } from '@/components/shared/JiraTable';
<JiraTable
  columns={[
    { key: 'name', title: 'Release', width: 200 },
    { key: 'status', title: 'Status', width: 100 },
  ]}
  rows={releases}
/>

✅ CORRECT (Semantic HTML):
<table>
  <thead>
    <tr>
      <th scope="col">Release</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    {releases.map(r => (
      <tr key={r.id}>
        <td>{r.name}</td>
        <td><Lozenge>{r.status}</Lozenge></td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### PROGRESS BARS

**Pattern: Dual-color progress**
```tsx
✅ CORRECT (with tokens):
import { token } from '@atlaskit/tokens';
const completedPercentage = (progress.completed / progress.total) * 100;
<div style={{
  display: 'flex',
  background: token('ds-background-neutral'),
  height: '8px',
  borderRadius: '4px',
  overflow: 'hidden',
}}>
  <div style={{
    width: `${completedPercentage}%`,
    background: token('ds-background-success-bold'),
  }} />
</div>
```

---

### TOKENS (Color/Sizing/Spacing)

**Always use tokens, never hardcode colors:**

```tsx
import { token } from '@atlaskit/tokens';

// Text colors
color: token('ds-text')           // Default text
color: token('ds-text-subtlest')  // Secondary text
color: token('ds-text-danger')    // Error/destructive

// Background colors
background: token('ds-background')            // White
background: token('ds-background-neutral')    // Light grey
background: token('ds-background-success-bold') // Green

// Border colors
border: token('ds-border')  // Light border

// Used like:
<div style={{
  color: token('ds-text'),
  background: token('ds-background-neutral'),
  border: `1px solid ${token('ds-border')}`,
}}>
  Content
</div>
```

---

## Quick Reference: Component → Atlaskit

| UI Element | Atlaskit Component | Confidence |
|------------|-------------------|-----------|
| Primary button | Button | High |
| Text input | Textfield | High |
| Dropdown | Select | High |
| Modal dialog | ModalDialog | High |
| Status badge | Lozenge | High |
| Menu (kebab) | DropdownMenu | High |
| Table | JiraTable (or `<table>`) | High |
| Heading | Heading | High |
| Progress bar | Custom + token | Medium |
| Date cell | Custom + token | Medium |

---

**When in doubt, use Atlaskit. Custom only with approval.**

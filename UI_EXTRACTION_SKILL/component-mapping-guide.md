# Atlaskit Component Mapping Guide

**Use this reference to map every UI element to an Atlaskit component.**

---

## Hierarchy: Component Selection Order

1. **Catalyst canonical component** (highest priority)
   - Does Catalyst already have this? (e.g., JiraTable)
   - Check: `/src/components/`, `Storybook`
   
2. **Catalyst wrapper around Atlaskit**
   - Is there a Catalyst-specific wrapper? (e.g., Button, Input wrapper)
   
3. **Atlaskit component** (primary source)
   - @atlaskit/button, @atlaskit/textfield, @atlaskit/modal-dialog, etc.
   
4. **Custom component** (only with explicit approval)
   - If Atlaskit is insufficient, build custom
   - Requires justification: "Why Atlaskit can't be used"

---

## Common Patterns & Mapping

### BUTTONS

**Pattern: Primary action button (blue)**
```tsx
❌ WRONG:
<div onClick={handleClick} style={{ background: '#0052CC' }}>Create</div>

✅ CORRECT:
import Button from '@atlaskit/button';
<Button appearance="primary" onClick={handleClick}>Create</Button>
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

**Pattern: Icon-only button (kebab menu)**
```tsx
✅ CORRECT:
import { MoreIcon } from '@atlaskit/icon';
<Button appearance="subtle" iconBefore={<MoreIcon />} />
```

**Atlaskit Props:**
- `appearance`: primary | default | danger | subtle | subtle-link | warning
- `size`: small | medium | large | xl
- `isDisabled`: boolean
- `iconBefore`: ReactNode
- `iconAfter`: ReactNode
- `onClick`: handler
- `type`: button | submit | reset (default: button)

---

### INPUTS & TEXTFIELDS

**Pattern: Search input**
```tsx
❌ WRONG:
<input type="text" placeholder="Search" style={{ border: '1px solid #DFE1E6' }} />

✅ CORRECT:
import Textfield from '@atlaskit/textfield';
<Textfield
  placeholder="Search"
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

**Pattern: Form field with label**
```tsx
✅ CORRECT:
import { Field, FieldGroup } from '@atlaskit/form';
<FieldGroup>
  <Field name="releaseName" isRequired>
    {({ fieldProps }) => (
      <Textfield {...fieldProps} label="Release name" />
    )}
  </Field>
</FieldGroup>
```

**Pattern: Email input with validation**
```tsx
✅ CORRECT:
<Textfield
  type="email"
  placeholder="name@example.com"
  required
/>
```

**Atlaskit Props:**
- `type`: text | email | date | password | number
- `placeholder`: string
- `value`: string
- `onChange`: handler
- `isDisabled`: boolean
- `isReadOnly`: boolean
- `label`: string
- `required`: boolean

---

### DROPDOWNS & SELECT

**Pattern: Status filter dropdown**
```tsx
❌ WRONG:
<select onChange={handleFilter}>
  <option>Released</option>
  <option>Unreleased</option>
</select>

✅ CORRECT (Simple):
<select onChange={handleFilter}>
  <option value="RELEASED">Released</option>
  <option value="UNRELEASED">Unreleased</option>
</select>

✅ CORRECT (Full Atlaskit):
import Select from '@atlaskit/select';
const options = [
  { value: 'RELEASED', label: 'Released' },
  { value: 'UNRELEASED', label: 'Unreleased' },
];
<Select options={options} onChange={(option) => handleFilter(option.value)} />
```

**Pattern: Menu actions (kebab menu)**
```tsx
✅ CORRECT:
import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
<DropdownMenu trigger="⋯">
  <DropdownItem onClick={handleEdit}>Edit</DropdownItem>
  <DropdownItem onClick={handleDelete}>Delete</DropdownItem>
</DropdownMenu>
```

**Atlaskit Props:**
- `options`: Array<{ value, label }>
- `onChange`: handler
- `value`: selected option
- `isDisabled`: boolean
- `placeholder`: string

---

### MODALS & DIALOGS

**Pattern: Create dialog**
```tsx
❌ WRONG:
<div style={{ position: 'fixed', ... }}>
  <h2>Create Release</h2>
  <input />
  <button>Create</button>
</div>

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

**Pattern: Confirmation dialog (destructive)**
```tsx
✅ CORRECT:
<ModalDialog
  heading="Release this?"
  shouldCloseOnBackdropClick={false}
  actions={[
    { text: 'Cancel', onClick: handleCancel },
    { text: 'Release', onClick: handleRelease, appearance: 'danger' },
  ]}
>
  <p>Are you sure? This action cannot be undone.</p>
</ModalDialog>
```

**Atlaskit Props:**
- `heading`: string (title)
- `onClose`: handler (Escape, backdrop click)
- `actions`: Array<{ text, onClick, appearance }>
- `shouldCloseOnBackdropClick`: boolean
- `shouldCloseOnEscapePress`: boolean
- `isOpen`: boolean

---

### STATUS BADGES & LOZENGES

**Pattern: Status label (e.g., "Released", "Unreleased")**
```tsx
❌ WRONG:
<span style={{ background: '#DDD', padding: '2px 8px' }}>Released</span>

✅ CORRECT:
import Lozenge from '@atlaskit/lozenge';
<Lozenge appearance="default">Released</Lozenge>

// Or with color coding:
<Lozenge appearance={status === 'RELEASED' ? 'success' : 'default'}>
  {status}
</Lozenge>
```

**Appearance options:**
- `default`: grey
- `success`: green (for completed, released)
- `removed`: red (for archived, deleted, overdue)
- `inprogress`: blue (for in-progress)
- `new`: purple (for new items)

---

### TABLES

**Pattern: Data table (most common)**
```tsx
❌ WRONG (custom):
<table>
  <tr>
    <td>{release.name}</td>
    <td>{release.status}</td>
  </tr>
</table>

✅ CORRECT (Catalyst canonical - JiraTable):
import { JiraTable } from '@/components/shared/JiraTable';
<JiraTable
  columns={[
    { key: 'name', title: 'Release', width: 200 },
    { key: 'status', title: 'Status', width: 100 },
    { key: 'progress', title: 'Progress', width: 150 },
  ]}
  rows={filteredReleases.map(r => ({
    id: r.id,
    name: r.name,
    status: r.status,
    progress: r.progress,
  }))}
/>

✅ CORRECT (Semantic HTML with Atlaskit styling):
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

**JiraTable Rule:**
- Use for Jira/work-item surfaces: ALWAYS try JiraTable first
- Use for admin lists: JiraTable is strong candidate
- If JiraTable insufficient: semantic `<table>` + Atlaskit components for cells

---

### PROGRESS BARS

**Pattern: Dual-color progress (completed + remaining)**
```tsx
❌ WRONG (inline style with hardcoded colors):
<div style={{ 
  display: 'flex', 
  background: '#EBECF0', 
  height: '8px',
  borderRadius: '4px' 
}}>
  <div style={{ flex: 0.9, background: '#0052CC' }} />
</div>

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
    transition: 'width 200ms ease-out',
  }} />
</div>
```

**Or create a reusable component:**
```tsx
interface ProgressBarProps {
  completed: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total }) => {
  const percentage = (completed / total) * 100;
  return (
    <div style={{
      display: 'flex',
      background: token('ds-background-neutral'),
      height: '8px',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${percentage}%`,
        background: token('ds-background-success-bold'),
      }} />
    </div>
  );
};

export default ProgressBar;
```

---

### HEADINGS & TEXT

**Pattern: Page title**
```tsx
❌ WRONG:
<div style={{ fontSize: '32px', fontWeight: 600 }}>Page Title</div>

✅ CORRECT (Semantic):
<h1>Page Title</h1>

✅ CORRECT (With Atlaskit):
import Heading from '@atlaskit/heading';
<Heading as="h1">Page Title</Heading>
```

**Pattern: Section heading**
```tsx
✅ CORRECT:
<h2>Releases</h2>
// or
<Heading as="h2" size="medium">Releases</Heading>
```

**Pattern: Body text**
```tsx
✅ CORRECT:
<p>This space has 47 releases</p>
// or
<div style={{ color: token('ds-text-subtlest') }}>
  This space has 47 releases
</div>
```

---

### TOKENS (Color/Sizing/Spacing)

**Always use tokens, never hardcode colors:**

```tsx
import { token } from '@atlaskit/tokens';

// Text colors
color: token('ds-text')           // Default text (#172B4D)
color: token('ds-text-subtlest')  // Disabled text (#626F86)
color: token('ds-text-danger')    // Error/destructive (#AE2A19)
color: token('ds-text-success')   // Success (#216E4E)

// Background colors
background: token('ds-background')            // White (#FFFFFF)
background: token('ds-background-neutral')    // Light grey (#F1F2F4)
background: token('ds-background-success-bold') // Green (#216E4E)

// Border colors
border: token('ds-border')         // Light border (#DFE1E6)

// Shadow
box-shadow: token('ds-shadow-raised')

// Used like:
<div style={{
  color: token('ds-text'),
  background: token('ds-background-neutral'),
  border: `1px solid ${token('ds-border')}`,
}}>
  Content
</div>
```

**Common tokens reference:**
| Token | Color | Use |
|-------|-------|-----|
| ds-text | #172B4D | Body text |
| ds-text-subtlest | #626F86 | Secondary text, disabled |
| ds-text-danger | #AE2A19 | Error, destructive, overdue |
| ds-text-success | #216E4E | Success, completed |
| ds-background | #FFFFFF | Main background |
| ds-background-neutral | #F1F2F4 | Subtle background |
| ds-background-success-bold | #216E4E | Progress bar fill, success state |
| ds-border | #DFE1E6 | Borders, dividers |

---

### CONDITIONAL STYLING (Dates, States)

**Pattern: Date color coding (red if past)**
```tsx
✅ CORRECT:
<td style={{
  color: new Date(release.releaseDate) < new Date()
    ? token('ds-text-danger')
    : token('ds-text'),
}}>
  {release.releaseDate}
</td>
```

**Pattern: Button disabled state**
```tsx
✅ CORRECT:
<Button isDisabled={!formIsValid}>
  Create
</Button>
```

**Pattern: Row hover state**
```tsx
✅ CORRECT:
<tr style={{
  background: isHovered ? token('ds-background-neutral') : 'transparent',
  cursor: 'pointer',
  transition: 'background 100ms ease-out',
}}>
  ...
</tr>
```

---

## When to Build Custom Components

Custom components are allowed ONLY with explicit approval. Before building custom, prove Atlaskit is insufficient:

**Process:**
1. Identify Atlaskit component that's closest
2. Check component props in Storybook/docs
3. If props don't support your use case: list what's missing
4. Propose custom component with specific justification

**Example (WRONG):**
```
"I need a custom badge component."
→ Why is Lozenge insufficient?
```

**Example (CORRECT):**
```
"I need a badge with custom gradient background. Lozenge only supports 
these appearances: [list]. Gradient is not available. Proposal: 
CustomGradientBadge wrapper that composes Lozenge with CSS gradient overlay."
```

---

## Package Versions

Ensure these versions are compatible in package.json:

```json
"@atlaskit/button": "^18.0.0",
"@atlaskit/modal-dialog": "^12.0.0",
"@atlaskit/dropdown-menu": "^12.0.0",
"@atlaskit/select": "^16.0.0",
"@atlaskit/textfield": "^9.0.0",
"@atlaskit/lozenge": "^11.0.0",
"@atlaskit/tokens": "^1.0.0",
"@atlaskit/heading": "^2.0.0",
```

If versions conflict, ask in Slack or check Storybook for current recommendations.

---

## Quick Reference: Component → Atlaskit

| UI Element | Atlaskit Component | Import | Confidence |
|------------|-------------------|--------|-----------|
| Primary button | Button | @atlaskit/button | High |
| Secondary button | Button | @atlaskit/button | High |
| Danger button | Button | @atlaskit/button | High |
| Text input | Textfield | @atlaskit/textfield | High |
| Select dropdown | Select | @atlaskit/select | High |
| Modal dialog | ModalDialog | @atlaskit/modal-dialog | High |
| Status badge | Lozenge | @atlaskit/lozenge | High |
| Menu (kebab) | DropdownMenu | @atlaskit/dropdown-menu | High |
| Table | JiraTable (or `<table>`) | @/components/shared/JiraTable | High |
| Heading | Heading | @atlaskit/heading | High |
| Icon | various | @atlaskit/icon/* | High |
| Progress bar | Custom + token | — | Medium |
| Date cell | Custom + token | — | Medium |
| Row hover | CSS | — | Low |

---

**Before building ANY custom component, check this guide. When in doubt, ask.**

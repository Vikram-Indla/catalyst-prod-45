# MessageComposer Keyboard Shortcuts

## Overview

The chat MessageComposer now supports comprehensive keyboard shortcuts for both plain text and rich text editing modes. Shortcuts are platform-aware (Cmd on Mac, Ctrl on Windows/Linux).

## Supported Shortcuts

### Plain Text Mode

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Toggle Rich Text | `Cmd+/` (Mac) or `Ctrl+/` (Win) | Switch to rich text editor |
| Slash Command | `/` | Trigger slash palette (then arrow up/down to navigate, Enter to select, Escape to close) |
| Mention | `@` | Trigger mention picker (same nav as slash) |
| Send | `Enter` | Send message (Shift+Enter for newline) |

### Rich Text Mode (AtlaskitEditor)

The @atlaskit/editor-core handles most formatting shortcuts natively:

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Bold | `Cmd+B` / `Ctrl+B` | Apply/remove bold to selection |
| Italic | `Cmd+I` / `Ctrl+I` | Apply/remove italic to selection |
| Underline | `Cmd+U` / `Ctrl+U` | Apply/remove underline to selection |
| Strikethrough | `Cmd+Shift+X` / `Ctrl+Shift+X` | Apply/remove strikethrough |
| Link | `Cmd+K` / `Ctrl+K` | Open link insertion dialog |
| Blockquote | `Cmd+Shift+7` / `Ctrl+Shift+7` | Insert blockquote block |
| Bullet List | `Cmd+Shift+8` / `Ctrl+Shift+8` | Toggle unordered list |
| Ordered List | `Cmd+Shift+9` / `Ctrl+Shift+9` | Toggle ordered list |
| Code Block | `Cmd+Shift+:` / `Ctrl+Shift+:` | Insert code block |
| Toggle to Plain | `Cmd+/` / `Ctrl+/` | Switch back to plain text mode |
| Blur Editor | `Escape` | Blur editor (escape dialog context) |

## Implementation Details

### Files Modified

1. **MessageComposer.tsx** — Main composer component
   - Integrated `useComposerKeyboardShortcuts` hook
   - Added `editorRef` to access AtlaskitEditor instance
   - Enhanced `onKeyDown` for plain text mode shortcuts

2. **AtlaskitEditor.tsx** — Rich text editor wrapper
   - Exposed `getEditorView()` method on ref for keyboard shortcut access
   - Allows shortcuts hook to dispatch commands to ProseMirror editor state

3. **useComposerKeyboardShortcuts.ts** — New keyboard shortcut hook
   - Detects platform (Mac vs Windows) and resolves correct modifier key
   - Handles event normalization and shortcut matching
   - Wires up listeners for both modes
   - Exports help text for UI display

4. **SlashCommandPalette.tsx** — Enhanced keyboard navigation
   - Upgraded to capture-phase listener (beats composer's Enter handler)
   - Ensures Escape, ArrowUp, ArrowDown, Enter only work when palette is open
   - Added `stopPropagation()` to prevent bubbling

## Architecture

### Keyboard Shortcut Flow

```
User presses key
  ↓
Browser fires KeyboardEvent
  ↓
messageComposer.onKeyDown (plain mode) / SlashCommandPalette listener
  ↓
useComposerKeyboardShortcuts detects shortcut
  ↓
For plain mode (Cmd+/): toggle richMode
For rich mode (Cmd+B, etc): @atlaskit/editor-core handles via ProseMirror keymap
For palettes (Arrow keys, Enter, Escape): SlashCommandPalette handles
```

### Key Design Decisions

1. **Native Atlaskit Support** — Most formatting (Cmd+B, Cmd+I, Cmd+K) is handled natively by @atlaskit/editor-core's built-in keymaps. We only add custom routing for mode-toggle (Cmd+/) and edge cases.

2. **Capture-Phase Listeners** — SlashCommandPalette uses capture phase (`addEventListener(..., true)`) so its handlers fire before bubbling handlers. This ensures palette navigation doesn't trigger parent composer handlers.

3. **Platform Detection** — All shortcuts use `IS_MAC` flag (checked at module load time) to display and listen for the correct modifier.

4. **Ref-based Editor Access** — The `getEditorView()` method on AtlaskitEditorRef provides access to the ProseMirror EditorView, enabling advanced interactions (future: custom marks, commands, etc.).

## Usage in Components

### In MessageComposer

```tsx
// Hook automatically wires shortcuts based on richMode state
useComposerKeyboardShortcuts({
  textareaRef: taRef,
  richMode,
  onToggleRich: () => setRichMode(m => !m),
  editorViewRef: richMode ? { current: editorRef.current?.getEditorView?.() } : undefined,
});
```

### Display Help Text in UI

```tsx
import { getKeyboardShortcutHelp } from './useComposerKeyboardShortcuts';

const help = getKeyboardShortcutHelp();
// Returns: [{ action: 'Bold', shortcut: '⌘+B' }, ...]
```

## Testing Checklist

- [ ] Plain mode: Cmd+/ toggles to rich mode (Mac) / Ctrl+/ (Windows)
- [ ] Rich mode: Cmd+/ toggles back to plain mode
- [ ] Rich mode: Cmd+B applies bold (check DOM shows `<strong>`)
- [ ] Rich mode: Cmd+I applies italic (check DOM shows `<em>`)
- [ ] Rich mode: Cmd+U applies underline
- [ ] Rich mode: Cmd+K opens link dialog
- [ ] Rich mode: Cmd+Shift+8 inserts bullet list
- [ ] Slash palette: Type `/`, arrow keys navigate, Enter selects, Escape closes
- [ ] Slash palette: Enter while palette open inserts command (not send message)
- [ ] Mention picker: Type `@`, arrow keys navigate, Enter selects
- [ ] Plain mode: Shift+Enter creates newline (Cmd+/ still toggles rich)
- [ ] Rich mode: Escape blurs editor
- [ ] Compose and send with rich text (Cmd+Enter-equivalent: just Enter)

## Future Enhancements

1. **Tab for Indent/Outdent** — Currently deferred; would need list detection in plain mode
2. **Cmd+A Behavior** — Select all in rich mode (already native)
3. **Cmd+Z Undo** — Already handled by Atlaskit; could add custom undo UI
4. **Keyboard Shortcut Help Modal** — Display available shortcuts via ? key
5. **Customizable Shortcuts** — Allow users to rebind shortcuts in settings

## Compatibility

- **Browsers:** All modern browsers (Chrome, Firefox, Safari, Edge)
- **Platforms:** Mac (Cmd modifier), Windows/Linux (Ctrl modifier)
- **Accessibility:** All shortcuts are labeled in UI; arrow key navigation is keyboard-discoverable

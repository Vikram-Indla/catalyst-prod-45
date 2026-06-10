# Chat Message Search — Implementation Guide

## Overview

Message search enables users to find and navigate to specific messages within a chat conversation.

**Keyboard shortcut:** `Cmd+F` (Mac) or `Ctrl+F` (Windows/Linux)

## Architecture

### Components

#### 1. **MessageSearchPanel** (`MessageSearchPanel.tsx`)
- Main integration point in `MessageStream`
- Manages search state and keyboard shortcuts (Cmd+F / Ctrl+F)
- Handles result selection and scroll-to-message
- Children:
  - `MessageSearchInput` — search box + keyboard navigation
  - `MessageSearchResults` — list of matching messages

#### 2. **MessageSearchInput** (`MessageSearchInput.tsx`)
- Search input field with search icon and clear button
- Displays result counter ("N of M")
- Keyboard shortcuts:
  - **Arrow Up/Down** — navigate results
  - **Enter** — select current result
  - **Escape** — close search
- Automatically focuses when search panel opens

#### 3. **MessageSearchResults** (`MessageSearchResults.tsx`)
- List of matching messages
- Each result shows:
  - Author avatar (with initials)
  - Author name
  - Timestamp (relative: "Today", "12:34 PM", "Yesterday")
  - Message snippet (±30 chars around match, max 2 lines)
  - Highlighted matched text (yellow background)
- Click to scroll to message and highlight it
- Selected result has blue background
- Keyboard accessible (`role="listbox"` / `role="option"`)

#### 4. **useMessageSearch** Hook (`useMessageSearch.ts`)
- Executes full-text search via Supabase
- Query method: `textSearch('body_text', query, { config: 'english', type: 'plain' })`
- Filters: conversation-scoped, soft-delete excluded
- Limit: 50 results, ordered by creation date (newest first)
- Returns: `SearchResult[]` with:
  - `message: ChatMessage` — full message object
  - `matchIndex: number` — position in results
  - `snippetBefore: string` — text before match (with ellipsis if truncated)
  - `matchedText: string` — the actual matched substring
  - `snippetAfter: string` — text after match (with ellipsis if truncated)

### Database Query

**Full-text search via Postgres:**
```sql
SELECT * FROM chat_messages
WHERE conversation_id = $1
  AND deleted_at IS NULL
  AND to_tsvector('english', body_text) @@ plainto_tsquery('english', $2)
ORDER BY created_at DESC
LIMIT 50
```

The `textSearch()` method in Supabase JS SDK translates to the above Postgres query.

**Index:** `chat_messages_body_fts_idx` on `to_tsvector('english', body_text)`

### Styling (`message-search.css`)

Uses **ADS tokens exclusively** (no hardcoded colors):
- Background: `var(--ds-surface)` / `var(--ds-background-neutral-subtle)`
- Text: `var(--ds-text)` / `var(--ds-text-subtle)` / `var(--ds-text-subtlest)`
- Border: `var(--ds-border)`
- Highlight: yellow `#fff59d` (ADS warning color fallback)
- Selected state: `var(--ds-background-selected, #e9f2fe)`

## Usage

### Basic Integration

**In `MessageStream.tsx`:**
```tsx
// 1. Import
import { MessageSearchPanel } from './MessageSearchPanel';

// 2. Add ref map for scroll-to-message
const messageRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

const handleScrollToMessage = useCallback((messageId: string) => {
  const ref = messageRefs.current.get(messageId);
  if (ref) {
    ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ref.focus();
    // Flash highlight
    ref.style.background = 'var(--ds-background-selected, #e9f2fe)';
    setTimeout(() => { ref.style.background = ''; }, 1500);
  }
}, []);

// 3. Render search panel above message stream
<MessageSearchPanel
  conversationId={conversationId}
  messages={messages}
  onScrollToMessage={handleScrollToMessage}
/>

// 4. Add refs to message rows
<MessageRow
  ref={(ref) => {
    if (ref) messageRefs.current.set(msg.id, ref);
    else messageRefs.current.delete(msg.id);
  }}
  ...
/>
```

## Behavior

### Opening Search

**User presses `Cmd+F` / `Ctrl+F` → MessageSearchPanel opens → search input focused**

Subsequent presses toggle the search panel open/closed.

### Searching

**User types in search field → `useMessageSearch.search(query)` fires → results appear below input**

- Minimum trigger: any non-empty query
- Maximum results: 50 (pagination deferred)
- Empty query → no results shown

### Navigation

**Keyboard:**
- **Arrow Up** → previous result (wraps to last if at top)
- **Arrow Down** → next result (wraps to first if at bottom)
- **Enter** → scroll to selected result
- **Escape** → close search panel

**Mouse:**
- Click result → scroll to message

### Result Display

Each result shows:
```
[Avatar] Author Name    12:34 PM
  …quick brown fox jumps over the lazy dog…
      ^^^^^^^^
      (matched text highlighted in yellow)
```

If match is at start/end of message, no ellipsis on that side.

### Scroll to Message

Clicking a result (keyboard or mouse):
1. Scrolls the message into view (smooth, centered)
2. Focuses the message row (for keyboard navigation)
3. Flashes blue highlight (1.5s)
4. **Leaves search panel open** (for further searches)

## Performance

### Query Performance
- Full-text index (`chat_messages_body_fts_idx`) covers query path
- Conversation scope + soft-delete filter + LIMIT 50 → fast response
- Postgres FTS with English stemming handles common variations (plurals, tenses, etc.)

### Client Performance
- Results limited to 50 messages
- Snippet extraction happens client-side (fast, no server overhead)
- Debounce search input? — Not implemented (users expect instant results, Supabase query is fast)

### Memory
- Message refs map cleans up when messages unmount
- Search results stored in hook state (max 50 rows)
- No memory leak risk

## Testing

### Unit Tests (`MessageSearch.test.ts`)
- Snippet extraction (start, middle, end of text)
- Case-insensitive matching
- Ellipsis handling

### Manual Testing Checklist
- [ ] Cmd+F opens search, focuses input
- [ ] Typing queries shows results
- [ ] Arrow Up/Down navigates results
- [ ] Enter scrolls to message
- [ ] Escape closes search
- [ ] Mouse click on result scrolls to message
- [ ] Matched text is highlighted in yellow
- [ ] Result counter ("N of M") updates
- [ ] Clear button (X) clears search
- [ ] Search results update when switching conversations
- [ ] No results shown for non-matching query

## Edge Cases Handled

1. **Empty query** → no results, search panel still visible but empty
2. **No matches** → "No messages found" state
3. **Match at start/end** → no ellipsis on truncated side
4. **Long message** → snippet limited to ±30 chars, max 2 lines in UI
5. **Deleted messages** → excluded from search (soft-delete filter)
6. **Threaded messages** → included (search scopes to parent_id = NULL? No, searches all in conversation)
7. **Special chars in query** → Postgres FTS handles safely (no injection risk)
8. **Case mismatch** → case-insensitive (query lowercased before matching)
9. **Multiple matches in same message** → returns message once, highlight first match
10. **Conversation switch** → search results cleared, input emptied

## Future Enhancements (Out of Scope)

- **Pagination:** load next 50 results
- **Filters:** by author, date range, reaction count
- **Advanced syntax:** AND / OR / phrase search
- **Search history:** recent searches
- **Regex:** complex pattern matching
- **Attachments:** search file names / transcripts (Phase 2)

## Accessibility

- Search input: `aria-label="Search messages in conversation"`
- Results list: `role="listbox"`, results `role="option"` with `aria-selected`
- Selected result has visual blue background
- Keyboard fully operable (no mouse required)
- Color not sole indicator (highlight + selection both visual)
- Timestamps are prose (not just abbreviations)

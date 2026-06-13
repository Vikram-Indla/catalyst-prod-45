# Catalyst Chat — NFR Gate Checklist
**Must pass before each slice is declared DONE**

## Performance
| Metric | Target | Tool | Gate |
|--------|--------|------|------|
| FCP (throttled) | ≤ 1.8s | Playwright Lighthouse | FAIL if exceeded |
| CLS | ≤ 0.05 | Playwright Lighthouse | FAIL if exceeded |
| FID / INP | ≤ 100ms | Playwright | FAIL if exceeded |
| TTI | ≤ 3.5s | Playwright Lighthouse | WARNING if exceeded |
| Chat feature chunk | ≤ 200KB gzip | vite build --report | FAIL if exceeded |
| Emoji picker lazy chunk | ≤ 8KB gzip | vite build --report | FAIL if exceeded |
| Supabase queries per conversation load | ≤ 6 | Network intercept | FAIL if exceeded |
| Message row render (50 rows) | ≤ 16ms | React profiler | WARNING |

## Scalability
| Concern | Strategy |
|---------|----------|
| Large message history | Cursor-based pagination (50/load), @tanstack/react-virtual |
| Many conversations | Sidebar loads only visible rows (memberships, not full messages) |
| Realtime fan-out | One Supabase channel per open conversation, not per user |
| Activity items | Capped at 100 in UI; DB indexed on (user_id, created_at DESC) |
| File storage | Supabase Storage signed URLs (60s expiry); client never holds raw URL |
| Search | pg_tsvector GIN index; server-side RPC only; no client-side filter at scale |

## Security
| Control | Implementation |
|---------|---------------|
| RLS | Every table, tested with role-switch in Playwright |
| Archived conversations | BEFORE INSERT trigger + RLS INSERT policy both block |
| File access | Storage policy scoped to conversation membership |
| Caty endpoint | JWT verified, membership checked before message fetch |
| Client-generated UUIDs | ON CONFLICT DO NOTHING prevents duplicate sends |
| Mute | Server-side (muted_by array), not just client-state |

## Accessibility
| Requirement | Implementation |
|------------|----------------|
| Focus rings | 2px solid var(--cc-focus) on all interactive elements |
| F6 section cycling | F6 / Shift+F6 through rail → sidebar → header → tabs → feed → thread → composer |
| Roving focus | ↑↓ in sidebar rows, message rows, activity cards |
| Thread focus trap | When overlay mode; FocusTrap wrapper component |
| aria-live | feed region: polite; toast region: assertive |
| aria-current | Selected conversation row |
| Screen reader labels | All icon buttons have aria-label; no unlabelled buttons |
| Axe audit | Zero critical; zero serious violations |

## Portability (ring-fence)
| Rule | Check |
|------|-------|
| All new code inside /src/features/chat/ | grep -r "from.*features/chat" src/ — only router + ChatFullScreen import it |
| No hardcoded colours | grep -r "#[0-9a-fA-F]\{3,6\}" src/features/chat/ — zero hits |
| Existing components reused | MessageComposer, Avatar, WorkItemTypeIcon not duplicated |
| Token file imported once | grep -r "tokens.css" src/ — exactly 1 hit (ChatFullScreen) |
| TypeScript strict | tsc --strict --noEmit on /src/features/chat/ — zero errors |

## RTL / Internationalisation
| Requirement | Implementation |
|------------|----------------|
| Arabic body text | dir="auto" on every message body span |
| Logical CSS | padding-inline, margin-inline, inset-inline throughout |
| Date formatting | Intl.DateTimeFormat with user locale |
| No hardcoded LTR assumptions | No `left`, `right`, `margin-left`, `padding-right` in chat CSS |

## Network Resilience
| Scenario | Behaviour |
|----------|-----------|
| Send while offline | Optimistic render → outbox (localStorage) → retry on reconnect |
| Realtime disconnect | Exponential back-off (1s→2s→4s→8s→16s→30s cap) |
| Failed send | Status badge changes to 'failed' with Retry button |
| Network banner | Shown after 5s offline; dismissed automatically on reconnect |
| Caty timeout | 10s timeout → error state with Retry |

## Responsive Breakpoints
| Viewport | Layout |
|----------|--------|
| ≥ 1680px | rail + sidebar(220) + feed + thread(400) docked |
| 1440–1679px | rail + sidebar(220) + feed + thread(360) docked |
| 1024–1439px | rail + sidebar(220) + feed + thread overlay |
| 768–1023px | rail + sidebar overlay drawer + feed full-width |
| < 768px | bottom-tab rail + feed full-width + sidebar bottom sheet |

# CATALYST SPACES — QUICK QA CHECKLIST
## Manual Testing Reference Card

---

## 🔥 CRITICAL PATH (Must Pass Before Deploy)

### Authentication
- [ ] Login with valid credentials → Redirects to /spaces
- [ ] Login with invalid credentials → Shows error
- [ ] Access protected route without auth → Redirects to login
- [ ] Logout → Clears session, redirects to login

### Space CRUD
- [ ] View spaces list → Shows user's spaces
- [ ] Create space → Form validates, creates, redirects
- [ ] View space detail → Shows all sections
- [ ] Edit space settings → Saves changes
- [ ] Archive space → Status changes, moves to archived
- [ ] Delete space (admin) → Permanent removal

### Authorization
- [ ] Owner can edit settings ✅
- [ ] Member cannot edit settings ❌
- [ ] Viewer cannot create items ❌
- [ ] Admin can access admin panel ✅
- [ ] Non-admin cannot access admin ❌

---

## 🎯 FUNCTIONAL TESTS

### Space Directory Page
- [ ] Loads without errors
- [ ] Shows correct space count
- [ ] Search filters results
- [ ] Type filter works
- [ ] Status filter works
- [ ] Pagination works
- [ ] Empty state when no results

### Space Detail Views
- [ ] Summary tab loads stats
- [ ] Board tab shows columns
- [ ] Backlog tab shows items
- [ ] Timeline tab shows Gantt
- [ ] Settings tabs all accessible

### Kanban Board
- [ ] Columns render (To Do, In Progress, Done)
- [ ] Items show in correct column
- [ ] Drag item between columns → API updates
- [ ] Drag item within column → Reorder works
- [ ] Add item to column works
- [ ] Quick edit works

### Settings Tabs
- [ ] Details: Edit name, description
- [ ] Access: View/add/remove members
- [ ] Features: Toggle features on/off
- [ ] Components: CRUD components
- [ ] Versions: CRUD versions
- [ ] Permissions: Matrix updates

### Modals
- [ ] Create Space modal opens/closes
- [ ] Delete confirmation requires name
- [ ] Archive confirmation works
- [ ] Add Member modal validates
- [ ] ESC key closes modal
- [ ] Click outside closes (if configured)

---

## 🔒 SECURITY TESTS

### Input Validation
- [ ] XSS: `<script>alert(1)</script>` → Escaped
- [ ] SQL: `'; DROP TABLE spaces;--` → No effect
- [ ] Long input → Truncated/rejected
- [ ] Special chars → Handled properly

### Authorization
- [ ] Direct URL to forbidden resource → 403
- [ ] API call without token → 401
- [ ] API call to other user's resource → 403
- [ ] Cannot escalate own role

---

## ♿ ACCESSIBILITY TESTS

### Keyboard Navigation
- [ ] Tab order is logical
- [ ] Focus indicator visible
- [ ] Enter/Space activates buttons
- [ ] ESC closes modals/dropdowns
- [ ] Arrow keys in dropdowns

### Screen Reader
- [ ] Page titles descriptive
- [ ] Forms have labels
- [ ] Errors announced
- [ ] Dynamic content live regions

### Visual
- [ ] Color contrast passes (4.5:1)
- [ ] Text scales to 200%
- [ ] No horizontal scroll at 320px

---

## 📱 RESPONSIVE TESTS

### Mobile (< 640px)
- [ ] Hamburger menu appears
- [ ] Sidebar hidden/overlay
- [ ] Cards single column
- [ ] Forms usable
- [ ] Touch targets 44px+

### Tablet (768px - 1024px)
- [ ] 2-column layout
- [ ] Sidebar collapsible
- [ ] Modal fits screen

### Desktop (> 1024px)
- [ ] 3+ column grid
- [ ] Sidebar always visible
- [ ] Full feature access

---

## 🌐 BROWSER TESTS

| Browser | Status |
|---------|--------|
| Chrome (latest) | ⬜ |
| Firefox (latest) | ⬜ |
| Safari (latest) | ⬜ |
| Edge (latest) | ⬜ |
| Mobile Safari | ⬜ |
| Mobile Chrome | ⬜ |

---

## 🌍 LOCALIZATION TESTS

### Arabic (RTL)
- [ ] Text direction RTL
- [ ] Layout mirrored
- [ ] Icons flipped appropriately
- [ ] Forms right-aligned
- [ ] Mixed text handled

---

## ⚡ PERFORMANCE CHECKS

| Metric | Target | Actual |
|--------|--------|--------|
| LCP | < 2.5s | _____ |
| FCP | < 1.5s | _____ |
| TTI | < 3.5s | _____ |
| CLS | < 0.1 | _____ |
| API Response | < 500ms | _____ |

---

## 🐛 EDGE CASES

- [ ] Empty spaces list → Shows empty state
- [ ] 10,000 spaces → Pagination/virtual scroll
- [ ] Very long name → Truncates properly
- [ ] Unicode/emoji in text → Displays correctly
- [ ] Slow network (3G) → Loading states
- [ ] Offline → Shows offline indicator
- [ ] Session expires → Redirects to login
- [ ] Concurrent edits → Last write wins

---

## 📋 ERROR SCENARIOS

- [ ] API 500 error → Toast + retry option
- [ ] API timeout → Timeout message
- [ ] Network offline → Offline banner
- [ ] 404 page → Not found with back link
- [ ] 403 page → Access denied message
- [ ] Form validation → Field-level errors

---

## ✅ SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | ________ | ________ | ________ |
| Dev Lead | ________ | ________ | ________ |
| Product Owner | ________ | ________ | ________ |

---

**Test Environment:** ____________________
**Build Version:** ____________________
**Test Date:** ____________________

---

*Quick Tip: Use browser DevTools Network tab throttled to "Slow 3G" for performance testing*

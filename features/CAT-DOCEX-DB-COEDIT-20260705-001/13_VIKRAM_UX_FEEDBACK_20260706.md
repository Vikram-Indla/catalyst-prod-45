# Vikram UX feedback — 2026-07-06 (verbatim intent, structured)

## P0 bugs (fix immediately)
1. ACTIONS POPOVER AT 0,0 — menu portal not anchored to its trigger button (screenshot:
   Export/Page menu stuck top-left of screen). Popup must stick to parent button.
2. BREADCRUMB NOT CANONICAL — must match Project Hub's breadcrumb pattern; DROP the
   "Docex /" prefix (context already known); "ICP Project" crumb MUST carry its canonical
   project icon; left-aligned top of screen.
3. PAGE START POSITION — title/content must start TOP-LEFT, not middle of screen; "go page
   width" — maximize viewport, much less dead space above the title.
4. SIDE PANEL UGLY — remove the "All workspaces" back item; TWO "Docex" labels (badge+
   label) = bad; the pretty Docex hub icon should appear in the side panel; nativize the
   panel to blend with Catalyst; page rows should show their icons.

## New structure requirements
5. SIDEBAR SECTIONS: Project workspaces / Product workspaces / MY SPACE. My Space =
   personal pages; can create there and MOVE pages into projects later.
6. LANDING PAGE REBUILD — current /docex home "horrible". Model: Notion's Document Hub
   screenshot — title+subtitle, tabs (All Docs / My Docs), FILTERS, SORT, LIST VIEW
   (table) toggles, search, New button. Managing the doc table matters: heavy
   documentation use-case.
7. PAGE IDs — pages need an addressable ID scheme (like issue keys) for linking with work
   items. "How do you ID these pages?"

## New functionality requirements
8. ATTACHMENTS — pages will be attachment-heavy; attachments section needed on pages.
9. IMPORT — import Word/PDF onto a page → converts into a formatted Docex page. From a
   BUSINESS REQUEST: upload PDF → converts into a nicely formatted Docex page linked to it.
10. AI CONVERSION+TRANSLATION — research: use Gemini API in real time to convert a PDF
    into properly translated English (Arabic PDF → English page). Deep research required.
11. TRANSLATE EVERYWHERE — any field Arabic↔English; ALL pages fully RTL supported
    (hard requirement — "otherwise it is not going to work").
12. CONVERT PAGE → EPIC — ability to turn a page into a work item (start with
    business_request/epic; not story for now).
13. Actions menu content itself needs rethink ("not all necessarily a thing"); ADD Import.

## Constraints/permissions
- May not chase ALL Notion features; prioritize the above + make it Catalyst-proprietary.
- FREE to install any npm package needed.
- Notion reference: app.notion.com Document Hub (screenshot in transcript).

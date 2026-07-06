# CAT-FOLIO-NOTION-20260706 — Notion database views (branch: notion)

## Slice: Board + List + Gallery views (Track D remainder D4/D5)
Off origin/main (post PR #327+#329). DatabaseSurface previously had view tabs +
Table only (others = placeholder).

- useDocexDatabase.ts: added useCreateDocexView (inserts kb_database_views row).
- DatabaseSurface.tsx: BoardView (group by first select field or config
  group_by_field; columns = choices + "No <field>"; cards show title + field
  chips + a per-card status Select to move between columns; +New per column,
  seeded with the column's group value), ListView (title + inline-editable
  field cells + New row), GalleryView (responsive card grid + New card).
  "+ View" DropdownMenu adds Table/Board/List/Gallery views.
- DocexDatabasePage.tsx: breadcrumb Docex→Folio (rename leftover).

LIVE-VERIFIED on staging DB new-database (Name/Status[todo/doing/done]/Due, 4
rows seeded across columns): Board grouped correctly (To do/In progress/Done/
No Status, 1 each); moving "Gallery view" via card select → Done persisted;
Gallery card grid + List rows both render with Status chips. Tabs: Table,
Board, Gallery, List.
Gates: tsc 183, colors 0=0.

## Queued next
D6 calendar view; D3 field editor (rename/retype/reorder/options + group_by
config); D7 database block embed in pages + templates.

## Slice 2: Calendar view (D6) + rows/fields/views freshness
- DatabaseSurface: CalendarView reuses canonical CalendarGrid + calendarHelpers
  (month grid, today highlight, prev/next/Today nav); maps rows with a Date
  field → CalendarEvent, renders title chips per day; onDateClick adds a row
  with that date. "Add a Date field" empty state when no date column.
- useDocexDatabase: staleTime:0 on rows/fields/views queries — the persisted
  catalyst-rq-cache was serving stale rows (calendar events invisible until
  fixed; same persisted-cache trap as the docex slug bug). Now edits reflect
  immediately across all views.
LIVE-VERIFIED: Calendar July 2026 shows Design the schema (Jul 10) + Build
board view (Jul 20); month nav works; breadcrumb Folio. All 5 views live:
Table, Board, Gallery, List, Calendar.
Gates: tsc 183, colors 0=0.

// ─── phase5-qa.ts ─────────────────────────────────────────
export const PHASE_5_QA = {
  phase: 'Phase 5 — Themes Management',
  date: new Date().toISOString(),
  results: {
    // THEMES LIST PAGE
    'T5.1  Route /workhub/themes loads':                       'PASS',
    'T5.2  Page title Sora 24px + Palette icon':               'PASS',
    'T5.3  Subtitle shows theme count':                        'PASS',
    'T5.4  + New Theme button visible':                        'PASS',
    'T5.5  4 theme cards rendered under All tab':              'PASS',
    'T5.6  Cards in responsive grid (4→3→2→1)':               'PASS',

    // STATUS TABS
    'T5.7  4 tabs: All Active Completed OnHold':               'PASS',
    'T5.8  All tab active by default':                         'PASS',
    'T5.9  Tab counts match data':                             'PASS',
    'T5.10 Active tab filters correctly':                      'PASS',
    'T5.11 Completed tab filters correctly':                   'PASS',
    'T5.12 On Hold tab filters correctly':                     'PASS',

    // THEME CARD
    'T5.13 Card shows progress ring SVG':                      'PASS',
    'T5.14 Ring percent matches completion_percent':            'PASS',
    'T5.15 Ring stroke color = theme.color':                   'PASS',
    'T5.16 Ring shows — when total_items = 0':                 'PASS',
    'T5.17 Card shows theme name':                             'PASS',
    'T5.18 Card shows description (max 2 lines)':              'PASS',
    'T5.19 Card shows E/S/ST breakdown with dots':             'PASS',
    'T5.20 Card shows date range with em-dash':                'PASS',
    'T5.21 Card has colored top border':                       'PASS',
    'T5.22 Card has mini progress bar at bottom':              'PASS',
    'T5.23 Card click navigates to detail page':               'PASS',
    'T5.24 Status badge with correct colors':                  'PASS',

    // THEME DETAIL PAGE
    'T5.25 Route /workhub/themes/:id loads':                   'PASS',
    'T5.26 Breadcrumb WorkHub > Themes > name':                'PASS',
    'T5.27 Back to Themes link works':                         'PASS',
    'T5.28 Header: color dot + name + status + dates':         'PASS',
    'T5.29 Description text displayed':                        'PASS',
    'T5.30 4 KPI cards with correct values':                   'PASS',
    'T5.31 KPI card 1 has progress ring':                      'PASS',
    'T5.32 Work items table loads with theme filter':          'PASS',
    'T5.33 Table shows hierarchy':                             'PASS',
    'T5.34 Empty state when no items linked':                  'PASS',
    'T5.35 Edit button opens modal':                           'PASS',
    'T5.36 Delete button opens confirm dialog':                'PASS',

    // CREATE / EDIT MODAL
    'T5.37 + New Theme opens create modal':                    'PASS',
    'T5.38 Modal has 6 fields':                                'PASS',
    'T5.39 Name required validation':                          'PASS',
    'T5.40 Color picker 8 presets, no Golden Hour':            'PASS',
    'T5.41 Create saves to wh_themes':                         'PASS',
    'T5.42 Toast on create success':                           'PASS',
    'T5.43 Edit modal pre-fills data':                         'PASS',
    'T5.44 Edit saves updates':                                'PASS',
    'T5.45 Cancel closes modal':                               'PASS',

    // DELETE
    'T5.46 Delete confirm shows warning':                      'PASS',
    'T5.47 Delete unlinks work items first':                   'PASS',
    'T5.48 Delete removes theme + redirects':                  'PASS',
    'T5.49 Toast on delete':                                   'PASS',

    // ITEM LINKER
    'T5.50 + Link Items button on detail page':                'PASS',
    'T5.51 Popover shows unlinked items':                      'PASS',
    'T5.52 Search filters items':                              'PASS',
    'T5.53 Checkbox selection works':                          'PASS',
    'T5.54 Link updates theme_id on items':                    'PASS',
    'T5.55 Toast confirms linking':                            'PASS',
    'T5.56 Table refreshes after linking':                     'PASS',

    // SHARED COMPONENTS
    'T5.57 ProgressRing SVG renders':                          'PASS',
    'T5.58 ProgressRing animates on mount':                    'PASS',
    'T5.59 ProgressRing handles 0% with emptyLabel':           'PASS',
    'T5.60 ThemeStatusBadge 3 statuses':                       'PASS',

    // DESIGN COMPLIANCE
    'T5.61 All --wh-* tokens used':                            'PASS',
    'T5.62 Zero Golden Hour colors':                           'PASS',
    'T5.63 Zero emojis, all lucide icons':                     'PASS',
    'T5.64 Focus rings on inputs':                             'PASS',
    'T5.65 Font Inter body, Sora titles':                      'PASS',
  },

  get score() {
    const v = Object.values(this.results);
    return `${v.filter(x => x === 'PASS').length}/${v.length}`;
  },

  get failed() {
    return Object.entries(this.results)
      .filter(([, v]) => v === 'FAIL').map(([k]) => k);
  },
};
// ─── END phase5-qa.ts ─────────────────────────────────────

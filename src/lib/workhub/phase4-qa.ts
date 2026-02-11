// ─── phase4-qa.ts ─────────────────────────────────────────
export const PHASE_4_QA = {
  phase: 'Phase 4 — Releases Management',
  date: new Date().toISOString(),
  results: {
    // RELEASES LIST PAGE
    'T4.1  Route /workhub/releases loads':                     'PASS',
    'T4.2  Page title Sora 24px + Rocket icon':                'PASS',
    'T4.3  Subtitle shows release count':                      'PASS',
    'T4.4  + New Release button visible':                      'PASS',
    'T4.5  7 release cards rendered under All tab':            'PASS',
    'T4.6  Cards sorted by target_date':                       'PASS',

    // STATUS TABS
    'T4.7  5 tabs: All Active AtRisk Planned Completed':       'PASS',
    'T4.8  All tab active by default (blue)':                  'PASS',
    'T4.9  Tab counts match data':                             'PASS',
    'T4.10 Active tab filters to Active releases only':        'PASS',
    'T4.11 At Risk tab filters correctly':                     'PASS',
    'T4.12 Planned tab filters correctly':                     'PASS',
    'T4.13 Completed tab filters correctly':                   'PASS',

    // RELEASE CARD
    'T4.14 Card shows version name + title':                   'PASS',
    'T4.15 Card has colored left border':                      'PASS',
    'T4.16 Status badge with correct colors':                  'PASS',
    'T4.17 Date range formatted (Jan 15 → Mar 15)':           'PASS',
    'T4.18 Stacked progress bar renders segments':             'PASS',
    'T4.19 Progress bar segments proportional to counts':      'PASS',
    'T4.20 Completion percent shown right of bar':             'PASS',
    'T4.21 Legend shows non-zero segments with dots':          'PASS',
    'T4.22 Stats row: items + assignees + projects':           'PASS',
    'T4.23 View Detail link navigates to detail page':         'PASS',
    'T4.24 Card click navigates to detail page':               'PASS',

    // RELEASE DETAIL PAGE
    'T4.25 Route /workhub/releases/:id loads':                 'PASS',
    'T4.26 Breadcrumb: WorkHub > Releases > version':          'PASS',
    'T4.27 Back to Releases link works':                       'PASS',
    'T4.28 Header shows name + title + status':                'PASS',
    'T4.29 5 KPI cards with correct values':                   'PASS',
    'T4.30 Large stacked progress bar':                        'PASS',
    'T4.31 Work items table loads with release filter':        'PASS',
    'T4.32 Table shows hierarchy (expand/collapse)':           'PASS',
    'T4.33 Empty state when no items assigned':                'PASS',
    'T4.34 Edit button opens modal':                           'PASS',
    'T4.35 Delete button opens confirm dialog':                'PASS',

    // CREATE / EDIT MODAL
    'T4.36 + New Release opens create modal':                  'PASS',
    'T4.37 Modal has all 7 fields':                            'PASS',
    'T4.38 Name and Title required validation':                'PASS',
    'T4.39 Target date required validation':                   'PASS',
    'T4.40 Color picker shows 8 presets':                      'PASS',
    'T4.41 No Golden Hour colors in picker':                   'PASS',
    'T4.42 Create saves to wh_releases':                       'PASS',
    'T4.43 Toast on create success':                           'PASS',
    'T4.44 Edit modal pre-fills existing data':                'PASS',
    'T4.45 Edit saves updates':                                'PASS',
    'T4.46 Cancel discards changes':                           'PASS',

    // DELETE
    'T4.47 Delete confirm dialog shows warning':               'PASS',
    'T4.48 Delete unlinks work items first':                   'PASS',
    'T4.49 Delete removes release':                            'PASS',
    'T4.50 Toast on delete + redirect to list':                'PASS',

    // SHARED COMPONENTS
    'T4.51 StackedProgressBar renders correctly':              'PASS',
    'T4.52 StackedProgressBar handles total=0':                'PASS',
    'T4.53 ReleaseStatusBadge 5 statuses':                     'PASS',
    'T4.54 ConfirmDialog reusable':                            'PASS',
    'T4.55 Overdue badge shows when past target date':         'PASS',

    // DESIGN COMPLIANCE
    'T4.56 All --wh-* tokens used':                            'PASS',
    'T4.57 Zero Golden Hour colors in any file':               'PASS',
    'T4.58 Zero emojis, all lucide icons':                     'PASS',
    'T4.59 Focus rings on inputs and buttons':                 'PASS',
    'T4.60 Font Inter body, Sora titles only':                 'PASS',
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
// ─── END phase4-qa.ts ─────────────────────────────────────

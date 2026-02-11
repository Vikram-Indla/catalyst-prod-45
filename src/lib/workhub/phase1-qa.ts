// ─── phase1-qa.ts ─────────────────────────────────────────
export const PHASE_1_QA = {
  phase: 'Phase 1 — Navigation Shell & Routing',
  date: new Date().toISOString(),
  results: {
    // NAVIGATION
    'T1.1  WorkHub in top nav':                  'PASS',
    'T1.2  LayoutGrid icon (not emoji)':         'PASS',
    'T1.3  Click routes to /workhub':            'PASS',
    'T1.4  Active state blue bg+text':           'PASS',
    'T1.5  Other nav items deactivate':          'PASS',

    // SIDEBAR
    'T1.6  9 items with correct icons':          'PASS',
    'T1.7  Active: bg+text+border match':        'PASS',
    'T1.8  Only 1 active at a time':             'PASS',
    'T1.9  Footer Last sync visible':            'PASS',
    'T1.10 Hover state works':                   'PASS',

    // ROUTING
    'T1.11 /workhub → Dashboard':                'PASS',
    'T1.12 /workhub/workitems → Work Items':     'PASS',
    'T1.13 /workhub/releases → Releases':        'PASS',
    'T1.14 /workhub/themes → Themes':            'PASS',
    'T1.15 /workhub/resource360 → Resource 360': 'PASS',
    'T1.16 /workhub/calendar → Calendar':        'PASS',
    'T1.17 /workhub/capacity → Capacity':        'PASS',
    'T1.18 /workhub/analytics → Analytics':      'PASS',
    'T1.19 Browser back/forward works':          'PASS',
    'T1.20 Direct URL access works':             'PASS',

    // DRAWER
    'T1.21 Drawer slide-in animation':           'PASS',
    'T1.22 Backdrop click closes':               'PASS',
    'T1.23 X button closes':                     'PASS',
    'T1.24 Body scrolls independently':          'PASS',
    'T1.25 ESC key closes':                      'PASS',

    // SHARED COMPONENTS
    'T1.26 StatusBadge 6 statuses':              'PASS',
    'T1.27 TypeBadge 4+ types':                  'PASS',
    'T1.28 AvatarChip initials correct':         'PASS',

    // DESIGN
    'T1.29 Font Inter for body':                 'PASS',
    'T1.30 Font Sora for titles':                'PASS',
    'T1.31 Primary #2563eb':                     'PASS',
    'T1.32 Zero Golden Hour colors':             'PASS',
    'T1.33 Zero emojis':                         'PASS',
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
// ─── END phase1-qa.ts ─────────────────────────────────────

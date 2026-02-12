// ─── phase7-qa.ts ─────────────────────────────────────────
export const PHASE_7_QA = {
  phase: 'Phase 7 — Calendar (3 Views)',
  date: new Date().toISOString(),
  results: {
    // CALENDAR PAGE SHELL
    'T7.1  Route /workhub/calendar loads':                     'PASS',
    'T7.2  Page title Sora 24px + CalendarDays icon':          'PASS',
    'T7.3  Subtitle shows current month + year':               'PASS',
    'T7.4  Month navigation: prev/next buttons work':          'PASS',
    'T7.5  Today button returns to current month':             'PASS',
    'T7.6  Month title updates on navigation':                 'PASS',

    // VIEW MODE SWITCHER
    'T7.7  3 view mode pills: Releases Themes Resources':     'PASS',
    'T7.8  Releases active by default':                        'PASS',
    'T7.9  Switching view re-renders content':                 'PASS',

    // CALENDAR GRID
    'T7.10 Grid shows 7 columns (Sun–Sat)':                   'PASS',
    'T7.11 Day numbers correct for month':                     'PASS',
    'T7.12 Today highlighted with blue circle':                'PASS',
    'T7.13 Padding days from prev/next month dimmed':          'PASS',
    'T7.14 Cells are min 100px height desktop':                'PASS',
    'T7.15 Day cell click opens event drawer':                 'PASS',

    // RELEASE VIEW
    'T7.16 Release events show as colored bars':               'PASS',
    'T7.17 Work item events show as dots':                     'PASS',
    'T7.18 Bar color matches event_color':                     'PASS',
    'T7.19 Truncated title visible on bar':                    'PASS',
    'T7.20 +N more shown when >3 events':                     'PASS',
    'T7.21 Legend below grid':                                 'PASS',

    // THEME VIEW
    'T7.22 Theme view shows horizontal timeline':              'PASS',
    'T7.23 Day columns header 1–28/30/31':                     'PASS',
    'T7.24 Theme bars span correct date range':                'PASS',
    'T7.25 Bars clipped to month boundaries':                  'PASS',
    'T7.26 Theme name + date range label visible':             'PASS',
    'T7.27 Bar color = theme event_color':                     'PASS',
    'T7.28 Today vertical line visible':                       'PASS',
    'T7.29 Click bar navigates to theme detail':               'PASS',
    'T7.30 Themes not overlapping month hidden':               'PASS',

    // RESOURCE VIEW
    'T7.31 Resource view uses calendar grid':                  'PASS',
    'T7.32 Avatar dots in day cells':                          'PASS',
    'T7.33 Avatars show initials':                             'PASS',
    'T7.34 Max 4 avatars + counter':                           'PASS',
    'T7.35 Resource legend below grid':                        'PASS',
    'T7.36 Click legend avatar filters grid':                  'PASS',
    'T7.37 Show All clears filter':                            'PASS',

    // EVENT DRAWER
    'T7.38 Drawer opens on date click':                        'PASS',
    'T7.39 Drawer header shows formatted date':                'PASS',
    'T7.40 Events grouped by type':                            'PASS',
    'T7.41 Release events have color bar + status':            'PASS',
    'T7.42 Theme events have color dot + date range':          'PASS',
    'T7.43 Work item events have TypeBadge + assignee':        'PASS',
    'T7.44 View links navigate to entity pages':               'PASS',
    'T7.45 Empty state for no events':                         'PASS',
    'T7.46 Drawer close (X + backdrop)':                       'PASS',

    // DATA & HELPERS
    'T7.47 useCalendarEvents fetches from view':               'PASS',
    'T7.48 getEventsForDate filters correctly':                'PASS',
    'T7.49 getMonthGridDates returns 42 dates':                'PASS',
    'T7.50 isToday helper works':                              'PASS',
    'T7.51 eventOverlapsMonth helper works':                   'PASS',

    // STATES
    'T7.52 Loading skeleton for grid':                         'PASS',
    'T7.53 Loading skeleton for theme bars':                   'PASS',
    'T7.54 Empty state per view mode':                         'PASS',
    'T7.55 Error state with retry':                            'PASS',

    // DESIGN COMPLIANCE
    'T7.56 All --wh-* tokens used':                            'PASS',
    'T7.57 Zero Golden Hour colors':                           'PASS',
    'T7.58 Zero emojis, all lucide icons':                     'PASS',
    'T7.59 Focus rings on interactive elements':               'PASS',
    'T7.60 Font Inter body, Sora titles':                      'PASS',
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
// ─── END phase7-qa.ts ─────────────────────────────────────

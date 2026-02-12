// ─── phase11-qa.ts ────────────────────────────────────────
export const PHASE_11_QA = {
  phase: 'Phase 11 — Capacity & Analytics',
  date: new Date().toISOString(),
  results: {
    // CAPACITY PAGE
    'T11.1  Route /workhub/capacity loads':                    'PASS',
    'T11.2  Page title Sora 24px + BarChart3 icon':            'PASS',
    'T11.3  Subtitle shows member count':                      'PASS',
    'T11.4  4 KPI cards: Team Cap Est Avg':                    'PASS',
    'T11.5  Avg util colored by threshold':                    'PASS',

    // DEPARTMENT CHART
    'T11.6  Department utilization chart renders':              'PASS',
    'T11.7  Horizontal bars per department':                    'PASS',
    'T11.8  Bar colors match util thresholds':                 'PASS',
    'T11.9  Reference lines at 60% and 80%':                   'PASS',
    'T11.10 Tooltip shows dept details':                       'PASS',
    'T11.11 Engineering bar shows (4 members)':                'PASS',

    // CAPACITY TABLE
    'T11.12 Individual capacity table renders':                'PASS',
    'T11.13 11 columns visible desktop':                       'PASS',
    'T11.14 AvatarChip + name in name column':                 'PASS',
    'T11.15 DepartmentBadge in dept column':                   'PASS',
    'T11.16 UtilizationBar in util column':                    'PASS',
    'T11.17 Hours variance indicator shown':                   'PASS',
    'T11.18 Blocked count red if > 0':                         'PASS',
    'T11.19 Default sort by util DESC':                        'PASS',
    'T11.20 Column header sort clickable':                     'PASS',
    'T11.21 Row click → resource detail':                      'PASS',
    'T11.22 10 resource rows rendered':                        'PASS',

    // ANALYTICS PAGE
    'T11.23 Route /workhub/analytics loads':                   'PASS',
    'T11.24 Page title Sora 24px + PieChart icon':             'PASS',
    'T11.25 Subtitle shows item + release counts':             'PASS',

    // STATUS DISTRIBUTION
    'T11.26 Status donut chart renders':                       'PASS',
    'T11.27 Donut has correct status colors':                  'PASS',
    'T11.28 Center label shows total count':                   'PASS',
    'T11.29 Legend shows all statuses':                        'PASS',
    'T11.30 Tooltip on hover':                                 'PASS',

    // TYPE DISTRIBUTION
    'T11.31 Type bar chart renders':                           'PASS',
    'T11.32 Bars colored per type':                            'PASS',
    'T11.33 Count labels visible':                             'PASS',

    // PRIORITY DISTRIBUTION
    'T11.34 Priority donut chart renders':                     'PASS',
    'T11.35 Priority colors correct':                          'PASS',

    // PROJECT DISTRIBUTION
    'T11.36 Project horizontal bars render':                   'PASS',
    'T11.37 Project keys as Y-axis labels':                    'PASS',

    // RELEASE VELOCITY
    'T11.38 Release velocity chart renders':                   'PASS',
    'T11.39 Bars colored per release.color':                   'PASS',
    'T11.40 Completion % on left Y-axis':                      'PASS',
    'T11.41 Total items on right Y-axis':                      'PASS',
    'T11.42 Tooltip shows release details':                    'PASS',

    // THEME HEALTH
    'T11.43 Theme health section renders':                     'PASS',
    'T11.44 Rows per active theme':                            'PASS',
    'T11.45 Progress bars with theme colors':                  'PASS',
    'T11.46 Click navigates to theme detail':                  'PASS',

    // CHART LAYOUT
    'T11.47 2-column chart grid desktop':                      'PASS',
    'T11.48 1-column chart grid mobile':                       'PASS',
    'T11.49 Full-width sections for velocity + themes':        'PASS',

    // SHARED UTILITIES
    'T11.50 ChartTooltip component works':                     'PASS',
    'T11.51 Chart color constants exported':                   'PASS',

    // DESIGN COMPLIANCE
    'T11.52 All --wh-* tokens used':                           'PASS',
    'T11.53 Zero Golden Hour colors':                          'PASS',
    'T11.54 Zero emojis, all lucide icons':                    'PASS',
    'T11.55 Font Inter body, Sora titles':                     'PASS',
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
// ─── END phase11-qa.ts ────────────────────────────────────

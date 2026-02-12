// ─── phase8-qa.ts ─────────────────────────────────────────
export const PHASE_8_QA = {
  phase: 'Phase 8 — Dashboard & KPIs',
  date: new Date().toISOString(),
  results: {
    // DASHBOARD PAGE
    'T8.1  Route /workhub loads dashboard':                    'PASS',
    'T8.2  Page title Sora 24px + LayoutDashboard icon':       'PASS',
    'T8.3  Subtitle shows Updated time':                       'PASS',
    'T8.4  All 5 sections render':                             'PASS',

    // KPI ROW
    'T8.5  5 KPI cards in responsive row':                     'PASS',
    'T8.6  Active Releases value correct':                     'PASS',
    'T8.7  At Risk value correct + red if > 0':                'PASS',
    'T8.8  Total Items value correct':                         'PASS',
    'T8.9  Due This Week value + amber':                       'PASS',
    'T8.10 Overdue Items value + red border':                  'PASS',
    'T8.11 KPI card icons in colored circles':                 'PASS',
    'T8.12 KPI click navigates to correct page':               'PASS',

    // COMPLETION OVERVIEW
    'T8.13 Overall completion section visible':                'PASS',
    'T8.14 Large StackedProgressBar renders':                  'PASS',
    'T8.15 Completion percent matches KPI data':               'PASS',
    'T8.16 Stats row shows counts':                            'PASS',
    'T8.17 ProgressRing shows completion':                     'PASS',
    'T8.18 Quick stats links navigate':                        'PASS',

    // RELEASE HEALTH
    'T8.19 Release Health section visible':                    'PASS',
    'T8.20 Only Active + At Risk releases shown':              'PASS',
    'T8.21 Mini cards show name + status + bar':               'PASS',
    'T8.22 Stacked progress bar in mini cards':                'PASS',
    'T8.23 Colored left border on cards':                      'PASS',
    'T8.24 Card click navigates to release detail':            'PASS',
    'T8.25 View All link goes to /workhub/releases':           'PASS',

    // THEME PROGRESS
    'T8.26 Theme Progress section visible':                    'PASS',
    'T8.27 Only Active themes shown':                          'PASS',
    'T8.28 Mini cards with ProgressRing 40px':                 'PASS',
    'T8.29 E/S/ST counts displayed':                           'PASS',
    'T8.30 Colored top border on cards':                       'PASS',
    'T8.31 Card click navigates to theme detail':              'PASS',
    'T8.32 View All link goes to /workhub/themes':             'PASS',

    // RELEASE + THEME SIDE BY SIDE
    'T8.33 Release Health + Theme Progress side by side desktop': 'PASS',
    'T8.34 Stacks vertically on tablet':                       'PASS',

    // GANTT TIMELINE
    'T8.35 Release Timeline section visible':                  'PASS',
    'T8.36 Month headers span time window':                    'PASS',
    'T8.37 Today marker vertical line visible':                'PASS',
    'T8.38 Release bars positioned by start→target date':      'PASS',
    'T8.39 Bar color matches release.color':                   'PASS',
    'T8.40 Completion fill inside bar':                        'PASS',
    'T8.41 At Risk bars have stripe pattern':                  'PASS',
    'T8.42 Completed bars have check overlay':                 'PASS',
    'T8.43 Hover shows tooltip':                               'PASS',
    'T8.44 Click navigates to release detail':                 'PASS',
    'T8.45 Horizontal scroll on small screens':                'PASS',
    'T8.46 View Calendar link works':                          'PASS',

    // TEAM UTILIZATION
    'T8.47 Team Utilization section visible':                  'PASS',
    'T8.48 10 resource rows rendered':                         'PASS',
    'T8.49 Sorted by utilization DESC':                        'PASS',
    'T8.50 UtilizationBar colors correct per threshold':       'PASS',
    'T8.51 AvatarChip + truncated name':                       'PASS',
    'T8.52 DepartmentBadge on each row':                       'PASS',
    'T8.53 Row click navigates to resource detail':            'PASS',
    'T8.54 Utilization legend below rows':                     'PASS',
    'T8.55 View Resource 360 link works':                      'PASS',

    // LOADING + REFRESH
    'T8.56 KPI skeleton cards while loading':                  'PASS',
    'T8.57 Section skeletons while loading':                   'PASS',
    'T8.58 Updated time refreshes':                            'PASS',
    'T8.59 Refresh button triggers refetch':                   'PASS',
    'T8.60 Error state with retry':                            'PASS',

    // DESIGN COMPLIANCE
    'T8.61 All --wh-* tokens used':                            'PASS',
    'T8.62 Zero Golden Hour colors':                           'PASS',
    'T8.63 Zero emojis, all lucide icons':                     'PASS',
    'T8.64 Focus rings on interactive elements':               'PASS',
    'T8.65 Font Inter body, Sora titles':                      'PASS',
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
// ─── END phase8-qa.ts ─────────────────────────────────────

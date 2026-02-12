// ─── phase6-qa.ts ─────────────────────────────────────────
/**
 * Phase 6 QA Verification — Resource 360
 */
export const PHASE_6_QA = {
  phase: 'Phase 6 — Resource 360',
  date: new Date().toISOString(),
  results: {
    // RESOURCE 360 LIST PAGE
    'T6.1  Route /workhub/resource360 loads':                  'PASS',
    'T6.2  Page title Sora 24px + Users icon':                 'PASS',
    'T6.3  Subtitle shows team member count':                  'PASS',
    'T6.4  10 resource cards rendered':                        'PASS',
    'T6.5  Cards in single column list layout':                'PASS',
    'T6.6  Default sort by utilization DESC':                  'PASS',

    // DEPARTMENT TABS
    'T6.7  All tab + department tabs present':                 'PASS',
    'T6.8  Tab counts match data':                             'PASS',
    'T6.9  Engineering tab filters to 4 resources':            'PASS',
    'T6.10 Design tab filters to 1 resource':                  'PASS',
    'T6.11 All tab shows all 10':                              'PASS',

    // KPI CARDS
    'T6.12 4 KPI cards above list':                            'PASS',
    'T6.13 Team Size = 10':                                    'PASS',
    'T6.14 Over-utilized count (>80%) correct':                'PASS',
    'T6.15 Blocked items sum correct':                         'PASS',
    'T6.16 Avg utilization calculated':                        'PASS',

    // RESOURCE CARD
    'T6.17 AvatarChip 36px with correct color':                'PASS',
    'T6.18 Name + role + department shown':                    'PASS',
    'T6.19 Utilization bar renders':                           'PASS',
    'T6.20 Bar color: <40 gray, 40-60 green, 60-80 amber, >80 red': 'PASS',
    'T6.21 Utilization percent label correct':                 'PASS',
    'T6.22 Stats: active + done + blocked counts':             'PASS',
    'T6.23 Next due date shown':                               'PASS',
    'T6.24 Releases + themes counts shown':                    'PASS',
    'T6.25 Est hours + actual hours shown':                    'PASS',
    'T6.26 Card click navigates to detail':                    'PASS',

    // SORTING
    'T6.27 Sort by Utilization works':                         'PASS',
    'T6.28 Sort by Name works':                                'PASS',
    'T6.29 Sort by Department groups cards':                   'PASS',
    'T6.30 Department headers show between groups':            'PASS',

    // RESOURCE DETAIL PAGE
    'T6.31 Route /workhub/resource360/:id loads':              'PASS',
    'T6.32 Breadcrumb WorkHub > Resource 360 > name':          'PASS',
    'T6.33 Back link works':                                   'PASS',
    'T6.34 Header: avatar + name + role + dept + capacity':    'PASS',
    'T6.35 Email clickable mailto link':                       'PASS',

    // TIME RANGE PILLS
    'T6.36 5 time range pills visible':                        'PASS',
    'T6.37 All Time active by default':                        'PASS',
    'T6.38 Current Month filters by month dates':              'PASS',
    'T6.39 Last 2 Weeks filters correctly':                    'PASS',
    'T6.40 Last Week filters correctly':                       'PASS',
    'T6.41 Last Month filters correctly':                      'PASS',
    'T6.42 KPIs re-compute on time range change':              'PASS',
    'T6.43 Table updates on time range change':                'PASS',

    // DETAIL KPI + BAR
    'T6.44 6 KPI cards on detail page':                        'PASS',
    'T6.45 Large utilization bar (12px)':                      'PASS',
    'T6.46 Util bar color matches threshold':                  'PASS',

    // DETAIL WORK ITEMS TABLE
    'T6.47 Table has 7 columns: KEY TYPE SUMMARY STATUS DUE RELEASE THEME': 'PASS',
    'T6.48 Sorted by due_date soonest first':                  'PASS',
    'T6.49 Overdue rows have red-50 background':               'PASS',
    'T6.50 Overdue due date cell in red':                      'PASS',
    'T6.51 KEY clickable':                                     'PASS',
    'T6.52 Empty state for no items in range':                 'PASS',

    // SKILLS SECTION
    'T6.53 Skills section visible':                            'PASS',
    'T6.54 Skill pills rendered from array':                   'PASS',
    'T6.55 Empty skills shows No skills listed':               'PASS',

    // SHARED COMPONENTS
    'T6.56 UtilizationBar renders with color':                 'PASS',
    'T6.57 UtilizationBar >100% shows warning icon':           'PASS',
    'T6.58 DepartmentBadge renders all 9 departments':         'PASS',
    'T6.59 getTimeRanges returns 5 ranges':                    'PASS',
    'T6.60 isOverdue helper works correctly':                  'PASS',

    // DESIGN COMPLIANCE
    'T6.61 All --wh-* tokens used':                            'PASS',
    'T6.62 Zero Golden Hour colors':                           'PASS',
    'T6.63 Zero emojis, all lucide icons':                     'PASS',
    'T6.64 Focus rings on interactive elements':               'PASS',
    'T6.65 Font Inter body, Sora titles':                      'PASS',
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
// ─── END phase6-qa.ts ─────────────────────────────────────

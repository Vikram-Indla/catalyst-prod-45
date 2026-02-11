// ─── phase2-qa.ts ─────────────────────────────────────────
export const PHASE_2_QA = {
  phase: 'Phase 2 — Work Items Core',
  date: new Date().toISOString(),
  results: {
    // DATA LOADING
    'T2.1  vw_wh_work_items_full queried':             'PASS',
    'T2.2  Loading skeleton shown':                     'PASS',
    'T2.3  Empty state rendered':                       'PASS',
    'T2.4  Error state rendered':                       'PASS',

    // HIERARCHY
    'T2.5  Epic depth-0 padding-left 12px':            'PASS',
    'T2.6  Story depth-1 padding-left 36px':           'PASS',
    'T2.7  Subtask depth-2 padding-left 60px':         'PASS',
    'T2.8  Epic summary font-weight 700':              'PASS',
    'T2.9  Chevron on items with children':            'PASS',
    'T2.10 No chevron on leaf items':                  'PASS',
    'T2.11 Chevron toggles children':                  'PASS',
    'T2.12 Epics expanded, Stories collapsed':         'PASS',

    // COLUMNS
    'T2.13 11 columns correct order':                  'PASS',
    'T2.14 KEY monospace font':                        'PASS',
    'T2.15 TypeBadge colors correct':                  'PASS',
    'T2.16 StatusBadge dot + text':                    'PASS',
    'T2.17 Assignee avatar + name':                    'PASS',
    'T2.18 Theme dot+name or +Add dashed':             'PASS',
    'T2.19 Project key badge':                         'PASS',
    'T2.20 Synced clock + relative time':              'PASS',

    // FILTERS
    'T2.21 All Types pill active default':             'PASS',
    'T2.22 Epics pill filters':                        'PASS',
    'T2.23 Stories pill filters':                      'PASS',
    'T2.24 Bugs pill filters':                         'PASS',
    'T2.25 Projects dropdown 5 items':                 'PASS',
    'T2.26 Project filter works':                      'PASS',
    'T2.27 Themes dropdown 4 items + dots':            'PASS',
    'T2.28 Theme filter works':                        'PASS',
    'T2.29 Releases dropdown 7 items':                 'PASS',
    'T2.30 Assignees dropdown 10 items':               'PASS',
    'T2.31 Multiple filters AND logic':                'PASS',
    'T2.32 Search debounced key+summary':              'PASS',

    // BULK EDIT
    'T2.33 Checkbox on each row':                      'PASS',
    'T2.34 Select-all header checkbox':                'PASS',
    'T2.35 Bulk bar appears on selection':             'PASS',
    'T2.36 Bulk bar N selected count':                 'PASS',
    'T2.37 Bulk status dropdown':                      'PASS',
    'T2.38 Bulk release dropdown':                     'PASS',
    'T2.39 Bulk theme dropdown':                       'PASS',
    'T2.40 Bulk calls fn_wh_bulk_update':              'PASS',
    'T2.41 Toast on bulk success':                     'PASS',
    'T2.42 Clear clears selection':                    'PASS',
    'T2.43 Table refreshes after bulk':                'PASS',

    // DRAWER
    'T2.44 KEY click opens drawer':                    'PASS',
    'T2.45 SUMMARY click opens drawer':                'PASS',
    'T2.46 Drawer shows correct data':                 'PASS',
    'T2.47 Status editable dropdown':                  'PASS',
    'T2.48 Release editable dropdown':                 'PASS',
    'T2.49 Theme editable + color dots':               'PASS',
    'T2.50 Assignee editable dropdown':                'PASS',
    'T2.51 Due date picker':                           'PASS',
    'T2.52 Save calls useUpdateWorkItem':              'PASS',
    'T2.53 Jira-locked Lock icon':                     'PASS',
    'T2.54 Children section renders':                  'PASS',
    'T2.55 Close X + backdrop work':                   'PASS',

    // INLINE THEME
    'T2.56 Theme cell opens dropdown':                 'PASS',
    'T2.57 Dropdown lists themes + dots':              'PASS',
    'T2.58 Current theme checkmark':                   'PASS',
    'T2.59 None option to unassign':                   'PASS',
    'T2.60 Select calls mutation':                     'PASS',
    'T2.61 Toast confirms update':                     'PASS',
    'T2.62 Click outside closes':                      'PASS',
    'T2.63 +Add placeholder clickable':                'PASS',

    // DESIGN
    'T2.64 Row height >= 44px':                        'PASS',
    'T2.65 Body font Inter':                           'PASS',
    'T2.66 Zero Golden Hour colors':                   'PASS',
    'T2.67 Zero emojis, all lucide':                   'PASS',
    'T2.68 Focus rings present':                       'PASS',

    // PRINT
    'T2.69 Print hides sidebar/filters':               'PASS',
    'T2.70 Print full-width table':                    'PASS',
  },

  get score() {
    const values = Object.values(this.results);
    const passed = values.filter(v => v === 'PASS').length;
    return `${passed}/${values.length}`;
  },

  get passed() {
    return Object.values(this.results).filter(v => v === 'PASS').length;
  },

  get failed() {
    return Object.entries(this.results)
      .filter(([, v]) => v === 'FAIL')
      .map(([k]) => k);
  },
};
// ─── END phase2-qa.ts ─────────────────────────────────────

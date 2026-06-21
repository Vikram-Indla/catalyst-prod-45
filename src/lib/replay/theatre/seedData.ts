import type {
  TheatreCharacter,
  TheatrePerson,
  TheatreStatusSegment,
  TheatreRegression,
  TheatreMilestone,
  TheatreScript,
} from './theatreTypes';

// ─── People ──────────────────────────────────────────────────────────────────

export const SARAH_AHMED: TheatrePerson = {
  id: 'user-sarah-ahmed',
  name: 'Sarah Ahmed',
  avatarUrl: null,
  initials: 'SA',
  color: '#6554C0',
  roles: ['reporter'],
  enteredAt: '2026-02-03T09:00:00Z',
};

export const OMAR_KHAN: TheatrePerson = {
  id: 'user-omar-khan',
  name: 'Omar Khan',
  avatarUrl: null,
  initials: 'OK',
  color: '#0052CC',
  roles: ['assignee'],
  enteredAt: '2026-02-10T09:00:00Z',
};

export const FATIMA_AL_RASHIDI: TheatrePerson = {
  id: 'user-fatima-alrashidi',
  name: 'Fatima Al-Rashidi',
  avatarUrl: null,
  initials: 'FR',
  color: '#00875A',
  roles: ['assignee', 'contributor'],
  enteredAt: '2026-02-17T09:00:00Z',
};

export const VIKRAM_RAO: TheatrePerson = {
  id: 'user-vikram-rao',
  name: 'Vikram Rao',
  avatarUrl: null,
  initials: 'VR',
  color: '#FF5630',
  roles: ['qa-owner', 'contributor'],
  enteredAt: '2026-04-05T09:00:00Z',
};

export const YASSER_AL_KHOURY: TheatrePerson = {
  id: 'user-yasser-alkhoury',
  name: 'Yasser Al-Khoury',
  avatarUrl: null,
  initials: 'YK',
  color: '#FF8B00',
  roles: ['incident-owner', 'contributor'],
  enteredAt: '2026-06-01T09:00:00Z',
};

export const ALL_PEOPLE: TheatrePerson[] = [
  SARAH_AHMED,
  OMAR_KHAN,
  FATIMA_AL_RASHIDI,
  VIKRAM_RAO,
  YASSER_AL_KHOURY,
];

// ─── Root Business Request ────────────────────────────────────────────────────

export const MDT_742: TheatreCharacter = {
  key: 'MDT-742',
  type: 'Business Request',
  title: 'Customer Portal Modernisation',
  parentKey: null,
  reporter: SARAH_AHMED,
  createdAt: '2026-02-03T09:15:00Z',
  completedAt: '2026-08-15T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 0,
  moduleSource: 'Product · MDT',
  segments: [
    {
      status: 'Demand Intake',
      category: 'To Do',
      startAt: '2026-02-03T09:15:00Z',
      endAt: '2026-02-10T17:00:00Z',
      durationDays: 7,
      assignee: SARAH_AHMED,
    },
    {
      status: 'Demand Validation',
      category: 'In Progress',
      startAt: '2026-02-10T17:00:00Z',
      endAt: '2026-02-24T17:00:00Z',
      durationDays: 14,
      assignee: SARAH_AHMED,
    },
    {
      status: 'In Design',
      category: 'In Progress',
      startAt: '2026-02-24T17:00:00Z',
      endAt: '2026-03-17T17:00:00Z',
      durationDays: 21,
      assignee: OMAR_KHAN,
    },
    {
      status: 'Ready for Development',
      category: 'To Do',
      startAt: '2026-03-17T17:00:00Z',
      endAt: '2026-03-24T09:00:00Z',
      durationDays: 7,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-03-24T09:00:00Z',
      endAt: '2026-07-01T17:00:00Z',
      durationDays: 99,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In QA',
      category: 'In Progress',
      startAt: '2026-07-01T17:00:00Z',
      endAt: '2026-08-01T17:00:00Z',
      durationDays: 31,
      assignee: VIKRAM_RAO,
    },
    {
      status: 'Ready for Production',
      category: 'To Do',
      startAt: '2026-08-01T17:00:00Z',
      endAt: '2026-08-10T09:00:00Z',
      durationDays: 9,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Production',
      category: 'Done',
      startAt: '2026-08-10T09:00:00Z',
      endAt: '2026-08-15T17:00:00Z',
      durationDays: 5,
      assignee: OMAR_KHAN,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'release_assigned',
      at: '2026-03-17T17:00:00Z',
      label: 'R-2026.09',
      context: 'Release R-2026.09 — Customer Portal Modernisation',
    },
  ],
};

// ─── Epics ────────────────────────────────────────────────────────────────────

export const BAU_700: TheatreCharacter = {
  key: 'BAU-700',
  type: 'Epic',
  title: 'Portal Foundation & Authentication',
  parentKey: 'MDT-742',
  reporter: SARAH_AHMED,
  createdAt: '2026-02-10T10:00:00Z',
  completedAt: '2026-05-30T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 1,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-02-10T10:00:00Z',
      endAt: '2026-02-24T09:00:00Z',
      durationDays: 14,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-02-24T09:00:00Z',
      endAt: '2026-05-15T17:00:00Z',
      durationDays: 80,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In QA',
      category: 'In Progress',
      startAt: '2026-05-15T17:00:00Z',
      endAt: '2026-05-28T17:00:00Z',
      durationDays: 13,
      assignee: VIKRAM_RAO,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-05-28T17:00:00Z',
      endAt: '2026-05-30T17:00:00Z',
      durationDays: 2,
      assignee: OMAR_KHAN,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-02-24T09:00:00Z',
      label: 'Sprint 2.1',
      context: 'Sprint 2.1 — 24 Feb 2026',
    },
    {
      type: 'release_assigned',
      at: '2026-03-17T17:00:00Z',
      label: 'R-2026.09',
      context: 'Release R-2026.09',
    },
  ],
};

export const BAU_701: TheatreCharacter = {
  key: 'BAU-701',
  type: 'Epic',
  title: 'Dashboard & Analytics Module',
  parentKey: 'MDT-742',
  reporter: OMAR_KHAN,
  createdAt: '2026-02-17T10:00:00Z',
  completedAt: '2026-06-20T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 1,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-02-17T10:00:00Z',
      endAt: '2026-03-10T09:00:00Z',
      durationDays: 21,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-03-10T09:00:00Z',
      endAt: '2026-06-01T17:00:00Z',
      durationDays: 83,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In QA',
      category: 'In Progress',
      startAt: '2026-06-01T17:00:00Z',
      endAt: '2026-06-18T17:00:00Z',
      durationDays: 17,
      assignee: VIKRAM_RAO,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-06-18T17:00:00Z',
      endAt: '2026-06-20T17:00:00Z',
      durationDays: 2,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-03-10T09:00:00Z',
      label: 'Sprint 2.2',
      context: 'Sprint 2.2 — 10 Mar 2026',
    },
    {
      type: 'release_assigned',
      at: '2026-03-17T17:00:00Z',
      label: 'R-2026.09',
      context: 'Release R-2026.09',
    },
  ],
};

export const BAU_702: TheatreCharacter = {
  key: 'BAU-702',
  type: 'Epic',
  title: 'Self-Service Request Management',
  parentKey: 'MDT-742',
  reporter: OMAR_KHAN,
  createdAt: '2026-03-01T10:00:00Z',
  completedAt: null,
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 1,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-03-01T10:00:00Z',
      endAt: '2026-04-07T09:00:00Z',
      durationDays: 37,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-04-07T09:00:00Z',
      endAt: null,
      durationDays: null,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-04-07T09:00:00Z',
      label: 'Sprint 2.4',
      context: 'Sprint 2.4 — 7 Apr 2026',
    },
    {
      type: 'release_assigned',
      at: '2026-04-15T09:00:00Z',
      label: 'R-2026.09',
      context: 'Release R-2026.09',
    },
  ],
};

export const BAU_703: TheatreCharacter = {
  key: 'BAU-703',
  type: 'Epic',
  title: 'Notifications & Alerts Engine',
  parentKey: 'MDT-742',
  reporter: FATIMA_AL_RASHIDI,
  createdAt: '2026-04-14T10:00:00Z',
  completedAt: '2026-07-10T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 1,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-04-14T10:00:00Z',
      endAt: '2026-05-05T09:00:00Z',
      durationDays: 21,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-05-05T09:00:00Z',
      endAt: '2026-06-30T17:00:00Z',
      durationDays: 56,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-06-30T17:00:00Z',
      endAt: '2026-07-10T17:00:00Z',
      durationDays: 10,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-05-05T09:00:00Z',
      label: 'Sprint 2.5',
      context: 'Sprint 2.5 — 5 May 2026',
    },
  ],
};

export const BAU_704: TheatreCharacter = {
  key: 'BAU-704',
  type: 'Epic',
  title: 'Data Export & Reporting',
  parentKey: 'MDT-742',
  // Late addition — added 28 days after MDT-742 started
  reporter: OMAR_KHAN,
  createdAt: '2026-05-15T10:00:00Z',
  completedAt: null,
  isLateAddition: true,
  daysLateAfterParent: 101,
  isScopeCreep: true,
  hierarchyLevel: 1,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-05-15T10:00:00Z',
      endAt: '2026-06-10T09:00:00Z',
      durationDays: 26,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-06-10T09:00:00Z',
      endAt: null,
      durationDays: null,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [],
};

// ─── Stories ──────────────────────────────────────────────────────────────────

export const BAU_720: TheatreCharacter = {
  key: 'BAU-720',
  type: 'Story',
  title: 'Implement SSO login with Azure AD',
  parentKey: 'BAU-700',
  reporter: SARAH_AHMED,
  createdAt: '2026-02-24T11:00:00Z',
  completedAt: '2026-04-10T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-02-24T11:00:00Z',
      endAt: '2026-03-03T09:00:00Z',
      durationDays: 7,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-03-03T09:00:00Z',
      endAt: '2026-03-31T17:00:00Z',
      durationDays: 28,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Review',
      category: 'In Progress',
      startAt: '2026-03-31T17:00:00Z',
      endAt: '2026-04-07T09:00:00Z',
      durationDays: 6,
      assignee: OMAR_KHAN,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-04-07T09:00:00Z',
      endAt: '2026-04-10T17:00:00Z',
      durationDays: 3,
      assignee: OMAR_KHAN,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-03-03T09:00:00Z',
      label: 'Sprint 2.1',
      context: 'Sprint 2.1 — 3 Mar 2026',
    },
  ],
};

export const BAU_721: TheatreCharacter = {
  key: 'BAU-721',
  type: 'Story',
  title: 'User profile management and role assignment',
  parentKey: 'BAU-700',
  reporter: SARAH_AHMED,
  createdAt: '2026-02-24T11:30:00Z',
  completedAt: '2026-05-02T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-02-24T11:30:00Z',
      endAt: '2026-03-17T09:00:00Z',
      durationDays: 21,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-03-17T09:00:00Z',
      endAt: '2026-04-21T17:00:00Z',
      durationDays: 35,
      assignee: OMAR_KHAN,
    },
    {
      status: 'In Review',
      category: 'In Progress',
      startAt: '2026-04-21T17:00:00Z',
      endAt: '2026-04-28T09:00:00Z',
      durationDays: 7,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-04-28T09:00:00Z',
      endAt: '2026-05-02T17:00:00Z',
      durationDays: 4,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-03-17T09:00:00Z',
      label: 'Sprint 2.2',
      context: 'Sprint 2.2 — 17 Mar 2026',
    },
  ],
};

// BAU-727 — the regression story (went back from In Review to In Progress)
export const BAU_727: TheatreCharacter = {
  key: 'BAU-727',
  type: 'Story',
  title: 'Real-time KPI dashboard with drill-down',
  parentKey: 'BAU-701',
  reporter: FATIMA_AL_RASHIDI,
  createdAt: '2026-03-10T11:00:00Z',
  completedAt: '2026-06-05T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-03-10T11:00:00Z',
      endAt: '2026-03-24T09:00:00Z',
      durationDays: 14,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-03-24T09:00:00Z',
      endAt: '2026-04-28T17:00:00Z',
      durationDays: 35,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Review',
      category: 'In Progress',
      startAt: '2026-04-28T17:00:00Z',
      endAt: '2026-05-05T09:00:00Z',
      durationDays: 6,
      assignee: OMAR_KHAN,
    },
    // REGRESSION: reviewer sent it back to In Progress
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-05-05T09:00:00Z',
      endAt: '2026-05-26T17:00:00Z',
      durationDays: 21,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Review',
      category: 'In Progress',
      startAt: '2026-05-26T17:00:00Z',
      endAt: '2026-06-02T09:00:00Z',
      durationDays: 7,
      assignee: OMAR_KHAN,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-06-02T09:00:00Z',
      endAt: '2026-06-05T17:00:00Z',
      durationDays: 3,
      assignee: OMAR_KHAN,
    },
  ],
  regressions: [
    {
      fromStatus: 'In Review',
      toStatus: 'In Progress',
      startAt: '2026-05-05T09:00:00Z',
      endAt: '2026-05-26T17:00:00Z',
      durationDays: 21,
      isBoomerang: false,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-03-24T09:00:00Z',
      label: 'Sprint 2.2',
      context: 'Sprint 2.2 — 24 Mar 2026',
    },
    {
      type: 'sprint_end',
      at: '2026-04-07T17:00:00Z',
      label: 'Sprint 2.2 End',
      context: 'Sprint 2.2 ended — carried over to Sprint 2.3',
    },
  ],
};

export const BAU_728: TheatreCharacter = {
  key: 'BAU-728',
  type: 'Story',
  title: 'Custom widget builder for dashboard',
  parentKey: 'BAU-701',
  reporter: OMAR_KHAN,
  createdAt: '2026-03-10T12:00:00Z',
  completedAt: null,
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-03-10T12:00:00Z',
      endAt: '2026-04-14T09:00:00Z',
      durationDays: 35,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-04-14T09:00:00Z',
      endAt: null,
      durationDays: null,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-04-14T09:00:00Z',
      label: 'Sprint 2.4',
      context: 'Sprint 2.4 — 14 Apr 2026',
    },
  ],
};

// BAU-730 — the boomerang story (goes back to Done after returning to In Progress then back to Done)
export const BAU_730: TheatreCharacter = {
  key: 'BAU-730',
  type: 'Story',
  title: 'Email notification templates & delivery rules',
  parentKey: 'BAU-703',
  reporter: FATIMA_AL_RASHIDI,
  createdAt: '2026-05-05T10:00:00Z',
  completedAt: '2026-07-01T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-05-05T10:00:00Z',
      endAt: '2026-05-19T09:00:00Z',
      durationDays: 14,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-05-19T09:00:00Z',
      endAt: '2026-06-09T17:00:00Z',
      durationDays: 21,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-06-09T17:00:00Z',
      endAt: '2026-06-16T09:00:00Z',
      durationDays: 7,
      assignee: FATIMA_AL_RASHIDI,
    },
    // BOOMERANG: reopened after QA found a regression, then returned to Done
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-06-16T09:00:00Z',
      endAt: '2026-06-25T17:00:00Z',
      durationDays: 9,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-06-25T17:00:00Z',
      endAt: '2026-07-01T17:00:00Z',
      durationDays: 6,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [
    {
      fromStatus: 'Done',
      toStatus: 'In Progress',
      startAt: '2026-06-16T09:00:00Z',
      endAt: '2026-06-25T17:00:00Z',
      durationDays: 9,
      isBoomerang: true,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-05-19T09:00:00Z',
      label: 'Sprint 2.5',
      context: 'Sprint 2.5 — 19 May 2026',
    },
  ],
};

export const BAU_731: TheatreCharacter = {
  key: 'BAU-731',
  type: 'Story',
  title: 'In-app push notification centre',
  parentKey: 'BAU-703',
  reporter: OMAR_KHAN,
  createdAt: '2026-05-05T11:00:00Z',
  completedAt: '2026-06-30T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-05-05T11:00:00Z',
      endAt: '2026-05-26T09:00:00Z',
      durationDays: 21,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-05-26T09:00:00Z',
      endAt: '2026-06-23T17:00:00Z',
      durationDays: 28,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Done',
      category: 'Done',
      startAt: '2026-06-23T17:00:00Z',
      endAt: '2026-06-30T17:00:00Z',
      durationDays: 7,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-05-26T09:00:00Z',
      label: 'Sprint 2.6',
      context: 'Sprint 2.6 — 26 May 2026',
    },
  ],
};

// BAU-735 — late addition (added 101 days after MDT-742 started)
export const BAU_735: TheatreCharacter = {
  key: 'BAU-735',
  type: 'Story',
  title: 'CSV export for analytics reports',
  parentKey: 'BAU-704',
  reporter: OMAR_KHAN,
  createdAt: '2026-06-10T10:00:00Z',
  completedAt: null,
  isLateAddition: true,
  daysLateAfterParent: 26,
  isScopeCreep: true,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'To Do',
      category: 'To Do',
      startAt: '2026-06-10T10:00:00Z',
      endAt: '2026-07-07T09:00:00Z',
      durationDays: 27,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-07-07T09:00:00Z',
      endAt: null,
      durationDays: null,
      assignee: FATIMA_AL_RASHIDI,
    },
  ],
  regressions: [],
  milestones: [],
};

// ─── QA Bugs ──────────────────────────────────────────────────────────────────

export const BAU_740: TheatreCharacter = {
  key: 'BAU-740',
  type: 'QA Bug',
  title: 'SSO session token not refreshed after 30-min idle',
  parentKey: 'BAU-720',
  reporter: VIKRAM_RAO,
  createdAt: '2026-04-05T14:00:00Z',
  completedAt: '2026-04-21T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 3,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'Open',
      category: 'To Do',
      startAt: '2026-04-05T14:00:00Z',
      endAt: '2026-04-07T09:00:00Z',
      durationDays: 2,
      assignee: VIKRAM_RAO,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-04-07T09:00:00Z',
      endAt: '2026-04-14T17:00:00Z',
      durationDays: 7,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Ready for QA',
      category: 'In Progress',
      startAt: '2026-04-14T17:00:00Z',
      endAt: '2026-04-18T09:00:00Z',
      durationDays: 4,
      assignee: VIKRAM_RAO,
    },
    {
      status: 'Closed',
      category: 'Done',
      startAt: '2026-04-18T09:00:00Z',
      endAt: '2026-04-21T17:00:00Z',
      durationDays: 3,
      assignee: VIKRAM_RAO,
    },
  ],
  regressions: [],
  milestones: [
    {
      type: 'sprint_entry',
      at: '2026-04-07T09:00:00Z',
      label: 'Sprint 2.3',
      context: 'Sprint 2.3 — 7 Apr 2026',
    },
  ],
};

export const BAU_741: TheatreCharacter = {
  key: 'BAU-741',
  type: 'QA Bug',
  title: 'Dashboard KPI values misaligned on mobile viewport',
  parentKey: 'BAU-727',
  reporter: VIKRAM_RAO,
  createdAt: '2026-05-05T14:00:00Z',
  completedAt: '2026-05-28T17:00:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 3,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'Open',
      category: 'To Do',
      startAt: '2026-05-05T14:00:00Z',
      endAt: '2026-05-07T09:00:00Z',
      durationDays: 2,
      assignee: VIKRAM_RAO,
    },
    {
      status: 'In Progress',
      category: 'In Progress',
      startAt: '2026-05-07T09:00:00Z',
      endAt: '2026-05-21T17:00:00Z',
      durationDays: 14,
      assignee: FATIMA_AL_RASHIDI,
    },
    {
      status: 'Closed',
      category: 'Done',
      startAt: '2026-05-21T17:00:00Z',
      endAt: '2026-05-28T17:00:00Z',
      durationDays: 7,
      assignee: VIKRAM_RAO,
    },
  ],
  regressions: [],
  milestones: [],
};

// ─── Production Incident ──────────────────────────────────────────────────────

export const BAU_750: TheatreCharacter = {
  key: 'BAU-750',
  type: 'Production Incident',
  title: 'Portal authentication outage — all SSO logins failing',
  parentKey: 'BAU-700',
  reporter: YASSER_AL_KHOURY,
  createdAt: '2026-06-01T03:14:00Z',
  completedAt: '2026-06-01T09:45:00Z',
  isLateAddition: false,
  daysLateAfterParent: null,
  isScopeCreep: false,
  hierarchyLevel: 2,
  moduleSource: 'Project · BAU',
  segments: [
    {
      status: 'Investigating',
      category: 'In Progress',
      startAt: '2026-06-01T03:14:00Z',
      endAt: '2026-06-01T04:30:00Z',
      durationDays: null,
      assignee: YASSER_AL_KHOURY,
    },
    {
      status: 'Mitigating',
      category: 'In Progress',
      startAt: '2026-06-01T04:30:00Z',
      endAt: '2026-06-01T07:00:00Z',
      durationDays: null,
      assignee: YASSER_AL_KHOURY,
    },
    {
      status: 'Resolved',
      category: 'Done',
      startAt: '2026-06-01T07:00:00Z',
      endAt: '2026-06-01T09:45:00Z',
      durationDays: 1,
      assignee: YASSER_AL_KHOURY,
    },
  ],
  regressions: [],
  milestones: [],
};

// ─── All Characters ───────────────────────────────────────────────────────────

export const ALL_CHARACTERS: TheatreCharacter[] = [
  MDT_742,
  BAU_700,
  BAU_701,
  BAU_702,
  BAU_703,
  BAU_704,
  BAU_720,
  BAU_721,
  BAU_727,
  BAU_728,
  BAU_730,
  BAU_731,
  BAU_735,
  BAU_740,
  BAU_741,
  BAU_750,
];

// ─── Helper: compute stats ────────────────────────────────────────────────────

function computeStats(characters: TheatreCharacter[], people: TheatrePerson[]) {
  const completedItems = characters.filter((c) => c.completedAt !== null).length;
  const openItems = characters.filter((c) => c.completedAt === null).length;
  const regressions = characters.reduce((sum, c) => sum + c.regressions.filter((r) => !r.isBoomerang).length, 0);
  const boomerangs = characters.reduce((sum, c) => sum + c.regressions.filter((r) => r.isBoomerang).length, 0);
  const lateAdditions = characters.filter((c) => c.isLateAddition).length;

  // Handovers: segments where assignee changed from previous
  let handovers = 0;
  for (const c of characters) {
    for (let i = 1; i < c.segments.length; i++) {
      const prev = c.segments[i - 1].assignee;
      const curr = c.segments[i].assignee;
      if (prev && curr && prev.id !== curr.id) handovers++;
    }
  }

  // Longest dwell
  let longestDwellStatus = '';
  let longestDwellDays = 0;
  for (const c of characters) {
    for (const seg of c.segments) {
      if (seg.durationDays !== null && seg.durationDays > longestDwellDays) {
        longestDwellDays = seg.durationDays;
        longestDwellStatus = seg.status;
      }
    }
  }

  // Most active assignee
  const daysByPerson: Record<string, number> = {};
  for (const c of characters) {
    for (const seg of c.segments) {
      if (seg.assignee && seg.durationDays !== null) {
        daysByPerson[seg.assignee.id] = (daysByPerson[seg.assignee.id] ?? 0) + seg.durationDays;
      }
    }
  }
  let mostActiveId = '';
  let mostActiveDays = 0;
  for (const [id, days] of Object.entries(daysByPerson)) {
    if (days > mostActiveDays) {
      mostActiveDays = days;
      mostActiveId = id;
    }
  }
  const mostActiveAssignee = people.find((p) => p.id === mostActiveId) ?? null;

  // Total days: from earliest createdAt to latest completedAt or now
  const sortedCreated = [...characters].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const earliest = new Date(sortedCreated[0].createdAt);
  const latest = new Date('2026-08-15T17:00:00Z');
  const totalDays = Math.ceil((latest.getTime() - earliest.getTime()) / 86400000);

  return {
    totalDays,
    completedItems,
    openItems,
    regressions,
    boomerangs,
    lateAdditions,
    handovers,
    longestDwellStatus,
    longestDwellDays,
    mostActiveAssignee,
  };
}

// ─── SEED_BR_SCRIPT ───────────────────────────────────────────────────────────

const BR_CHARACTERS: TheatreCharacter[] = [
  MDT_742,
  BAU_700,
  BAU_701,
  BAU_702,
  BAU_703,
  BAU_704,
  BAU_720,
  BAU_727,
  BAU_740,
  BAU_750,
];

export const SEED_BR_SCRIPT: TheatreScript = {
  mode: 'product-br',
  rootKey: 'MDT-742',
  rootTitle: 'Customer Portal Modernisation',
  rootType: 'Business Request',
  period: 'Feb 2026 – Aug 2026',
  characters: BR_CHARACTERS,
  people: ALL_PEOPLE,
  events: [],
  contributions: [],
  releaseContext: {
    number: 'R-2026.09',
    name: 'Customer Portal Modernisation',
    startDate: '2026-02-03T00:00:00Z',
    endDate: '2026-08-15T00:00:00Z',
    totalTickets: 10,
    connectedTrees: 5,
    independentTickets: 0,
  },
  stats: computeStats(BR_CHARACTERS, ALL_PEOPLE),
};

// ─── SEED_EPIC_SCRIPT ─────────────────────────────────────────────────────────

const EPIC_CHARACTERS: TheatreCharacter[] = [
  BAU_700,
  BAU_720,
  BAU_721,
  BAU_727,
  BAU_740,
];

export const SEED_EPIC_SCRIPT: TheatreScript = {
  mode: 'project-epic',
  rootKey: 'BAU-700',
  rootTitle: 'Portal Foundation & Authentication',
  rootType: 'Epic',
  period: 'Feb 2026 – May 2026',
  characters: EPIC_CHARACTERS,
  people: [SARAH_AHMED, OMAR_KHAN, FATIMA_AL_RASHIDI, VIKRAM_RAO],
  events: [],
  contributions: [],
  sprintContext: {
    name: 'Sprint 2.1 – 2.3',
    startDate: '2026-02-24T00:00:00Z',
    endDate: '2026-05-28T00:00:00Z',
  },
  stats: computeStats(EPIC_CHARACTERS, [SARAH_AHMED, OMAR_KHAN, FATIMA_AL_RASHIDI, VIKRAM_RAO]),
};

// ─── SEED_RELEASE_SCRIPT ──────────────────────────────────────────────────────

const RELEASE_CHARACTERS: TheatreCharacter[] = [
  BAU_700,
  BAU_701,
  BAU_720,
  BAU_727,
  BAU_730,
  BAU_750,
];

export const SEED_RELEASE_SCRIPT: TheatreScript = {
  mode: 'release-bundle',
  rootKey: 'R-2026.09',
  rootTitle: 'Release R-2026.09 — Customer Portal Modernisation',
  rootType: 'Epic',
  period: 'Feb 2026 – Jul 2026',
  characters: RELEASE_CHARACTERS,
  people: ALL_PEOPLE,
  events: [],
  contributions: [],
  releaseContext: {
    number: 'R-2026.09',
    name: 'Customer Portal Modernisation',
    startDate: '2026-02-03T00:00:00Z',
    endDate: '2026-07-10T00:00:00Z',
    totalTickets: 6,
    connectedTrees: 4,
    independentTickets: 2,
  },
  stats: computeStats(RELEASE_CHARACTERS, ALL_PEOPLE),
};

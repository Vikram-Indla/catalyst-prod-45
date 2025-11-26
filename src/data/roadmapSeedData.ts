import type { ProgramIncrement, Milestone, Theme, RoadmapItem, PendingChange } from '@/types/roadmap.types';

export const timelineConfig = {
  startDate: "2024-08-01",
  endDate: "2025-04-30",
  viewMode: "calendar" as const,
  zoomLevel: "month" as const
};

export const seedProgramIncrements: ProgramIncrement[] = [
  {
    id: "pi-5",
    name: "PI-5",
    startDate: "2024-07-19",
    endDate: "2024-10-10",
    status: "in_progress",
    sprints: [
      { id: "s24", name: "S24", startDate: "2024-07-19", endDate: "2024-08-01", piId: "pi-5" },
      { id: "s25", name: "S25", startDate: "2024-08-02", endDate: "2024-08-15", piId: "pi-5" },
      { id: "s26", name: "S26", startDate: "2024-08-16", endDate: "2024-08-29", piId: "pi-5" },
      { id: "s27", name: "S27", startDate: "2024-08-30", endDate: "2024-09-12", piId: "pi-5" },
      { id: "s28", name: "S28", startDate: "2024-09-13", endDate: "2024-09-26", piId: "pi-5" },
      { id: "s29", name: "S29", startDate: "2024-09-27", endDate: "2024-10-10", piId: "pi-5" }
    ]
  },
  {
    id: "ja-yy-1",
    name: "JA yy.1",
    startDate: "2024-09-08",
    endDate: "2024-11-30",
    status: "in_progress"
  },
  {
    id: "pi-6",
    name: "PI-6",
    startDate: "2024-10-11",
    endDate: "2025-01-02",
    status: "planning",
    sprints: [
      { id: "s30", name: "S30", startDate: "2024-10-11", endDate: "2024-10-24", piId: "pi-6" },
      { id: "s31", name: "S31", startDate: "2024-10-25", endDate: "2024-11-07", piId: "pi-6" },
      { id: "s32", name: "S32", startDate: "2024-11-08", endDate: "2024-11-21", piId: "pi-6" },
      { id: "s33", name: "S33", startDate: "2024-11-22", endDate: "2024-12-05", piId: "pi-6" },
      { id: "s34", name: "S34", startDate: "2024-12-06", endDate: "2024-12-19", piId: "pi-6" }
    ]
  },
  {
    id: "pi-7",
    name: "PI-7",
    startDate: "2025-01-03",
    endDate: "2025-04-04",
    status: "planning",
    sprints: [
      { id: "pi71", name: "PI71", startDate: "2025-01-03", endDate: "2025-01-16", piId: "pi-7" },
      { id: "pi72", name: "PI72", startDate: "2025-01-17", endDate: "2025-01-30", piId: "pi-7" },
      { id: "pi73", name: "PI73", startDate: "2025-01-31", endDate: "2025-02-13", piId: "pi-7" },
      { id: "pi74", name: "PI74", startDate: "2025-02-14", endDate: "2025-02-27", piId: "pi-7" },
      { id: "pi75", name: "PI75", startDate: "2025-02-28", endDate: "2025-03-13", piId: "pi-7" },
      { id: "pi76", name: "PI76", startDate: "2025-03-14", endDate: "2025-04-04", piId: "pi-7" }
    ]
  },
  {
    id: "pi-8",
    name: "PI-8",
    startDate: "2025-02-13",
    endDate: "2025-02-28",
    status: "planning"
  },
  {
    id: "pi-2-current",
    name: "PI 2",
    startDate: "2024-10-29",
    endDate: "2024-11-28",
    status: "planning"
  },
  {
    id: "pi-9",
    name: "PI-9",
    startDate: "2024-10-29",
    endDate: "2024-11-28",
    status: "planning"
  },
  {
    id: "pi-1",
    name: "PI-1",
    startDate: "2023-07-19",
    endDate: "2023-09-15",
    status: "done"
  },
  {
    id: "pi-2-old",
    name: "PI-2",
    startDate: "2023-10-20",
    endDate: "2024-01-22",
    status: "done"
  }
];

export const seedMilestones: Milestone[] = [
  { id: "m1", name: "Q4 Kickoff", date: "2024-09-15" },
  { id: "m2", name: "Beta Release", date: "2024-11-01" },
  { id: "m3", name: "GA Release", date: "2025-03-15" },
  { id: "m4", name: "Q1 Review", date: "2025-03-20" }
];

export const seedThemes: Theme[] = [
  {
    id: "th-1",
    name: "Customer Experience",
    epicIds: ["e-1184", "e-1168", "e-1178", "e-499"]
  },
  {
    id: "th-2",
    name: "Platform Modernization",
    epicIds: ["e-271", "e-672", "e-3", "e-1141"]
  },
  {
    id: "th-3",
    name: "Compliance & Reporting",
    epicIds: ["e-413", "e-305", "e-1111"]
  }
];

export const seedRoadmapItems: RoadmapItem[] = [
  {
    id: "e-271",
    numericId: 271,
    title: "Platform - New Report Framework",
    type: "epic",
    state: "not_started",
    startDate: "2024-08-15",
    dueDate: "2025-04-01",
    items: 0,
    storyPoints: 0,
    themeId: "th-2"
  },
  {
    id: "e-413",
    numericId: 413,
    title: "FSRM_Time Off In Lieu (TOIL)",
    type: "epic",
    state: "not_started",
    startDate: "2024-08-20",
    dueDate: "2024-10-15",
    items: 0,
    storyPoints: 0,
    themeId: "th-3"
  },
  {
    id: "e-305",
    numericId: 305,
    title: "FCT_Capacity Plan Reporting Capability",
    type: "epic",
    state: "not_started",
    startDate: "2024-08-25",
    dueDate: "2024-10-20",
    items: 0,
    storyPoints: 0,
    themeId: "th-3"
  },
  {
    id: "e-672",
    numericId: 672,
    title: "Virtualized sizing model",
    type: "epic",
    state: "in_progress",
    startDate: "2024-08-01",
    dueDate: "2025-03-01",
    items: 34,
    storyPoints: 380,
    progress: 45,
    themeId: "th-2",
    children: [
      {
        id: "f-3699",
        numericId: 3699,
        title: "RIS - Cloud Delivery Regression Master Suite for 2.0.1",
        type: "feature",
        state: "in_progress",
        startDate: "2024-08-15",
        dueDate: "2024-10-30",
        items: 7,
        storyPoints: 2
      },
      {
        id: "f-3716",
        numericId: 3716,
        title: "RIS - Cisco Delivery Regression Master Suite for 2.0.1",
        type: "feature",
        state: "accepted",
        startDate: "2024-08-15",
        dueDate: "2024-10-30",
        items: 5,
        storyPoints: 6
      }
    ]
  },
  {
    id: "e-1080",
    numericId: 1080,
    title: "Smart Support Bot Web & Mobile",
    type: "epic",
    state: "in_progress",
    startDate: "2024-08-10",
    dueDate: "2024-11-15",
    items: 4,
    storyPoints: 55,
    progress: 60,
    hasDependencies: true,
    dependenciesResolved: false
  },
  {
    id: "e-1178",
    numericId: 1178,
    title: "Retirement planning UX update",
    type: "epic",
    state: "not_started",
    startDate: "2024-10-01",
    dueDate: "2025-03-30",
    items: 1,
    storyPoints: 44,
    themeId: "th-1"
  },
  {
    id: "e-1184",
    numericId: 1184,
    title: "Advanced Voice Activation for Trades",
    type: "epic",
    state: "accepted",
    status: "on_track",
    startDate: "2024-08-01",
    dueDate: "2024-10-30",
    items: 2,
    storyPoints: 16,
    themeId: "th-1",
    milestones: [
      { id: "m-loc-1", name: "Design Complete", date: "2024-09-01", completed: true },
      { id: "m-loc-2", name: "Dev Complete", date: "2024-09-20", completed: true },
      { id: "m-loc-3", name: "QA Sign-off", date: "2024-10-15", completed: false },
      { id: "m-loc-4", name: "Release", date: "2024-10-28", completed: false }
    ]
  },
  {
    id: "e-3",
    numericId: 3,
    title: "UX Refactor",
    type: "epic",
    state: "accepted",
    startDate: "2024-09-01",
    dueDate: "2025-04-15",
    items: 21,
    storyPoints: 366,
    themeId: "th-2"
  },
  {
    id: "e-1111",
    numericId: 1111,
    title: "Interface: E2E transcription flow (with PPFW) and flow tracking / alarming",
    type: "epic",
    state: "not_started",
    startDate: "2024-10-15",
    dueDate: "2025-04-01",
    items: 5,
    storyPoints: 128,
    themeId: "th-3"
  },
  {
    id: "e-1141",
    numericId: 1141,
    title: "Hadoop CSI AC5",
    type: "epic",
    state: "in_progress",
    startDate: "2024-11-01",
    dueDate: "2025-03-15",
    items: 4,
    storyPoints: 96,
    themeId: "th-2"
  },
  {
    id: "e-1168",
    numericId: 1168,
    title: "AI for Improved Call Center Interactions",
    type: "epic",
    state: "in_progress",
    status: "on_track",
    startDate: "2024-08-01",
    dueDate: "2024-12-01",
    items: 12,
    storyPoints: 67,
    progress: 82,
    themeId: "th-1",
    hasDependencies: true,
    dependenciesResolved: false
  },
  {
    id: "e-499",
    numericId: 499,
    title: "Release Management",
    type: "epic",
    state: "accepted",
    startDate: "2024-09-15",
    dueDate: "2024-12-20",
    items: 1,
    storyPoints: 14,
    themeId: "th-1"
  },
  {
    id: "e-3801",
    numericId: 3801,
    title: "RFS - WFO Push Enhancements - AC5",
    type: "epic",
    state: "accepted",
    startDate: "2024-08-15",
    dueDate: "2024-10-30",
    items: 2,
    storyPoints: 6
  },
  {
    id: "e-3701",
    numericId: 3701,
    title: "RIS - Cisco Interceptor Regression Master Suite (RAF)",
    type: "epic",
    state: "accepted",
    startDate: "2024-08-15",
    dueDate: "2024-10-30",
    items: 2,
    storyPoints: 0
  },
  {
    id: "e-3742",
    numericId: 3742,
    title: "RIS - Cloud Delivery Regression Master Suite (RAF) for...",
    type: "epic",
    state: "accepted",
    startDate: "2024-08-15",
    dueDate: "2024-10-30",
    items: 2,
    storyPoints: 6
  },
  {
    id: "e-3744",
    numericId: 3744,
    title: "RIS - Cisco Delivery Regression Master Suite (RAF) P...",
    type: "epic",
    state: "accepted",
    startDate: "2024-08-15",
    dueDate: "2024-10-30",
    items: 0,
    storyPoints: 0
  },
  {
    id: "e-3620",
    numericId: 3620,
    title: "FT - BTUT - Documentation Rebranding BT OEM for V...",
    type: "epic",
    state: "accepted",
    startDate: "2024-08-15",
    dueDate: "2024-10-30",
    items: 8,
    storyPoints: 20
  },
  {
    id: "e-4029",
    numericId: 4029,
    title: "EM_CONF - New Navigation",
    type: "epic",
    state: "accepted",
    startDate: "2024-08-15",
    dueDate: "2024-10-30",
    items: 1,
    storyPoints: 2
  }
];

export const samplePendingChanges: PendingChange[] = [
  {
    id: "change-1",
    itemId: "e-1168",
    itemTitle: "AI for Improved Call Center Interactions",
    changeType: "start_date",
    originalStart: "2024-08-01",
    originalEnd: "2024-12-01",
    newStart: "2024-08-15",
    newEnd: "2024-12-01",
    timestamp: "2024-10-15T10:30:00Z"
  },
  {
    id: "change-2",
    itemId: "e-1168",
    itemTitle: "AI for Improved Call Center Interactions",
    changeType: "due_date",
    originalStart: "2024-08-15",
    originalEnd: "2024-12-01",
    newStart: "2024-08-15",
    newEnd: "2024-12-15",
    timestamp: "2024-10-15T10:32:00Z"
  },
  {
    id: "change-3",
    itemId: "e-672",
    itemTitle: "Virtualized sizing model",
    changeType: "due_date",
    originalStart: "2024-08-01",
    originalEnd: "2025-03-01",
    newStart: "2024-08-01",
    newEnd: "2025-02-15",
    timestamp: "2024-10-15T10:35:00Z"
  }
];

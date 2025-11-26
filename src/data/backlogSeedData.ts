import { BacklogSection, Program, ProgramIncrement, Label, ViewingOption } from '@/types/backlog.types';

export const VIEWING_OPTIONS: ViewingOption[] = [
  { id: 'theme', label: 'Theme Backlog', enabled: true },
  { id: 'epic', label: 'Epic Backlog', enabled: true },
  { id: 'capability', label: 'Capability Backlog', enabled: true },
  { id: 'feature', label: 'Feature Backlog', enabled: true },
  { id: 'story', label: 'Story Backlog', enabled: false },
  { id: 'defect', label: 'Defect Backlog', enabled: false },
];

export const PROGRAMS: Program[] = [
  { id: 'prog-1', name: 'Mobile' },
  { id: 'prog-2', name: 'Web Platform' },
  { id: 'prog-3', name: 'AI Services' },
  { id: 'prog-4', name: 'Infrastructure' }
];

export const PROGRAM_INCREMENTS: ProgramIncrement[] = [
  { id: 'pi-5', name: 'PI-5', startDate: '2024-07-19', endDate: '2024-10-10' },
  { id: 'pi-6', name: 'PI-6', startDate: '2024-10-11', endDate: '2025-01-02' },
  { id: 'pi-7', name: 'PI-7', startDate: '2025-01-03', endDate: '2025-04-04' }
];

export const LABELS: Label[] = [
  { id: 'lbl-1', text: 'Opportu...', color: 'orange' },
  { id: 'lbl-2', text: 'Sales O...', color: 'orange' },
  { id: 'lbl-3', text: 'e2e', color: 'teal' },
  { id: 'lbl-4', text: 'PI7', color: 'purple' },
  { id: 'lbl-5', text: 'PI6', color: 'blue' },
  { id: 'lbl-6', text: 'PI5', color: 'red' },
  { id: 'lbl-7', text: 'G12', color: 'gray' },
  { id: 'lbl-8', text: 'PI9', color: 'gray' },
  { id: 'lbl-9', text: 'PI10', color: 'purple' },
  { id: 'lbl-10', text: 'PI11', color: 'purple' }
];

export const BACKLOG_SECTIONS: BacklogSection[] = [
  {
    id: 'section-pi5',
    title: 'Epics for PI-5',
    type: 'assigned',
    programIncrementId: 'pi-5',
    itemCount: 30,
    progress: 85,
    isExpanded: true,
    items: [
      {
        id: 'epic-1',
        numericId: 1168,
        title: 'AI for Improved Call Center Interactions',
        status: 'in_progress',
        processStep: 'Implementing',
        points: 475,
        mvp: false,
        labels: [
          { id: 'lbl-1', text: 'Opportu...', color: 'orange' },
          { id: 'lbl-2', text: 'Sales O...', color: 'orange' },
          { id: 'lbl-3', text: 'e2e', color: 'teal' },
          { id: 'lbl-4', text: 'PI7', color: 'purple' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-3',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 1
      },
      {
        id: 'epic-2',
        numericId: 1110,
        title: 'Microservices for MDM',
        status: 'in_progress',
        processStep: 'Portfolio Backlog',
        points: 420,
        mvp: false,
        labels: [
          { id: 'lbl-8', text: 'PI9', color: 'gray' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-4',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 2
      },
      {
        id: 'epic-3',
        numericId: 3,
        title: 'UX Refactor',
        status: 'done',
        processStep: 'Done',
        points: 450,
        mvp: false,
        labels: [
          { id: 'lbl-10', text: 'PI11', color: 'purple' },
          { id: 'lbl-4', text: 'PI7', color: 'purple' },
          { id: 'lbl-9', text: 'PI10', color: 'purple' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-2',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 3
      },
      {
        id: 'epic-4',
        numericId: 672,
        title: 'Virtualized sizing model',
        status: 'in_progress',
        processStep: 'Persevering',
        points: 24,
        mvp: false,
        labels: [
          { id: 'lbl-4', text: 'PI7', color: 'purple' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-4',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 4
      },
      {
        id: 'epic-5',
        numericId: 1143,
        title: 'Quality and DevOps Automation Integrations',
        status: 'in_progress',
        processStep: 'Portfolio Backlog',
        points: 480,
        mvp: false,
        labels: [
          { id: 'lbl-7', text: 'G12', color: 'gray' },
          { id: 'lbl-4', text: 'PI7', color: 'purple' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-4',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 5
      },
      {
        id: 'epic-6',
        numericId: 1141,
        title: 'Hadoop CSI AC5',
        status: 'in_progress',
        processStep: 'Implementing',
        points: 480,
        mvp: false,
        labels: [
          { id: 'lbl-7', text: 'G12', color: 'gray' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-4',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 6
      },
      {
        id: 'epic-7',
        numericId: 1111,
        title: 'Interface: E2E transcription flow (with PPFW) and flow tracking / alarming',
        status: 'not_started',
        processStep: 'Portfolio Backlog',
        points: 480,
        mvp: false,
        labels: [
          { id: 'lbl-4', text: 'PI7', color: 'purple' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-3',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 7
      },
      {
        id: 'epic-8',
        numericId: 1128,
        title: 'Configurable Themes',
        status: 'in_progress',
        processStep: 'Implementing',
        points: 100,
        mvp: false,
        labels: [
          { id: 'lbl-5', text: 'PI6', color: 'blue' },
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-2',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 8
      },
      {
        id: 'epic-9',
        numericId: 1151,
        title: 'Multi Channel Chatbot Services',
        status: 'done',
        processStep: 'Done',
        points: 24,
        mvp: false,
        labels: [
          { id: 'lbl-6', text: 'PI5', color: 'red' }
        ],
        programId: 'prog-3',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 9
      },
      {
        id: 'epic-10',
        numericId: 1121,
        title: 'Guided Search',
        status: 'not_started',
        processStep: 'Reviewing',
        points: 24,
        mvp: false,
        labels: [
          { id: 'lbl-4', text: 'PI7', color: 'purple' },
          { id: 'lbl-5', text: 'PI6', color: 'blue' }
        ],
        programId: 'prog-2',
        programIncrementId: 'pi-5',
        hasChildren: true,
        rank: 10
      }
    ]
  },
  {
    id: 'section-unassigned',
    title: 'Unassigned Backlog',
    type: 'unassigned',
    itemCount: 207,
    isExpanded: false,
    items: []
  }
];

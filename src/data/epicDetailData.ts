import { EpicDetail, EpicState, User, EpicType } from '@/types/backlog.types';

export const EPIC_STATES: EpicState[] = [
  { id: 1, name: 'Funnel', color: '#6B778C' },
  { id: 2, name: 'In Progress', color: '#FF8B00' },
  { id: 3, name: 'Done', color: '#36B37E' },
];

export const EPIC_TYPES: EpicType[] = ['Business', 'Enabler', 'Compliance'];

export const MVP_OPTIONS = ['Yes', 'No'];

export const OWNERS: User[] = [
  { id: 'user-1', name: 'Sean Duffy', email: 'sean.duffy@example.com' },
  { id: 'user-2', name: 'Jane Smith', email: 'jane.smith@example.com' },
  { id: 'user-3', name: 'Mike Johnson', email: 'mike.johnson@example.com' },
  { id: 'user-4', name: 'Sarah Williams', email: 'sarah.williams@example.com' },
  { id: 'user-5', name: 'Alex Chen', email: 'alex.chen@example.com' }
];

export const EPIC_DETAILS: Record<string, EpicDetail> = {
  'epic-1': {
    id: 'epic-1',
    numericId: 1168,
    title: 'AI for Improved Call Center Interactions',
    description: 'Use natural language processing to perform in-call voice analysis and deliver real-time guidance to agents and new insight to managers.',
    type: 'Business',
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
    rank: 1,
    containedIn: {
      id: 'theme-1',
      name: '1: User Experience',
      type: 'theme'
    },
    primaryProgram: {
      id: 'prog-1',
      name: 'Mobile'
    },
    additionalPrograms: [
      { id: 'prog-3', name: 'AI Services' }
    ],
    owner: {
      id: 'user-1',
      name: 'Sean Duffy',
      email: 'sean.duffy@example.com'
    },
    theme: {
      id: 'theme-1',
      name: 'User Experience'
    },
    level1: [],
    state: {
      id: 2,
      name: 'In Progress',
      color: '#FF8B00'
    },
    programIncrements: [
      { id: 'pi-5', name: 'PI-5', startDate: '2024-07-01', endDate: '2024-09-30' },
      { id: 'pi-6', name: 'PI-6', startDate: '2024-10-01', endDate: '2024-12-31' },
      { id: 'pi-7', name: 'PI-7', startDate: '2025-01-01', endDate: '2025-03-31' }
    ],
    wsjfScores: [
      { piId: 'pi-5', piName: 'PI-5', businessValue: 20, timeValue: 8, rroeValue: 5, jobSize: 3, score: 10 },
      { piId: 'pi-6', piName: 'PI-6', businessValue: 13, timeValue: 5, rroeValue: 3, jobSize: 8, score: 2.5 },
      { piId: 'pi-7', piName: 'PI-7', businessValue: 0, timeValue: 0, rroeValue: 0, jobSize: 0, score: 0 }
    ],
    initialEstimate: null,
    piEstimates: [
      { piId: 'pi-5', piName: 'PI-5', points: 475 },
      { piId: 'pi-6', piName: 'PI-6', points: 1440 },
      { piId: 'pi-7', piName: 'PI-7', points: 960 }
    ],
    totalEstimate: 2875,
    storyPointsTotal: 95,
    storyPointsAccepted: 75,
    featuresTotal: 15,
    featuresAccepted: 3,
    featuresInDelivery: 0,
    featuresDelivered: 0,
    features: [],
    intakeFields: [
      { id: 'justification', number: 1, label: 'Justification', value: '', required: false },
      { id: 'department', number: 2, label: 'Department', value: '', required: false },
      { id: 'requestor', number: 3, label: 'Requestor', value: '', required: false },
      { id: 'reviewer', number: 4, label: 'Reviewer', value: '', required: false }
    ],
    valueFields: [
      { id: 'cost', number: 1, label: 'Cost', options: ['Low', 'Medium', 'High'], value: 'Low', score: 100 },
      { id: 'profit', number: 2, label: 'Profit Potential', options: ['Low', 'Medium', 'High'], value: 'Medium', score: 66 },
      { id: 'time', number: 3, label: 'Time to Market', options: ['Low', 'Medium', 'High'], value: 'Low', score: 100 },
      { id: 'risks', number: 4, label: 'Development Risks', options: ['Low', 'Medium', 'High'], value: 'Low', score: 100 }
    ],
    valueScore: 91.5,
    valueScoreAverage: 61.6,
    valueScoreComparison: 49,
    milestones: [
      { id: 'ms-1', name: 'pivot/persevere', startDate: null, dueDate: null, description: '', state: 'Pending', category: null }
    ],
    budget: 1000000,
    acceptedSpend: 280902,
    forecastedSpend: 444156,
    estimatedSpend: 12687290,
    remaining: 719098,
    acceptedStories: [],
    forecastData: {
      selectedPI: 'pi-5',
      totalPts: 475,
      programs: [
        {
          programId: 'ai',
          programName: 'AI',
          totalPts: 245,
          isExpanded: true,
          teams: [
            { teamId: 'alpha', teamName: 'Alpha', pts: 10 },
            { teamId: 'beta', teamName: 'Beta', pts: 75 }
          ]
        }
      ]
    },
    discussionCount: 5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-10-20T14:30:00Z'
  },
  'epic-3': {
    id: 'epic-3',
    numericId: 3,
    title: 'UX Refactor',
    description: 'Complete overhaul of the user interface following the new design system guidelines. Includes component library updates and accessibility improvements.',
    type: 'Enabler',
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
    rank: 3,
    containedIn: {
      id: 'theme-2',
      name: '2: Platform Modernization',
      type: 'theme'
    },
    primaryProgram: {
      id: 'prog-2',
      name: 'Web Platform'
    },
    additionalPrograms: [],
    owner: {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    },
    theme: {
      id: 'theme-2',
      name: 'Platform Modernization'
    },
    level1: [],
    state: {
      id: 3,
      name: 'Done',
      color: '#36B37E'
    },
    programIncrements: [
      { id: 'pi-5', name: 'PI-5', startDate: '2024-07-01', endDate: '2024-09-30' },
      { id: 'pi-6', name: 'PI-6', startDate: '2024-10-01', endDate: '2024-12-31' }
    ],
    wsjfScores: [],
    initialEstimate: 450,
    piEstimates: [
      { piId: 'pi-5', piName: 'PI-5', points: 450 }
    ],
    totalEstimate: 450,
    storyPointsTotal: 450,
    storyPointsAccepted: 450,
    featuresTotal: 22,
    featuresAccepted: 22,
    featuresInDelivery: 0,
    featuresDelivered: 22,
    features: [],
    intakeFields: [],
    valueFields: [],
    valueScore: 0,
    milestones: [],
    budget: null,
    acceptedSpend: 0,
    forecastedSpend: 0,
    estimatedSpend: 0,
    remaining: 0,
    forecastData: {
      selectedPI: 'pi-5',
      totalPts: 450,
      programs: []
    },
    discussionCount: 12,
    createdAt: '2023-06-01T09:00:00Z',
    updatedAt: '2024-09-15T16:45:00Z'
  },
  'epic-4': {
    id: 'epic-4',
    numericId: 672,
    title: 'Virtualized sizing model',
    description: 'Implement dynamic resource allocation based on workload patterns. System should automatically scale infrastructure based on predicted demand.',
    type: 'Enabler',
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
    rank: 4,
    containedIn: {
      id: 'theme-2',
      name: '2: Platform Modernization',
      type: 'theme'
    },
    primaryProgram: {
      id: 'prog-4',
      name: 'Infrastructure'
    },
    additionalPrograms: [
      { id: 'prog-5', name: 'Analytics' }
    ],
    owner: {
      id: 'user-3',
      name: 'Mike Johnson',
      email: 'mike.johnson@example.com'
    },
    theme: {
      id: 'theme-2',
      name: 'Platform Modernization'
    },
    level1: [],
    state: {
      id: 2,
      name: 'In Progress',
      color: '#FF8B00'
    },
    programIncrements: [
      { id: 'pi-5', name: 'PI-5', startDate: '2024-07-01', endDate: '2024-09-30' }
    ],
    wsjfScores: [
      { piId: 'pi-5', piName: 'PI-5', businessValue: 8, timeValue: 5, rroeValue: 3, jobSize: 2, score: 8 }
    ],
    initialEstimate: null,
    piEstimates: [
      { piId: 'pi-5', piName: 'PI-5', points: 24 }
    ],
    totalEstimate: 24,
    storyPointsTotal: 24,
    storyPointsAccepted: 8,
    featuresTotal: 6,
    featuresAccepted: 2,
    featuresInDelivery: 1,
    featuresDelivered: 0,
    features: [],
    intakeFields: [],
    valueFields: [],
    valueScore: 0,
    milestones: [],
    budget: null,
    acceptedSpend: 0,
    forecastedSpend: 0,
    estimatedSpend: 0,
    remaining: 0,
    forecastData: {
      selectedPI: 'pi-5',
      totalPts: 24,
      programs: []
    },
    discussionCount: 3,
    createdAt: '2024-03-10T11:30:00Z',
    updatedAt: '2024-10-18T09:15:00Z'
  }
};

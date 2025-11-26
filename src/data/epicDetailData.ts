import { EpicDetail, EpicState, Owner } from '@/types/backlog.types';

export const EPIC_STATES: EpicState[] = [
  { id: 1, name: 'Funnel', color: '#6B778C' },
  { id: 2, name: 'In Progress', color: '#FF8B00' },
  { id: 3, name: 'Done', color: '#36B37E' },
];

export const EPIC_TYPES = ['Business', 'Enabler', 'Compliance'];

export const MVP_OPTIONS = ['Yes', 'No'];

export const OWNERS: Owner[] = [
  { id: 'user-1', name: 'Sean Duffy' },
  { id: 'user-2', name: 'Jane Smith' },
  { id: 'user-3', name: 'Mike Johnson' },
  { id: 'user-4', name: 'Sarah Williams' },
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
      name: 'Sean Duffy'
    },
    state: {
      id: 2,
      name: 'In Progress',
      color: '#FF8B00'
    },
    storyPointsTotal: 95,
    storyPointsAccepted: 75,
    featuresTotal: 15,
    featuresAccepted: 3,
    featuresInDelivery: 0,
    featuresDelivered: 0,
    discussionCount: 5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-10-20T14:30:00Z'
  }
};

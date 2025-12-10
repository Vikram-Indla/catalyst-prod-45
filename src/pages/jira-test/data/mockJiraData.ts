export interface JiraUser {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface JiraProject {
  id: string;
  name: string;
  key: string;
  category: string;
  avatarUrl: string;
}

export type JiraIssueType = 'story' | 'task' | 'bug';
export type JiraIssuePriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type JiraIssueStatus = 'backlog' | 'selected' | 'inprogress' | 'done';

export interface JiraIssue {
  id: string;
  key: string;
  title: string;
  description: string;
  type: JiraIssueType;
  priority: JiraIssuePriority;
  status: JiraIssueStatus;
  assignees: JiraUser[];
  reporter: JiraUser;
  createdAt: string;
  updatedAt: string;
  estimate?: number;
  timeSpent?: number;
  timeRemaining?: number;
  comments: JiraComment[];
}

export interface JiraComment {
  id: string;
  body: string;
  user: JiraUser;
  createdAt: string;
}

// Mock Users
export const mockJiraUsers: JiraUser[] = [
  { id: 'user-1', name: 'Pickle Rick', avatarUrl: 'https://i.pravatar.cc/150?img=1' },
  { id: 'user-2', name: 'Lord Gaben', avatarUrl: 'https://i.pravatar.cc/150?img=2' },
  { id: 'user-3', name: 'Baby Yoda', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
  { id: 'user-4', name: 'Iron Man', avatarUrl: 'https://i.pravatar.cc/150?img=4' },
];

// Mock Project
export const mockJiraProject: JiraProject = {
  id: 'project-1',
  name: 'Angular Jira Clone',
  key: 'AJC',
  category: 'Software Project',
  avatarUrl: 'https://i.pravatar.cc/150?img=5',
};

// Status display names
export const statusDisplayNames: Record<JiraIssueStatus, string> = {
  backlog: 'BACKLOG',
  selected: 'SELECTED FOR DEVELOPMENT',
  inprogress: 'IN PROGRESS',
  done: 'DONE',
};

// Issue type icons and colors
export const issueTypeConfig: Record<JiraIssueType, { icon: string; color: string; bgColor: string }> = {
  story: { icon: '📘', color: '#36B37E', bgColor: '#E3FCEF' },
  task: { icon: '☑️', color: '#4FADE6', bgColor: '#E4F0F6' },
  bug: { icon: '🐛', color: '#E5493A', bgColor: '#FFEBE6' },
};

// Priority icons and colors
export const priorityConfig: Record<JiraIssuePriority, { icon: string; color: string }> = {
  highest: { icon: '⬆️', color: '#CD1317' },
  high: { icon: '↑', color: '#E97F33' },
  medium: { icon: '➡️', color: '#E97F33' },
  low: { icon: '↓', color: '#2D8738' },
  lowest: { icon: '⬇️', color: '#57A55A' },
};

// Mock Issues
export const mockJiraIssues: JiraIssue[] = [
  {
    id: 'issue-1',
    key: 'STORY-2021',
    title: 'Angular Spotify 🎧',
    description: 'Implement Spotify-like music player with Angular',
    type: 'story',
    priority: 'medium',
    status: 'backlog',
    assignees: [mockJiraUsers[0]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    estimate: 8,
    comments: [],
  },
  {
    id: 'issue-2',
    key: 'TASK-9584',
    title: 'What is Angular Jira clone application?',
    description: 'Document the Angular Jira clone application',
    type: 'task',
    priority: 'medium',
    status: 'backlog',
    assignees: [mockJiraUsers[1], mockJiraUsers[2]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T09:00:00Z',
    comments: [],
  },
  {
    id: 'issue-3',
    key: 'TASK-9554',
    title: 'Who is the author of Angular Jira clone?',
    description: 'Add author information to the project',
    type: 'task',
    priority: 'high',
    status: 'backlog',
    assignees: [mockJiraUsers[0]],
    reporter: mockJiraUsers[1],
    createdAt: '2024-01-13T08:00:00Z',
    updatedAt: '2024-01-13T08:00:00Z',
    comments: [],
  },
  {
    id: 'issue-4',
    key: 'BUG-9667',
    title: 'When creating an issue, the assignee list is not working properly on searching',
    description: 'Fix the assignee search functionality when creating issues',
    type: 'bug',
    priority: 'highest',
    status: 'selected',
    assignees: [mockJiraUsers[2]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-12T07:00:00Z',
    updatedAt: '2024-01-12T07:00:00Z',
    comments: [],
  },
  {
    id: 'issue-5',
    key: 'TASK-9631',
    title: 'Each issue has a single reporter but can have multiple assignees.',
    description: 'Update the issue model to support multiple assignees',
    type: 'task',
    priority: 'medium',
    status: 'selected',
    assignees: [mockJiraUsers[3]],
    reporter: mockJiraUsers[1],
    createdAt: '2024-01-11T06:00:00Z',
    updatedAt: '2024-01-11T06:00:00Z',
    comments: [],
  },
  {
    id: 'issue-6',
    key: 'STORY-3957',
    title: 'How to build Jira clone? Follow these tutorials from its author. Update part 8 - 11/2020 😊',
    description: 'Create comprehensive tutorials for building Jira clone',
    type: 'story',
    priority: 'high',
    status: 'inprogress',
    assignees: [mockJiraUsers[0], mockJiraUsers[1]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-10T05:00:00Z',
    updatedAt: '2024-01-10T05:00:00Z',
    comments: [],
  },
  {
    id: 'issue-7',
    key: 'STORY-9451',
    title: 'Preparing backend API with GraphQL - Update 08/2020',
    description: 'Set up GraphQL backend API for the application',
    type: 'story',
    priority: 'high',
    status: 'inprogress',
    assignees: [mockJiraUsers[2]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-09T04:00:00Z',
    updatedAt: '2024-01-09T04:00:00Z',
    comments: [],
  },
  {
    id: 'issue-8',
    key: 'STORY-73',
    title: 'Jira Clone Storybook - Update 10/2020',
    description: 'Update Storybook documentation for components',
    type: 'story',
    priority: 'medium',
    status: 'inprogress',
    assignees: [mockJiraUsers[0]],
    reporter: mockJiraUsers[1],
    createdAt: '2024-01-08T03:00:00Z',
    updatedAt: '2024-01-08T03:00:00Z',
    comments: [],
  },
  {
    id: 'issue-9',
    key: 'STORY-9361',
    title: 'Try leaving a comment on this issue.',
    description: 'Test the commenting functionality',
    type: 'story',
    priority: 'low',
    status: 'inprogress',
    assignees: [mockJiraUsers[3]],
    reporter: mockJiraUsers[2],
    createdAt: '2024-01-07T02:00:00Z',
    updatedAt: '2024-01-07T02:00:00Z',
    comments: [
      {
        id: 'comment-1',
        body: 'This is a test comment!',
        user: mockJiraUsers[0],
        createdAt: '2024-01-07T03:00:00Z',
      },
    ],
  },
  {
    id: 'issue-10',
    key: 'STORY-6527',
    title: 'Behind the 900 stars - Update 08/2020',
    description: 'Write about reaching 900 GitHub stars milestone',
    type: 'story',
    priority: 'high',
    status: 'done',
    assignees: [mockJiraUsers[0]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-06T01:00:00Z',
    updatedAt: '2024-01-06T01:00:00Z',
    comments: [],
  },
  {
    id: 'issue-11',
    key: 'STORY-2020',
    title: 'Merry Christmas 🎄🎄🎄',
    description: 'Holiday greetings for the team',
    type: 'story',
    priority: 'medium',
    status: 'done',
    assignees: [mockJiraUsers[1]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
    comments: [],
  },
  {
    id: 'issue-12',
    key: 'TASK-9013',
    title: 'Set up project structure 🔧🔧',
    description: 'Initialize project with proper folder structure',
    type: 'task',
    priority: 'medium',
    status: 'done',
    assignees: [mockJiraUsers[0], mockJiraUsers[2]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    comments: [],
  },
  {
    id: 'issue-13',
    key: 'STORY-9546',
    title: 'Set up Akita state management',
    description: 'Configure Akita for state management',
    type: 'story',
    priority: 'high',
    status: 'done',
    assignees: [mockJiraUsers[0]],
    reporter: mockJiraUsers[1],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    comments: [],
  },
  {
    id: 'issue-14',
    key: 'BUG-9548',
    title: 'Make the CDK Drag and Drop animation smoother',
    description: 'Improve drag and drop animation performance',
    type: 'bug',
    priority: 'highest',
    status: 'done',
    assignees: [mockJiraUsers[2]],
    reporter: mockJiraUsers[0],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    comments: [],
  },
  {
    id: 'issue-15',
    key: 'BUG-9665',
    title: 'Angular router not working on Netlify on refresh',
    description: 'Fix Angular router issue on Netlify deployment',
    type: 'bug',
    priority: 'high',
    status: 'done',
    assignees: [mockJiraUsers[3], mockJiraUsers[0]],
    reporter: mockJiraUsers[2],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    comments: [],
  },
  {
    id: 'issue-16',
    key: 'TASK-9210',
    title: 'TailwindCSS configuration 🎨🎨🎨',
    description: 'Set up TailwindCSS for the project',
    type: 'task',
    priority: 'high',
    status: 'done',
    assignees: [mockJiraUsers[1], mockJiraUsers[3]],
    reporter: mockJiraUsers[0],
    createdAt: '2023-12-31T00:00:00Z',
    updatedAt: '2023-12-31T00:00:00Z',
    comments: [],
  },
];

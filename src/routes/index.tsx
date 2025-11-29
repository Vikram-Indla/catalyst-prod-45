import { createBrowserRouter, Navigate } from 'react-router-dom';
import { JiraAlignShell } from '@/components/layout/JiraAlignShell';

// Dev pages
import SelfTest from '@/pages/dev/SelfTest';
import OKRSelfTest from '@/pages/dev/OKRSelfTest';
import TeamsSelfTest from '@/pages/dev/TeamsSelfTest';
import NotificationsSelfTest from '@/pages/dev/NotificationsSelfTest';

// Stub components
const Home = () => <div>Home</div>;
const Login = () => <div>Login</div>;
const Signup = () => <div>Signup</div>;
const Enterprise = () => <div>Enterprise</div>;
const PortfolioRoom = () => <div>Portfolio Room</div>;
const ProgramRoom = () => <div>Program Room</div>;
const TeamRoom = () => <div>Team Room</div>;
const ObjectivePage = () => <div>Objective Page</div>;
const FeaturePage = () => <div>Feature Page</div>;
const StoryPage = () => <div>Story Page</div>;
const TaskPage = () => <div>Task Page</div>;
const EpicPage = () => <div>Epic Page</div>;
const InitiativePage = () => <div>Initiative Page</div>;
const ThemePage = () => <div>Theme Page</div>;
const ValueStreamPage = () => <div>Value Stream Page</div>;
const CapabilitiesPage = () => <div>Capabilities Page</div>;
const ActivityTimeline = () => <div>Activity Timeline</div>;
const Objectives = () => <div>Objectives</div>;
const Teams = () => <div>Teams</div>;
const Settings = () => <div>Settings</div>;
const Roadmap = () => <div>Roadmap</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <JiraAlignShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      
      // Dev routes
      { path: 'dev/self-test', element: <SelfTest /> },
      { path: 'dev/okr-self-test', element: <OKRSelfTest /> },
      { path: 'dev/teams-self-test', element: <TeamsSelfTest /> },
      { path: 'dev/notifications-self-test', element: <NotificationsSelfTest /> },
      
      { path: 'enterprise/:id', element: <Enterprise /> },
      { path: 'portfolio/:id', element: <PortfolioRoom /> },
      { path: 'program/:id', element: <ProgramRoom /> },
      { path: 'team/:id', element: <TeamRoom /> },
      { path: 'objective/:id', element: <ObjectivePage /> },
      { path: 'feature/:id', element: <FeaturePage /> },
      { path: 'story/:id', element: <StoryPage /> },
      { path: 'task/:id', element: <TaskPage /> },
      { path: 'epic/:id', element: <EpicPage /> },
      { path: 'initiative/:id', element: <InitiativePage /> },
      { path: 'theme/:id', element: <ThemePage /> },
      { path: 'value-stream/:id', element: <ValueStreamPage /> },
      { path: 'capability/:id', element: <CapabilitiesPage /> },
      { path: 'activity-timeline', element: <ActivityTimeline /> },
      { path: 'okrs', element: <Objectives /> },
      { path: 'teams', element: <Teams /> },
      { path: 'settings', element: <Settings /> },
      { path: 'roadmap', element: <Roadmap /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
]);

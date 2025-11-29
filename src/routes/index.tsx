import { createBrowserRouter, Navigate } from 'react-router-dom';
import { JiraAlignShell } from '@/components/layout/JiraAlignShell';

// Dev pages
import SelfTest from '@/pages/dev/SelfTest';
import OKRSelfTest from '@/pages/dev/OKRSelfTest';
import TeamsSelfTest from '@/pages/dev/TeamsSelfTest';
import NotificationsSelfTest from '@/pages/dev/NotificationsSelfTest';

// Backlog module
import EpicBacklogWithSidebar from '@/pages/EpicBacklogWithSidebar';

// Stub components
const Home = () => <div>Home</div>;
const Login = () => <div>Login</div>;
const Signup = () => <div>Signup</div>;
const Enterprise = () => <div>Enterprise</div>;
const PortfolioRoom = () => <div>Portfolio Room</div>;
const ProgramRoom = () => <div>Program Room</div>;
const TeamRoom = () => <div>Team Room</div>;
const ActivityTimeline = () => <div>Activity Timeline</div>;
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
      
      // Enterprise routes
      { path: 'enterprise/:id', element: <Enterprise /> },
      { path: 'enterprise/:id/backlog', element: <EpicBacklogWithSidebar /> },
      { path: 'enterprise/:id/objectives', element: <EpicBacklogWithSidebar /> },
      
      // Portfolio routes
      { path: 'portfolio/:portfolioId', element: <PortfolioRoom /> },
      { path: 'portfolio/:portfolioId/room', element: <PortfolioRoom /> },
      { path: 'portfolio/:portfolioId/backlog', element: <EpicBacklogWithSidebar /> },
      { path: 'portfolio/:portfolioId/themes', element: <EpicBacklogWithSidebar /> },
      { path: 'portfolio/:portfolioId/epics', element: <EpicBacklogWithSidebar /> },
      { path: 'portfolio/:portfolioId/objectives', element: <EpicBacklogWithSidebar /> },
      { path: 'portfolio/:portfolioId/roadmaps', element: <Roadmap /> },
      { path: 'portfolio/:portfolioId/forecast', element: <div>Portfolio Forecast</div> },
      { path: 'portfolio/:portfolioId/capacity', element: <div>Portfolio Capacity</div> },
      
      // Program routes
      { path: 'programs/:programId', element: <ProgramRoom /> },
      { path: 'programs/:programId/room', element: <ProgramRoom /> },
      { path: 'programs/:programId/backlog', element: <EpicBacklogWithSidebar /> },
      { path: 'programs/:programId/features', element: <EpicBacklogWithSidebar /> },
      { path: 'programs/:programId/objectives', element: <EpicBacklogWithSidebar /> },
      { path: 'programs/:programId/program-board', element: <div>Program Board</div> },
      { path: 'programs/:programId/dependencies', element: <div>Dependencies</div> },
      { path: 'programs/:programId/roadmaps', element: <Roadmap /> },
      { path: 'programs/:programId/forecast', element: <div>Program Forecast</div> },
      { path: 'programs/:programId/capacity', element: <div>Program Capacity</div> },
      
      // Team routes
      { path: 'teams', element: <Teams /> },
      { path: 'teams/:teamId', element: <TeamRoom /> },
      { path: 'teams/:teamId/room', element: <TeamRoom /> },
      { path: 'teams/:teamId/backlog', element: <EpicBacklogWithSidebar /> },
      { path: 'teams/:teamId/stories', element: <EpicBacklogWithSidebar /> },
      { path: 'teams/:teamId/objectives', element: <EpicBacklogWithSidebar /> },
      { path: 'teams/:teamId/board', element: <div>Team Board</div> },
      { path: 'teams/:teamId/sprints', element: <div>Sprints</div> },
      { path: 'teams/:teamId/velocity', element: <div>Velocity</div> },
      
      // Global routes
      { path: 'activity-timeline', element: <ActivityTimeline /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
]);

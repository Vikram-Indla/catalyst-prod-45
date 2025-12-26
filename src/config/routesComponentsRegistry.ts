/**
 * Catalyst Routes & Components Registry
 * 
 * Central registry for all routes, pages, drawers, tables, and components.
 * Add new entries here and the admin page will automatically update.
 */

export type ComponentType = 'Page' | 'Drawer' | 'Table' | 'Kanban' | 'Widget' | 'Layout';
export type CategoryType = 
  | 'Public' 
  | 'Home' 
  | 'Enterprise' 
  | 'Product' 
  | 'Program' 
  | 'Project' 
  | 'Portfolio' 
  | 'Team' 
  | 'Release' 
  | 'Insights' 
  | 'Admin' 
  | 'Utility'
  | 'Shared';

export interface RegistryEntry {
  id: string;
  category: CategoryType;
  name: string;
  route?: string;
  filePath: string;
  description: string;
  type: ComponentType;
  tags?: string[];
}

export const routesComponentsRegistry: RegistryEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'auth',
    category: 'Public',
    name: 'Auth',
    route: '/auth',
    filePath: 'src/pages/Auth.tsx',
    description: 'Login/signup page',
    type: 'Page',
    tags: ['authentication', 'login', 'signup']
  },
  {
    id: 'submit-request',
    category: 'Public',
    name: 'SubmitDemandRequest',
    route: '/submit-request',
    filePath: 'src/pages/SubmitDemandRequest.tsx',
    description: 'External user demand submission form',
    type: 'Page',
    tags: ['external', 'demand', 'form']
  },
  {
    id: 'reset-password',
    category: 'Public',
    name: 'ResetPassword',
    route: '/reset-password',
    filePath: 'src/pages/ResetPassword.tsx',
    description: 'Password reset page',
    type: 'Page',
    tags: ['authentication', 'password']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'home',
    category: 'Home',
    name: 'Home',
    route: '/home',
    filePath: 'src/pages/jira-align/Home.tsx',
    description: 'Main dashboard/home page',
    type: 'Page',
    tags: ['dashboard', 'landing']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'strategy-room',
    category: 'Enterprise',
    name: 'StrategyRoomPage',
    route: '/enterprise/strategy-room',
    filePath: 'src/pages/enterprise/StrategyRoomPage.tsx',
    description: 'Executive strategy dashboard with widgets',
    type: 'Page',
    tags: ['strategy', 'executive', 'dashboard']
  },
  {
    id: 'strategic-snapshots',
    category: 'Enterprise',
    name: 'StrategicSnapshots',
    route: '/enterprise/snapshots',
    filePath: 'src/pages/enterprise/StrategicSnapshots.tsx',
    description: 'Strategy snapshot management',
    type: 'Page',
    tags: ['strategy', 'snapshots']
  },
  {
    id: 'strategic-backlog',
    category: 'Enterprise',
    name: 'StrategicBacklog',
    route: '/enterprise/backlog',
    filePath: 'src/pages/enterprise/StrategicBacklog.tsx',
    description: 'Strategic backlog with themes/objectives tabs',
    type: 'Page',
    tags: ['backlog', 'themes', 'objectives']
  },
  {
    id: 'okr-heatmap',
    category: 'Enterprise',
    name: 'OKRHeatmap',
    route: '/enterprise/okr-heatmap',
    filePath: 'src/pages/enterprise/OKRHeatmap.tsx',
    description: 'OKR heatmap visualization',
    type: 'Page',
    tags: ['okr', 'heatmap', 'visualization']
  },
  {
    id: 'okr-tree',
    category: 'Enterprise',
    name: 'OKRTree',
    route: '/enterprise/okr-tree',
    filePath: 'src/pages/enterprise/OKRTree.tsx',
    description: 'OKR tree view',
    type: 'Page',
    tags: ['okr', 'tree']
  },
  {
    id: 'okr-hub',
    category: 'Enterprise',
    name: 'OKRHub',
    route: '/enterprise/okr-hub',
    filePath: 'src/pages/enterprise/OKRHub.tsx',
    description: 'OKR hub v2 with strategy tree',
    type: 'Page',
    tags: ['okr', 'hub', 'strategy']
  },
  {
    id: 'enterprise-roadmaps',
    category: 'Enterprise',
    name: 'RoadmapsPage',
    route: '/enterprise/roadmaps',
    filePath: 'src/pages/enterprise/Roadmaps.tsx',
    description: 'Theme/epic roadmap with Gantt view',
    type: 'Page',
    tags: ['roadmap', 'gantt', 'themes']
  },
  {
    id: 'enterprise-risks',
    category: 'Enterprise',
    name: 'EnterpriseRisks',
    route: '/enterprise/risks',
    filePath: 'src/pages/enterprise/EnterpriseRisks.tsx',
    description: 'Enterprise-wide risk management',
    type: 'Page',
    tags: ['risks', 'roam']
  },
  {
    id: 'skills-inventory',
    category: 'Enterprise',
    name: 'SkillsInventory',
    route: '/enterprise/skills-inventory',
    filePath: 'src/pages/SkillsInventory.tsx',
    description: 'Skills inventory matrix',
    type: 'Page',
    tags: ['skills', 'inventory', 'matrix']
  },
  {
    id: 'enterprise-epics',
    category: 'Enterprise',
    name: 'EnterpriseEpics',
    route: '/enterprise/epics',
    filePath: 'src/pages/enterprise/EnterpriseEpics.tsx',
    description: 'Enterprise epics list',
    type: 'Page',
    tags: ['epics', 'list']
  },
  {
    id: 'enterprise-features',
    category: 'Enterprise',
    name: 'EnterpriseFeatures',
    route: '/enterprise/features',
    filePath: 'src/pages/enterprise/EnterpriseFeatures.tsx',
    description: 'Enterprise features list',
    type: 'Page',
    tags: ['features', 'list']
  },
  {
    id: 'enterprise-stories',
    category: 'Enterprise',
    name: 'EnterpriseStories',
    route: '/enterprise/stories',
    filePath: 'src/pages/enterprise/EnterpriseStories.tsx',
    description: 'Enterprise stories list',
    type: 'Page',
    tags: ['stories', 'list']
  },
  {
    id: 'enterprise-defects',
    category: 'Enterprise',
    name: 'EnterpriseDefects',
    route: '/enterprise/defects',
    filePath: 'src/pages/enterprise/EnterpriseDefects.tsx',
    description: 'Enterprise defects list',
    type: 'Page',
    tags: ['defects', 'list']
  },
  {
    id: 'enterprise-tasks',
    category: 'Enterprise',
    name: 'EnterpriseTasks',
    route: '/enterprise/tasks',
    filePath: 'src/pages/enterprise/EnterpriseTasks.tsx',
    description: 'Enterprise tasks list',
    type: 'Page',
    tags: ['tasks', 'list']
  },
  {
    id: 'enterprise-objectives',
    category: 'Enterprise',
    name: 'EnterpriseObjectives',
    route: '/enterprise/objectives',
    filePath: 'src/pages/enterprise/EnterpriseObjectives.tsx',
    description: 'Enterprise objectives list',
    type: 'Page',
    tags: ['objectives', 'list']
  },
  {
    id: 'enterprise-dependencies',
    category: 'Enterprise',
    name: 'EnterpriseDependencies',
    route: '/enterprise/dependencies',
    filePath: 'src/pages/enterprise/EnterpriseDependencies.tsx',
    description: 'Cross-program dependencies',
    type: 'Page',
    tags: ['dependencies', 'cross-program']
  },
  {
    id: 'enterprise-sprints',
    category: 'Enterprise',
    name: 'EnterpriseSprints',
    route: '/enterprise/sprints',
    filePath: 'src/pages/enterprise/EnterpriseSprints.tsx',
    description: 'Enterprise sprints',
    type: 'Page',
    tags: ['sprints', 'list']
  },
  {
    id: 'enterprise-pis',
    category: 'Enterprise',
    name: 'EnterpriseProgramIncrements',
    route: '/enterprise/program-increments',
    filePath: 'src/pages/enterprise/EnterpriseProgramIncrements.tsx',
    description: 'PI management',
    type: 'Page',
    tags: ['pi', 'program-increment']
  },
  {
    id: 'enterprise-ideation',
    category: 'Enterprise',
    name: 'EnterpriseIdeation',
    route: '/enterprise/ideation',
    filePath: 'src/pages/enterprise/EnterpriseIdeation.tsx',
    description: 'Innovation/ideation management',
    type: 'Page',
    tags: ['ideation', 'innovation']
  },
  {
    id: 'enterprise-impediments',
    category: 'Enterprise',
    name: 'EnterpriseImpediments',
    route: '/enterprise/impediments',
    filePath: 'src/pages/enterprise/EnterpriseImpediments.tsx',
    description: 'Enterprise impediments',
    type: 'Page',
    tags: ['impediments', 'blockers']
  },
  {
    id: 'enterprise-kanban-boards',
    category: 'Enterprise',
    name: 'KanbanBoardsPage',
    route: '/enterprise/kanban-boards',
    filePath: 'src/pages/KanbanBoardsPage.tsx',
    description: 'Kanban board management',
    type: 'Page',
    tags: ['kanban', 'boards']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT/INDUSTRY ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'product-backlog',
    category: 'Product',
    name: 'CatalystDemandList',
    route: '/industry/backlog',
    filePath: 'src/modules/product-backlog/pages/CatalystDemandList.tsx',
    description: 'Product backlog (business requests list)',
    type: 'Page',
    tags: ['backlog', 'demand', 'business-requests']
  },
  {
    id: 'product-kanban',
    category: 'Product',
    name: 'CatalystDemandKanban',
    route: '/industry/kanban',
    filePath: 'src/modules/kanban/pages/CatalystDemandKanban.tsx',
    description: 'Business requests Kanban board',
    type: 'Page',
    tags: ['kanban', 'demand', 'business-requests']
  },
  {
    id: 'demand-dashboard',
    category: 'Product',
    name: 'DemandSummaryPage',
    route: '/industry/dashboard',
    filePath: 'src/pages/enterprise/DemandSummaryPage.tsx',
    description: 'Executive demand dashboard',
    type: 'Page',
    tags: ['dashboard', 'demand', 'executive']
  },
  {
    id: 'product-roadmaps',
    category: 'Product',
    name: 'ExecutiveRoadmapPage',
    route: '/industry/roadmaps',
    filePath: 'src/pages/enterprise/ExecutiveRoadmapPage.tsx',
    description: 'Demand/product roadmap Gantt',
    type: 'Page',
    tags: ['roadmap', 'gantt', 'demand']
  },
  {
    id: 'product-room',
    category: 'Product',
    name: 'ProductRoomPage',
    route: '/product/room',
    filePath: 'src/pages/ProductRoomPage.tsx',
    description: 'Product room dashboard',
    type: 'Page',
    tags: ['room', 'dashboard', 'product']
  },
  {
    id: 'capacity-planning',
    category: 'Product',
    name: 'CapacityPlanningPage',
    route: '/product/capacity',
    filePath: 'src/pages/CapacityPlanningPage.tsx',
    description: 'Capacity planning Gantt/list',
    type: 'Page',
    tags: ['capacity', 'planning', 'gantt']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRAM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'program-room',
    category: 'Program',
    name: 'ProgramRoom',
    route: '/program/:programId/room',
    filePath: 'src/pages/ProgramRoom.tsx',
    description: 'Program room dashboard',
    type: 'Page',
    tags: ['room', 'dashboard', 'program']
  },
  {
    id: 'epic-backlog',
    category: 'Program',
    name: 'EpicBacklogWithSidebar',
    route: '/program/:programId/epic-backlog',
    filePath: 'src/pages/EpicBacklogWithSidebar.tsx',
    description: 'Epic backlog table',
    type: 'Page',
    tags: ['backlog', 'epics', 'table']
  },
  {
    id: 'program-features',
    category: 'Program',
    name: 'FeaturesWithSidebar',
    route: '/program/:programId/features',
    filePath: 'src/pages/program/FeaturesWithSidebar.tsx',
    description: 'Features list',
    type: 'Page',
    tags: ['features', 'list']
  },
  {
    id: 'program-board',
    category: 'Program',
    name: 'ProgramBoardWithSidebar',
    route: '/program/:programId/program-board',
    filePath: 'src/pages/ProgramBoardWithSidebar.tsx',
    description: 'PI planning board',
    type: 'Page',
    tags: ['board', 'pi', 'planning']
  },
  {
    id: 'program-dependencies',
    category: 'Program',
    name: 'DependenciesPage',
    route: '/program/:programId/dependencies',
    filePath: 'src/pages/work/Dependencies.tsx',
    description: 'Program dependencies',
    type: 'Page',
    tags: ['dependencies']
  },
  {
    id: 'program-roadmaps',
    category: 'Program',
    name: 'RoadmapsWithSidebar',
    route: '/program/:programId/roadmaps',
    filePath: 'src/pages/program/RoadmapsWithSidebar.tsx',
    description: 'Epic roadmap Gantt',
    type: 'Page',
    tags: ['roadmap', 'gantt', 'epics']
  },
  {
    id: 'program-forecast',
    category: 'Program',
    name: 'ForecastWithSidebar',
    route: '/program/:programId/forecast',
    filePath: 'src/pages/program/ForecastWithSidebar.tsx',
    description: 'Program forecast',
    type: 'Page',
    tags: ['forecast', 'planning']
  },
  {
    id: 'program-capacity',
    category: 'Program',
    name: 'CapacityWithSidebar',
    route: '/program/:programId/capacity',
    filePath: 'src/pages/program/CapacityWithSidebar.tsx',
    description: 'Capacity planning',
    type: 'Page',
    tags: ['capacity', 'planning']
  },
  {
    id: 'program-quarters',
    category: 'Program',
    name: 'ProgramIncrements',
    route: '/program/:programId/quarters',
    filePath: 'src/pages/ProgramIncrements.tsx',
    description: 'PI/Quarter management',
    type: 'Page',
    tags: ['quarters', 'pi', 'increments']
  },
  {
    id: 'epic-balancing',
    category: 'Program',
    name: 'EpicBalancingPage',
    route: '/program/:programId/epic-balancing',
    filePath: 'src/modules/epic-balancing/EpicBalancingPage.tsx',
    description: 'Epic prioritization bubble chart',
    type: 'Page',
    tags: ['epic', 'prioritization', 'bubble-chart']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'project-directory',
    category: 'Project',
    name: 'ProjectDirectory',
    route: '/projects',
    filePath: 'src/pages/ProjectDirectory.tsx',
    description: 'Project directory listing',
    type: 'Page',
    tags: ['directory', 'projects']
  },
  {
    id: 'project-summary',
    category: 'Project',
    name: 'ProjectSummaryPage',
    route: '/projects/:projectKey',
    filePath: 'src/pages/projects/ProjectSummaryPage.tsx',
    description: 'Project summary dashboard',
    type: 'Page',
    tags: ['summary', 'dashboard', 'project']
  },
  {
    id: 'project-settings',
    category: 'Project',
    name: 'ProjectSettingsPage',
    route: '/projects/:projectKey/settings',
    filePath: 'src/pages/ProjectSettingsPage.tsx',
    description: 'Project settings',
    type: 'Page',
    tags: ['settings', 'project']
  },
  {
    id: 'project-work-hub',
    category: 'Project',
    name: 'ProjectWorkHubPage',
    route: '/project/:projectId/work',
    filePath: 'src/modules/project-work-hub/ProjectWorkHubPage.tsx',
    description: 'Project work hub',
    type: 'Page',
    tags: ['work-hub', 'project']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PORTFOLIO ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'portfolio-room',
    category: 'Portfolio',
    name: 'PortfolioRoomPage',
    route: '/portfolio/:portfolioId/room',
    filePath: 'src/pages/PortfolioRoomPage.tsx',
    description: 'Portfolio room dashboard',
    type: 'Page',
    tags: ['room', 'dashboard', 'portfolio']
  },
  {
    id: 'portfolio-backlog',
    category: 'Portfolio',
    name: 'PortfolioBacklog',
    route: '/portfolio/:portfolioId/backlog',
    filePath: 'src/pages/PortfolioBacklog.tsx',
    description: 'Portfolio backlog',
    type: 'Page',
    tags: ['backlog', 'portfolio']
  },
  {
    id: 'portfolio-themes',
    category: 'Portfolio',
    name: 'ThemesGrid',
    route: '/portfolio/:portfolioId/themes',
    filePath: 'src/pages/ThemesGrid.tsx',
    description: 'Strategic themes grid',
    type: 'Page',
    tags: ['themes', 'grid', 'strategic']
  },
  {
    id: 'portfolio-epics',
    category: 'Portfolio',
    name: 'EpicsPage',
    route: '/portfolio/:portfolioId/epics',
    filePath: 'src/pages/items/EpicsPage.tsx',
    description: 'Portfolio epics',
    type: 'Page',
    tags: ['epics', 'portfolio']
  },
  {
    id: 'portfolio-roadmaps',
    category: 'Portfolio',
    name: 'Roadmaps',
    route: '/portfolio/:portfolioId/roadmaps',
    filePath: 'src/pages/Roadmaps.tsx',
    description: 'Portfolio roadmap',
    type: 'Page',
    tags: ['roadmap', 'portfolio']
  },
  {
    id: 'portfolio-forecast',
    category: 'Portfolio',
    name: 'Forecast',
    route: '/portfolio/:portfolioId/forecast',
    filePath: 'src/pages/Forecast.tsx',
    description: 'Portfolio forecast',
    type: 'Page',
    tags: ['forecast', 'portfolio']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'teams-directory',
    category: 'Team',
    name: 'TeamsDirectory',
    route: '/teams',
    filePath: 'src/pages/TeamsDirectory.tsx',
    description: 'Teams directory listing',
    type: 'Page',
    tags: ['directory', 'teams']
  },
  {
    id: 'team-room',
    category: 'Team',
    name: 'TeamRoomDetail',
    route: '/teams/:teamId/room',
    filePath: 'src/pages/TeamRoomDetail.tsx',
    description: 'Team room dashboard',
    type: 'Page',
    tags: ['room', 'dashboard', 'team']
  },
  {
    id: 'team-backlog',
    category: 'Team',
    name: 'TeamBacklog',
    route: '/team/:teamId/backlog',
    filePath: 'src/pages/team/TeamBacklog.tsx',
    description: 'Team backlog',
    type: 'Page',
    tags: ['backlog', 'team']
  },
  {
    id: 'team-stories',
    category: 'Team',
    name: 'TeamStoriesPage',
    route: '/team/:teamId/stories',
    filePath: 'src/pages/team/TeamStoriesPage.tsx',
    description: 'Team stories view',
    type: 'Page',
    tags: ['stories', 'team']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEASE ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'release-overview',
    category: 'Release',
    name: 'ReleaseOverview',
    route: '/release/overview',
    filePath: 'src/pages/release/ReleaseOverview.tsx',
    description: 'Release overview dashboard',
    type: 'Page',
    tags: ['release', 'overview', 'dashboard']
  },
  {
    id: 'incidents-list',
    category: 'Release',
    name: 'IncidentsList',
    route: '/release/incidents',
    filePath: 'src/pages/release/IncidentsList.tsx',
    description: 'Incidents list',
    type: 'Page',
    tags: ['incidents', 'list']
  },
  {
    id: 'incidents-dashboard',
    category: 'Release',
    name: 'IncidentsDashboard',
    route: '/release/incidents/dashboard',
    filePath: 'src/pages/release/IncidentsDashboard.tsx',
    description: 'Incidents dashboard',
    type: 'Page',
    tags: ['incidents', 'dashboard']
  },
  {
    id: 'incident-detail',
    category: 'Release',
    name: 'IncidentDetail',
    route: '/release/incidents/:id',
    filePath: 'src/pages/release/IncidentDetail.tsx',
    description: 'Incident detail view',
    type: 'Page',
    tags: ['incident', 'detail']
  },
  {
    id: 'versions-list',
    category: 'Release',
    name: 'VersionsList',
    route: '/release/versions',
    filePath: 'src/pages/release/VersionsList.tsx',
    description: 'Versions list',
    type: 'Page',
    tags: ['versions', 'list']
  },
  {
    id: 'version-detail',
    category: 'Release',
    name: 'VersionDetail',
    route: '/release/versions/:id',
    filePath: 'src/pages/release/VersionDetail.tsx',
    description: 'Version detail view',
    type: 'Page',
    tags: ['version', 'detail']
  },
  {
    id: 'release-calendar',
    category: 'Release',
    name: 'ReleaseCalendar',
    route: '/release/calendar',
    filePath: 'src/pages/release/ReleaseCalendar.tsx',
    description: 'Release calendar',
    type: 'Page',
    tags: ['calendar', 'release']
  },
  {
    id: 'release-settings',
    category: 'Release',
    name: 'ReleaseSettings',
    route: '/release/settings',
    filePath: 'src/pages/release/ReleaseSettings.tsx',
    description: 'Release settings',
    type: 'Page',
    tags: ['settings', 'release']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INSIGHTS ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'insights-portfolio',
    category: 'Insights',
    name: 'PortfolioInsights',
    route: '/insights/portfolio',
    filePath: 'src/pages/insights/PortfolioInsights.tsx',
    description: 'Portfolio analytics',
    type: 'Page',
    tags: ['analytics', 'portfolio', 'insights']
  },
  {
    id: 'insights-program',
    category: 'Insights',
    name: 'ProgramInsights',
    route: '/insights/program',
    filePath: 'src/pages/insights/ProgramInsights.tsx',
    description: 'Program analytics',
    type: 'Page',
    tags: ['analytics', 'program', 'insights']
  },
  {
    id: 'insights-team',
    category: 'Insights',
    name: 'TeamInsights',
    route: '/insights/team',
    filePath: 'src/pages/insights/TeamInsights.tsx',
    description: 'Team analytics',
    type: 'Page',
    tags: ['analytics', 'team', 'insights']
  },
  {
    id: 'insights-predictability',
    category: 'Insights',
    name: 'Predictability',
    route: '/insights/predictability',
    filePath: 'src/pages/insights/Predictability.tsx',
    description: 'Predictability metrics',
    type: 'Page',
    tags: ['predictability', 'metrics']
  },
  {
    id: 'insights-dependency-risk',
    category: 'Insights',
    name: 'DependencyRisk',
    route: '/insights/dependency-risk',
    filePath: 'src/pages/insights/DependencyRisk.tsx',
    description: 'Dependency risk analysis',
    type: 'Page',
    tags: ['dependency', 'risk', 'analysis']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'admin-overview',
    category: 'Admin',
    name: 'AdminOverview',
    route: '/admin/overview',
    filePath: 'src/pages/admin/AdminOverview.tsx',
    description: 'Admin dashboard',
    type: 'Page',
    tags: ['admin', 'dashboard']
  },
  {
    id: 'admin-users',
    category: 'Admin',
    name: 'Users',
    route: '/admin/users',
    filePath: 'src/pages/admin/Users.tsx',
    description: 'User management',
    type: 'Page',
    tags: ['users', 'management']
  },
  {
    id: 'admin-roles',
    category: 'Admin',
    name: 'RolesPermissions',
    route: '/admin/roles-permissions',
    filePath: 'src/pages/admin/RolesPermissions.tsx',
    description: 'Roles & permissions',
    type: 'Page',
    tags: ['roles', 'permissions']
  },
  {
    id: 'admin-programs',
    category: 'Admin',
    name: 'Programs',
    route: '/admin/programs',
    filePath: 'src/pages/admin/Programs.tsx',
    description: 'Program management',
    type: 'Page',
    tags: ['programs', 'management']
  },
  {
    id: 'admin-portfolios',
    category: 'Admin',
    name: 'Portfolios',
    route: '/admin/portfolios',
    filePath: 'src/pages/admin/Portfolios.tsx',
    description: 'Portfolio management',
    type: 'Page',
    tags: ['portfolios', 'management']
  },
  {
    id: 'admin-departments',
    category: 'Admin',
    name: 'Departments',
    route: '/admin/departments',
    filePath: 'src/pages/admin/Departments.tsx',
    description: 'Department configuration',
    type: 'Page',
    tags: ['departments', 'configuration']
  },
  {
    id: 'admin-business-owners',
    category: 'Admin',
    name: 'BusinessOwnersAdmin',
    route: '/admin/business-owners',
    filePath: 'src/pages/admin/BusinessOwners.tsx',
    description: 'Business owner configuration',
    type: 'Page',
    tags: ['business-owners', 'configuration']
  },
  {
    id: 'admin-process-steps',
    category: 'Admin',
    name: 'ProcessSteps',
    route: '/admin/business/ProcessStep',
    filePath: 'src/pages/admin/ProcessSteps.tsx',
    description: 'Process step configuration',
    type: 'Page',
    tags: ['process-steps', 'configuration']
  },
  {
    id: 'admin-modules',
    category: 'Admin',
    name: 'ModulesPackages',
    route: '/admin/modules-packages',
    filePath: 'src/pages/admin/ModulesPackages.tsx',
    description: 'Module enablement',
    type: 'Page',
    tags: ['modules', 'packages']
  },
  {
    id: 'admin-product-settings',
    category: 'Admin',
    name: 'ProductSettings',
    route: '/admin/product-settings',
    filePath: 'src/pages/admin/ProductSettings.tsx',
    description: 'Product/business line settings',
    type: 'Page',
    tags: ['product', 'settings']
  },
  {
    id: 'admin-resources',
    category: 'Admin',
    name: 'ResourceInventory',
    route: '/admin/resourceinventory',
    filePath: 'src/pages/admin/ResourceInventory.tsx',
    description: 'Resource inventory',
    type: 'Page',
    tags: ['resources', 'inventory']
  },
  {
    id: 'admin-kanban',
    category: 'Admin',
    name: 'KanbanSettings',
    route: '/admin/kanban-settings',
    filePath: 'src/pages/admin/KanbanSettings.tsx',
    description: 'Kanban board settings',
    type: 'Page',
    tags: ['kanban', 'settings']
  },
  {
    id: 'admin-design-audit',
    category: 'Admin',
    name: 'DesignAuditPage',
    route: '/admin/design-audit',
    filePath: 'src/pages/admin/DesignAuditPage.tsx',
    description: 'UI design audit tool',
    type: 'Page',
    tags: ['design', 'audit']
  },
  {
    id: 'admin-activity',
    category: 'Admin',
    name: 'AuditActivityPage',
    route: '/admin/activity',
    filePath: 'src/pages/admin/AuditActivityPage.tsx',
    description: 'Audit activity log',
    type: 'Page',
    tags: ['audit', 'activity']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY ROUTES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'browse',
    category: 'Utility',
    name: 'BrowsePage',
    route: '/browse/:key',
    filePath: 'src/pages/BrowsePage.tsx',
    description: 'Deep-link resolver for work items',
    type: 'Page',
    tags: ['browse', 'deep-link']
  },
  {
    id: 'search',
    category: 'Utility',
    name: 'SearchPage',
    route: '/search',
    filePath: 'src/pages/SearchPage.tsx',
    description: 'Global search',
    type: 'Page',
    tags: ['search', 'global']
  },
  {
    id: 'profile',
    category: 'Utility',
    name: 'UserProfile',
    route: '/profile',
    filePath: 'src/pages/UserProfile.tsx',
    description: 'User profile page',
    type: 'Page',
    tags: ['profile', 'user']
  },
  {
    id: 'knowledge-hub',
    category: 'Utility',
    name: 'KnowledgeHubPage',
    route: '/knowledge-hub',
    filePath: 'src/pages/KnowledgeHubPage.tsx',
    description: 'Knowledge hub main',
    type: 'Page',
    tags: ['knowledge', 'hub']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAWER COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'business-request-drawer',
    category: 'Shared',
    name: 'BusinessRequestDrawer',
    filePath: 'src/components/business-requests/BusinessRequestDrawer.tsx',
    description: 'Full demand/business request detail drawer with tabs (Details, Budget, Risks, Links, Discussions, Audit)',
    type: 'Drawer',
    tags: ['drawer', 'business-request', 'demand']
  },
  {
    id: 'epic-drawer',
    category: 'Shared',
    name: 'EpicDrawer',
    filePath: 'src/components/items/epics/EpicDrawer.tsx',
    description: 'Epic detail drawer with Technical Score, Budget, Features tabs',
    type: 'Drawer',
    tags: ['drawer', 'epic']
  },
  {
    id: 'objective-analytics-drawer',
    category: 'Shared',
    name: 'ObjectiveAnalyticsDrawer',
    filePath: 'src/modules/okr-v2/components/ObjectiveAnalyticsDrawer/',
    description: 'Objective analytics with performance metrics',
    type: 'Drawer',
    tags: ['drawer', 'objective', 'analytics']
  },
  {
    id: 'kr-analytics-drawer',
    category: 'Shared',
    name: 'KeyResultAnalyticsDrawer',
    filePath: 'src/modules/okr-v2/components/KeyResultAnalyticsDrawer/',
    description: 'Key result analytics drawer',
    type: 'Drawer',
    tags: ['drawer', 'key-result', 'analytics']
  },
  {
    id: 'work-item-analytics-drawer',
    category: 'Shared',
    name: 'WorkItemAnalyticsDrawer',
    filePath: 'src/modules/okr-v2/components/WorkItemAnalyticsDrawer/',
    description: 'Work item analytics drawer',
    type: 'Drawer',
    tags: ['drawer', 'work-item', 'analytics']
  },
  {
    id: 'theme-details-drawer',
    category: 'Shared',
    name: 'ThemeDetailsDrawer',
    filePath: 'src/components/strategic-backlog/ThemeDetailsDrawer.tsx',
    description: 'Strategic theme detail drawer',
    type: 'Drawer',
    tags: ['drawer', 'theme', 'strategic']
  },
  {
    id: 'goal-drawer',
    category: 'Shared',
    name: 'GoalDrawer',
    filePath: 'src/components/strategic-backlog/GoalDrawer.tsx',
    description: 'Strategic goal drawer',
    type: 'Drawer',
    tags: ['drawer', 'goal', 'strategic']
  },
  {
    id: 'strategic-epic-drawer',
    category: 'Shared',
    name: 'StrategicEpicDrawer',
    filePath: 'src/components/strategic-backlog/StrategicEpicDrawer.tsx',
    description: 'Strategic epic drawer',
    type: 'Drawer',
    tags: ['drawer', 'epic', 'strategic']
  },
  {
    id: 'dependency-details-drawer',
    category: 'Shared',
    name: 'DependencyDetailsDrawer',
    filePath: 'src/components/dependencies/DependencyDetailsDrawer.tsx',
    description: 'Dependency detail drawer',
    type: 'Drawer',
    tags: ['drawer', 'dependency']
  },
  {
    id: 'risk-drawer',
    category: 'Shared',
    name: 'RiskDrawer',
    filePath: 'src/components/risks/RiskDrawer.tsx',
    description: 'Risk detail drawer with RiskFormV2',
    type: 'Drawer',
    tags: ['drawer', 'risk', 'roam']
  },
  {
    id: 'epic-details-drawer',
    category: 'Shared',
    name: 'EpicDetailsDrawer',
    filePath: 'src/modules/epic-balancing/components/EpicDetailsDrawer.tsx',
    description: 'Epic balancing detail drawer',
    type: 'Drawer',
    tags: ['drawer', 'epic', 'balancing']
  },
  {
    id: 'feature-details-panel',
    category: 'Shared',
    name: 'FeatureDetailsPanel',
    filePath: 'src/components/backlog/FeatureDetailsPanel.tsx',
    description: 'Feature detail panel',
    type: 'Drawer',
    tags: ['drawer', 'feature', 'panel']
  },
  {
    id: 'pyramid-drilldown-drawer',
    category: 'Shared',
    name: 'PyramidDrilldownDrawer',
    filePath: 'src/components/strategy/PyramidDrilldownDrawer.tsx',
    description: 'Strategy pyramid drill-down',
    type: 'Drawer',
    tags: ['drawer', 'pyramid', 'strategy']
  },
  {
    id: 'manage-quarters-drawer',
    category: 'Shared',
    name: 'ManageQuartersDrawer',
    filePath: 'src/components/strategy/snapshots/ManageQuartersDrawer.tsx',
    description: 'Quarter management drawer',
    type: 'Drawer',
    tags: ['drawer', 'quarters', 'management']
  },
  {
    id: 'strategy-filters-drawer',
    category: 'Shared',
    name: 'StrategyRoomFiltersDrawer',
    filePath: 'src/components/strategy/StrategyRoomFiltersDrawer.tsx',
    description: 'Strategy room filters',
    type: 'Drawer',
    tags: ['drawer', 'filters', 'strategy']
  },
  {
    id: 'canonical-drawer-shell',
    category: 'Shared',
    name: 'CanonicalDrawerShell',
    filePath: 'src/components/shared/CanonicalDrawerShell.tsx',
    description: 'Reusable drawer shell pattern',
    type: 'Drawer',
    tags: ['drawer', 'shell', 'reusable']
  },
  {
    id: 'filter-drawer',
    category: 'Shared',
    name: 'FilterDrawer',
    filePath: 'src/modules/project-work-hub/components/FilterDrawer.tsx',
    description: 'Work hub filter drawer',
    type: 'Drawer',
    tags: ['drawer', 'filter', 'work-hub']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE/LIST COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'executive-table',
    category: 'Shared',
    name: 'ExecutiveTable',
    filePath: 'src/components/business-requests/ExecutiveTable.tsx',
    description: 'Main demand list table with sorting, filtering',
    type: 'Table',
    tags: ['table', 'demand', 'business-requests']
  },
  {
    id: 'epic-backlog-table',
    category: 'Shared',
    name: 'EpicBacklogTable',
    filePath: 'src/components/backlog/EpicBacklogTable.tsx',
    description: 'Epic backlog table with drag-drop',
    type: 'Table',
    tags: ['table', 'epic', 'backlog', 'drag-drop']
  },
  {
    id: 'features-table',
    category: 'Shared',
    name: 'FeaturesTable',
    filePath: 'src/components/backlog/FeaturesTable.tsx',
    description: 'Features backlog table',
    type: 'Table',
    tags: ['table', 'features', 'backlog']
  },
  {
    id: 'dependencies-table',
    category: 'Shared',
    name: 'DependenciesTable',
    filePath: 'src/components/dependencies/DependenciesTable.tsx',
    description: 'Dependencies list view',
    type: 'Table',
    tags: ['table', 'dependencies']
  },
  {
    id: 'risks-grid',
    category: 'Shared',
    name: 'RisksGrid',
    filePath: 'src/pages/risks/RisksGridPage.tsx',
    description: 'Risks list with ROAM categorization',
    type: 'Table',
    tags: ['table', 'risks', 'roam']
  },
  {
    id: 'okr-tree',
    category: 'Shared',
    name: 'OkrTree',
    filePath: 'src/components/strategy/OkrTree.tsx',
    description: 'OKR hierarchy tree (Objective → KR → Work Item)',
    type: 'Table',
    tags: ['table', 'tree', 'okr', 'hierarchy']
  },
  {
    id: 'strategy-tree',
    category: 'Shared',
    name: 'StrategyTree',
    filePath: 'src/modules/okr-v2/components/StrategyCockpit/StrategyTree.tsx',
    description: 'Strategy tree in OKR Hub v2',
    type: 'Table',
    tags: ['table', 'tree', 'strategy']
  },
  {
    id: 'themes-table',
    category: 'Shared',
    name: 'ThemesTable',
    filePath: 'src/components/strategic-backlog/ThemesTable.tsx',
    description: 'Strategic themes list',
    type: 'Table',
    tags: ['table', 'themes', 'strategic']
  },
  {
    id: 'all-work-ticket-list',
    category: 'Shared',
    name: 'AllWorkTicketList',
    filePath: 'src/modules/work-hub/components/AllWorkTicketList.tsx',
    description: 'Project work hub ticket list',
    type: 'Table',
    tags: ['table', 'tickets', 'work-hub']
  },
  {
    id: 'capacity-list-view',
    category: 'Shared',
    name: 'ListView',
    filePath: 'src/modules/capacity-planning/components/ListView.tsx',
    description: 'Capacity planning list view',
    type: 'Table',
    tags: ['table', 'capacity', 'planning']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KANBAN COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'business-requests-kanban',
    category: 'Shared',
    name: 'BusinessRequestsKanbanView',
    filePath: 'src/modules/kanban/components/BusinessRequestsKanbanView.tsx',
    description: 'Demand Kanban board',
    type: 'Kanban',
    tags: ['kanban', 'demand', 'business-requests']
  },
  {
    id: 'kanban-board-view',
    category: 'Shared',
    name: 'KanbanBoardView',
    filePath: 'src/pages/KanbanBoardView.tsx',
    description: 'Generic Kanban board view',
    type: 'Kanban',
    tags: ['kanban', 'generic']
  },
  {
    id: 'epic-kanban-view',
    category: 'Shared',
    name: 'EpicKanbanView',
    filePath: 'src/components/backlog/EpicKanbanView.tsx',
    description: 'Epic Kanban view',
    type: 'Kanban',
    tags: ['kanban', 'epic']
  },
  {
    id: 'feature-kanban-view',
    category: 'Shared',
    name: 'FeatureKanbanView',
    filePath: 'src/components/backlog/FeatureKanbanView.tsx',
    description: 'Feature Kanban view',
    type: 'Kanban',
    tags: ['kanban', 'feature']
  },
  {
    id: 'program-board-new',
    category: 'Shared',
    name: 'ProgramBoardNew',
    filePath: 'src/pages/ProgramBoardNew.tsx',
    description: 'PI planning program board',
    type: 'Kanban',
    tags: ['kanban', 'program-board', 'pi']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WIDGET COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'mission-vision-values',
    category: 'Shared',
    name: 'MissionVisionValuesCard',
    filePath: 'src/components/strategy/MissionVisionValuesCard.tsx',
    description: 'Mission/Vision/Values editable cards',
    type: 'Widget',
    tags: ['widget', 'mission', 'vision', 'values']
  },
  {
    id: 'execution-outcomes-widget',
    category: 'Shared',
    name: 'ExecutionAgainstOutcomesWidget',
    filePath: 'src/components/strategy/ExecutionAgainstOutcomesWidget.tsx',
    description: 'Execution vs outcomes widget',
    type: 'Widget',
    tags: ['widget', 'execution', 'outcomes']
  },
  {
    id: 'strategic-goals-widget',
    category: 'Shared',
    name: 'StrategicGoalsWidget',
    filePath: 'src/components/strategy/StrategicGoalsWidget.tsx',
    description: 'Strategic goals summary',
    type: 'Widget',
    tags: ['widget', 'goals', 'strategic']
  },
  {
    id: 'misaligned-work-items',
    category: 'Shared',
    name: 'MisalignedWorkItems',
    filePath: 'src/components/strategy/MisalignedWorkItems.tsx',
    description: 'Misaligned items list',
    type: 'Widget',
    tags: ['widget', 'misalignment', 'work-items']
  },
  {
    id: 'snapshot-progress',
    category: 'Shared',
    name: 'SnapshotProgress',
    filePath: 'src/components/strategy/SnapshotProgress.tsx',
    description: 'Snapshot progress bars',
    type: 'Widget',
    tags: ['widget', 'progress', 'snapshot']
  },
  {
    id: 'strategy-pyramid',
    category: 'Shared',
    name: 'StrategyPyramid',
    filePath: 'src/components/strategy/StrategyPyramid.tsx',
    description: 'Strategy pyramid visualization',
    type: 'Widget',
    tags: ['widget', 'pyramid', 'strategy']
  },
  {
    id: 'demand-summary-stats',
    category: 'Shared',
    name: 'DemandSummaryStats',
    filePath: 'src/components/business-requests/DemandSummaryStats.tsx',
    description: 'Demand dashboard stats',
    type: 'Widget',
    tags: ['widget', 'stats', 'demand']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'catalyst-shell',
    category: 'Shared',
    name: 'CatalystShell',
    filePath: 'src/components/layout/CatalystShell.tsx',
    description: 'Main app shell with nav + sidebar',
    type: 'Layout',
    tags: ['layout', 'shell', 'navigation']
  },
  {
    id: 'global-page-header',
    category: 'Shared',
    name: 'GlobalPageHeader',
    filePath: 'src/components/layout/GlobalPageHeader.tsx',
    description: 'Unified page header with breadcrumbs',
    type: 'Layout',
    tags: ['layout', 'header', 'breadcrumbs']
  },
  {
    id: 'page-shell',
    category: 'Shared',
    name: 'PageShell',
    filePath: 'src/components/shared/PageShell.tsx',
    description: 'Page container with consistent spacing',
    type: 'Layout',
    tags: ['layout', 'container', 'spacing']
  },
  {
    id: 'admin-layout',
    category: 'Shared',
    name: 'AdminLayout',
    filePath: 'src/pages/admin/AdminLayout.tsx',
    description: 'Admin section layout wrapper',
    type: 'Layout',
    tags: ['layout', 'admin']
  },
  {
    id: 'work-hub-layout',
    category: 'Shared',
    name: 'WorkHubLayout',
    filePath: 'src/modules/work-hub/WorkHubLayout.tsx',
    description: 'Work hub layout wrapper',
    type: 'Layout',
    tags: ['layout', 'work-hub']
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getEntriesByType(type: ComponentType): RegistryEntry[] {
  return routesComponentsRegistry.filter(entry => entry.type === type);
}

export function getEntriesByCategory(category: CategoryType): RegistryEntry[] {
  return routesComponentsRegistry.filter(entry => entry.category === category);
}

export function searchEntries(query: string): RegistryEntry[] {
  const lowerQuery = query.toLowerCase();
  return routesComponentsRegistry.filter(entry => 
    entry.name.toLowerCase().includes(lowerQuery) ||
    entry.description.toLowerCase().includes(lowerQuery) ||
    entry.route?.toLowerCase().includes(lowerQuery) ||
    entry.filePath.toLowerCase().includes(lowerQuery) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getAllTypes(): ComponentType[] {
  return [...new Set(routesComponentsRegistry.map(entry => entry.type))];
}

export function getAllCategories(): CategoryType[] {
  return [...new Set(routesComponentsRegistry.map(entry => entry.category))];
}

export function getStats() {
  const byType = getAllTypes().reduce((acc, type) => {
    acc[type] = getEntriesByType(type).length;
    return acc;
  }, {} as Record<ComponentType, number>);

  const byCategory = getAllCategories().reduce((acc, category) => {
    acc[category] = getEntriesByCategory(category).length;
    return acc;
  }, {} as Record<CategoryType, number>);

  return {
    total: routesComponentsRegistry.length,
    byType,
    byCategory
  };
}

# 2. Architecture Overview

## 2.1 System Context

### 2.1.1 Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Catalyst Platform                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      In-Jira Module                              │   │
│  │                                                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Projects │  │  Issues  │  │  Boards  │  │ Releases │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │ Strategy Room  │  │  Team Manager  │  │   Admin Hub    │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Jira Cloud    │  │   Slack/Teams   │  │   CI/CD Tools   │
│   (Import)      │  │  (Notifications)│  │   (Webhooks)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 2.1.2 User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| Admin | System administrator | Full access |
| Project Lead | Project manager | Project-level admin |
| Developer | Team member | Issue CRUD, board access |
| Viewer | Read-only user | Browse only |
| Service Account | Integration user | API access |

## 2.2 Component Architecture

### 2.2.1 Frontend Components

```
src/modules/in-jira/
├── components/
│   ├── board/
│   │   ├── KanbanBoard.tsx       # Kanban board implementation
│   │   ├── ScrumBoard.tsx        # Scrum board with sprints
│   │   ├── BoardColumn.tsx       # Column container
│   │   ├── IssueCard.tsx         # Draggable issue card
│   │   └── index.ts
│   ├── drawer/
│   │   ├── IssueDrawer.tsx       # Main drawer component
│   │   ├── DetailsPanel.tsx      # Right-side details
│   │   ├── ActivityTabs.tsx      # Comments/history/worklog
│   │   └── InlineEdit.tsx        # Inline editing
│   ├── import/
│   │   ├── ImportWizard.tsx      # Multi-step import flow
│   │   └── AISuggestionBanner.tsx
│   ├── releases/
│   │   ├── VersionCard.tsx       # Version display
│   │   ├── VersionDialog.tsx     # Create/edit version
│   │   └── FixVersionPicker.tsx
│   ├── StatusPill.tsx            # Status display
│   ├── TransitionControls.tsx    # Workflow transitions
│   └── CreateIssueModal.tsx
├── context/
│   └── InJiraContext.tsx         # Global state management
├── hooks/
│   ├── useBoardData.ts           # Board data fetching
│   ├── useVersions.ts            # Version management
│   ├── useIssueAudit.ts          # Audit trail
│   └── useAISuggestions.ts       # AI suggestions
├── pages/
│   ├── SummaryPage.tsx           # Project overview
│   ├── KanbanBoardPage.tsx       # Kanban view
│   ├── ScrumBoardPage.tsx        # Scrum view
│   ├── ListPage.tsx              # Issue list
│   ├── AllWorkPage.tsx           # Hierarchy view
│   ├── ReleasesPage.tsx          # Version management
│   └── SettingsPage.tsx          # Project settings
├── types/
│   └── index.ts                  # TypeScript definitions
└── utils/
    └── lexorank.ts               # LexoRank implementation
```

### 2.2.2 Backend Components

```
supabase/
├── functions/
│   ├── injira-import/            # Jira Cloud import
│   │   └── index.ts
│   ├── injira-import-analyzer/   # AI diff analyzer
│   │   └── index.ts
│   └── injira-defect-triage/     # AI defect triage
│       └── index.ts
└── migrations/
    └── *.sql                     # Schema migrations
```

## 2.3 Data Flow

### 2.3.1 Issue Creation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Modal   │────▶│ Supabase │────▶│ Database │
│  Action  │     │  Form    │     │  Client  │     │  Insert  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Realtime │
                                  │ Broadcast│
                                  └──────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │  Board   │        │   List   │        │  Other   │
              │  Update  │        │  Update  │        │  Views   │
              └──────────┘        └──────────┘        └──────────┘
```

### 2.3.2 Board Drag-Drop Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Drag   │────▶│ Calculate│────▶│ Optimistic│────▶│  Server  │
│   Event  │     │ New Rank │     │  Update   │     │  Update  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Rollback │
                                  │ on Error │
                                  └──────────┘
```

### 2.3.3 Import Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Upload  │────▶│  Parse   │────▶│ Analyze  │────▶│  Diff    │
│   JSON   │     │ Manifest │     │   (AI)   │     │  Report  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Complete │◀────│  Upsert  │◀────│  Map     │◀────│  Review  │
│          │     │  Issues  │     │  Data    │     │  & Start │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

## 2.4 State Management

### 2.4.1 Context Structure

```typescript
interface InJiraState {
  // Project context
  currentProject: Project | null;
  
  // Issue state
  selectedIssue: Issue | null;
  isDrawerOpen: boolean;
  
  // Board state
  boardColumns: BoardColumn[];
  quickFilters: QuickFilter[];
  activeFilters: string[];
  
  // Search
  searchQuery: string;
  
  // Modal state
  isCreateModalOpen: boolean;
  createModalDefaults: Partial<Issue>;
}
```

### 2.4.2 State Updates

| Action | Trigger | State Change |
|--------|---------|--------------|
| openIssueDrawer | Click issue | selectedIssue, isDrawerOpen |
| closeIssueDrawer | Click X, ESC | selectedIssue, isDrawerOpen |
| toggleFilter | Click filter | activeFilters |
| setSearchQuery | Type in search | searchQuery |
| openCreateModal | Click Create | isCreateModalOpen, createModalDefaults |

## 2.5 Security Architecture

### 2.5.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Supabase │────▶│   JWT    │────▶│  Session │
│  Form    │     │   Auth   │     │  Token   │     │  Cookie  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  RLS     │
                                  │ Policies │
                                  └──────────┘
```

### 2.5.2 Authorization Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Authentication (JWT)                                    │
│ - User identity verification                                     │
│ - Token validation                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Tenant Isolation (RLS)                                  │
│ - tenant_id on all tables                                        │
│ - Automatic filtering                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Project Permissions                                     │
│ - Project membership                                             │
│ - Role-based access                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Issue Security Level                                    │
│ - Issue-level restrictions                                       │
│ - Field-level visibility                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 2.6 Performance Architecture

### 2.6.1 Caching Strategy

| Layer | Technology | TTL | Invalidation |
|-------|------------|-----|--------------|
| Browser | React Query | 5 min | Mutation |
| CDN | Cloudflare | 1 hour | Purge API |
| Database | PostgreSQL | N/A | Realtime |

### 2.6.2 Optimization Techniques

1. **Virtual Scrolling** - Boards with 1000+ issues
2. **LexoRank** - O(1) reordering
3. **Optimistic Updates** - Immediate UI feedback
4. **Selective Subscriptions** - Per-board realtime

## 2.7 Scalability Architecture

### 2.7.1 Horizontal Scaling

```
                        ┌──────────────┐
                        │ Load Balancer│
                        └──────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Edge Fn  │    │ Edge Fn  │    │ Edge Fn  │
        │ Instance │    │ Instance │    │ Instance │
        └──────────┘    └──────────┘    └──────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │   (Primary)      │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │   Replica    │    │   Replica    │
            │   (Read)     │    │   (Read)     │
            └──────────────┘    └──────────────┘
```

### 2.7.2 Capacity Planning

| Resource | Per Tenant | Max |
|----------|------------|-----|
| Projects | 1,000 | 100,000 |
| Issues/Project | 1,000,000 | 100,000,000 |
| Users/Tenant | 10,000 | 1,000,000 |
| Attachments | 10GB | 1PB |

# Catalyst Architecture Documentation

## System Overview

Catalyst is a full-stack SAFe portfolio management application built with a modern, scalable architecture.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                       │
│  React SPA with TypeScript + Tailwind CSS          │
│  (Vite build, React Router, TanStack Query)        │
└─────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────┐
│                 Supabase Backend                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ PostgreSQL │  │ Auth       │  │ Edge         │ │
│  │ Database   │  │ (JWT)      │  │ Functions    │ │
│  └────────────┘  └────────────┘  └──────────────┘ │
│  ┌────────────┐  ┌────────────┐                    │
│  │ Storage    │  │ Realtime   │                    │
│  │ Buckets    │  │ (WebSocket)│                    │
│  └────────────┘  └────────────┘                    │
└─────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives (Button, Dialog, etc.)
│   ├── layout/          # Layout components (AppShell, Sidebar, etc.)
│   ├── shared/          # Shared components (HealthBadge, etc.)
│   ├── admin/           # Admin-only components
│   ├── backlog/         # Backlog-specific components
│   ├── items/           # Work item components
│   │   └── epics/       # Epic-specific components
│   │       ├── tabs/    # Epic detail tabs
│   │       ├── dialogs/ # Epic dialogs
│   │       └── *.tsx    # Epic views (Kanban, List, etc.)
│   └── ...
├── pages/               # Route pages
│   ├── items/          # Item pages (Epics, Features, etc.)
│   │   └── reports/    # Report pages
│   ├── enterprise/     # Enterprise-level pages
│   ├── admin/          # Admin pages
│   └── ...
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
├── contexts/           # React contexts
├── integrations/       # Third-party integrations
│   └── supabase/       # Supabase client and types
└── types/              # TypeScript type definitions
```

### State Management

**Server State:**
- **Library**: TanStack Query (React Query)
- **Usage**: All data fetching, mutations, and caching
- **Pattern**: Query keys for cache invalidation
- **Benefits**: Automatic background refetching, optimistic updates

**Client State:**
- **Library**: React Context API + useState
- **Usage**: UI state, navigation context, user preferences
- **Contexts**: 
  - `AuthContext` - User authentication
  - `NavigationContext` - Navigation state
  - `JiraAlignContext` - Jira Align-specific state

**Form State:**
- **Library**: React Hook Form
- **Validation**: Zod schemas
- **Usage**: All forms (Epic, Feature, Story dialogs)

### Routing

**Library**: React Router v6

**Route Structure:**
```
/                        # Home redirect
/auth                   # Authentication page
/home                   # Jira Align home

# Enterprise Routes
/enterprise/strategy-room
/enterprise/okr-heatmap
/enterprise/okr-tree
/enterprise/roadmaps
/enterprise/backlog

# Portfolio Routes
/portfolio/:id/room
/portfolio/:id/epics
/portfolio/:id/roadmap

# Program Routes
/programs/program-board
/capacity

# Item Routes
/items/epics                              # Epic list
/items/epics/recycle-bin                  # Deleted epics
/items/epics/canceled                     # Canceled epics
/items/epics/:id/status-report            # Status report
/items/epics/:id/trace                    # Trace report
/items/epics/:id/requirement-hierarchy    # Hierarchy

# Admin Routes
/admin/org-setup
/admin/user-roles
/admin/permissions
```

### UI Component Library

**Base**: shadcn/ui (Radix UI primitives)

**Customization:**
- Design tokens in `index.css`
- Tailwind config in `tailwind.config.ts`
- Component variants in component files

**Key Components:**
- `Button` - Multiple variants (default, destructive, outline, ghost, etc.)
- `Dialog` - Modal dialogs
- `Sheet` - Slide-out panels (detail panels)
- `Tabs` - Tab navigation (epic detail tabs)
- `Table` - Data tables (epic list)
- `Card` - Content cards
- `Badge` - Status badges
- `Progress` - Progress bars

---

## Backend Architecture

### Database Schema

**Platform**: PostgreSQL via Supabase

**Schema Organization:**

```
public schema
├── Core Tables
│   ├── profiles              # User profiles
│   ├── user_roles            # Role assignments
│   ├── permission_grants     # Permission system
│   └── activity_logs         # Audit trail
├── Organizational Hierarchy
│   ├── portfolios
│   ├── programs
│   ├── teams
│   ├── portfolio_members     # Membership tracking
│   ├── program_members
│   └── team_members
├── Strategic Planning
│   ├── strategic_themes
│   ├── initiatives
│   ├── objectives
│   ├── key_results
│   └── strategy_snapshots
├── Work Items
│   ├── epics                 # Large initiatives
│   ├── capabilities          # Epic decomposition
│   ├── features              # Program-level work
│   ├── stories               # Team-level work
│   └── subtasks              # Task-level work
├── Epic Supporting Tables
│   ├── epic_design_items
│   ├── epic_intake_responses
│   ├── epic_benefits
│   ├── epic_value_metrics
│   ├── epic_links
│   ├── epic_pi_forecasts
│   ├── epic_spend
│   └── milestones
├── Planning & Execution
│   ├── program_increments
│   ├── iterations (sprints)
│   ├── capacity_allocations
│   ├── dependencies
│   └── risks
└── Process Management
    ├── process_flows
    ├── process_steps
    └── epic_process_history
```

### Row-Level Security (RLS)

**Enabled on All Tables**

**Policy Patterns:**

1. **Admin Full Access**
   ```sql
   CREATE POLICY "Admins can do everything"
   ON epics FOR ALL
   USING (is_admin(auth.uid()));
   ```

2. **Scope-Based Access**
   ```sql
   CREATE POLICY "Users see their scope"
   ON features FOR SELECT
   USING (
     user_in_program(auth.uid(), program_id)
   );
   ```

3. **Owner-Based Access**
   ```sql
   CREATE POLICY "Users can edit their items"
   ON stories FOR UPDATE
   USING (owner_id = auth.uid());
   ```

4. **Role-Based Access**
   ```sql
   CREATE POLICY "Managers see all"
   ON teams FOR SELECT
   USING (
     has_role(auth.uid(), 'program_manager') OR
     has_role(auth.uid(), 'team_lead')
   );
   ```

### Database Functions

**Membership Checks:**
- `user_in_team(_user_id, _team_id)` - Check team membership
- `user_in_program(_user_id, _program_id)` - Check program membership (cascades)
- `user_in_portfolio(_user_id, _portfolio_id)` - Check portfolio membership (cascades)

**Permission Checks:**
- `has_role(_user_id, _role)` - Check if user has role
- `is_admin(_user_id)` - Admin check helper
- `check_permission(...)` - Comprehensive permission check

**Triggers:**
- `update_updated_at_column()` - Auto-update timestamps
- `track_epic_process_step_change()` - Track process flow
- `log_activity()` - Audit trail logging
- `calculate_feature_wsjf()` - WSJF score calculation

### Authentication

**Provider**: Supabase Auth

**Methods:**
- Email/Password
- Magic Links
- OAuth (Google, GitHub, etc.)

**JWT Structure:**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {
    "provider": "email"
  },
  "user_metadata": {
    "full_name": "User Name"
  }
}
```

**Protected Routes:**
- All routes except `/auth` require authentication
- Admin routes require `AdminGuard`
- Permission-based guards on specific operations

---

## Data Flow

### Typical Data Flow (Epic List Example)

```
1. User navigates to /items/epics

2. EpicsPage component mounts
   └─> useQuery hook triggers

3. Query executes:
   supabase
     .from('epics')
     .select('*, strategic_themes(name), programs(name)')
     .order('name')

4. Supabase applies RLS policies:
   - Check user authentication
   - Apply scope-based filtering
   - Return only accessible epics

5. Data flows to component:
   - TanStack Query caches result
   - Component receives data
   - Renders list view

6. User clicks epic:
   - Opens EpicDetailsPanel
   - Loads detail tabs on-demand
   - Each tab has own useQuery

7. User edits epic:
   - useMutation triggered
   - Optimistic update in UI
   - API call to Supabase
   - On success: invalidate queries
   - On error: rollback optimistic update
```

### Optimistic Updates Pattern

```typescript
const updateEpicMutation = useMutation({
  mutationFn: async (data) => {
    const { error } = await supabase
      .from('epics')
      .update(data)
      .eq('id', epicId);
    if (error) throw error;
  },
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['epics']);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['epics']);
    
    // Optimistically update
    queryClient.setQueryData(['epics'], (old) => 
      old.map(e => e.id === epicId ? { ...e, ...newData } : e)
    );
    
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['epics'], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries(['epics']);
  }
});
```

---

## Security Architecture

### Authentication Flow

```
1. User submits credentials → Supabase Auth
2. Supabase validates → Returns JWT
3. Frontend stores JWT → localStorage
4. All API calls include JWT → Authorization header
5. Supabase validates JWT → Applies RLS
6. Returns filtered data → Based on user scope
```

### Authorization Layers

**Layer 1: Route Guards**
- `ProtectedRoute` - Requires authentication
- `AdminGuard` - Requires admin role
- `PermissionGuard` - Requires specific permission

**Layer 2: Row-Level Security (Database)**
- RLS policies on all tables
- Automatic filtering by scope
- Cannot be bypassed from client

**Layer 3: Permission System**
- Role-based permissions
- Entity-type specific permissions
- Scope-based permissions (global/portfolio/program/team)

**Layer 4: UI-Level Guards**
- Hide buttons if no permission
- Disable actions if no access
- Show error messages appropriately

### Data Encryption

- **In Transit**: HTTPS/TLS
- **At Rest**: Supabase encryption
- **JWTs**: Signed with secret key
- **Passwords**: Bcrypt hashed

---

## Performance Optimizations

### Frontend

**Code Splitting:**
- React.lazy() for route-based splitting
- Dynamic imports for large components
- Vendor chunk separation

**Caching:**
- TanStack Query cache (5 minutes default)
- Background refetching
- Stale-while-revalidate pattern

**Rendering:**
- React.memo for expensive components
- useCallback for stable function references
- useMemo for expensive computations
- Virtualized lists for large datasets (future)

**Bundle Size:**
- Tree-shaking with Vite
- Lazy loading of routes
- Import only used icons
- Minimal dependencies

### Backend

**Database Indexes:**
```sql
-- Membership lookup
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_program_members_user ON program_members(user_id);

-- Epic queries
CREATE INDEX idx_epics_portfolio ON epics(portfolio_id);
CREATE INDEX idx_epics_program ON epics(primary_program_id);
CREATE INDEX idx_epics_theme ON epics(theme_id);

-- Feature queries
CREATE INDEX idx_features_epic ON features(epic_id);
CREATE INDEX idx_features_program ON features(program_id);
```

**Query Optimization:**
- Select only needed columns
- Use joins instead of multiple queries
- Limit result sets appropriately
- Use EXISTS instead of JOINs in RLS when possible

**Caching:**
- Function result caching (future)
- Materialized views for complex reports (future)
- CDN for static assets

---

## Deployment Architecture

### Current Setup (Lovable Cloud)

```
┌────────────────────────────────────────────────┐
│  Lovable CDN (Static Assets)                   │
│  - HTML, CSS, JS bundles                       │
│  - Images, fonts                               │
└────────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│  Supabase Cloud                                │
│  - Database (PostgreSQL)                       │
│  - Auth service                                │
│  - Edge Functions                              │
│  - Storage                                     │
│  - Realtime                                    │
└────────────────────────────────────────────────┘
```

### Build Process

```
1. Code pushed to GitHub
2. Lovable detects changes
3. Runs build:
   - npm run build
   - Vite bundles
   - TypeScript compilation
   - Tailwind CSS processing
4. Uploads to CDN
5. Backend changes auto-deploy (Edge Functions, migrations)
```

### Environment Variables

**Frontend (.env):**
```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

**Backend (Supabase Secrets):**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin operations
- Custom secrets as needed (API keys, etc.)

---

## Monitoring & Logging

### Frontend Monitoring

**Console Logs:**
- Development: Verbose logging
- Production: Error logging only

**Error Tracking:**
- React Error Boundaries
- Console error capture
- Toast notifications for user-facing errors

### Backend Monitoring

**Supabase Dashboard:**
- Query performance
- Error logs
- Auth logs
- Edge function logs

**Activity Logs Table:**
- All CRUD operations logged
- Actor, entity, before/after state
- Timestamp and action type

---

## Testing Strategy

### Unit Tests
- *Pending implementation*
- Target: Utilities, helpers, pure functions

### Integration Tests
- *Pending implementation*
- Target: Component + API interactions

### End-to-End Tests
- **Framework**: Playwright
- **Location**: `/e2e` folder
- **Coverage**:
  - Epic backlog workflows
  - Forecast functionality
  - OKR management
  - Program board operations

**Example Test:**
```typescript
test('should create and edit epic', async ({ page }) => {
  await page.goto('/items/epics');
  await page.click('text=Add Epic');
  await page.fill('[name="name"]', 'Test Epic');
  await page.click('button:has-text("Create")');
  await expect(page.locator('text=Test Epic')).toBeVisible();
});
```

---

## Development Workflow

### Local Development

```bash
# Clone repository
git clone <repo-url>
cd catalyst

# Install dependencies
npm install

# Start dev server
npm run dev

# Runs on http://localhost:8080
```

### Database Changes

```bash
# Create migration
supabase migration new <name>

# Edit migration file
# Add SQL in supabase/migrations/

# Deploy via Lovable
# Migrations auto-apply on push
```

### Feature Development

1. Create feature branch
2. Develop locally with hot reload
3. Test in preview
4. Push to GitHub
5. Lovable auto-deploys
6. Review and merge

---

## Scalability Considerations

### Current Limits
- Supabase free tier constraints
- Database connection pooling
- Storage quotas

### Future Scaling
- **Database**: Upgrade Supabase tier, add read replicas
- **Frontend**: Edge CDN, code splitting
- **Backend**: Edge Functions for compute
- **Caching**: Redis layer
- **Search**: Full-text search indexing

---

## Maintenance

### Regular Tasks
- Monitor error logs
- Review performance metrics
- Update dependencies monthly
- Backup database weekly (Supabase automatic)
- Review RLS policies quarterly

### Dependency Updates
```bash
# Check outdated
npm outdated

# Update
npm update

# Test thoroughly
npm run build
npm run dev
```

---

## Troubleshooting

### Common Issues

**Build Failures:**
- Check TypeScript errors
- Verify all imports resolve
- Check Tailwind config

**Query Failures:**
- Check RLS policies
- Verify user permissions
- Check database connection

**Slow Performance:**
- Check query complexity
- Add database indexes
- Optimize component rendering
- Check bundle size

---

## Future Architecture

### Planned Improvements

1. **Microservices**: Extract heavy operations to Edge Functions
2. **Real-time Collaboration**: Expand WebSocket usage
3. **Offline Support**: PWA with service workers
4. **Mobile App**: React Native version
5. **Analytics**: Custom analytics dashboard
6. **AI Integration**: Lovable AI for insights
7. **Multi-tenancy**: Tenant isolation at database level

---

## Contributing

### Code Standards
- TypeScript strict mode
- ESLint + Prettier
- Component-based architecture
- Functional components with hooks

### Commit Messages
- Conventional commits format
- Clear, descriptive messages
- Reference issue numbers

### Pull Requests
- Feature branch from main
- Descriptive PR title
- List of changes
- Screenshots for UI changes

---

**Last Updated**: Phase 5 Completion  
**Version**: 1.0  
**Maintained By**: Catalyst Development Team

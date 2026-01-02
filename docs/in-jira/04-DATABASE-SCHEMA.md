# 4. Database Schema

## 4.1 Overview

The In-Jira module uses a multi-tenant PostgreSQL schema with row-level security. All tables include a `tenant_id` column for data isolation.

## 4.2 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ injira_projects │───────│  injira_issues  │───────│injira_comments  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│injira_versions  │       │injira_issue_links│
└─────────────────┘       └─────────────────┘
        │
        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│injira_sprints   │───────│injira_board_configs│───│injira_workflows │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

## 4.3 Core Tables DDL

### 4.3.1 Projects Table

```sql
-- Table: injira_projects
-- Purpose: Stores project definitions
CREATE TABLE public.injira_projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    key VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lead_user_id UUID,
    project_type VARCHAR(50) NOT NULL DEFAULT 'software',
    avatar_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT injira_projects_key_unique UNIQUE (tenant_id, key),
    CONSTRAINT injira_projects_key_format CHECK (key ~ '^[A-Z][A-Z0-9]{1,9}$'),
    CONSTRAINT injira_projects_type_valid CHECK (
        project_type IN ('software', 'service_desk', 'business')
    )
);

-- Indexes
CREATE INDEX idx_injira_projects_tenant ON public.injira_projects(tenant_id);
CREATE INDEX idx_injira_projects_key ON public.injira_projects(key);
CREATE INDEX idx_injira_projects_lead ON public.injira_projects(lead_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_injira_projects_updated_at
    BEFORE UPDATE ON public.injira_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.injira_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_projects"
    ON public.injira_projects
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.2 Issues Table

```sql
-- Table: injira_issues
-- Purpose: Stores all issue types (story, bug, task, epic, etc.)
CREATE TABLE public.injira_issues (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE CASCADE,
    
    -- Issue identification
    key VARCHAR(20) NOT NULL,
    issue_number INTEGER NOT NULL,
    
    -- Core fields
    summary VARCHAR(500) NOT NULL,
    description TEXT,
    issue_type VARCHAR(50) NOT NULL,
    status_id UUID NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    resolution VARCHAR(50),
    
    -- Assignment
    assignee_id UUID,
    reporter_id UUID,
    
    -- Hierarchy
    parent_id UUID REFERENCES public.injira_issues(id) ON DELETE SET NULL,
    epic_id UUID REFERENCES public.injira_issues(id) ON DELETE SET NULL,
    
    -- Agile fields
    story_points DECIMAL(5,1),
    sprint_id UUID,
    rank VARCHAR(255),
    
    -- Version tracking
    fix_version_id UUID,
    affected_version_id UUID,
    
    -- Dates
    due_date DATE,
    start_date DATE,
    
    -- Labels and components
    labels TEXT[],
    components UUID[],
    
    -- Import tracking
    external_id VARCHAR(255),
    external_source VARCHAR(50),
    import_job_id UUID,
    
    -- AI features
    ai_suggestions_pending BOOLEAN DEFAULT false,
    
    -- Custom fields (JSONB for flexibility)
    custom_fields JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT injira_issues_key_unique UNIQUE (tenant_id, key),
    CONSTRAINT injira_issues_number_unique UNIQUE (project_id, issue_number),
    CONSTRAINT injira_issues_type_valid CHECK (
        issue_type IN ('epic', 'story', 'task', 'subtask', 'bug', 'feature', 'spike', 'improvement')
    ),
    CONSTRAINT injira_issues_priority_valid CHECK (
        priority IN ('highest', 'high', 'medium', 'low', 'lowest')
    )
);

-- Indexes
CREATE INDEX idx_injira_issues_tenant ON public.injira_issues(tenant_id);
CREATE INDEX idx_injira_issues_project ON public.injira_issues(project_id);
CREATE INDEX idx_injira_issues_key ON public.injira_issues(key);
CREATE INDEX idx_injira_issues_status ON public.injira_issues(status_id);
CREATE INDEX idx_injira_issues_assignee ON public.injira_issues(assignee_id);
CREATE INDEX idx_injira_issues_sprint ON public.injira_issues(sprint_id);
CREATE INDEX idx_injira_issues_epic ON public.injira_issues(epic_id);
CREATE INDEX idx_injira_issues_parent ON public.injira_issues(parent_id);
CREATE INDEX idx_injira_issues_rank ON public.injira_issues(rank);
CREATE INDEX idx_injira_issues_external ON public.injira_issues(external_id, external_source);
CREATE INDEX idx_injira_issues_labels ON public.injira_issues USING GIN(labels);
CREATE INDEX idx_injira_issues_custom_fields ON public.injira_issues USING GIN(custom_fields);
CREATE INDEX idx_injira_issues_created ON public.injira_issues(created_at DESC);
CREATE INDEX idx_injira_issues_updated ON public.injira_issues(updated_at DESC);

-- Full-text search index
CREATE INDEX idx_injira_issues_search ON public.injira_issues 
    USING GIN(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(description, '')));

-- Trigger for updated_at
CREATE TRIGGER update_injira_issues_updated_at
    BEFORE UPDATE ON public.injira_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for issue key generation
CREATE OR REPLACE FUNCTION generate_issue_key()
RETURNS TRIGGER AS $$
DECLARE
    project_key VARCHAR(10);
    next_number INTEGER;
BEGIN
    -- Get project key
    SELECT key INTO project_key 
    FROM public.injira_projects 
    WHERE id = NEW.project_id;
    
    -- Get next issue number for project
    SELECT COALESCE(MAX(issue_number), 0) + 1 INTO next_number
    FROM public.injira_issues
    WHERE project_id = NEW.project_id;
    
    NEW.issue_number := next_number;
    NEW.key := project_key || '-' || next_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_injira_issue_key
    BEFORE INSERT ON public.injira_issues
    FOR EACH ROW
    WHEN (NEW.key IS NULL)
    EXECUTE FUNCTION generate_issue_key();

-- RLS
ALTER TABLE public.injira_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_issues"
    ON public.injira_issues
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.3 Statuses Table

```sql
-- Table: injira_statuses
-- Purpose: Defines issue statuses per workflow
CREATE TABLE public.injira_statuses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID REFERENCES public.injira_projects(id) ON DELETE CASCADE,
    
    name VARCHAR(50) NOT NULL,
    description TEXT,
    status_category VARCHAR(20) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B778C',
    icon VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    is_initial BOOLEAN NOT NULL DEFAULT false,
    is_final BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT injira_statuses_category_valid CHECK (
        status_category IN ('new', 'indeterminate', 'done')
    )
);

-- Indexes
CREATE INDEX idx_injira_statuses_tenant ON public.injira_statuses(tenant_id);
CREATE INDEX idx_injira_statuses_project ON public.injira_statuses(project_id);
CREATE INDEX idx_injira_statuses_category ON public.injira_statuses(status_category);

-- RLS
ALTER TABLE public.injira_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_statuses"
    ON public.injira_statuses
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.4 Workflows Table

```sql
-- Table: injira_workflows
-- Purpose: Defines workflow state machines
CREATE TABLE public.injira_workflows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID REFERENCES public.injira_projects(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Issue type mapping (null = applies to all)
    issue_types TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID
);

-- Indexes
CREATE INDEX idx_injira_workflows_tenant ON public.injira_workflows(tenant_id);
CREATE INDEX idx_injira_workflows_project ON public.injira_workflows(project_id);

-- RLS
ALTER TABLE public.injira_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_workflows"
    ON public.injira_workflows
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.5 Transitions Table

```sql
-- Table: injira_transitions
-- Purpose: Defines workflow transitions between statuses
CREATE TABLE public.injira_transitions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    workflow_id UUID NOT NULL REFERENCES public.injira_workflows(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    from_status_id UUID REFERENCES public.injira_statuses(id) ON DELETE CASCADE,
    to_status_id UUID NOT NULL REFERENCES public.injira_statuses(id) ON DELETE CASCADE,
    
    -- Conditions (JSONB for flexibility)
    conditions JSONB DEFAULT '[]',
    
    -- Validators (JSONB for flexibility)
    validators JSONB DEFAULT '[]',
    
    -- Post-functions (JSONB for flexibility)
    post_functions JSONB DEFAULT '[]',
    
    -- Screen to display during transition (optional)
    screen_id UUID,
    
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_injira_transitions_tenant ON public.injira_transitions(tenant_id);
CREATE INDEX idx_injira_transitions_workflow ON public.injira_transitions(workflow_id);
CREATE INDEX idx_injira_transitions_from ON public.injira_transitions(from_status_id);
CREATE INDEX idx_injira_transitions_to ON public.injira_transitions(to_status_id);

-- RLS
ALTER TABLE public.injira_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_transitions"
    ON public.injira_transitions
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.6 Sprints Table

```sql
-- Table: injira_sprints
-- Purpose: Sprint management for Scrum boards
CREATE TABLE public.injira_sprints (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE CASCADE,
    board_id UUID,
    
    name VARCHAR(100) NOT NULL,
    goal TEXT,
    
    state VARCHAR(20) NOT NULL DEFAULT 'future',
    
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    complete_date TIMESTAMP WITH TIME ZONE,
    
    -- Velocity metrics
    committed_points DECIMAL(5,1),
    completed_points DECIMAL(5,1),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    CONSTRAINT injira_sprints_state_valid CHECK (
        state IN ('future', 'active', 'closed')
    ),
    CONSTRAINT injira_sprints_dates_valid CHECK (
        start_date IS NULL OR end_date IS NULL OR start_date < end_date
    )
);

-- Indexes
CREATE INDEX idx_injira_sprints_tenant ON public.injira_sprints(tenant_id);
CREATE INDEX idx_injira_sprints_project ON public.injira_sprints(project_id);
CREATE INDEX idx_injira_sprints_state ON public.injira_sprints(state);
CREATE INDEX idx_injira_sprints_dates ON public.injira_sprints(start_date, end_date);

-- RLS
ALTER TABLE public.injira_sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_sprints"
    ON public.injira_sprints
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.7 Versions Table

```sql
-- Table: injira_versions
-- Purpose: Release version management
CREATE TABLE public.injira_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    start_date DATE,
    release_date DATE,
    
    released BOOLEAN NOT NULL DEFAULT false,
    archived BOOLEAN NOT NULL DEFAULT false,
    
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    CONSTRAINT injira_versions_name_unique UNIQUE (project_id, name)
);

-- Indexes
CREATE INDEX idx_injira_versions_tenant ON public.injira_versions(tenant_id);
CREATE INDEX idx_injira_versions_project ON public.injira_versions(project_id);
CREATE INDEX idx_injira_versions_released ON public.injira_versions(released);

-- RLS
ALTER TABLE public.injira_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_versions"
    ON public.injira_versions
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.8 Comments Table

```sql
-- Table: injira_comments
-- Purpose: Issue comments and discussions
CREATE TABLE public.injira_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    issue_id UUID NOT NULL REFERENCES public.injira_issues(id) ON DELETE CASCADE,
    
    -- Author
    author_id UUID NOT NULL,
    
    -- Content (supports Atlassian Document Format)
    body TEXT NOT NULL,
    body_adf JSONB,
    
    -- Visibility
    is_internal BOOLEAN NOT NULL DEFAULT false,
    visibility_type VARCHAR(20),
    visibility_value VARCHAR(100),
    
    -- Edit tracking
    edited_at TIMESTAMP WITH TIME ZONE,
    edited_by UUID,
    
    -- Import tracking
    external_id VARCHAR(255),
    external_source VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_injira_comments_tenant ON public.injira_comments(tenant_id);
CREATE INDEX idx_injira_comments_issue ON public.injira_comments(issue_id);
CREATE INDEX idx_injira_comments_author ON public.injira_comments(author_id);
CREATE INDEX idx_injira_comments_created ON public.injira_comments(created_at DESC);

-- RLS
ALTER TABLE public.injira_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_comments"
    ON public.injira_comments
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.9 Audit Log Table

```sql
-- Table: injira_audit_log
-- Purpose: Complete audit trail for all changes
CREATE TABLE public.injira_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- What changed
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Who changed it
    actor_id UUID,
    actor_name VARCHAR(255),
    actor_email VARCHAR(255),
    
    -- What was the change
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- When
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Indexes
    CONSTRAINT injira_audit_action_valid CHECK (
        action IN ('create', 'update', 'delete', 'transition', 'assign', 
                   'comment', 'attach', 'link', 'sprint_move', 'rank_change')
    )
);

-- Indexes
CREATE INDEX idx_injira_audit_tenant ON public.injira_audit_log(tenant_id);
CREATE INDEX idx_injira_audit_entity ON public.injira_audit_log(entity_type, entity_id);
CREATE INDEX idx_injira_audit_actor ON public.injira_audit_log(actor_id);
CREATE INDEX idx_injira_audit_created ON public.injira_audit_log(created_at DESC);
CREATE INDEX idx_injira_audit_action ON public.injira_audit_log(action);

-- RLS
ALTER TABLE public.injira_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_audit_log"
    ON public.injira_audit_log
    FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 4.3.10 Import Tables

```sql
-- Table: injira_import_jobs
-- Purpose: Track import job status
CREATE TABLE public.injira_import_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID REFERENCES public.injira_projects(id),
    
    source_type VARCHAR(50) NOT NULL DEFAULT 'jira_cloud',
    source_project_key VARCHAR(20),
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    config JSONB DEFAULT '{}',
    
    total_items INTEGER DEFAULT 0,
    imported_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    
    error_log JSONB DEFAULT '[]',
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    CONSTRAINT injira_import_status_valid CHECK (
        status IN ('pending', 'analyzing', 'importing', 'completed', 'failed', 'cancelled')
    )
);

-- Table: injira_import_diff_reports
-- Purpose: Store AI-generated diff analysis
CREATE TABLE public.injira_import_diff_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    import_job_id UUID NOT NULL REFERENCES public.injira_import_jobs(id) ON DELETE CASCADE,
    
    report_data JSONB NOT NULL DEFAULT '{}',
    ai_analysis TEXT,
    
    total_source_issues INTEGER DEFAULT 0,
    matched_issues INTEGER DEFAULT 0,
    missing_in_target INTEGER DEFAULT 0,
    missing_in_source INTEGER DEFAULT 0,
    field_conflicts INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: injira_ai_suggestions
-- Purpose: Store AI-generated suggestions for issues
CREATE TABLE public.injira_ai_suggestions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    issue_id UUID NOT NULL REFERENCES public.injira_issues(id) ON DELETE CASCADE,
    import_job_id UUID REFERENCES public.injira_import_jobs(id) ON DELETE SET NULL,
    
    suggestion_type VARCHAR(50) NOT NULL,
    suggestion_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    
    is_accepted BOOLEAN,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT injira_ai_suggestion_type_valid CHECK (
        suggestion_type IN ('priority', 'assignee', 'component', 'label', 'epic', 'duplicate')
    ),
    CONSTRAINT injira_ai_confidence_valid CHECK (
        confidence_score >= 0 AND confidence_score <= 1
    )
);

-- Indexes for import tables
CREATE INDEX idx_injira_import_jobs_tenant ON public.injira_import_jobs(tenant_id);
CREATE INDEX idx_injira_import_jobs_status ON public.injira_import_jobs(status);
CREATE INDEX idx_injira_import_diff_job ON public.injira_import_diff_reports(import_job_id);
CREATE INDEX idx_injira_ai_suggestions_issue ON public.injira_ai_suggestions(issue_id);
CREATE INDEX idx_injira_ai_suggestions_pending ON public.injira_ai_suggestions(issue_id) 
    WHERE is_accepted IS NULL;

-- RLS for import tables
ALTER TABLE public.injira_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_import_diff_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_import_jobs"
    ON public.injira_import_jobs FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Tenant isolation for injira_import_diff_reports"
    ON public.injira_import_diff_reports FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Tenant isolation for injira_ai_suggestions"
    ON public.injira_ai_suggestions FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

## 4.4 Board Configuration Tables

```sql
-- Table: injira_boards
-- Purpose: Board definitions
CREATE TABLE public.injira_boards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES public.injira_projects(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    board_type VARCHAR(20) NOT NULL DEFAULT 'kanban',
    
    filter_jql TEXT,
    
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    config JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    CONSTRAINT injira_boards_type_valid CHECK (
        board_type IN ('kanban', 'scrum', 'simple')
    )
);

-- Table: injira_board_columns
-- Purpose: Board column configuration
CREATE TABLE public.injira_board_columns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    board_id UUID NOT NULL REFERENCES public.injira_boards(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    
    -- Statuses mapped to this column
    status_ids UUID[] NOT NULL,
    
    -- Column constraints
    min_issues INTEGER,
    max_issues INTEGER,
    
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_injira_boards_tenant ON public.injira_boards(tenant_id);
CREATE INDEX idx_injira_boards_project ON public.injira_boards(project_id);
CREATE INDEX idx_injira_board_columns_board ON public.injira_board_columns(board_id);

-- RLS
ALTER TABLE public.injira_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injira_board_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for injira_boards"
    ON public.injira_boards FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Tenant isolation for injira_board_columns"
    ON public.injira_board_columns FOR ALL
    USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

## 4.5 Database Functions

### 4.5.1 Issue Key Generation

```sql
-- Function: generate_next_issue_key
-- Purpose: Thread-safe issue key generation
CREATE OR REPLACE FUNCTION public.generate_next_issue_key(
    p_project_id UUID
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_project_key VARCHAR(10);
    v_next_number INTEGER;
    v_issue_key VARCHAR(20);
BEGIN
    -- Get project key
    SELECT key INTO v_project_key
    FROM public.injira_projects
    WHERE id = p_project_id;
    
    IF v_project_key IS NULL THEN
        RAISE EXCEPTION 'Project not found: %', p_project_id;
    END IF;
    
    -- Get next number with lock
    SELECT COALESCE(MAX(issue_number), 0) + 1 INTO v_next_number
    FROM public.injira_issues
    WHERE project_id = p_project_id
    FOR UPDATE;
    
    v_issue_key := v_project_key || '-' || v_next_number;
    
    RETURN v_issue_key;
END;
$$ LANGUAGE plpgsql;
```

### 4.5.2 Transition Validation

```sql
-- Function: validate_transition
-- Purpose: Check if a transition is allowed
CREATE OR REPLACE FUNCTION public.validate_transition(
    p_issue_id UUID,
    p_to_status_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_issue RECORD;
    v_transition RECORD;
    v_result JSONB;
BEGIN
    -- Get current issue state
    SELECT * INTO v_issue
    FROM public.injira_issues
    WHERE id = p_issue_id;
    
    IF v_issue IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Issue not found');
    END IF;
    
    -- Find valid transition
    SELECT * INTO v_transition
    FROM public.injira_transitions t
    JOIN public.injira_workflows w ON t.workflow_id = w.id
    WHERE w.project_id = v_issue.project_id
      AND (t.from_status_id = v_issue.status_id OR t.from_status_id IS NULL)
      AND t.to_status_id = p_to_status_id
      AND (w.issue_types IS NULL OR v_issue.issue_type = ANY(w.issue_types))
    LIMIT 1;
    
    IF v_transition IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'No valid transition found');
    END IF;
    
    RETURN jsonb_build_object(
        'valid', true,
        'transition_id', v_transition.id,
        'transition_name', v_transition.name
    );
END;
$$ LANGUAGE plpgsql;
```

## 4.6 Realtime Configuration

```sql
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.injira_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.injira_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.injira_sprints;

-- Note: Limit realtime to prevent performance issues
-- Consider using channels for per-board subscriptions
```

## 4.7 Schema Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-02 | Initial schema |
| 1.1.0 | TBD | Custom fields expansion |
| 1.2.0 | TBD | Advanced permissions |

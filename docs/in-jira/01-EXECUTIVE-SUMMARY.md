# 1. Executive Summary

## 1.1 Purpose

Catalyst In-Jira is an enterprise-grade project execution module that provides Jira-class issue tracking, agile board management, and workflow automation capabilities within the Catalyst platform. This document provides complete implementation specifications for engineering teams.

## 1.2 Scope

This documentation covers:

- Complete system architecture and design patterns
- Database schema definitions with DDL statements
- API specifications and contracts
- Workflow engine implementation
- JQL (Jira Query Language) parser and grammar
- Board system (Kanban, Scrum)
- Permission and security model
- Audit logging framework
- Jira Cloud import system
- AI agent integration
- Quality assurance and parity testing
- Operational procedures

## 1.3 Target Audience

- Software Engineers
- DevOps Engineers
- Quality Assurance Engineers
- Solution Architects
- Technical Product Managers

## 1.4 System Overview

### 1.4.1 Core Capabilities

| Capability | Description | Status |
|------------|-------------|--------|
| Issue Tracking | Full CRUD for issues with custom fields | ✅ |
| Agile Boards | Kanban and Scrum boards with drag-drop | ✅ |
| Workflows | Configurable state machines with conditions | ✅ |
| JQL Search | Jira-compatible query language | ✅ |
| Sprints | Sprint planning, execution, and retrospectives | ✅ |
| Releases | Version management with progress tracking | ✅ |
| Permissions | Project, issue, and field-level security | ✅ |
| Audit Trail | Complete change history with actor tracking | ✅ |
| Import | Deterministic Jira Cloud import | ✅ |
| AI Triage | Automated defect classification | ✅ |

### 1.4.2 Key Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (P95) | < 200ms | 150ms |
| Board Render Time | < 1s | 800ms |
| Search Query Time | < 500ms | 350ms |
| Concurrent Users | 10,000 | 10,000 |
| Issues per Project | 1,000,000 | 1,000,000 |

## 1.5 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  Boards   │  │   List    │  │  Drawer   │  │  Filters  │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  Context  │  │   Hooks   │  │ Components│  │  Utils    │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer                                  │
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │    Supabase Client    │  │      Edge Functions           │  │
│  │  - CRUD Operations    │  │  - Import Analyzer            │  │
│  │  - Realtime           │  │  - Defect Triage              │  │
│  │  - Storage            │  │  - Jira Import                │  │
│  └───────────────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL                              │  │
│  │  - injira_* tables                                        │  │
│  │  - RLS policies                                           │  │
│  │  - Triggers & Functions                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.6 Key Design Decisions

### 1.6.1 Multi-tenancy Model

**Decision:** Row-level security with tenant_id column on all tables.

**Rationale:**
- Complete data isolation between tenants
- No cross-tenant data leakage possible at database level
- Simplified application logic (no tenant filtering in queries)

### 1.6.2 LexoRank for Ordering

**Decision:** Use LexoRank algorithm for issue ordering on boards.

**Rationale:**
- Enables reordering without updating all items
- Supports concurrent editing
- Matches Jira's internal implementation

### 1.6.3 Workflow as State Machine

**Decision:** Implement workflows as finite state machines with transitions.

**Rationale:**
- Deterministic behavior
- Condition/validator support
- Post-function extensibility
- Matches Jira workflow semantics

### 1.6.4 Idempotent Import

**Decision:** Import operations are idempotent using external_id tracking.

**Rationale:**
- Safe to re-run imports
- Incremental sync support
- Conflict detection and resolution

## 1.7 Compliance Requirements

| Requirement | Standard | Status |
|-------------|----------|--------|
| Data Encryption at Rest | AES-256 | ✅ |
| Data Encryption in Transit | TLS 1.3 | ✅ |
| Audit Logging | SOC 2 Type II | ✅ |
| Access Control | RBAC | ✅ |
| Data Residency | Configurable | ✅ |

## 1.8 Document Structure

Each subsequent chapter follows this structure:

1. **Overview** - Purpose and scope
2. **Specification** - Detailed technical requirements
3. **Implementation** - Code and configuration
4. **Testing** - Verification approach
5. **Operations** - Runtime considerations

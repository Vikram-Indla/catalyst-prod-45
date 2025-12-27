# Catalyst Menu Hierarchy

> Complete navigation structure and menu organization for the Catalyst application.

---

## Table of Contents

1. [Top Navigation Bar](#top-navigation-bar)
2. [Home](#home)
3. [Enterprise](#enterprise)
4. [Product](#product)
5. [Program](#program)
6. [Project](#project)
7. [Release](#release)
8. [Planner](#planner)
9. [Global Items Dropdown](#global-items-dropdown)
10. [Visual Hierarchy Diagram](#visual-hierarchy-diagram)

---

## Top Navigation Bar

The main navigation bar contains these primary menu items:

| Menu Item | Type | Module Code | Route |
|-----------|------|-------------|-------|
| Home | Direct Link | Always visible | `/home` |
| Enterprise | Direct Link | ENTERPRISE | `/enterprise/strategy-room` |
| Product | Dropdown | PRODUCT | Dynamic (product selector) |
| Program | Dropdown | PORTFOLIO | Dynamic (program selector) |
| Project | Dropdown | PROGRAM | Dynamic (project selector) |
| Release | Dropdown | Always visible | `/release` |
| Planner | Dropdown | Always visible | `/planner` |

---

## Home

**Route:** `/home`

Home is the landing page with no sidebar. Provides an overview dashboard.

---

## Enterprise

**Route:** `/enterprise/*`  
**Module Code:** `ENTERPRISE`  
**Badge:** `EN`

### Enterprise Sidebar Menu

| ID | Label | Icon | Route |
|----|-------|------|-------|
| strategy-room | Strategy Room | Focus | `/enterprise/strategy-room` |
| strategic-snapshots | Strategic Snapshots | CircleDot | `/enterprise/snapshots` |
| strategic-backlog | Strategic Backlog | ListTree | `/enterprise/backlog` |
| objective-tree | Objective Tree | Workflow | `/enterprise/okr-hub` |
| roadmaps | Roadmaps | Map | `/enterprise/roadmaps` |
| risks | Risks | Blocks | `/enterprise/risks` |
| capacity | Capacity | Users | `/enterprise/reports/demand-capacity` |
| reports | Reports | TrendingUp | `/reports-discovery` |

### Enterprise Footer

| ID | Label | Route |
|----|-------|-------|
| settings | Enterprise Settings | `/admin/settings` |

---

## Product

**Route:** `/product/*`, `/industry/*`, `/mining/*`  
**Module Code:** `PRODUCT`  
**Badge:** `PR`

### Product Dropdown (Header)
Shows list of available business lines/products for selection.

### Product Sidebar Menu

| ID | Label | Icon | Route |
|----|-------|------|-------|
| Product Room | Product Room | (Custom) | `/product/room` |
| Product Backlog | Product Backlog | (Custom) | `/industry/backlog` |
| Product Kanban | Product Kanban | (Custom) | `/industry/kanban` |
| Product Roadmap | Product Roadmap | (Custom) | `/industry/roadmaps-v1` |

### Product Footer (Admin Only)

| ID | Label | Route |
|----|-------|-------|
| product-settings | Product Settings | Coming soon |

---

## Program

**Route:** `/program/:programId/*`  
**Module Code:** `PORTFOLIO`  
**Badge:** Dynamic (First 2 letters of program name)

### Program Dropdown (Header)
Shows list of accessible programs for selection with:
- Search functionality
- Program list with abbreviations
- Create Program option (admin only)

### Program Sidebar Menu

| ID | Label | Icon | Route Template |
|----|-------|------|----------------|
| room | Program Room | LayoutDashboard | `/program/:id/room` |
| epic-backlog | Epic Backlog | Layers | `/program/:id/epic-backlog` |
| feature-backlog | Feature Backlog | LayoutList | `/program/:id/feature-backlog` |
| work-tree | Work Tree | Network | `/program/:id/work-tree` |
| dependencies | Dependencies | GitBranch | `/program/:id/dependencies` |
| roadmaps | Roadmaps | Map | `/program/:id/roadmaps` |
| epic-balancing | Epic Balancing | Grid3x3 | `/program/:id/epic-balancing` |
| reports | Reports | FileText | `/program/:id/reports` |

### Program Footer

| ID | Label | Route |
|----|-------|-------|
| settings | Program Settings | `/admin/portfolios` |

---

## Project

**Route:** `/projects/:projectId/*`, `/programs/:projectId/*`, `/project/:projectId/*`  
**Module Code:** `PROGRAM`  
**Badge:** Dynamic (First 2 letters of project name)

### Project Dropdown (Header)
Shows list of accessible projects for selection with:
- Search functionality
- Project list grouped by program
- Create Project option (admin only)

### Project Sidebar Menu

| ID | Label | Icon | Route Template |
|----|-------|------|----------------|
| project-room | Project Room | Home | `/projects/:id/work` |
| backlog | Backlog | Square | `/projects/:id/backlog` |
| roadmap | Roadmap | Map | `/projects/:id/roadmap` |
| dependencies | Dependencies | GitBranch | `/projects/:id/dependencies` |
| reports | Reports | FileText | `/projects/:id/reports` |

### Project Footer

| ID | Label | Route |
|----|-------|-------|
| settings | Project Settings | `/admin/programs` |

---

## Release

**Route:** `/release/*`  
**Module Code:** Always visible  
**Badge:** `RL`

### Release Dropdown (Header)

| Item | Icon | Route | Visibility |
|------|------|-------|------------|
| Incident Room | Siren | `/release/incidents` | All users |
| Create Release | Plus | `/release/versions?create=true` | Admin only |
| Manage Releases | Settings | `/release/versions` | Admin only |

### Release Sidebar Menu

| ID | Label | Icon | Route | Badge |
|----|-------|------|-------|-------|
| incidents | Incident List | List | `/release/incidents` | Open incident count |
| incident-reports | Incident Reports | FileText | `/release/incident-reports` | - |
| committee-queue | Committee Queue | Users | `/release/committee-queue` | - |
| versions | Versions | Tag | `/release/versions` | - |
| calendar | Calendar | Calendar | `/release/calendar` | - |

### Release Footer

| ID | Label | Route |
|----|-------|-------|
| release-settings | Release Settings | `/release/settings` |

---

## Planner

**Route:** `/planner/*`  
**Module Code:** Always visible

### Planner Dropdown (Header)
Team-based navigation showing accessible teams:

| Item | Icon | Route | Visibility |
|------|------|-------|------------|
| All Teams | LayoutGrid | `/planner/boards` | Admin/Program Manager only |
| [Team List] | Users | `/planner/boards?team={teamId}` | Based on team membership |

**Team Types with Colors:**
- AGILE: Teal (`#0d9488`)
- KANBAN: Gray (`#6b7280`)
- COP: Blue (`#2563eb`)
- PROGRAM: Blue (`#2563eb`)
- PORTFOLIO: Blue (`#1d4ed8`)
- SOLUTION: Teal (`#0d9488`)
- PROCESS_FLOW: Teal (`#0f766e`)

---

## Global Items Dropdown

Available from the header "Items" button. Shows work items and planning entities filtered by enabled modules.

### Work Items Section

| Key | Label | Icon | Color | Module | Route |
|-----|-------|------|-------|--------|-------|
| themes | Themes | Circle | workitem-theme | PORTFOLIO | `/themes` |
| business-requests | Business Request | Building2 | brand-primary | PRODUCT | `/demand/list` |
| epics | Epics | Square | workitem-epic | PORTFOLIO | `/items/epics` |
| features | Features | Gem | workitem-feature | PROGRAM | `/features` |
| stories | Stories | FileText | workitem-story | TEAMS | `/work-items/stories` |

### Planning Section

| Key | Label | Icon | Color | Module | Route |
|-----|-------|------|-------|--------|-------|
| programs | Programs | FolderKanban | workitem-feature | PROGRAM | `/programs` |
| projects | Projects | FolderKanban | info | PROGRAM | `/projects` |

### Other Section

| Key | Label | Icon | Color | Module | Route |
|-----|-------|------|-------|--------|-------|
| objectives | Objectives | Target | brand-primary | ENTERPRISE | `/pi-objectives` |
| dependencies | Dependencies | GitBranch | brand-primary | PROGRAM | `/dependencies` |
| risks | Risks | AlertTriangle | destructive | ENTERPRISE | `/roam` |
| sprints | Sprints | Calendar | brand-primary | PROGRAM | `/sprints` |
| program-increments | Program Increments | Package | workitem-theme | PROGRAM | `/pis` |
| incidents | Incidents | Siren | destructive | Always visible | `/release/incidents` |

---

## Visual Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TOP NAVIGATION BAR                                  │
├─────────┬────────────┬─────────┬─────────┬─────────┬──────────┬────────────────┤
│  Home   │ Enterprise │ Product │ Program │ Project │ Release  │    Planner     │
│   ↓     │     ↓      │    ↓    │    ↓    │    ↓    │    ↓     │       ↓        │
│ /home   │ Sidebar    │ Select  │ Select  │ Select  │ Dropdown │  Team Select   │
│         │            │ Product │ Program │ Project │          │                │
└─────────┴────────────┴─────────┴─────────┴─────────┴──────────┴────────────────┘

ENTERPRISE SIDEBAR          PRODUCT SIDEBAR           PROGRAM SIDEBAR
├── Strategy Room           ├── Product Room          ├── Program Room
├── Strategic Snapshots     ├── Product Backlog       ├── Epic Backlog
├── Strategic Backlog       ├── Product Kanban        ├── Feature Backlog
├── Objective Tree          └── Product Roadmap       ├── Work Tree
├── Roadmaps                                          ├── Dependencies
├── Risks                   PROJECT SIDEBAR           ├── Roadmaps
├── Capacity                ├── Project Room          ├── Epic Balancing
├── Reports                 ├── Backlog               └── Reports
└── [Settings]              ├── Roadmap
                            ├── Dependencies          RELEASE SIDEBAR
                            └── Reports               ├── Incident List (badge)
                                                      ├── Incident Reports
                                                      ├── Committee Queue
                                                      ├── Versions
                                                      ├── Calendar
                                                      └── [Settings]
```

---

## Module Access Control

| Module Code | Controls Access To |
|-------------|-------------------|
| ENTERPRISE | Enterprise tier, Objectives, Risks |
| PRODUCT | Product tier, Business Requests |
| PORTFOLIO | Program tier, Themes, Epics |
| PROGRAM | Project tier, Features, Programs, Projects, Dependencies, Sprints, PIs |
| TEAMS | Stories |

**Special Roles:**
- **Product Owner:** Limited to Home, Enterprise, Product, Planner
- **Admin:** Full access + settings management
- **Super Admin:** Full access + enterprise settings

---

## Room-Based Navigation (Alternative View)

The application also supports room-based navigation for different perspectives:

| Room | Icon | Default Path | Focus |
|------|------|--------------|-------|
| Strategy | Target | `/strategy-room` | Company-level objectives |
| Program | Briefcase | `/program-room` | PI planning and execution |
| Project | GitBranch | `/project-room` | Project delivery |
| Team | Users | `/team-room` | Sprint planning and execution |

---

## Team Room Sidebar (Planner Context)

| ID | Label | Icon | Route Template |
|----|-------|------|----------------|
| room | Team Room | LayoutDashboard | `/team/:teamId/room` |
| backlog | Backlog | List | `/team/:teamId/backlog` |
| board | Board | LayoutGrid | `/team/:teamId/board` |
| sprint | Sprint | Zap | `/team/:teamId/sprint` |
| reports | Reports | FileText | `/team/:teamId/reports` |

---

## Risk Sidebar

| ID | Label | Icon | Route |
|----|-------|------|-------|
| risk-grid | Risk Grid | Grid3x3 | `/risks` |
| risk-roam | Risk ROAM Report | Layers | `/risk-roam-report` |

---

*Last Updated: December 27, 2024*

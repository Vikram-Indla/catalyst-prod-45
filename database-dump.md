# Database Dump - Lovable Cloud Project
**Generated:** 2026-01-08  
**Project ID:** stcpycushiccfvrqwipw

---

## Table Overview (145+ tables)

| Table | Columns |
|-------|---------|
| acceptance_criteria | 7 |
| active_package | 5 |
| activity_logs | 8 |
| ai_assist_approvals | 9 |
| ai_assist_artifacts | 13 |
| ai_assist_audit_events | 7 |
| ai_assist_documents | 41 |
| ai_assist_drafts | 26 |
| ai_assist_exemptions | 14 |
| ai_assist_links | 5 |
| ai_assist_published_epics | 7 |
| ai_assist_runs | 19 |
| ai_contracts | 9 |
| ai_feedback | 6 |
| ai_governance_audit_log | 8 |
| ai_integration_settings | 10 |
| ai_policies | 7 |
| ai_route_scopes | 7 |
| ai_semantic_dictionary | 10 |
| ai_table_allowlist | 9 |
| anchor_sprints | 7 |
| announcement_dismissals | 4 |
| announcements | 13 |
| api_keys | 12 |
| assignments | 15 |
| attachments | 9 |
| auth_audit_log | 9 |
| auth_settings | 5 |
| board_configs | 8 |
| business_lines | 9 |
| business_owners | 6 |
| business_processes | 7 |
| business_request_audit_logs | 9 |
| business_request_discussions | 6 |
| business_request_links | 17 |
| business_requests | 101 |
| cap_committee_default_members | 7 |
| cap_committee_policy | 7 |
| capacity_departments | 8 |
| capacity_scenarios | 15 |
| certifications | 12 |
| change_approvals | 12 |
| change_card_audit_events | 10 |
| change_card_links | 11 |
| change_cards | 23 |
| change_conflicts | 12 |
| change_dependencies | 8 |
| change_numbers | 9 |
| comment_mentions | 5 |
| comments | 7 |
| committee_members | 6 |
| committee_votes | 8 |
| create_menu_visibility | 6 |
| custom_field_definitions | 19 |
| custom_field_defs | 14 |
| custom_field_values | 7 |
| daily_execution_stats | 15 |
| dashboard_widgets | 12 |
| defect_attachments | 11 |
| defect_audit_log | 8 |
| defect_column_preferences | 6 |
| defect_comments | 7 |
| defect_history | 7 |
| defect_id_sequences | 3 |
| defect_links | 7 |
| defect_work_item_links | 7 |
| defects | 37 |
| demand_field_configs | 13 |
| demand_process_steps | 8 |
| demand_section_configs | 11 |
| demand_tab_configs | 9 |
| department_owner_mapping | 4 |
| departments | 6 |
| dependencies | 60 |
| dependency_audit_log | 9 |
| dependency_negotiations | 9 |
| development_inventory | 11 |
| discussion_mentions | 6 |
| discussions | 7 |
| disposable_email_domains | 3 |
| domain_allowlist | 6 |
| drawer_tab_configs | 9 |
| efd_atoms | 26 |
| efd_audit_log | 7 |
| efd_documents | 13 |
| efd_epics | 25 |
| efd_features | 18 |
| efd_trace_links | 11 |
| efd_wizard_sessions | 19 |
| enterprise_grid_user_state | 9 |
| enterprise_grid_views | 13 |
| epic_acceptance_criteria | 6 |
| epic_benefits | 8 |
| epic_business_processes | 3 |
| epic_custom_columns | 9 |
| epic_design_items | 8 |
| epic_intake_responses | 6 |
| epic_key_sequences | 4 |
| epics | 60+ |
| features | 50+ |
| profiles | 30+ |
| projects | 20+ |
| resource_inventory | 20+ |
| resource_vendors | 7 |
| stories | 30+ |
| teams | 25+ |

---

## Key Tables - Schema Details

### profiles
```
id                      uuid PRIMARY KEY
email                   text NOT NULL
full_name               text
role                    text (user, admin, Product Owner, etc.)
status                  text (Active, Inactive, Pending)
vendor                  text (Permanent, ELM, Thiqah, etc.)
department_id           uuid REFERENCES departments
country                 text
country_code            text
location                text (Onsite, Off-Shore)
contract_start_date     date
contract_end_date       date
approval_status         text (APPROVED, PENDING, REJECTED)
created_at              timestamptz
updated_at              timestamptz
```

### resource_inventory
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
profile_id              uuid REFERENCES profiles
vendor_id               uuid REFERENCES resource_vendors
vendor_name             text
department_id           uuid
department_name         text
role_name               text
contract_start_date     date
contract_end_date       date
country_id              uuid
location_id             uuid
default_capacity_percent integer
is_active               boolean
assignment_id           uuid
created_at              timestamptz
updated_at              timestamptz
```

### resource_vendors
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
description             text
is_active               boolean DEFAULT true
sort_order              integer
created_at              timestamptz
updated_at              timestamptz
```

### departments
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
is_active               boolean DEFAULT true
sort_order              integer
created_at              timestamptz
updated_at              timestamptz
```

### teams
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
short_name              text
description             text
team_type               text (AGILE, KANBAN)
status                  text (active, inactive)
velocity_baseline       integer
track_by                text (POINTS, HOURS)
project_id              uuid REFERENCES projects
is_active               boolean
created_at              timestamptz
updated_at              timestamptz
```

### projects
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
key                     text UNIQUE
description             text
status                  text (active, archived)
program_id              uuid
wip_limits              jsonb
settings                jsonb
created_at              timestamptz
updated_at              timestamptz
```

### epics
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
description             text
program_id              uuid
theme_id                uuid
owner_id                uuid REFERENCES profiles
status                  text (proposed, analyzing, in_progress, done)
state                   text (not_started, in_progress, completed)
health                  text (green, yellow, red)
start_date              date
end_date                date
estimate                numeric
mvp                     boolean
tags                    text[]
created_at              timestamptz
updated_at              timestamptz
```

### features
```
id                      uuid PRIMARY KEY
name                    text NOT NULL
display_id              text
description             text
epic_id                 uuid REFERENCES epics
project_id              uuid REFERENCES projects
team_id                 uuid REFERENCES teams
status                  text (backlog, in_progress, done)
health                  text (green, yellow, red)
priority                text (low, medium, high, critical)
estimate_points         integer
planned_start_date      date
planned_end_date        date
created_at              timestamptz
updated_at              timestamptz
```

### stories
```
id                      uuid PRIMARY KEY
title                   text NOT NULL
story_key               text
description             text
feature_id              uuid REFERENCES features
team_id                 uuid REFERENCES teams
sprint_id               uuid
assignee_id             uuid REFERENCES profiles
status                  text (todo, in_progress, done)
state                   text (backlog, in_progress, done)
health                  text (green, yellow, red)
priority                text
story_points            integer
progress_pct            integer
created_at              timestamptz
updated_at              timestamptz
```

### business_requests
```
id                      uuid PRIMARY KEY
title                   text NOT NULL
request_key             text
description             text
business_owner          text
department              text
department_id           uuid
process_step            text (draft, submitted, approved, etc.)
priority_tier           text (low, medium, high, critical)
health                  text (on_track, at_risk, blocked)
progress                integer
start_date              date
end_date                date
estimated_cost_sar      numeric
approved_budget_sar     numeric
rank                    integer
created_at              timestamptz
updated_at              timestamptz
```

---

## Sample Data

### resource_vendors (6 records)
| id | name | is_active | sort_order |
|----|------|-----------|------------|
| 579b22e5-... | BMC | true | 1 |
| c20498a6-... | ELM | true | 2 |
| 39ab6455-... | Freelance | true | 3 |
| 7a61d5d2-... | Thiqah | true | 4 |
| cfda6d86-... | Permanent | true | 5 |
| 094f9c08-... | Spectech | true | 6 |

### departments (7 records)
| id | name | is_active | sort_order |
|----|------|-----------|------------|
| 93153caa-... | Industrial License | true | 1 |
| 9962b165-... | Industrial Compliance | true | 2 |
| e2067c7d-... | Future Factories & Advanced Manufacturing Center | true | 3 |
| acfa7ad5-... | Standard Incentive | true | 4 |
| 39cc95eb-... | ICP | true | 5 |
| e3a66c71-... | Industry Investment Tracking | true | 6 |
| 976e302f-... | Mining Investor Journey | true | 7 |

### teams (3 records)
| id | name | short_name | team_type | velocity_baseline |
|----|------|------------|-----------|-------------------|
| 20000000-0001-... | Digital Experience Squad | DXS | AGILE | 30 |
| 20000000-0002-... | Platform Engineering | PEG | AGILE | 35 |
| 20000000-0003-... | Integration Specialists | INT | AGILE | 25 |

### projects (5 records)
| id | name | key | status |
|----|------|-----|--------|
| 40000000-0001-... | Industrial Platform Modernization | IPM | active |
| 40000000-0002-... | Digital Investor Portal | DIP | active |
| 40000000-0003-... | Industrial Marketplace | IMP | active |
| 40000000-0004-... | Mobile App Initiative | MAI | active |
| b7d14a3b-... | Core Banking Modernization | CBM | active |

### profiles (sample)
| full_name | email | vendor | department | status |
|-----------|-------|--------|------------|--------|
| Khaled Alghithy | khaled.alghithy@catalyst.app | Permanent | Product | Active |
| Maali Alanazi | m.alanazi@mim.gov.sa | Permanent | Product | Active |
| ibrahim alqusiyer | i.alqusiyer@mim.gov.sa | Permanent | Delivery | Active |
| Aya Ibrahims | ayaibrahim319@gmail.com | ELM | Delivery | Active |
| Nour Almani | nour.almani@catalyst.app | ELM | Delivery | Active |
| Abdullah Alshammari | a.s.alshammari@mim.gov.sa | Permenant | Product | Active |

### resource_inventory (sample)
| name | vendor_id | vendor_name | role_name | department_name |
|------|-----------|-------------|-----------|-----------------|
| Sulaiman Alessa | cfda6d86-... | Permanent | Business Analyst | Product |
| Abdullah Alshammari | cfda6d86-... | Permanent | Management | Product |
| Mohamed Tammam | 7a61d5d2-... | NULL | Backend Developer | NULL |
| Khaled Alghithy | cfda6d86-... | Permanent | Business Analyst | Product |
| Waqas Ali | 7a61d5d2-... | Thiqah | Backend Developer | Delivery |

---

## RLS Policies Summary

| Table | Policies |
|-------|----------|
| acceptance_criteria | Users can manage/view |
| active_package | Admins manage, Anyone view |
| activity_logs | Authenticated full access |
| ai_assist_* | Authenticated read/write |
| profiles | Authenticated access |
| resource_inventory | Authenticated access |
| teams | Public read, Authenticated write |
| projects | Public read, Authenticated write |
| epics | Public read, Authenticated write |
| features | Public read, Authenticated write |
| stories | Authenticated access |
| business_requests | Authenticated access |

---

## Notes

1. **Vendor Resolution Priority:**
   - `resource_inventory.vendor_id` → lookup in `resource_vendors.name`
   - Fallback: `resource_inventory.vendor_name`
   - Fallback: `profiles.vendor`

2. **Contract Dates Priority:**
   - `resource_inventory.contract_end_date` (authoritative)
   - Fallback: `profiles.contract_end_date`

3. **Key Relationships:**
   - `profiles.id` ↔ `resource_inventory.profile_id`
   - `resource_inventory.vendor_id` → `resource_vendors.id`
   - `epics.owner_id` → `profiles.id`
   - `features.epic_id` → `epics.id`
   - `stories.feature_id` → `features.id`

# JOB-010: Home Analytics & Telemetry Specification

**Version:** 1.0  
**Date:** December 24, 2024  
**Classification:** Technical Specification  
**Owner:** Product Analytics Team

---

## Executive Summary

This document defines the complete analytics architecture for the Home ("For You") module, enabling:
- **Adoption tracking** — Are users engaging with Home?
- **Value measurement** — Are decisions faster?
- **Quality monitoring** — Are errors occurring?
- **Continuous improvement** — What needs optimization?

---

## 1. Event Taxonomy

### 1.1 Naming Convention

All events follow the pattern: `{scope}_{action}` or `{scope}_{object}_{action}`

| Prefix | Description |
|--------|-------------|
| `home_` | Global Home events |
| `ops_` | Operations mode events |
| `delivery_` | Delivery mode events |
| `planner_` | Planner mode events |

### 1.2 Complete Event List

#### Global Home Events

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `home_viewed` | Page load complete | `home_mode` |
| `home_mode_switched` | User clicks mode selector | `from_mode`, `to_mode` |
| `home_state_restored` | Page refresh with URL state | `home_mode`, `tab`, `filter` |
| `home_load_time` | Performance measurement | `load_time_ms` |
| `home_search_executed` | User submits search | `search_query`, `result_count` |
| `home_sort_changed` | User changes sort | `action_type` (sort option) |
| `home_filter_applied` | User applies filter | `filter` |
| `home_filter_cleared` | User clears filter | — |

#### Operations Mode Events

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `ops_chip_clicked` | Click on Critical Strip chip | `action_type` (major/sla/blocked/awaiting-me) |
| `ops_item_opened` | Click on incident/release | `item_type`, `item_id`, `item_key`, `time_to_action_ms` |
| `ops_status_changed` | Status update on item | `item_id`, `from_status`, `to_status` |
| `ops_assign_to_me` | User self-assigns | `item_id` |
| `ops_escalate_clicked` | User clicks escalate | `item_id` |

#### Delivery Mode Events

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `delivery_tab_switched` | Click on Worked on/Assigned/Starred | `tab` |
| `delivery_item_opened` | Click on work item | `item_type`, `item_id`, `item_key`, `time_to_action_ms` |
| `delivery_star_toggled` | Star/unstar item | `item_id`, `starred` (boolean) |
| `delivery_assign_to_me` | User self-assigns | `item_id` |
| `delivery_status_changed` | Status update | `item_id`, `from_status`, `to_status` |
| `delivery_load_more` | Click load more | `result_count` |

#### Planner Mode Events

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `planner_tab_switched` | Click on Planned/Upcoming/Pending review | `tab` |
| `planner_item_opened` | Click on planned item | `item_id`, `item_key`, `time_to_action_ms` |
| `planner_review_started` | User begins review | `item_id` |
| `planner_note_added` | User adds note | `item_id` |
| `planner_decision_made` | User makes decision | `item_id`, `action_type` (approve/reject/defer) |

#### Error & Friction Events

| Event Name | Trigger | Key Properties |
|------------|---------|----------------|
| `home_api_error` | API call fails | `error_type`, `error_message` |
| `home_permission_denied` | Access blocked | `action_target` |
| `home_empty_state_shown` | No items to display | `tab`, `filter` |
| `home_action_failed` | User action fails | `action_type`, `error_message` |

---

## 2. Event Payload Schema

### 2.1 Base Event Structure

```typescript
interface HomeAnalyticsEvent {
  id: string;                    // Auto-generated UUID
  user_id: string;               // User UUID (from auth)
  event_name: string;            // Event name from taxonomy
  home_mode: 'operations' | 'delivery' | 'planner';
  event_properties: {            // Event-specific data
    tab?: string;
    filter?: string;
    item_type?: string;
    item_id?: string;
    item_key?: string;
    load_time_ms?: number;
    time_to_action_ms?: number;
    from_mode?: string;
    to_mode?: string;
    search_query?: string;       // Truncated to 100 chars
    result_count?: number;
    error_type?: string;
    error_message?: string;      // Truncated to 200 chars
    action_type?: string;
    starred?: boolean;
    from_status?: string;
    to_status?: string;
  };
  session_id: string;            // Browser session identifier
  created_at: timestamp;         // Server timestamp
}
```

### 2.2 Privacy Considerations

| Field | Treatment |
|-------|-----------|
| `user_id` | Stored as UUID, no PII |
| `search_query` | Truncated to 100 chars, no logging of sensitive terms |
| `error_message` | Truncated to 200 chars |
| `item_id` | Internal UUID only |
| `session_id` | Generated per browser session, no cross-session tracking |

---

## 3. Metric Definitions

### 3.1 Adoption Metrics

| Metric | Formula | Target | Frequency |
|--------|---------|--------|-----------|
| **Daily Active Users (DAU)** | COUNT(DISTINCT user_id) WHERE created_at = today | Track trend | Daily |
| **Mode Distribution** | COUNT(*) GROUP BY home_mode / total events | Balanced | Daily |
| **DAU/WAU Ratio** | DAU / (7-day unique users) | > 0.4 | Weekly |
| **Return Rate** | Users with 2+ sessions / total users | > 60% | Weekly |

### 3.2 Efficiency Metrics

| Metric | Formula | Target | Frequency |
|--------|---------|--------|-----------|
| **Time to First Action** | AVG(first item_opened.time_to_action_ms after home_viewed) | < 10s | Daily |
| **Avg Incident Open Time** | AVG(time_to_action_ms) WHERE event_name = 'ops_item_opened' | < 5s | Daily |
| **Avg Work Item Open Time** | AVG(time_to_action_ms) WHERE event_name = 'delivery_item_opened' | < 5s | Daily |
| **Avg Planner Open Time** | AVG(time_to_action_ms) WHERE event_name = 'planner_item_opened' | < 5s | Daily |

### 3.3 Value Metrics

| Metric | Formula | Target | Frequency |
|--------|---------|--------|-----------|
| **Incidents Actioned from Home** | COUNT(ops_status_changed + ops_assign_to_me) | Track trend | Daily |
| **Items Updated from Home** | COUNT(delivery_status_changed) | Track trend | Daily |
| **Reviews Completed from Home** | COUNT(planner_decision_made) | Track trend | Daily |
| **Stars Added** | COUNT(delivery_star_toggled WHERE starred=true) | Track trend | Daily |

### 3.4 Quality Metrics

| Metric | Formula | Target | Frequency |
|--------|---------|--------|-----------|
| **Error Rate** | COUNT(home_api_error) / COUNT(*) * 100 | < 2% | Hourly |
| **Empty State Rate** | COUNT(home_empty_state_shown) / COUNT(home_viewed) * 100 | < 15% | Daily |
| **Permission Denial Rate** | COUNT(home_permission_denied) / COUNT(*) * 100 | < 1% | Daily |
| **Action Failure Rate** | COUNT(home_action_failed) / COUNT(action events) * 100 | < 1% | Daily |
| **P95 Load Time** | PERCENTILE_CONT(0.95) of load_time_ms | < 2500ms | Hourly |

---

## 4. Dashboard Specifications

### 4.1 Executive Dashboard

**Audience:** CIO, PMO Head, Ops Director  
**Refresh:** Daily  
**Access:** Admin role only

| Widget | Type | Data |
|--------|------|------|
| **Home Adoption Trend** | Line chart | DAU over 30 days |
| **Mode Usage Distribution** | Donut chart | Operations / Delivery / Planner split |
| **Avg Decision Time** | Big number + trend | Time to first action |
| **Top Friction Points** | Bar chart | Top 5 error types |
| **Weekly Engagement** | Heatmap | Usage by day of week / hour |

### 4.2 Product Dashboard

**Audience:** Product Manager, UX Lead  
**Refresh:** Hourly  
**Access:** Admin, Program Manager roles

| Widget | Type | Data |
|--------|------|------|
| **CTA Usage Heatmap** | Heatmap | Events by type and mode |
| **Drop-off Funnel** | Funnel | home_viewed → item_opened → action |
| **Empty State Analysis** | Table | Empty states by mode/tab/filter |
| **Load Time Distribution** | Histogram | load_time_ms buckets |
| **Search Effectiveness** | Table | Queries with 0 results |
| **Tab Usage by Mode** | Stacked bar | Tab switches per mode |

### 4.3 Operations Health Dashboard

**Audience:** Ops Lead, Incident Manager  
**Refresh:** Real-time (5 min)  
**Access:** Admin, Team Lead roles

| Widget | Type | Data |
|--------|------|------|
| **Ops Mode Active Users** | Big number | Users in ops mode now |
| **Incident Response Rate** | Gauge | Items actioned / items viewed |
| **SLA Breach Correlation** | Scatter | Breaches vs. Home usage |
| **Chip Click Distribution** | Pie | major/sla/blocked/awaiting-me clicks |

---

## 5. Alert Thresholds

### 5.1 Critical Alerts (Immediate Action Required)

| Alert | Metric | Threshold | Notify |
|-------|--------|-----------|--------|
| **Critical Load Time** | P95 load time | > 5000ms | Engineering Lead, Admin |
| **Critical Error Rate** | Error rate | > 5% | Engineering Lead, Admin, Product |

### 5.2 Warning Alerts (Review Within 4 Hours)

| Alert | Metric | Threshold | Notify |
|-------|--------|-----------|--------|
| **High Load Time** | P95 load time | > 2500ms | Engineering Lead |
| **High Error Rate** | Error rate | > 2% | Engineering Lead |
| **Planner Abandonment** | Empty state rate (Planner) | > 50% | Product |

### 5.3 Info Alerts (Review Weekly)

| Alert | Metric | Threshold | Notify |
|-------|--------|-----------|--------|
| **Low Ops Adoption** | Daily ops users | < 10 | Product |
| **Low Return Rate** | DAU/WAU ratio | < 0.3 | Product |

---

## 6. Implementation Guidelines

### 6.1 Performance Requirements

- **Event tracking must not block UI** — Use fire-and-forget pattern
- **Batch writes** — Consider batching if > 100 events/second
- **No sensitive data** — Truncate strings, no PII
- **Fail silently** — Analytics errors must never break the app

### 6.2 Data Retention

| Table | Retention | Aggregation |
|-------|-----------|-------------|
| `home_analytics_events` | 90 days raw | Daily aggregation |
| `home_analytics_daily` | 2 years | No further aggregation |
| `home_migration_metrics` | 30 days (migration only) | Delete after full rollout |

### 6.3 Query Optimization

All analytics queries must:
1. Use indexed columns (`created_at`, `home_mode`, `event_name`)
2. Apply date range filters first
3. Avoid full table scans
4. Use `home_analytics_daily` for historical analysis

---

## 7. Integration Checklist

### Frontend Integration

- [ ] Import `useHomeAnalytics` hook in HomeContentV2
- [ ] Call `trackHomeViewed()` on component mount
- [ ] Call `trackModeSwitched()` on mode change
- [ ] Call `trackLoadTime()` after data loads
- [ ] Call appropriate item opened events on row click
- [ ] Call error events on API failures
- [ ] Call empty state events when no data

### Backend Integration

- [ ] Daily aggregation job runs at 02:00 UTC
- [ ] Alert check job runs every 15 minutes
- [ ] Metrics exposed to monitoring system

### Dashboard Integration

- [ ] Executive dashboard accessible at `/admin/analytics/home`
- [ ] Product dashboard accessible at `/admin/analytics/home/product`
- [ ] Ops dashboard accessible at `/admin/analytics/home/operations`

---

## 8. Validation

### Pre-Launch Validation

| Check | Method | Owner |
|-------|--------|-------|
| Events fire correctly | Console logging in dev | Engineering |
| Events stored in DB | Query `home_analytics_events` | Engineering |
| No PII in payloads | Audit event_properties | Security |
| Performance impact < 10ms | Performance profiling | Engineering |
| Dashboards render | Manual testing | Product |

### Post-Launch Validation

| Check | Method | Owner |
|-------|--------|-------|
| DAU matches expectations | Compare to login data | Product |
| Error rate < 2% | Alert monitoring | Engineering |
| No alert fatigue | Review alert volume | Ops |

---

## Appendix A: SQL Queries for Key Metrics

### DAU by Mode

```sql
SELECT 
  created_at::date as date,
  home_mode,
  COUNT(DISTINCT user_id) as unique_users
FROM home_analytics_events
WHERE created_at >= CURRENT_DATE - 30
GROUP BY date, home_mode
ORDER BY date DESC;
```

### Time to First Action

```sql
WITH first_actions AS (
  SELECT 
    user_id,
    session_id,
    MIN(created_at) FILTER (WHERE event_name = 'home_viewed') as view_time,
    MIN(created_at) FILTER (WHERE event_name LIKE '%_item_opened') as action_time
  FROM home_analytics_events
  WHERE created_at >= CURRENT_DATE
  GROUP BY user_id, session_id
)
SELECT 
  AVG(EXTRACT(EPOCH FROM (action_time - view_time)) * 1000) as avg_time_to_action_ms
FROM first_actions
WHERE action_time IS NOT NULL;
```

### Error Rate by Mode

```sql
SELECT 
  home_mode,
  COUNT(*) FILTER (WHERE event_name = 'home_api_error') as errors,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE event_name = 'home_api_error')::numeric / COUNT(*) * 100, 2) as error_rate
FROM home_analytics_events
WHERE created_at >= CURRENT_DATE
GROUP BY home_mode;
```

---

**Document End**

*Prepared for Catalyst Platform — Ministry of Industry & Mineral Resources (MIM)*

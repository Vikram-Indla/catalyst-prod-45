/**
 * Phase 3 Releases Module Types
 * Schema: releases, sprints, story_sprints junction
 * API Contracts: 14 endpoints (Phase 2)
 */

export type ReleaseStatus = 'unreleased' | 'released' | 'archived';
export type SprintStatus = 'planned' | 'active' | 'completed' | 'archived';

export interface Release {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  start_date?: string; // ISO 8601
  release_date?: string; // ISO 8601
  status: ReleaseStatus;
  sequence: number;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  release_id: string; // FK NOT NULL
  name: string;
  description?: string;
  start_date?: string; // ISO 8601
  end_date?: string; // ISO 8601
  capacity?: number;
  status: SprintStatus;
  sequence: number;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StorySprints {
  story_id: string;
  sprint_id: string;
}

// Extended story type (for UI context)
export interface Story {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  release_id?: string;
  sprint_ids?: string[]; // via junction
}

// API Request/Response types
export interface CreateReleasePayload {
  project_id: string;
  name: string;
  description?: string;
  start_date?: string;
  release_date?: string;
}

export interface UpdateReleasePayload {
  name?: string;
  description?: string;
  start_date?: string;
  release_date?: string;
}

export interface ReleaseListResponse {
  data: Release[];
  groupedByStatus?: {
    unreleased: Release[];
    released: Release[];
    archived: Release[];
  };
}

export interface SprintListResponse {
  data: Sprint[];
}

export interface LinkSprintPayload {
  sprint_id: string;
}

export interface ReorderSprintsPayload {
  sprints: Array<{ id: string; sequence: number }>;
}

// Progress calculation type
export interface ReleaseProgress {
  done: number;
  inProgress: number;
  toDo: number;
  total: number;
  donePercent: number;
  inProgressPercent: number;
}

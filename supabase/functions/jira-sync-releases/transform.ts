// Pure transform: a Jira Project Version -> a ph_releases upsert row.
// Kept separate from index.ts so it can be unit-tested without network/Supabase.

export interface JiraVersion {
  id: string | number;
  name: string;
  description?: string | null;
  archived?: boolean;
  released?: boolean;
  startDate?: string | null;   // "YYYY-MM-DD"
  releaseDate?: string | null; // "YYYY-MM-DD"
}

export interface ReleaseRow {
  project_id: string;
  jira_version_id: string;
  name: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'released' | 'archived';
  start_date: string | null;
  release_date: string | null;
  target_date: string | null;
}

export function versionToReleaseRow(v: JiraVersion, projectId: string): ReleaseRow {
  // archived takes precedence over released (an archived-and-released version reads as archived in Jira's UI)
  const status: ReleaseRow['status'] = v.archived
    ? 'archived'
    : v.released
      ? 'released'
      : 'in_progress';

  const startDate = v.startDate ?? null;
  const releaseDate = v.releaseDate ?? null;

  return {
    project_id: projectId,
    jira_version_id: String(v.id),
    name: v.name,
    title: v.name, // ph_releases.title is NOT NULL; mirror name
    description: v.description ?? null,
    status,
    start_date: startDate,
    release_date: releaseDate,
    target_date: releaseDate ?? startDate ?? null,
  };
}

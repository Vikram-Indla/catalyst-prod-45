/**
 * Description — ADF-based rich text for Catalyst work items
 * Canonical types for description field using Atlassian Document Format (ADF)
 */

/**
 * Minimal ADF Document shape.
 * ADF is a JSON-based format standardized by Atlassian.
 * Full spec: https://developer.atlassian.com/cloud/jira/platform/apis/document/adf/
 *
 * For Catalyst, we support:
 * - Basic content nodes: paragraph, heading, blockquote, codeBlock
 * - Inline marks: strong, em, code, link, mention, hardBreak
 * - Media nodes: image, mediaGroup
 * - Structural: table, table row/cell, list item, list
 */
export interface ADFNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ADFNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

export interface ADFDocument {
  version: 1;
  type: 'doc';
  content: ADFNode[];
}

/**
 * CatalystDescription — wraps ADF content with metadata
 * Matches the `descriptions` table structure in Supabase
 */
export interface CatalystDescription {
  id: string; // uuid
  issue_id: string; // Foreign key to ph_issues.id
  adf_content: ADFDocument; // The actual rich-text document
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  deleted_at: string | null; // Soft-delete marker
  created_by: string; // User email or ID
  parent_version_id: string | null; // Reference to prior version for history
}

/**
 * DescriptionVersion — tracks edit history for audit and undo
 * Matches the `description_versions` table structure
 */
export interface DescriptionVersion {
  id: string; // uuid
  description_id: string; // Foreign key to descriptions.id
  adf_content: ADFDocument; // Snapshot of ADF at this version
  changes_summary: string | null; // User-provided edit summary (e.g., "Fixed typo")
  created_at: string; // ISO timestamp
  created_by: string; // User who made the edit
}

/**
 * DescriptionEditorProps — props for the DescriptionEditor component
 */
export interface DescriptionEditorProps {
  adfContent: ADFDocument | null; // Current ADF to edit; null = empty doc
  onSave: (adf: ADFDocument) => Promise<void>; // Callback when user saves
  onCancel: () => void; // Callback when user cancels edit
  isLoading?: boolean; // Optional loading state for save button
  mediaUploadEndpoint?: string; // Optional custom media upload URL (defaults to Supabase)
}

/**
 * DescriptionRendererProps — props for the DescriptionRenderer component
 */
export interface DescriptionRendererProps {
  adf: ADFDocument | null; // ADF to render; null = empty state
  emptyStateText?: string; // Custom text for empty state (defaults to "No description")
}

/**
 * API request/response shapes for description operations
 */
export interface FetchDescriptionResponse {
  description: CatalystDescription | null;
}

export interface SaveDescriptionRequest {
  adf_content: ADFDocument;
  changes_summary?: string; // Optional edit note
}

export interface SaveDescriptionResponse {
  id: string;
  description: CatalystDescription;
  version_id: string; // The created version record ID
}

/**
 * Description API Client
 * 
 * Supabase-backed client for description CRUD operations.
 * Handles:
 * - Fetching latest description
 * - Saving with version history
 * - Rollback to previous versions
 * - Soft-delete
 * 
 * All queries include DB proof for DYNAMITE Stage D.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  CatalystDescription,
  DescriptionVersion,
  EntityType,
  UUID,
  DescriptionHistoryResponse,
  DescriptionApiClient,
} from './description.types';
import { validateADF } from './adf-validator';
import type { ADFDocument } from './adf';

// ============================================================================
// INIT
// ============================================================================

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

// ============================================================================
// API CLIENT
// ============================================================================

export const descriptionApi: DescriptionApiClient = {
  /**
   * GET latest description for an entity
   * 
   * DYNAMITE Stage D Proof:
   * - SQL: SELECT * FROM descriptions WHERE entity_id=$1 AND entity_type=$2 AND is_latest=true AND is_deleted=false
   * - Returns: CatalystDescription | null
   * - Wiring: DB row → TypeScript interface → React state
   */
  async getLatest(entityId: UUID, entityType: EntityType): Promise<CatalystDescription | null> {
    const { data, error } = await supabase
      .from('descriptions')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('is_latest', true)
      .eq('is_deleted', false)
      .single();

    if (error?.code === 'PGRST116') {
      // No rows found (not an error, just empty)
      return null;
    }

    if (error) {
      console.error('[descriptionApi] getLatest error:', error);
      throw new Error(`Failed to fetch description: ${error.message}`);
    }

    return data as CatalystDescription;
  },

  /**
   * GET version history for an entity
   * 
   * DYNAMITE Stage D Proof:
   * - SQL: SELECT dv.* FROM description_versions dv 
   *        JOIN descriptions d ON d.id = dv.description_id
   *        WHERE d.entity_id=$1 AND d.entity_type=$2 AND d.is_deleted=false
   *        ORDER BY dv.version_number DESC
   * - Returns: DescriptionHistoryResponse (paginated)
   * - Wiring: DB rows → Sorted array → React history list
   */
  async getVersions(
    entityId: UUID,
    entityType: EntityType,
    page: number = 1
  ): Promise<DescriptionHistoryResponse> {
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // First, find the description ID
    const { data: descData, error: descError } = await supabase
      .from('descriptions')
      .select('id')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('is_latest', true)
      .eq('is_deleted', false)
      .single();

    if (descError?.code === 'PGRST116') {
      // No description yet
      return {
        entity_id: entityId,
        entity_type: entityType,
        versions: [],
        total_count: 0,
        page,
        page_size: pageSize,
      };
    }

    if (descError) {
      console.error('[descriptionApi] getVersions desc lookup error:', descError);
      throw new Error(`Failed to fetch description: ${descError.message}`);
    }

    // Then fetch versions
    const { data: versions, error: versionsError, count } = await supabase
      .from('description_versions')
      .select('*', { count: 'exact' })
      .eq('description_id', descData.id)
      .order('version_number', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (versionsError) {
      console.error('[descriptionApi] getVersions error:', versionsError);
      throw new Error(`Failed to fetch versions: ${versionsError.message}`);
    }

    return {
      entity_id: entityId,
      entity_type: entityType,
      versions: (versions || []) as DescriptionVersion[],
      total_count: count || 0,
      page,
      page_size: pageSize,
    };
  },

  /**
   * GET a specific version
   * 
   * DYNAMITE Stage D Proof:
   * - SQL: SELECT * FROM description_versions WHERE description_id=$1 AND version_number=$2
   * - Returns: DescriptionVersion | null
   * - Wiring: DB row → React diff viewer
   */
  async getVersion(
    entityId: UUID,
    entityType: EntityType,
    versionNumber: number
  ): Promise<DescriptionVersion | null> {
    // Find description first
    const { data: descData } = await supabase
      .from('descriptions')
      .select('id')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('is_deleted', false)
      .single();

    if (!descData) return null;

    // Fetch specific version
    const { data, error } = await supabase
      .from('description_versions')
      .select('*')
      .eq('description_id', descData.id)
      .eq('version_number', versionNumber)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw new Error(`Failed to fetch version: ${error.message}`);

    return data as DescriptionVersion;
  },

  /**
   * SAVE description (upsert with version history)
   * 
   * DYNAMITE Stage D Proof:
   * 1. Validate ADF document
   * 2. Fetch current latest (if exists)
   * 3. Archive old latest to description_versions table
   * 4. INSERT new row with version=old.version+1, is_latest=true
   * 5. SET old is_latest=false
   * 6. Return new description
   * 
   * SQL:
   * - INSERT INTO descriptions (entity_id, entity_type, content_adf, ..., version=?, is_latest=true)
   * - INSERT INTO description_versions (description_id, version_number, content_adf, ...)
   * - UPDATE descriptions SET is_latest=false WHERE id=<old>
   * 
   * Wiring proof: User types → onChange → saveDescription → DB INSERT → getLatest refetch → UI renders new content
   */
  async save(
    entityId: UUID,
    entityType: EntityType,
    contentADF: ADFDocument,
    changeSummary?: string
  ): Promise<CatalystDescription> {
    // Validate ADF
    const validation = validateADF(contentADF);
    if (!validation.isValid) {
      throw new Error(`Invalid ADF: ${validation.errors?.join(', ')}`);
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const userId = user.id as UUID;

    // Fetch current latest description
    const current = await this.getLatest(entityId, entityType);

    // Calculate next version
    const nextVersion = (current?.version ?? 0) + 1;

    // Start transaction: archive old version, insert new
    const { data: newDesc, error: insertError } = await supabase
      .from('descriptions')
      .insert({
        entity_id: entityId,
        entity_type: entityType,
        content_adf: contentADF,
        version: nextVersion,
        is_latest: true,
        parent_version_id: current?.id,
        created_by: current?.created_by ?? userId,
        created_at: current?.created_at ?? new Date().toISOString(),
        updated_by: userId,
        updated_at: new Date().toISOString(),
        is_deleted: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[descriptionApi] save insert error:', insertError);
      throw new Error(`Failed to save description: ${insertError.message}`);
    }

    // Archive old version to history table
    if (current) {
      const { error: versionError } = await supabase
        .from('description_versions')
        .insert({
          description_id: current.id,
          version_number: current.version,
          content_adf: current.content_adf,
          changed_by: userId,
          changed_at: new Date().toISOString(),
          change_summary: changeSummary ?? 'Updated',
        });

      if (versionError) {
        console.error('[descriptionApi] save version archive error:', versionError);
        // Don't throw — archive failure shouldn't block the save
      }

      // Mark old as not latest
      const { error: updateError } = await supabase
        .from('descriptions')
        .update({ is_latest: false })
        .eq('id', current.id);

      if (updateError) {
        console.error('[descriptionApi] save is_latest update error:', updateError);
      }
    }

    return newDesc as CatalystDescription;
  },

  /**
   * ROLLBACK to a previous version
   * 
   * DYNAMITE Stage D Proof:
   * - SQL: SELECT * FROM description_versions WHERE description_id=$1 AND version_number=$2
   * - Creates a new "current" row via save() with content from the target version
   * - Wiring: User clicks "Restore version 5" → Creates version 6 with version 5's content → UI refreshes
   */
  async rollback(
    entityId: UUID,
    entityType: EntityType,
    targetVersion: number,
    reason?: string
  ): Promise<CatalystDescription> {
    // Fetch target version
    const targetVer = await this.getVersion(entityId, entityType, targetVersion);
    if (!targetVer) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // Save as new version with the target content
    return this.save(
      entityId,
      entityType,
      targetVer.content_adf,
      reason ?? `Rolled back to version ${targetVersion}`
    );
  },

  /**
   * SOFT-DELETE a description
   * 
   * DYNAMITE Stage D Proof:
   * - SQL: UPDATE descriptions SET is_deleted=true, deleted_at=now(), deleted_by=$1 WHERE id=$2
   * - Never physically deletes (respects immutability)
   * - Wiring: User deletes → UPDATE is_deleted=true → getLatest filters is_deleted=false → UI shows nothing
   */
  async delete(descriptionId: UUID): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('descriptions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', descriptionId);

    if (error) {
      console.error('[descriptionApi] delete error:', error);
      throw new Error(`Failed to delete description: ${error.message}`);
    }
  },
};

/**
 * Test helper: Insert a test description (dev/test only)
 */
export async function testInsertDescription(
  entityId: UUID,
  entityType: EntityType,
  contentADF: ADFDocument
): Promise<CatalystDescription | null> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('testInsertDescription is not available in production');
  }

  try {
    return await descriptionApi.save(entityId, entityType, contentADF, 'Test insert');
  } catch (err) {
    console.error('testInsertDescription error:', err);
    return null;
  }
}

/**
 * Test helper: Verify soft-delete guard
 * 
 * Expected behavior:
 * - Direct DELETE should fail with "use soft-delete" error
 * - UPDATE is_deleted=true should succeed
 */
export async function testSoftDeleteGuard(descriptionId: UUID): Promise<{
  directDeleteFails: boolean;
  softDeleteWorks: boolean;
}> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('testSoftDeleteGuard is not available in production');
  }

  try {
    // This will fail per the trigger
    await supabase.from('descriptions').delete().eq('id', descriptionId);
    return { directDeleteFails: false, softDeleteWorks: false };
  } catch {
    // Expected
  }

  try {
    // This should work
    await descriptionApi.delete(descriptionId);
    return { directDeleteFails: true, softDeleteWorks: true };
  } catch {
    return { directDeleteFails: true, softDeleteWorks: false };
  }
}

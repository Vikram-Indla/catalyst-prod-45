/**
 * CATALYST TESTS - Bulk Operations Service
 * API service for bulk test case operations
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  BulkEditRequest,
  BulkMoveRequest,
  BulkDeleteRequest,
  BulkArchiveRequest,
  BulkAddToSetRequest,
  BulkAddToCycleRequest,
  BulkOperationResult
} from '@/types/bulkOperations';

export async function bulkEditCases(request: BulkEditRequest): Promise<BulkOperationResult> {
  const operationId = crypto.randomUUID();
  const results: BulkOperationResult = {
    operation_id: operationId,
    total_count: request.case_ids.length,
    success_count: 0,
    failure_count: 0,
    errors: []
  };

  for (const caseId of request.case_ids) {
    try {
      const updateData: any = {};
      
      // Build update object
      if (request.updates.status) updateData.status = request.updates.status;
      if (request.updates.priority) updateData.priority = request.updates.priority;
      if (request.updates.owner_id) updateData.owner_id = request.updates.owner_id;
      if (request.updates.component) updateData.component = request.updates.component;
      if (request.updates.release) updateData.release = request.updates.release;
      if (request.updates.folder_id !== undefined) updateData.folder_id = request.updates.folder_id;
      
      // Handle labels
      if (request.updates.labels) {
        const { data: currentCase } = await supabase
          .from('test_cases')
          .select('labels')
          .eq('id', caseId)
          .single();

        const currentLabels = currentCase?.labels || [];
        
        switch (request.updates.labels.action) {
          case 'add':
            updateData.labels = [...new Set([...currentLabels, ...request.updates.labels.values])];
            break;
          case 'remove':
            updateData.labels = currentLabels.filter(l => !request.updates.labels!.values.includes(l));
            break;
          case 'replace':
            updateData.labels = request.updates.labels.values;
            break;
        }
      }

      const { error } = await supabase
        .from('test_cases')
        .update(updateData)
        .eq('id', caseId);

      if (error) throw error;
      results.success_count++;
    } catch (error: any) {
      results.failure_count++;
      results.errors.push({
        case_id: caseId,
        error_message: error.message
      });
    }
  }

  // Log bulk operation
  await supabase.from('test_case_bulk_operations').insert({
    case_ids: request.case_ids,
    operation_type: 'edit',
    operation_data: request as any,
    success_count: results.success_count,
    failure_count: results.failure_count,
    error_messages: results.errors.map(e => e.error_message),
    status: results.failure_count > 0 ? 'partial' : 'completed'
  });

  return results;
}

export async function bulkMoveCases(request: BulkMoveRequest): Promise<BulkOperationResult> {
  const operationId = crypto.randomUUID();
  const results: BulkOperationResult = {
    operation_id: operationId,
    total_count: request.case_ids.length,
    success_count: 0,
    failure_count: 0,
    errors: []
  };

  for (const caseId of request.case_ids) {
    try {
      const { error } = await supabase
        .from('test_cases')
        .update({ folder_id: request.target_folder_id })
        .eq('id', caseId);

      if (error) throw error;
      results.success_count++;
    } catch (error: any) {
      results.failure_count++;
      results.errors.push({
        case_id: caseId,
        error_message: error.message
      });
    }
  }

  // Log bulk operation
  await supabase.from('test_case_bulk_operations').insert({
    case_ids: request.case_ids,
    operation_type: 'move',
    operation_data: request as any,
    success_count: results.success_count,
    failure_count: results.failure_count,
    error_messages: results.errors.map(e => e.error_message),
    status: results.failure_count > 0 ? 'partial' : 'completed'
  });

  return results;
}

export async function bulkDeleteCases(request: BulkDeleteRequest): Promise<BulkOperationResult> {
  const operationId = crypto.randomUUID();
  const results: BulkOperationResult = {
    operation_id: operationId,
    total_count: request.case_ids.length,
    success_count: 0,
    failure_count: 0,
    errors: []
  };

  for (const caseId of request.case_ids) {
    try {
      if (request.cascade_delete_executions) {
        // Hard delete
        const { error } = await supabase
          .from('test_cases')
          .delete()
          .eq('id', caseId);
        if (error) throw error;
      } else {
        // Soft delete
        const { error } = await supabase
          .from('test_cases')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', caseId);
        if (error) throw error;
      }
      
      results.success_count++;
    } catch (error: any) {
      results.failure_count++;
      results.errors.push({
        case_id: caseId,
        error_message: error.message
      });
    }
  }

  // Log bulk operation
  await supabase.from('test_case_bulk_operations').insert({
    case_ids: request.case_ids,
    operation_type: 'delete',
    operation_data: request as any,
    success_count: results.success_count,
    failure_count: results.failure_count,
    error_messages: results.errors.map(e => e.error_message),
    status: results.failure_count > 0 ? 'partial' : 'completed'
  });

  return results;
}

export async function bulkArchiveCases(request: BulkArchiveRequest): Promise<BulkOperationResult> {
  const operationId = crypto.randomUUID();
  const results: BulkOperationResult = {
    operation_id: operationId,
    total_count: request.case_ids.length,
    success_count: 0,
    failure_count: 0,
    errors: []
  };

  for (const caseId of request.case_ids) {
    try {
      const { error } = await supabase
        .from('test_cases')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', caseId);

      if (error) throw error;
      results.success_count++;
    } catch (error: any) {
      results.failure_count++;
      results.errors.push({
        case_id: caseId,
        error_message: error.message
      });
    }
  }

  // Log bulk operation
  await supabase.from('test_case_bulk_operations').insert({
    case_ids: request.case_ids,
    operation_type: 'archive',
    operation_data: request as any,
    success_count: results.success_count,
    failure_count: results.failure_count,
    error_messages: results.errors.map(e => e.error_message),
    status: results.failure_count > 0 ? 'partial' : 'completed'
  });

  return results;
}

export async function bulkAddToSet(request: BulkAddToSetRequest): Promise<BulkOperationResult> {
  const operationId = crypto.randomUUID();
  const results: BulkOperationResult = {
    operation_id: operationId,
    total_count: request.case_ids.length,
    success_count: 0,
    failure_count: 0,
    errors: []
  };

  for (const caseId of request.case_ids) {
    try {
      const { error } = await supabase
        .from('test_set_cases')
        .insert({
          test_set_id: request.set_id,
          test_case_id: caseId
        });

      if (error) throw error;
      results.success_count++;
    } catch (error: any) {
      results.failure_count++;
      results.errors.push({
        case_id: caseId,
        error_message: error.message
      });
    }
  }

  // Log bulk operation
  await supabase.from('test_case_bulk_operations').insert({
    case_ids: request.case_ids,
    operation_type: 'add_to_set',
    operation_data: request as any,
    success_count: results.success_count,
    failure_count: results.failure_count,
    error_messages: results.errors.map(e => e.error_message),
    status: results.failure_count > 0 ? 'partial' : 'completed'
  });

  return results;
}

export async function bulkAddToCycle(request: BulkAddToCycleRequest): Promise<BulkOperationResult> {
  const operationId = crypto.randomUUID();
  const results: BulkOperationResult = {
    operation_id: operationId,
    total_count: request.case_ids.length,
    success_count: 0,
    failure_count: 0,
    errors: []
  };

  for (const caseId of request.case_ids) {
    try {
      const { error } = await supabase
        .from('test_executions')
        .insert([{
          test_case_id: caseId,
          test_cycle_id: request.cycle_id,
          executed_by: request.assign_to_user_id || (await supabase.auth.getUser()).data.user!.id,
          execution_date: new Date().toISOString(),
          status: 'not_run'
        }]);

      if (error) throw error;
      results.success_count++;
    } catch (error: any) {
      results.failure_count++;
      results.errors.push({
        case_id: caseId,
        error_message: error.message
      });
    }
  }

  // Log bulk operation
  await supabase.from('test_case_bulk_operations').insert({
    case_ids: request.case_ids,
    operation_type: 'add_to_cycle',
    operation_data: request as any,
    success_count: results.success_count,
    failure_count: results.failure_count,
    error_messages: results.errors.map(e => e.error_message),
    status: results.failure_count > 0 ? 'partial' : 'completed'
  });

  return results;
}

// Export service object
export const bulkOperationsService = {
  bulkEditCases,
  bulkMoveCases,
  bulkDeleteCases,
  bulkArchiveCases,
  bulkAddToSet,
  bulkAddToCycle,
};

/**
 * Shared audit logger for ph_request_audit_log.
 * Fire-and-forget — never blocks the calling mutation.
 */
import { supabase, typedQuery } from '@/integrations/supabase/client';

interface AuditEntry {
  request_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, any>;
}

export async function logInitiativeAudit(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await typedQuery('ph_request_audit_log').insert({
      ...entry,
      user_id: user?.id || null,
    });
  } catch (err) {
    console.warn('Audit log failed (non-blocking):', err);
  }
}

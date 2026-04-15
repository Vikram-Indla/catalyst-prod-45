import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function rpc(name: string, params: Record<string, unknown>) {
  return db.rpc(name, params);
}

export async function moveIssueToColumn(
  issueId: string,
  columnId: string,
  userId: string
): Promise<void> {
  const { error } = await rpc('move_issue_to_column', {
    p_issue_id:  issueId,
    p_column_id: columnId,
    p_user_id:   userId,
  });
  if (error) throw error;
}

export async function revertIssueMove(
  issueId: string,
  originalColumnId: string,
  userId: string
): Promise<void> {
  await moveIssueToColumn(issueId, originalColumnId, userId);
}

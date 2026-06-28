/**
 * BoardPanel — top-level "Board" tab in the For You page.
 *
 * Renders personal kanban board (Kanban columns by status_category)
 * for the current user, querying ph_issues directly.
 * Works for all users regardless of R360 resource profile status.
 */
import React, { useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import Spinner from '@atlaskit/spinner';
import type { R360WorkItem } from '@/types/r360';
import { BoardView } from '@/pages/r360-member';

export default function BoardPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<R360WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<R360WorkItem | null>(null);

  useEffect(() => {
    const fetchUserBoard = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('jira_account_id')
          .eq('id', user.id)
          .single();

        if (!profile?.jira_account_id) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('ph_issues')
          .select('*')
          .eq('assignee_account_id', profile.jira_account_id)
          .is('archived_at', null)
          .order('jira_updated_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Failed to fetch board items:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserBoard();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: token('color.text.subtle', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-400)',
      }}>
        No work items assigned to you.
      </div>
    );
  }

  return (
    <div style={{ minHeight: 600, padding: '0 16px' }}>
      <BoardView items={items} onSelect={setSelectedItem} />
    </div>
  );
}

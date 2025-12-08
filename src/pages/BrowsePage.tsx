import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { findByHistoricalKey } from '@/hooks/useWorkItemKeyHistory';

type WorkItemType = 'epic' | 'feature' | 'story' | 'subtask' | 'demand' | null;

interface WorkItemResult {
  id: string;
  type: WorkItemType;
  key: string;
}

/**
 * BrowsePage - Deep-link resolver for work items
 * Route: /browse/:key
 * 
 * Resolves work item keys (e.g., PROJ-123, MIM-001) to their detail views
 * Searches across: epics, features, stories, subtasks, business_requests
 * Also checks historical keys (renamed items)
 */
export default function BrowsePage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setError('No work item key provided');
      setLoading(false);
      return;
    }

    resolveWorkItemKey(key);
  }, [key]);

  async function resolveWorkItemKey(workItemKey: string) {
    setLoading(true);
    setError(null);

    try {
      const normalizedKey = workItemKey.toUpperCase();

      // Search across all work item tables in parallel
      const [epicResult, featureResult, storyResult, demandResult] = await Promise.all([
        supabase
          .from('epics')
          .select('id, epic_key')
          .ilike('epic_key', normalizedKey)
          .maybeSingle(),
        supabase
          .from('features')
          .select('id, display_id')
          .ilike('display_id', normalizedKey)
          .maybeSingle(),
        supabase
          .from('stories')
          .select('id, story_key')
          .ilike('story_key', normalizedKey)
          .maybeSingle(),
        supabase
          .from('business_requests')
          .select('id, request_key')
          .ilike('request_key', normalizedKey)
          .maybeSingle(),
      ]);

      let result: WorkItemResult | null = null;

      if (epicResult.data) {
        result = { id: epicResult.data.id, type: 'epic', key: epicResult.data.epic_key || workItemKey };
      } else if (featureResult.data) {
        result = { id: featureResult.data.id, type: 'feature', key: featureResult.data.display_id || workItemKey };
      } else if (storyResult.data) {
        result = { id: storyResult.data.id, type: 'story', key: storyResult.data.story_key || workItemKey };
      } else if (demandResult.data) {
        result = { id: demandResult.data.id, type: 'demand', key: demandResult.data.request_key || workItemKey };
      }

      // If not found, check historical keys
      if (!result) {
        const historicalResult = await findByHistoricalKey(normalizedKey);
        if (historicalResult) {
          result = {
            id: historicalResult.workItemId,
            type: historicalResult.workItemType as WorkItemType,
            key: workItemKey,
          };
        }
      }

      if (result) {
        navigateToWorkItem(result);
      } else {
        setError(`Work item "${workItemKey}" not found`);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error resolving work item key:', err);
      setError('Failed to resolve work item key');
      setLoading(false);
    }
  }

  function navigateToWorkItem(item: WorkItemResult) {
    switch (item.type) {
      case 'epic':
        navigate(`/items/epics?selected=${item.id}`, { replace: true });
        break;
      case 'feature':
        navigate(`/items/features?selected=${item.id}`, { replace: true });
        break;
      case 'story':
        navigate(`/items/stories?selected=${item.id}`, { replace: true });
        break;
      case 'subtask':
        navigate(`/items/stories?subtask=${item.id}`, { replace: true });
        break;
      case 'demand':
        navigate(`/industry?selected=${item.id}`, { replace: true });
        break;
      default:
        setError(`Unknown work item type: ${item.type}`);
        setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
          <p className="text-muted-foreground">Resolving {key}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-xl font-semibold">Work Item Not Found</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <button
            onClick={() => navigate('/home')}
            className="mt-4 px-4 py-2 bg-brand-gold text-white rounded-md hover:bg-brand-gold-hover transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

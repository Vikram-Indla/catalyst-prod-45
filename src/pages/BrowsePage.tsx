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
  projectId?: string | null;
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
      navigate('/home', { replace: true });
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

      // Check if the key is a generated key (e.g., F-3f3fbf, US-abc123)
      // These are derived from the UUID when display_id is null
      let idFromGeneratedKey: string | null = null;
      const generatedKeyMatch = normalizedKey.match(/^(F|US|E)-([A-F0-9]{6})$/i);
      if (generatedKeyMatch) {
        idFromGeneratedKey = generatedKeyMatch[2].toLowerCase();
      }

      // Search across all work item tables in parallel
      const [epicResult, featureResult, storyResult, demandResult, featureByIdResult, storyByIdResult] = await Promise.all([
        supabase
          .from('epics')
          .select('id, epic_key')
          .ilike('epic_key', normalizedKey)
          .maybeSingle(),
        supabase
          .from('features')
          .select('id, display_id, project_id')
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
        // Also search by ID prefix for features (when display_id is null)
        // Use RPC function that handles text casting properly
        idFromGeneratedKey && normalizedKey.startsWith('F-')
          ? supabase.rpc('find_feature_by_short_id', { p_short: idFromGeneratedKey })
          : Promise.resolve({ data: null, error: null }),
        // Also search by ID prefix for stories (when story_key is null)
        idFromGeneratedKey && normalizedKey.startsWith('US-')
          ? supabase.rpc('find_story_by_short_id', { p_short: idFromGeneratedKey })
          : Promise.resolve({ data: null, error: null }),
      ]);

      let result: WorkItemResult | null = null;

      if (epicResult.data) {
        result = { id: epicResult.data.id, type: 'epic', key: epicResult.data.epic_key || workItemKey };
      } else if (featureResult.data) {
        result = { id: featureResult.data.id, type: 'feature', key: featureResult.data.display_id || workItemKey, projectId: featureResult.data.project_id };
      } else if (featureByIdResult.data && Array.isArray(featureByIdResult.data) && featureByIdResult.data.length > 0) {
        // Found by generated key (F-xxxxxx) via RPC - need to fetch project_id
        const foundFeature = featureByIdResult.data[0];
        const { data: featureDetails } = await supabase
          .from('features')
          .select('project_id')
          .eq('id', foundFeature.id)
          .single();
        result = { 
          id: foundFeature.id, 
          type: 'feature', 
          key: foundFeature.display_id || workItemKey, 
          projectId: featureDetails?.project_id 
        };
      } else if (storyResult.data) {
        result = { id: storyResult.data.id, type: 'story', key: storyResult.data.story_key || workItemKey };
      } else if (storyByIdResult.data && Array.isArray(storyByIdResult.data) && storyByIdResult.data.length > 0) {
        // Found by generated key (US-xxxxxx) via RPC
        const foundStory = storyByIdResult.data[0];
        result = { id: foundStory.id, type: 'story', key: foundStory.story_key || workItemKey };
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
        // Redirect away from /browse/:key entirely (no dead-end error screen)
        navigate('/home', { replace: true });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error resolving work item key:', err);
      navigate('/home', { replace: true });
      setLoading(false);
    }
  }

  function navigateToWorkItem(item: WorkItemResult) {
    switch (item.type) {
      case 'epic':
        navigate(`/items/epics?selected=${item.id}`, { replace: true });
        break;
      case 'feature':
        // Navigate to the new FeatureDetailPage with full-page view
        if (item.projectId) {
          navigate(`/projects/${item.projectId}/features/${item.id}`, { replace: true });
        } else {
          // Fallback to features list if no project
          navigate(`/items/features?selected=${item.id}`, { replace: true });
        }
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
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
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
            className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

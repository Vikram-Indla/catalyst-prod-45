/**
 * FeatureViewPage — Project Module Feature Details (Full Page)
 * 
 * This is a dedicated delivery workspace view for Features within a Project.
 * Layout: Breadcrumb → Split (Content + Sidebar)
 * 
 * Route: /projects/:projectId/features/:featureId
 * 
 * DO NOT use drawer patterns here. This is the Project module full-page view.
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureProgress } from '@/hooks/useFeatureProgress';

// Sub-components
import { FeatureViewHeader } from './components/FeatureViewHeader';
import { FeatureKeyDetails } from './components/FeatureKeyDetails';
import { FeatureBlockedBanner } from './components/FeatureBlockedBanner';
import { FeatureStoryProgress } from './components/FeatureStoryProgress';
import { FeatureDescription } from './components/FeatureDescription';
import { FeatureChildStories } from './components/FeatureChildStories';
import { FeatureLinkedItems } from './components/FeatureLinkedItems';
import { FeatureActivity } from './components/FeatureActivity';
import { FeatureDetailsSidebar } from './components/FeatureDetailsSidebar';

import styles from './FeatureViewPage.module.css';

interface FeatureWithRelations {
  id: string;
  display_id: string | null;
  name: string;
  description: string | null;
  status: string | null;
  health: string | null;
  blocked: boolean | null;
  blocked_reason: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  owner_id: string | null;
  epic_id: string | null;
  project_id: string;
  // Joined data
  owner?: { id: string; name: string } | null;
  epic?: { id: string; display_id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  // Additional fields for sidebar - fetched from DB or null
  priority?: string | null;
  reporter_id?: string | null;
  reporter?: { id: string; name: string } | null;
  labels?: string[];
  component?: string | null;
  theme?: string | null;
  release?: string | null;
}

export default function FeatureViewPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>();
  
  // Fetch feature data
  const { data: feature, isLoading, error } = useQuery({
    queryKey: ['feature-view', featureId],
    queryFn: async (): Promise<FeatureWithRelations | null> => {
      if (!featureId) return null;
      
      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          display_id,
          name,
          description,
          status,
          health,
          blocked,
          blocked_reason,
          planned_start_date,
          planned_end_date,
          owner_id,
          epic_id,
          project_id
        `)
        .eq('id', featureId)
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      // Fetch related data
      let owner = null;
      let epic = null;
      let project = null;
      
      if (data.owner_id) {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', data.owner_id)
          .single();
        owner = ownerData ? { id: ownerData.id, name: ownerData.full_name || 'Unknown' } : null;
      }
      
      if (data.epic_id) {
        const { data: epicData } = await supabase
          .from('epics')
          .select('id, epic_key, name')
          .eq('id', data.epic_id)
          .single();
        epic = epicData ? { id: epicData.id, display_id: epicData.epic_key || epicData.id.slice(0, 6), name: epicData.name } : null;
      }
      
      if (data.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', data.project_id)
          .single();
        project = projectData;
      }
      
      return {
        ...data,
        owner,
        epic,
        project,
        // These fields are not in DB schema yet - show as null/empty
        priority: null,
        labels: [],
        component: null,
        release: null,
        reporter: null,
      };
    },
    enabled: !!featureId,
  });
  
  // Fetch story-driven progress
  const { data: progress } = useFeatureProgress(featureId);
  
  // Fetch child stories
  const { data: stories = [] } = useQuery({
    queryKey: ['feature-stories', featureId],
    queryFn: async () => {
      if (!featureId) return [];
      
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          name,
          status,
          state,
          priority,
          assignee_id
        `)
        .eq('feature_id', featureId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Failed to fetch stories:', error);
        return [];
      }
      
      // Map to expected shape with display_id derived from id
      return (data || []).map(s => ({
        ...s,
        display_id: `STORY-${s.id.slice(0, 4).toUpperCase()}`,
      }));
    },
    enabled: !!featureId,
  });
  
  if (isLoading) {
    return (
      <div className={styles.featureViewPage}>
        <div className={styles.breadcrumbRow}>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className={styles.mainLayout}>
          <div className={styles.contentArea}>
            <div className={styles.loadingContainer}>
              <Skeleton className="h-8 w-96 mb-4" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
          </div>
          <div className={styles.sidebar}>
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !feature) {
    return (
      <div className={styles.featureViewPage}>
        <div className={styles.breadcrumbRow}>
          <Link to={`/projects/${projectId}/features`} className={styles.breadcrumbLink}>
            Features
          </Link>
        </div>
        <div className={styles.notFoundContainer}>
          <span>Feature not found</span>
          <Link to={`/projects/${projectId}/features`} className={styles.breadcrumbLink}>
            ← Back to Features
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.featureViewPage}>
      {/* Breadcrumb Row - navigates to Project workspace views */}
      <div className={styles.breadcrumbRow}>
        <Link to="/projects" className={styles.breadcrumbLink}>Projects</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link to={`/projects/${projectId}`} className={styles.breadcrumbLink}>
          {feature.project?.name || 'Project'}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link to={`/projects/${projectId}/features`} className={styles.breadcrumbLink}>
          Features
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{feature.display_id || feature.id}</span>
      </div>
      
      {/* Main Split Layout */}
      <div className={styles.mainLayout}>
        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Feature Header */}
          <FeatureViewHeader 
            feature={feature} 
          />
          
          {/* Key Details Grid */}
          <FeatureKeyDetails 
            feature={feature}
          />
          
          {/* Blocked Banner */}
          {feature.blocked && feature.blocked_reason && (
            <FeatureBlockedBanner reason={feature.blocked_reason} />
          )}
          
          {/* Story Progress */}
          {progress && progress.totalStories > 0 && (
            <FeatureStoryProgress progress={progress} />
          )}
          
          {/* Description */}
          <FeatureDescription 
            description={feature.description || ''} 
            featureId={feature.id}
          />
          
          {/* Child Stories Table */}
          <FeatureChildStories 
            stories={stories}
            featureId={feature.id}
            projectId={projectId || ''}
            totalCount={progress?.totalStories || 0}
          />
          
          {/* Linked Items */}
          <FeatureLinkedItems featureId={feature.id} />
          
          {/* Activity */}
          <FeatureActivity featureId={feature.id} />
        </div>
        
        {/* Details Sidebar */}
        <FeatureDetailsSidebar feature={feature} />
      </div>
    </div>
  );
}

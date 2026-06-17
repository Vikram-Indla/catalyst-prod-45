/**
 * TasksDetailPage — Full-page detail view for tasks.
 *
 * Route: /tasks/view/:taskKey  (e.g. /tasks/view/PLN-11)
 *
 * Mirrors BacklogDetailPage (project-work-hub) but resolves a `tasks` row
 * (key → UUID) instead of `ph_issues`. Mounts CatalystDetailRouter with
 * `entityKind='task'` so the router short-circuits to TaskCatalystView
 * regardless of the resolved itemType.
 *
 * Reached by the "Open in full page" button on the task detail side panel
 * (TaskCatalystView → fullPageHrefBuilder → `/tasks/view/<task-key>`).
 */
import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

interface ResolvedTask {
  id: string;
  key: string;
  title: string | null;
}

export default function TasksDetailPage() {
  const { taskKey } = useParams<{ taskKey: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<ResolvedTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (!taskKey) {
      setDebugInfo('No taskKey from URL params');
      setLoading(false);
      return;
    }

    setTask(null);
    setLoading(true);
    setDebugInfo('');

    let cancelled = false;

    async function resolve() {
      try {
        const { data, error } = await (supabase as any)
          .from('tasks')
          .select('id, key, title')
          .eq('key', taskKey)
          .is('deleted_at', null)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setDebugInfo(`Supabase error: ${JSON.stringify(error)}`);
          setLoading(false);
          return;
        }

        if (data) {
          setTask({ id: data.id, key: data.key, title: data.title ?? null });
          setLoading(false);
          return;
        }

        setDebugInfo(`Task with key="${taskKey}" not found.`);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setDebugInfo(`Exception: ${err?.message || String(err)}`);
          setLoading(false);
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [taskKey]);

  const handleClose = () => {
    navigate('/tasks/list');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ds-text-subtle, #5E6C84)' }}>
        Loading…
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #344054)' }}>Task not found</span>
        <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #5E6C84)' }}>{taskKey} could not be found or has been deleted.</span>
        {debugInfo && (
          <span style={{ fontSize: 11, color: 'var(--ds-text-danger, #DE350B)', maxWidth: 600, textAlign: 'center', padding: '8px 12px', background: 'var(--ds-background-danger, #FFF5F5)', border: '1px solid var(--ds-border-danger, #FFCDD2)', borderRadius: 4 }}>
            {debugInfo}
          </span>
        )}
        <button
          onClick={handleClose}
          style={{ marginTop: 8, padding: '8px 16px', background: 'var(--ds-text-brand, #2563EB)', color: 'var(--ds-surface, #FFFFFF)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          Back to tasks
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={handleClose}
            itemId={task.id}
            projectKey="TASKS"
            itemType="task"
            entityKind="task"
            fullPageMode={true}
          />
        </Suspense>
      </div>
    </div>
  );
}

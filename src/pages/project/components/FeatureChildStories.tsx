/**
 * FeatureChildStories — Child stories table
 */

import { Link2, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface Story {
  id: string;
  display_id: string | null;
  name: string;
  status: string | null;
  state: string | null;
  priority: string | null;
  assignee_id: string | null;
}

interface FeatureChildStoriesProps {
  stories: Story[];
  featureId: string;
  totalCount: number;
}

function getStatusClass(status: string | null, state: string | null): string {
  const s = (state || status || '').toLowerCase();
  if (['done', 'accepted', 'closed', 'deployed'].includes(s)) {
    return styles.storyStatusDone;
  }
  if (['in_progress', 'in-progress', 'implementing', 'testing', 'review'].includes(s)) {
    return styles.storyStatusInProgress;
  }
  return styles.storyStatusTodo;
}

function getStatusLabel(status: string | null, state: string | null): string {
  const s = (state || status || '').toLowerCase();
  if (['done', 'accepted', 'closed', 'deployed'].includes(s)) {
    return 'DONE';
  }
  if (['in_progress', 'in-progress', 'implementing', 'testing', 'review'].includes(s)) {
    return 'IN PROGRESS';
  }
  return 'TO DO';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FeatureChildStories({ stories, featureId, totalCount }: FeatureChildStoriesProps) {
  const handleLinkExisting = () => {
    toast.info('Link existing story');
  };
  
  const handleAddStory = () => {
    toast.info('Add new story');
  };
  
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          Child Stories
          <span className={styles.panelCount}>{totalCount}</span>
        </h2>
        <div className={styles.panelActions}>
          <button className={styles.panelAction} onClick={handleLinkExisting}>
            <Link2 size={14} />
            Link existing
          </button>
          <button className={styles.panelAction} onClick={handleAddStory}>
            <Plus size={14} />
            Add story
          </button>
        </div>
      </div>
      <div className={styles.panelBody}>
        {stories.length === 0 ? (
          <div className={styles.panelBodyPadded}>
            <span className={styles.noneValue}>No stories linked to this feature.</span>
          </div>
        ) : (
          <table className={styles.storiesTable}>
            <thead className={styles.storiesTableHead}>
              <tr>
                <th>ID</th>
                <th>SUMMARY</th>
                <th>PRIORITY</th>
                <th>ASSIGNEE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody className={styles.storiesTableBody}>
              {stories.map(story => (
                <tr key={story.id}>
                  <td>
                    <span className={styles.storyId}>
                      <span className={styles.storyIcon}>S</span>
                      {story.display_id || story.id.slice(0, 8)}
                    </span>
                  </td>
                  <td>{story.name}</td>
                  <td>
                    {story.priority?.toLowerCase() === 'high' ? (
                      <span className={styles.priorityHigh}>
                        <AlertTriangle />
                        High
                      </span>
                    ) : (
                      <span className={styles.priorityMedium}>
                        {story.priority || 'Medium'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.assigneeCell}>
                      <div className={styles.avatar} style={{ width: 20, height: 20, fontSize: 9 }}>
                        --
                      </div>
                      <span>Unassigned</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.storyStatusPill} ${getStatusClass(story.status, story.state)}`}>
                      {getStatusLabel(story.status, story.state)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

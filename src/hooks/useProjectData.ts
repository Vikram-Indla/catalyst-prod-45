import { useMemo } from 'react';
import { ProjectData, ProjectMetrics, StatusCount, PriorityCount, TypeCount, Feature, Story, Subtask } from '../types/project.types';

export function useProjectData(projectData: ProjectData) {
  const allItems = useMemo(() => {
    const items: Array<Feature | Story | Subtask> = [];
    
    projectData.features.forEach(feature => {
      items.push(feature);
      feature.stories.forEach(story => {
        items.push(story);
        story.subtasks.forEach(subtask => {
          items.push(subtask);
        });
      });
    });
    
    return items;
  }, [projectData]);

  const metrics: ProjectMetrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      completed: allItems.filter(item => {
        const created = new Date(item.created);
        return item.status === 'DONE' && created >= sevenDaysAgo;
      }).length,
      updated: 8, // Mock data
      created: allItems.filter(item => {
        const created = new Date(item.created);
        return created >= sevenDaysAgo;
      }).length,
      dueSoon: 3, // Mock data
    };
  }, [allItems]);

  const statusCounts: StatusCount[] = useMemo(() => {
    const counts = allItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { status: 'To Do', count: counts['TO DO'] || 0, color: '#42526E' },
      { status: 'In Progress', count: counts['IN PROGRESS'] || 0, color: '#0052CC' },
      { status: 'Done', count: counts['DONE'] || 0, color: '#00875A' },
    ];
  }, [allItems]);

  const priorityCounts: PriorityCount[] = useMemo(() => {
    const counts = allItems.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { priority: 'High', count: counts['High'] || 0 },
      { priority: 'Medium', count: counts['Medium'] || 0 },
      { priority: 'Low', count: counts['Low'] || 0 },
    ];
  }, [allItems]);

  const typeCounts: TypeCount[] = useMemo(() => {
    const featureCount = projectData.features.length;
    const storyCount = projectData.features.reduce((sum, f) => sum + f.stories.length, 0);
    const subtaskCount = projectData.features.reduce((sum, f) => 
      sum + f.stories.reduce((s, story) => s + story.subtasks.length, 0), 0
    );
    const total = featureCount + storyCount + subtaskCount;

    return [
      { type: 'Feature', count: featureCount, percentage: Math.round((featureCount / total) * 100) },
      { type: 'Story', count: storyCount, percentage: Math.round((storyCount / total) * 100) },
      { type: 'Subtask', count: subtaskCount, percentage: Math.round((subtaskCount / total) * 100) },
    ];
  }, [projectData]);

  return {
    allItems,
    metrics,
    statusCounts,
    priorityCounts,
    typeCounts,
    totalItems: allItems.length,
  };
}

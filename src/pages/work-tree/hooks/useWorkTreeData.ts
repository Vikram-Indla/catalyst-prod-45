import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type WorkTreeView = 'top-down' | 'bottom-up' | 'team' | 'strategy' | 'theme-group';

export function useWorkTreeData(view: WorkTreeView) {
  return useQuery({
    queryKey: ['work-tree', view],
    queryFn: async () => {
      // Mock data structure - will be replaced with actual DB queries
      const mockTree = generateMockTree(view);
      const mockMetrics = generateMockMetrics();

      return {
        tree: mockTree,
        ...mockMetrics
      };
    }
  });
}

function generateMockTree(view: WorkTreeView) {
  // Generate mock tree based on view type
  switch (view) {
    case 'top-down':
      return [
        {
          id: 'epic-1',
          type: 'epic',
          title: 'Mobile App Redesign',
          health: 'green',
          points: 120,
          itemCount: 15,
          progress: 65,
          children: [
            {
              id: 'feature-1',
              type: 'feature',
              title: 'New Dashboard UI',
              health: 'green',
              points: 40,
              itemCount: 8,
              progress: 75,
              children: [
                {
                  id: 'story-1',
                  type: 'story',
                  title: 'Design dashboard wireframes',
                  health: 'green',
                  points: 8,
                  itemCount: 2,
                  progress: 100
                }
              ]
            }
          ]
        }
      ];
    case 'strategy':
      return [
        {
          id: 'goal-1',
          type: 'goal',
          title: 'Increase Market Share',
          progress: 55,
          children: [
            {
              id: 'theme-1',
              type: 'theme',
              title: 'Digital Transformation',
              progress: 60,
              children: [
                {
                  id: 'epic-2',
                  type: 'epic',
                  title: 'Cloud Migration',
                  health: 'yellow',
                  points: 200,
                  itemCount: 25,
                  progress: 45
                }
              ]
            }
          ]
        }
      ];
    case 'theme-group':
      return [
        {
          id: 'tg-1',
          type: 'theme-group',
          title: 'Innovation Initiatives',
          progress: 50,
          children: [
            {
              id: 'theme-2',
              type: 'theme',
              title: 'AI & Automation',
              progress: 45,
              children: [
                {
                  id: 'epic-3',
                  type: 'epic',
                  title: 'ML Pipeline',
                  health: 'green',
                  points: 150,
                  itemCount: 18,
                  progress: 70
                }
              ]
            }
          ]
        }
      ];
    default:
      return [];
  }
}

function generateMockMetrics() {
  return {
    epicTotal: 10,
    epicCompleted: 6,
    featureTotal: 45,
    featureCompleted: 28,
    storyTotal: 120,
    storyCompleted: 85,
    taskTotal: 240,
    taskCompleted: 180
  };
}

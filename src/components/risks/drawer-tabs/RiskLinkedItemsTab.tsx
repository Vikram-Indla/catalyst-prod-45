/**
 * RiskLinkedItemsTab - Linked Items tab for Risk Drawer
 * Shows traceability to Business Request, Epic, Feature, Story
 */

import { Risk } from '@/types/risks';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Layers, LayoutGrid, ListTodo, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RiskLinkedItemsTabProps {
  risk: Risk;
}

interface LinkedItem {
  type: 'business_request' | 'epic' | 'feature' | 'story';
  id: string;
  key: string;
  title: string;
  status?: string;
  owner?: string;
  score?: number;
  quarter?: string;
}

export function RiskLinkedItemsTab({ risk }: RiskLinkedItemsTabProps) {
  const navigate = useNavigate();

  // Fetch linked items based on risk's related_item_id and relationship type
  const { data: linkedItems = [], isLoading } = useQuery({
    queryKey: ['risk-linked-items', risk.id, risk.related_item_id, risk.relationship],
    queryFn: async () => {
      const items: LinkedItem[] = [];

      // If this risk is linked to a specific item
      if (risk.related_item_id && risk.relationship) {
        switch (risk.relationship) {
          case 'Epic': {
            const { data } = await supabase
              .from('epics')
              .select('id, epic_key, name, state')
              .eq('id', risk.related_item_id)
              .single();
            if (data) {
              items.push({
                type: 'epic',
                id: data.id,
                key: data.epic_key || 'EPIC',
                title: data.name,
                status: data.state,
              });
            }
            break;
          }
          case 'Feature': {
            const { data } = await supabase
              .from('features')
              .select('id, name, status')
              .eq('id', risk.related_item_id)
              .single();
            if (data) {
              items.push({
                type: 'feature',
                id: data.id,
                key: `FEAT-${data.id.slice(0, 4).toUpperCase()}`,
                title: data.name,
                status: data.status,
              });
            }
            break;
          }
          // Add more relationship types as needed
        }
      }

      // Also look for any business requests that might reference this risk
      // (if the risk is linked via business_request_id or similar)

      return items;
    },
    enabled: !!risk.id,
  });

  const getIcon = (type: LinkedItem['type']) => {
    switch (type) {
      case 'business_request':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'epic':
        return <Layers className="h-4 w-4 text-purple-600" />;
      case 'feature':
        return <LayoutGrid className="h-4 w-4 text-green-600" />;
      case 'story':
        return <ListTodo className="h-4 w-4 text-orange-600" />;
    }
  };

  const getTypeLabel = (type: LinkedItem['type']) => {
    switch (type) {
      case 'business_request':
        return 'Business Request';
      case 'epic':
        return 'Epic';
      case 'feature':
        return 'Feature';
      case 'story':
        return 'Story';
    }
  };

  const handleItemClick = (item: LinkedItem) => {
    switch (item.type) {
      case 'business_request':
        navigate(`/industry?request=${item.id}`);
        break;
      case 'epic':
        navigate(`/enterprise/epics?epicId=${item.id}`);
        break;
      case 'feature':
        navigate(`/project/features?featureId=${item.id}`);
        break;
      case 'story':
        navigate(`/project/stories?storyId=${item.id}`);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <span className="text-sm text-muted-foreground">Loading linked items...</span>
      </div>
    );
  }

  if (linkedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No linked items</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          This risk is not linked to any work items
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {linkedItems.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
          onClick={() => handleItemClick(item)}
        >
          <div className="shrink-0 mt-0.5">{getIcon(item.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {getTypeLabel(item.type)}
              </span>
              <span className="text-xs text-brand-gold font-medium">{item.key}</span>
            </div>
            <h4 className="text-sm font-medium text-foreground truncate mt-0.5">
              {item.title}
            </h4>
            <div className="flex items-center gap-3 mt-1.5">
              {item.status && (
                <Badge variant="outline" className="text-xs">
                  {item.status}
                </Badge>
              )}
              {item.owner && (
                <span className="text-xs text-muted-foreground">
                  Owner: {item.owner}
                </span>
              )}
              {item.score !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Score: {item.score}
                </span>
              )}
              {item.quarter && (
                <span className="text-xs text-muted-foreground">
                  {item.quarter}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

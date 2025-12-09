import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Link2, Unlink, ChevronRight, Target, Eye, Heart } from 'lucide-react';
import type { StrategyMission, StrategyVision, StrategyValue, SnapshotStrategyLinks } from '@/types/strategicBacklog';
import { StrategyObjectDrawer } from './StrategyObjectDrawer';
import { CreateStrategyObjectDialog } from './CreateStrategyObjectDialog';
import { useUpsertSnapshotLinks } from '@/hooks/useStrategicBacklog';

interface MVVTabProps {
  missions: StrategyMission[];
  visions: StrategyVision[];
  values: StrategyValue[];
  links: SnapshotStrategyLinks | null;
  snapshotId: string;
  isArchived: boolean;
}

type ObjectType = 'mission' | 'vision' | 'value';

export function MVVTab({ missions, visions, values, links, snapshotId, isArchived }: MVVTabProps) {
  const [selectedObject, setSelectedObject] = useState<{ type: ObjectType; data: any } | null>(null);
  const [createType, setCreateType] = useState<ObjectType | null>(null);
  const upsertLinks = useUpsertSnapshotLinks();

  const linkedMissionIds = links?.mission_ids || [];
  const linkedVisionIds = links?.vision_ids || [];
  const linkedValueIds = links?.value_ids || [];

  const handleLink = async (type: ObjectType, id: string) => {
    if (isArchived) return;
    
    const currentLinks = {
      snapshot_id: snapshotId,
      mission_ids: [...linkedMissionIds],
      vision_ids: [...linkedVisionIds],
      value_ids: [...linkedValueIds],
      goal_ids: links?.goal_ids || [],
      theme_ids: links?.theme_ids || [],
    };

    if (type === 'mission' && !currentLinks.mission_ids.includes(id)) {
      currentLinks.mission_ids.push(id);
    } else if (type === 'vision' && !currentLinks.vision_ids.includes(id)) {
      currentLinks.vision_ids.push(id);
    } else if (type === 'value' && !currentLinks.value_ids.includes(id)) {
      currentLinks.value_ids.push(id);
    }

    await upsertLinks.mutateAsync(currentLinks);
  };

  const handleUnlink = async (type: ObjectType, id: string) => {
    if (isArchived) return;

    const currentLinks = {
      snapshot_id: snapshotId,
      mission_ids: type === 'mission' ? linkedMissionIds.filter(i => i !== id) : linkedMissionIds,
      vision_ids: type === 'vision' ? linkedVisionIds.filter(i => i !== id) : linkedVisionIds,
      value_ids: type === 'value' ? linkedValueIds.filter(i => i !== id) : linkedValueIds,
      goal_ids: links?.goal_ids || [],
      theme_ids: links?.theme_ids || [],
    };

    await upsertLinks.mutateAsync(currentLinks);
  };

  const sections = [
    {
      type: 'mission' as ObjectType,
      title: 'Missions',
      icon: Target,
      items: missions,
      linkedIds: linkedMissionIds,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      type: 'vision' as ObjectType,
      title: 'Visions',
      icon: Eye,
      items: visions,
      linkedIds: linkedVisionIds,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      type: 'value' as ObjectType,
      title: 'Values',
      icon: Heart,
      items: values,
      linkedIds: linkedValueIds,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const Icon = section.icon;
        const linkedItems = section.items.filter(item => section.linkedIds.includes(item.id));
        const unlinkedItems = section.items.filter(item => !section.linkedIds.includes(item.id));

        return (
          <Card key={section.type} className="border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${section.bgColor}`}>
                  <Icon className={`h-4 w-4 ${section.color}`} />
                </div>
                <h3 className="font-medium text-foreground">{section.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {linkedItems.length} linked
                </Badge>
              </div>
              {!isArchived && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateType(section.type)}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create
                </Button>
              )}
            </div>

            <div className="divide-y divide-border">
              {linkedItems.length === 0 && unlinkedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No {section.title.toLowerCase()} created yet.
                  </p>
                  {!isArchived && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setCreateType(section.type)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create {section.type}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {linkedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedObject({ type: section.type, data: item })}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge variant="outline" className="bg-brand-gold/10 text-brand-gold border-brand-gold/30 text-[10px]">
                          Linked
                        </Badge>
                        <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isArchived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlink(section.type, item.id);
                            }}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {unlinkedItems.length > 0 && (
                    <div className="bg-muted/20">
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Available to link
                      </div>
                      {unlinkedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedObject({ type: section.type, data: item })}
                        >
                          <span className="text-sm text-foreground truncate">{item.title}</span>
                          <div className="flex items-center gap-2">
                            {!isArchived && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground hover:text-brand-gold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLink(section.type, item.id);
                                }}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        );
      })}

      {/* Details Drawer */}
      <StrategyObjectDrawer
        open={!!selectedObject}
        onOpenChange={(open) => !open && setSelectedObject(null)}
        type={selectedObject?.type || 'mission'}
        data={selectedObject?.data}
        isArchived={isArchived}
      />

      {/* Create Dialog */}
      <CreateStrategyObjectDialog
        open={!!createType}
        onOpenChange={(open) => !open && setCreateType(null)}
        type={createType || 'mission'}
        snapshotId={snapshotId}
      />
    </div>
  );
}

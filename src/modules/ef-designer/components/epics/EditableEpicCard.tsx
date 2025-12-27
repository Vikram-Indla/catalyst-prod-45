import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EditableEpicCardProps {
  epic: {
    id: string;
    epic_key: string;
    name: string;
    description: string | null;
    size: string | null;
    lbc_hypothesis: string | null;
    mvp_definition: string | null;
    is_selected_for_features: boolean;
  };
  onUpdate: (epicId: string, updates: Record<string, any>) => void;
  onToggleSelection: (epicId: string, selected: boolean) => void;
}

export const EditableEpicCard: React.FC<EditableEpicCardProps> = ({
  epic,
  onUpdate,
  onToggleSelection,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState({
    name: epic.name,
    description: epic.description || '',
    size: epic.size || 'M',
    lbc_hypothesis: epic.lbc_hypothesis || '',
    mvp_definition: epic.mvp_definition || '',
  });

  const handleSave = () => {
    onUpdate(epic.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: epic.name,
      description: epic.description || '',
      size: epic.size || 'M',
      lbc_hypothesis: epic.lbc_hypothesis || '',
      mvp_definition: epic.mvp_definition || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="border-primary">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <span className="text-sm font-mono text-primary">{epic.epic_key}</span>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="font-semibold"
                placeholder="Epic name"
              />
            </div>
            <Select value={editData.size} onValueChange={(v) => setEditData({ ...editData, size: v })}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XS">XS</SelectItem>
                <SelectItem value="S">S</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="XL">XL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Epic description"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">LBC Hypothesis</label>
            <Textarea
              value={editData.lbc_hypothesis}
              onChange={(e) => setEditData({ ...editData, lbc_hypothesis: e.target.value })}
              placeholder="If we... then we will..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">MVP Definition</label>
            <Textarea
              value={editData.mvp_definition}
              onChange={(e) => setEditData({ ...editData, mvp_definition: e.target.value })}
              placeholder="Minimum viable product definition"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-sm font-mono text-primary">{epic.epic_key}</span>
              <CardTitle className="text-lg mt-1">{epic.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {epic.size && <Badge variant="outline">{epic.size}</Badge>}
              <input
                type="checkbox"
                checked={epic.is_selected_for_features}
                onChange={(e) => onToggleSelection(epic.id, e.target.checked)}
                className="h-4 w-4 rounded border-muted cursor-pointer"
              />
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{epic.description}</p>
            
            {epic.lbc_hypothesis && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Hypothesis</p>
                <p className="text-sm italic">{epic.lbc_hypothesis}</p>
              </div>
            )}

            {epic.mvp_definition && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">MVP Definition</p>
                <p className="text-sm">{epic.mvp_definition}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
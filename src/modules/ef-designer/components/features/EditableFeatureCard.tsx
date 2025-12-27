import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Pencil } from 'lucide-react';

interface EditableFeatureCardProps {
  feature: {
    id: string;
    feature_key: string;
    name?: string;
    title?: string;
    description: string | null;
    story_points?: number | null;
    benefit_hypothesis: string | null;
    is_enabler?: boolean;
  };
  onUpdate: (featureId: string, updates: Record<string, any>) => void;
}

export const EditableFeatureCard: React.FC<EditableFeatureCardProps> = ({
  feature,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const featureName = feature.name || feature.title || '';
  const [editData, setEditData] = useState({
    name: featureName,
    description: feature.description || '',
    story_points: feature.story_points || 0,
    benefit_hypothesis: feature.benefit_hypothesis || '',
  });

  const handleSave = () => {
    // Update both name and title for compatibility
    onUpdate(feature.id, {
      name: editData.name,
      title: editData.name,
      description: editData.description,
      story_points: editData.story_points,
      benefit_hypothesis: editData.benefit_hypothesis,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: featureName,
      description: feature.description || '',
      story_points: feature.story_points || 0,
      benefit_hypothesis: feature.benefit_hypothesis || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="border-primary">
        <CardHeader className="py-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <span className="text-xs font-mono text-emerald-600">{feature.feature_key}</span>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="font-semibold"
                placeholder="Feature name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={editData.story_points}
                onChange={(e) => setEditData({ ...editData, story_points: parseInt(e.target.value) || 0 })}
                className="w-20"
                placeholder="SP"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Feature description"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Benefit Hypothesis</label>
            <Textarea
              value={editData.benefit_hypothesis}
              onChange={(e) => setEditData({ ...editData, benefit_hypothesis: e.target.value })}
              placeholder="If we deliver this... users will..."
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
    <Card className="hover:shadow-sm transition-shadow group">
      <CardHeader className="py-3 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-emerald-600">{feature.feature_key}</span>
            <CardTitle className="text-base mt-0.5">{featureName}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {feature.story_points && (
              <Badge variant="secondary">{feature.story_points} pts</Badge>
            )}
            {feature.is_enabler && (
              <Badge variant="outline">Enabler</Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground">{feature.description}</p>
        
        {feature.benefit_hypothesis && (
          <p className="text-sm mt-2 p-2 bg-muted/50 rounded italic">
            {feature.benefit_hypothesis}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
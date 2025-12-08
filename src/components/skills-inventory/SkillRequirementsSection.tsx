import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface SkillRequirementsSectionProps {
  entityType: 'feature' | 'epic' | 'program';
  entityId: string;
  isEditable?: boolean;
}

interface SkillRequirement {
  id: string;
  skill_id: string;
  required_proficiency: ProficiencyLevel;
  required_count: number;
  skill?: {
    id: string;
    name: string;
    category: string;
  };
  currentCount?: number;
}

const PROFICIENCY_LEVELS = ['awareness', 'beginner', 'intermediate', 'advanced', 'expert'] as const;
type ProficiencyLevel = typeof PROFICIENCY_LEVELS[number];

const PROFICIENCY_COLORS: Record<string, string> = {
  expert: 'hsl(var(--health-green))',
  advanced: 'hsl(var(--info))',
  intermediate: 'hsl(var(--warning))',
  beginner: 'hsl(280 70% 50%)',
  awareness: 'hsl(var(--muted-foreground))',
};

const PROFICIENCY_LABELS: Record<string, string> = {
  expert: 'Expert',
  advanced: 'Advanced',
  intermediate: 'Intermediate',
  beginner: 'Beginner',
  awareness: 'Awareness',
};

const CATEGORY_COLORS: Record<string, string> = {
  Technical: 'hsl(var(--info))',
  'Cloud & Infrastructure': 'hsl(185 70% 50%)',
  Leadership: 'hsl(var(--brand-gold))',
  'Soft Skills': 'hsl(330 70% 55%)',
  'Data & Analytics': 'hsl(280 70% 50%)',
  Security: 'hsl(var(--destructive))',
  Methodology: 'hsl(var(--health-green))',
};

export function SkillRequirementsSection({ 
  entityType, 
  entityId, 
  isEditable = false 
}: SkillRequirementsSectionProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<SkillRequirement | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedProficiency, setSelectedProficiency] = useState<ProficiencyLevel>('intermediate');
  const [requiredCount, setRequiredCount] = useState<number>(1);

  // Fetch skill requirements for this entity
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['skill_requirements', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_requirements')
        .select(`
          id,
          skill_id,
          required_proficiency,
          required_count,
          skill:skills(id, name, category)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (error) throw error;
      
      // Calculate current availability for each requirement
      const requirementsWithAvailability = await Promise.all(
        (data || []).map(async (req) => {
          const proficiencyIndex = PROFICIENCY_LEVELS.indexOf(req.required_proficiency);
          const sufficientLevels = PROFICIENCY_LEVELS.slice(proficiencyIndex);
          
          const { count } = await supabase
            .from('team_member_skills')
            .select('*', { count: 'exact', head: true })
            .eq('skill_id', req.skill_id)
            .in('proficiency_level', sufficientLevels);
          
          return {
            ...req,
            currentCount: count || 0,
          };
        })
      );
      
      return requirementsWithAvailability as SkillRequirement[];
    },
  });

  // Fetch available skills for the dropdown
  const { data: availableSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, category')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Add skill requirement mutation
  const addRequirementMutation = useMutation({
    mutationFn: async (newReq: { 
      skill_id: string; 
      required_proficiency: ProficiencyLevel; 
      required_count: number 
    }) => {
      const { data, error } = await supabase
        .from('skill_requirements')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          skill_id: newReq.skill_id,
          required_proficiency: newReq.required_proficiency,
          required_count: newReq.required_count,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill_requirements', entityType, entityId] });
      toast.success('Skill requirement added');
      resetForm();
      setAddDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to add skill requirement');
    },
  });

  // Update skill requirement mutation
  const updateRequirementMutation = useMutation({
    mutationFn: async (update: { 
      id: string; 
      required_proficiency: ProficiencyLevel; 
      required_count: number 
    }) => {
      const { error } = await supabase
        .from('skill_requirements')
        .update({
          required_proficiency: update.required_proficiency,
          required_count: update.required_count,
        })
        .eq('id', update.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill_requirements', entityType, entityId] });
      toast.success('Skill requirement updated');
      setEditingRequirement(null);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update skill requirement');
    },
  });

  // Delete skill requirement mutation
  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('skill_requirements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill_requirements', entityType, entityId] });
      toast.success('Skill requirement removed');
    },
    onError: () => {
      toast.error('Failed to remove skill requirement');
    },
  });

  const resetForm = () => {
    setSelectedSkillId('');
    setSelectedProficiency('intermediate');
    setRequiredCount(1);
  };

  const handleAddRequirement = () => {
    if (!selectedSkillId) {
      toast.error('Please select a skill');
      return;
    }
    addRequirementMutation.mutate({
      skill_id: selectedSkillId,
      required_proficiency: selectedProficiency,
      required_count: requiredCount,
    });
  };

  const handleUpdateRequirement = () => {
    if (!editingRequirement) return;
    updateRequirementMutation.mutate({
      id: editingRequirement.id,
      required_proficiency: selectedProficiency,
      required_count: requiredCount,
    });
  };

  const openEditDialog = (req: SkillRequirement) => {
    setEditingRequirement(req);
    setSelectedProficiency(req.required_proficiency);
    setRequiredCount(req.required_count);
  };

  const gapsCount = requirements.filter(r => (r.currentCount || 0) < r.required_count).length;

  const renderProficiencyDots = (level: string) => {
    const levelIndex = PROFICIENCY_LEVELS.indexOf(level as ProficiencyLevel);
    const color = PROFICIENCY_COLORS[level] || 'hsl(var(--muted-foreground))';
    
    return (
      <div className="flex gap-1">
        {PROFICIENCY_LEVELS.map((_, idx) => (
          <div
            key={idx}
            className="w-2 h-2 rounded-full"
            style={{
              background: idx <= levelIndex ? color : 'hsl(var(--muted-foreground) / 0.3)',
            }}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-xl p-4 bg-secondary border border-brand-gold-border">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-brand-dark" />
          <div className="h-12 rounded bg-brand-dark" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4 bg-secondary border border-brand-gold-border">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-brand-gold" />
          <h3 className="text-sm font-semibold text-foreground">
            Required Skills
          </h3>
          {requirements.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold">
              {requirements.length}
            </span>
          )}
        </div>
        {isEditable && (
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="h-7 text-xs bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Skill
          </Button>
        )}
      </div>

      {/* Empty State */}
      {requirements.length === 0 ? (
        <div className="text-center py-8 rounded-lg bg-brand-dark">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            No skills defined
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            Define required skills to track capability gaps
          </p>
        </div>
      ) : (
        <>
          {/* Skills List */}
          <div className="space-y-2">
            {requirements.map((req) => {
              const isGap = (req.currentCount || 0) < req.required_count;
              const availabilityColor = isGap ? 'hsl(var(--destructive))' : 'hsl(var(--health-green))';
              const availabilityPercent = Math.min(100, ((req.currentCount || 0) / req.required_count) * 100);
              
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-dark"
                >
                  {/* Left: Skill name + category */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate text-foreground">
                          {req.skill?.name || 'Unknown Skill'}
                        </span>
                        {req.skill?.category && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: `${CATEGORY_COLORS[req.skill.category] || 'hsl(var(--muted-foreground))'}20`,
                              color: CATEGORY_COLORS[req.skill.category] || 'hsl(var(--muted-foreground))',
                            }}
                          >
                            {req.skill.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Required proficiency */}
                  <div className="flex items-center gap-3 px-4">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${PROFICIENCY_COLORS[req.required_proficiency] || 'hsl(var(--muted-foreground))'}20`,
                          color: PROFICIENCY_COLORS[req.required_proficiency] || 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {PROFICIENCY_LABELS[req.required_proficiency] || req.required_proficiency}
                      </span>
                      {renderProficiencyDots(req.required_proficiency)}
                    </div>
                  </div>

                  {/* Right: Availability */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isGap ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-health-green" />
                      )}
                      <div className="text-right">
                        <div className="text-xs" style={{ color: availabilityColor }}>
                          {req.currentCount || 0} of {req.required_count} available
                        </div>
                        <div className="w-20 h-1.5 rounded-full mt-1 bg-background">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${availabilityPercent}%`,
                              background: availabilityColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Edit/Delete buttons */}
                    {isEditable && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditDialog(req)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteRequirementMutation.mutate(req.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-gold-border">
            <span className="text-xs text-muted-foreground">
              {requirements.length} skill{requirements.length !== 1 ? 's' : ''} required
              {gapsCount > 0 && (
                <span className="text-destructive">, {gapsCount} gap{gapsCount !== 1 ? 's' : ''} identified</span>
              )}
            </span>
            <Link
              to="/enterprise/skills-inventory?view=gap-analysis"
              className="flex items-center gap-1 text-xs text-brand-gold hover:underline"
            >
              View Gap Analysis
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={addDialogOpen || !!editingRequirement} 
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingRequirement(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border border-brand-gold-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingRequirement ? 'Edit Skill Requirement' : 'Add Skill Requirement'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Skill Selection (only for new) */}
            {!editingRequirement && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider mb-2 block text-muted-foreground">
                  Skill
                </label>
                <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                  <SelectTrigger className="w-full bg-brand-dark border border-brand-gold-border text-foreground">
                    <SelectValue placeholder="Select a skill" />
                  </SelectTrigger>
                  <SelectContent className="bg-brand-dark border border-brand-gold-border">
                    {availableSkills.map((skill) => (
                      <SelectItem 
                        key={skill.id} 
                        value={skill.id}
                        className="text-foreground focus:bg-brand-gold/10"
                      >
                        {skill.name} ({skill.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Proficiency Level */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block text-muted-foreground">
                Required Proficiency
              </label>
              <Select 
                value={selectedProficiency} 
                onValueChange={(value: ProficiencyLevel) => setSelectedProficiency(value)}
              >
                <SelectTrigger className="w-full bg-brand-dark border border-brand-gold-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-brand-dark border border-brand-gold-border">
                  {PROFICIENCY_LEVELS.map((level) => (
                    <SelectItem 
                      key={level} 
                      value={level}
                      className="text-foreground focus:bg-brand-gold/10"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: PROFICIENCY_COLORS[level] }}
                        />
                        {PROFICIENCY_LABELS[level]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required Count */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block text-muted-foreground">
                Required Count
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={requiredCount}
                onChange={(e) => setRequiredCount(parseInt(e.target.value) || 1)}
                className="w-full h-10 px-3 rounded-md bg-brand-dark border border-brand-gold-border text-foreground focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditingRequirement(null);
                resetForm();
              }}
              className="border-brand-gold-border text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={editingRequirement ? handleUpdateRequirement : handleAddRequirement}
              disabled={!editingRequirement && !selectedSkillId}
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
            >
              {editingRequirement ? 'Update' : 'Add'} Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

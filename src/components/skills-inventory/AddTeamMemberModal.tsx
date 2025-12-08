import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

// NEW: Standard skills list for quick selection
export const STANDARD_SKILLS = [
  'Business Analyst',
  'FE Developer',
  'BE Developer',
  'DevOps',
  'Technical PO',
  'Product Owner',
  'BE Lead',
  'FE Lead',
] as const;

export const STANDARD_ROLES = [
  'Business Analyst',
  'Frontend Developer',
  'Backend Developer',
  'DevOps Engineer',
  'Technical Product Owner',
  'Product Owner',
  'Backend Lead',
  'Frontend Lead',
  'Full Stack Developer',
  'Data Engineer',
  'QA Engineer',
  'Scrum Master',
] as const;

const proficiencyOptions = [
  { level: 'Beginner', label: 'Beginner', color: 'hsl(var(--destructive))' },
  { level: 'Intermediate', label: 'Intermediate', color: 'hsl(var(--warning))' },
  { level: 'Advanced', label: 'Advanced', color: 'hsl(var(--info))' },
  { level: 'Expert', label: 'Expert', color: 'hsl(var(--health-green))' },
];

interface SkillEntry {
  id: string;
  skill: string;
  proficiency: string;
}

interface AddTeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { 
    name: string;
    role: string;
    project: string;
    skills: SkillEntry[];
    notes: string;
  }) => void;
  projects: string[];
}

export function AddTeamMemberModal({ open, onClose, onSave, projects }: AddTeamMemberModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    project: '',
    notes: ''
  });
  const [skills, setSkills] = useState<SkillEntry[]>([
    { id: '1', skill: '', proficiency: 'Intermediate' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState('');

  const handleAddSkill = () => {
    setSkills([...skills, { id: Date.now().toString(), skill: '', proficiency: 'Intermediate' }]);
  };

  const handleRemoveSkill = (id: string) => {
    if (skills.length > 1) {
      setSkills(skills.filter(s => s.id !== id));
    }
  };

  const handleSkillChange = (id: string, field: 'skill' | 'proficiency', value: string) => {
    setSkills(skills.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleQuickAddSkill = (skillName: string) => {
    // Check if skill already exists
    if (skills.some(s => s.skill === skillName)) {
      toast.error(`${skillName} is already added`);
      return;
    }
    // Find empty skill slot or add new one
    const emptySlot = skills.find(s => !s.skill);
    if (emptySlot) {
      handleSkillChange(emptySlot.id, 'skill', skillName);
    } else {
      setSkills([...skills, { id: Date.now().toString(), skill: skillName, proficiency: 'Intermediate' }]);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role) {
      toast.error('Please fill in name and role');
      return;
    }
    
    const validSkills = skills.filter(s => s.skill);
    if (validSkills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }
    
    setIsSaving(true);
    try {
      onSave({
        name: formData.name,
        role: formData.role,
        project: formData.project || 'Unassigned',
        skills: validSkills,
        notes: formData.notes
      });
      toast.success('Team member added successfully');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', role: '', project: '', notes: '' });
    setSkills([{ id: '1', skill: '', proficiency: 'Intermediate' }]);
    setCustomSkillInput('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                className="bg-white border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-white border-border">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {STANDARD_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Assignment */}
          <div className="space-y-2">
            <Label className="text-foreground">Project</Label>
            <Select
              value={formData.project}
              onValueChange={(value) => setFormData({ ...formData, project: value })}
            >
              <SelectTrigger className="bg-white border-border">
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {projects.filter(p => p !== 'All Projects').map((project) => (
                  <SelectItem key={project} value={project}>{project}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skills Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Skills *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSkill}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Skill
              </Button>
            </div>

            {/* Quick Add Skills */}
            <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <span className="text-xs text-muted-foreground mr-1">Quick add:</span>
              {STANDARD_SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleQuickAddSkill(skill)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    skills.some(s => s.skill === skill)
                      ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                      : 'bg-white border-neutral-300 text-neutral-600 hover:border-brand-gold hover:text-brand-gold'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            {/* Skill Entries */}
            <div className="space-y-2">
              {skills.map((skillEntry, index) => (
                <div key={skillEntry.id} className="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
                  <div className="flex-1">
                    <Select
                      value={skillEntry.skill}
                      onValueChange={(value) => handleSkillChange(skillEntry.id, 'skill', value)}
                    >
                      <SelectTrigger className="bg-white border-border h-9">
                        <SelectValue placeholder="Select skill" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {STANDARD_SKILLS.map((skill) => (
                          <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-36">
                    <Select
                      value={skillEntry.proficiency}
                      onValueChange={(value) => handleSkillChange(skillEntry.id, 'proficiency', value)}
                    >
                      <SelectTrigger className="bg-white border-border h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {proficiencyOptions.map(({ level, label }) => (
                          <SelectItem key={level} value={level}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {skills.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSkill(skillEntry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-foreground">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
              className="bg-white border-border resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.name || !formData.role}
              className="flex-1 bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              {isSaving ? 'Adding...' : 'Add Team Member'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

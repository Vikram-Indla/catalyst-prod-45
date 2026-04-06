import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface SkillData {
  id: number;
  name: string;
  role: string;
  project: string;
  skill: string;
  proficiency: string;
  coverage: number;
  lastUpdated: string;
}

interface EditSkillModalProps {
  open: boolean;
  onClose: () => void;
  skill: SkillData | null;
  onDelete: () => void;
  onSave: (id: number, data: { skill: string; proficiency: string; notes: string }) => void;
}

const proficiencyOptions = [
  { level: 'Beginner', label: 'Beginner', color: 'var(--sem-danger)' },
  { level: 'Intermediate', label: 'Intermediate', color: 'var(--sem-warning)' },
  { level: 'Advanced', label: 'Advanced', color: 'var(--sem-info)' },
  { level: 'Expert', label: 'Expert', color: 'var(--health-green)' },
];

export function EditSkillModal({ open, onClose, skill, onDelete, onSave }: EditSkillModalProps) {
  const [formData, setFormData] = useState({
    skillName: '',
    proficiency: 'Intermediate',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (skill) {
      setFormData({
        skillName: skill.skill,
        proficiency: skill.proficiency,
        notes: ''
      });
    }
  }, [skill]);

  const handleSave = async () => {
    if (!skill || !formData.skillName) return;
    setIsSaving(true);
    try {
      onSave(skill.id, {
        skill: formData.skillName,
        proficiency: formData.proficiency,
        notes: formData.notes
      });
      toast.success('Skill assessment updated successfully');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!skill) return null;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#1A1A1A]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Skill Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Team Member - Read Only */}
          <div className="space-y-2">
            <Label className="text-foreground">Team Member</Label>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-[#1A1A1A] rounded-md border border-border dark:border-[#2E2E2E]">
              <div className="w-7 h-7 rounded bg-brand-primary flex items-center justify-center text-[10px] text-white font-medium">
                {getInitials(skill.name)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{skill.name}</span>
                <span className="text-sm text-muted-foreground">• {skill.role}</span>
              </div>
            </div>
          </div>

          {/* Skill Name */}
          <div className="space-y-2">
            <Label className="text-foreground">Skill Name</Label>
            <Input
              value={formData.skillName}
              onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
              className="bg-white dark:bg-[#1A1A1A] border-border dark:border-[#2E2E2E]"
            />
          </div>

          {/* Proficiency Level */}
          <div className="space-y-2">
            <Label className="text-foreground">Proficiency Level</Label>
            <div className="grid grid-cols-4 gap-2">
              {proficiencyOptions.map(({ level, label, color }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, proficiency: level })}
                  className={`p-2 rounded-md border transition-all ${
                    formData.proficiency === level
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-border hover:border-brand-primary/50 bg-white dark:bg-[#1A1A1A]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-white text-xs font-medium">
                      {level === 'Beginner' ? '1' : level === 'Intermediate' ? '2' : level === 'Advanced' ? '3' : '4'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground block text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-foreground">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
              className="bg-white dark:bg-[#1A1A1A] border-border dark:border-[#2E2E2E] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              variant="ghost"
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.skillName}
                className="bg-brand-primary text-white hover:bg-brand-primary-hover"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

interface AddSkillModalProps {
  open: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  onSave: (data: { 
    teamMemberId: number; 
    teamMemberName: string;
    teamMemberRole: string;
    skill: string; 
    proficiency: string; 
    notes: string 
  }) => void;
}

const proficiencyOptions = [
  { level: 'Beginner', label: 'Beginner', color: 'hsl(var(--destructive))' },
  { level: 'Intermediate', label: 'Intermediate', color: 'hsl(var(--warning))' },
  { level: 'Advanced', label: 'Advanced', color: 'hsl(var(--info))' },
  { level: 'Expert', label: 'Expert', color: 'hsl(var(--health-green))' },
];

export function AddSkillModal({ open, onClose, teamMembers, onSave }: AddSkillModalProps) {
  const [formData, setFormData] = useState({
    teamMemberId: '',
    skillName: '',
    proficiency: 'Intermediate',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.teamMemberId || !formData.skillName) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSaving(true);
    try {
      const member = teamMembers.find(m => m.id.toString() === formData.teamMemberId);
      if (!member) return;
      
      onSave({
        teamMemberId: member.id,
        teamMemberName: member.name,
        teamMemberRole: member.role,
        skill: formData.skillName,
        proficiency: formData.proficiency,
        notes: formData.notes
      });
      toast.success('Skill assessment added successfully');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      teamMemberId: '',
      skillName: '',
      proficiency: 'Intermediate',
      notes: ''
    });
    onClose();
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Skill Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label className="text-foreground">Team Member</Label>
            <Select
              value={formData.teamMemberId}
              onValueChange={(value) => setFormData({ ...formData, teamMemberId: value })}
            >
              <SelectTrigger className="bg-white border-border">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-brand-gold flex items-center justify-center text-[9px] text-white font-medium">
                        {getInitials(member.name)}
                      </div>
                      <span>{member.name}</span>
                      <span className="text-muted-foreground">• {member.role}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skill Name */}
          <div className="space-y-2">
            <Label className="text-foreground">Skill Name</Label>
            <Input
              value={formData.skillName}
              onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
              placeholder="e.g., React, Python, AWS..."
              className="bg-white border-border"
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
                      ? 'border-brand-gold bg-brand-gold/10'
                      : 'border-border hover:border-brand-gold/50 bg-white'
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
              className="bg-white border-border resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.teamMemberId || !formData.skillName}
              className="flex-1 bg-brand-gold text-white hover:bg-brand-gold-hover"
            >
              {isSaving ? 'Adding...' : 'Add Skill'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

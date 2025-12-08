import { useState } from 'react';
import { Target, X } from 'lucide-react';
import { toast } from 'sonner';
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

  const selectedMember = teamMembers.find(m => m.id.toString() === formData.teamMemberId);

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

  if (!open) return null;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg w-full max-w-lg border border-brand-gold-border shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-brand-gold-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold to-brand-gold-dark flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Add Skill Assessment</h2>
              <p className="text-sm text-muted-foreground">Assign a new skill to a team member</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Team Member Selection */}
          <div>
            <label className="text-[13px] font-medium text-brand-gold mb-2 block">Team Member *</label>
            <Select
              value={formData.teamMemberId}
              onValueChange={(value) => setFormData({ ...formData, teamMemberId: value })}
            >
              <SelectTrigger className="w-full border-brand-gold-border focus:ring-brand-gold">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-gold to-brand-gold-dark flex items-center justify-center text-[10px] text-white font-semibold">
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

          {/* Selected Member Preview */}
          {selectedMember && (
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 rounded-lg border border-brand-gold-border">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-gold-dark flex items-center justify-center text-[11px] text-white font-semibold">
                {getInitials(selectedMember.name)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">{selectedMember.name}</span>
                <span className="text-[13px] text-muted-foreground">• {selectedMember.role}</span>
              </div>
            </div>
          )}

          {/* Skill Name */}
          <div>
            <label className="text-[13px] font-medium text-brand-gold mb-2 block">Skill Name *</label>
            <input
              type="text"
              value={formData.skillName}
              onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
              placeholder="e.g., React, Python, AWS..."
              className="w-full px-4 py-3 bg-background rounded-lg border border-brand-gold-border text-[14px] text-foreground placeholder-muted-foreground focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all"
            />
          </div>

          {/* Proficiency Level - Visual Selector */}
          <div>
            <label className="text-[13px] font-medium text-brand-gold mb-3 block">Proficiency Level *</label>
            <div className="grid grid-cols-4 gap-3">
              {proficiencyOptions.map(({ level, label, color }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, proficiency: level })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.proficiency === level
                      ? 'border-brand-gold bg-brand-gold/10'
                      : 'border-brand-gold-border hover:border-brand-gold/50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-white text-[13px] font-semibold">
                      {level === 'Beginner' ? '1' : level === 'Intermediate' ? '2' : level === 'Advanced' ? '3' : '4'}
                    </span>
                  </div>
                  <span className="text-[13px] text-muted-foreground block text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[13px] font-medium text-brand-gold mb-2 block">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes about this skill assessment..."
              className="w-full px-4 py-3 bg-background rounded-lg border border-brand-gold-border text-[14px] text-foreground placeholder-muted-foreground focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-gold-border flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-brand-gold-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.teamMemberId || !formData.skillName}
            className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-hover rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Adding...' : 'Add Skill'}
          </button>
        </div>
      </div>
    </div>
  );
}

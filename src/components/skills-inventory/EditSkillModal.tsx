import { useState, useEffect } from 'react';
import { Target, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

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
  { level: 'Beginner', label: 'Beginner', color: 'hsl(var(--destructive))' },
  { level: 'Intermediate', label: 'Intermediate', color: 'hsl(var(--warning))' },
  { level: 'Advanced', label: 'Advanced', color: 'hsl(var(--info))' },
  { level: 'Expert', label: 'Expert', color: 'hsl(var(--health-green))' },
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

  if (!open || !skill) return null;

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
              <h2 className="text-lg font-semibold text-foreground">Edit Skill Assessment</h2>
              <p className="text-sm text-muted-foreground">{skill.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Team Member - Read Only */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">Team Member</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 rounded-lg border border-brand-gold-border">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-gold-dark flex items-center justify-center text-[11px] text-white font-semibold">
                {getInitials(skill.name)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-text-primary">{skill.name}</span>
                <span className="text-[13px] text-text-secondary">• {skill.role}</span>
              </div>
            </div>
          </div>

          {/* Skill Name */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">Skill Name *</label>
            <input
              type="text"
              value={formData.skillName}
              onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
              className="w-full px-4 py-3 bg-background rounded-lg border border-brand-gold-border text-[14px] text-text-primary focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all"
            />
          </div>

          {/* Proficiency Level - Visual Selector */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-3 block">Proficiency Level *</label>
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
                  <span className="text-[13px] text-text-secondary block text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes about this skill assessment..."
              className="w-full px-4 py-3 bg-background rounded-lg border border-brand-gold-border text-[14px] text-text-primary placeholder-text-tertiary focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-gold-border flex justify-between">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-brand-gold-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.skillName}
              className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-hover rounded-lg text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

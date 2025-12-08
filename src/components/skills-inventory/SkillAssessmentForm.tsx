import React, { useState } from 'react';
import { Target, X, ChevronDown } from 'lucide-react';
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES, SkillProficiencyLevel, SkillCategory } from '@/types/skills';

interface SkillAssessmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SkillAssessmentData) => void;
}

export interface SkillAssessmentData {
  teamMemberId: string;
  skillName: string;
  category: SkillCategory;
  proficiencyLevel: SkillProficiencyLevel;
  yearsExperience?: number;
  certification?: string;
  notes?: string;
}

interface FormErrors {
  teamMemberId?: string;
  skillName?: string;
  category?: string;
  proficiencyLevel?: string;
}

const teamMembers = [
  { id: '1', name: 'Sarah Chen', role: 'Lead Engineer' },
  { id: '2', name: 'Mohammed Al-Rashid', role: 'Senior Developer' },
  { id: '3', name: 'Alex Kim', role: 'DevOps Engineer' },
  { id: '4', name: 'Fatima Hassan', role: 'Full Stack Dev' },
  { id: '5', name: 'James Wilson', role: 'Security Engineer' },
  { id: '6', name: 'Priya Patel', role: 'Data Engineer' },
];

const proficiencyOptions: { key: SkillProficiencyLevel; value: number }[] = [
  { key: 'awareness', value: 1 },
  { key: 'beginner', value: 2 },
  { key: 'intermediate', value: 3 },
  { key: 'advanced', value: 4 },
  { key: 'expert', value: 5 },
];

const categoryOptions = Object.entries(SKILL_CATEGORIES).map(([key, value]) => ({
  key: key as SkillCategory,
  label: value.label,
}));

export const SkillAssessmentForm: React.FC<SkillAssessmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<SkillAssessmentData>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [teamMemberDropdownOpen, setTeamMemberDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.teamMemberId) {
      newErrors.teamMemberId = 'Team member is required';
    }
    if (!formData.skillName?.trim()) {
      newErrors.skillName = 'Skill name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.proficiencyLevel) {
      newErrors.proficiencyLevel = 'Proficiency level is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData as SkillAssessmentData);
      setFormData({});
      setErrors({});
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onClose();
  };

  const selectedTeamMember = teamMembers.find((m) => m.id === formData.teamMemberId);
  const selectedCategory = categoryOptions.find((c) => c.key === formData.category);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[#242938] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(198,156,109,0.15)]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#c69c6d] rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-[#1a1f2e]" />
            </div>
            <h2 className="text-xl font-semibold text-[#f5f5f7]">
              Add New Skill Assessment
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[rgba(198,156,109,0.1)] transition-colors"
          >
            <X className="w-5 h-5 text-[#9ca3af]" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Team Member */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Team Member <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTeamMemberDropdownOpen(!teamMemberDropdownOpen)}
                className={`w-full px-4 py-3 bg-[#1a1f2e] border rounded-lg text-left flex items-center justify-between transition-colors ${
                  errors.teamMemberId
                    ? 'border-red-500'
                    : 'border-[rgba(198,156,109,0.15)] focus:border-[#c69c6d]'
                }`}
              >
                {selectedTeamMember ? (
                  <span className="text-[#f5f5f7]">
                    {selectedTeamMember.name}{' '}
                    <span className="text-[#6b7280]">• {selectedTeamMember.role}</span>
                  </span>
                ) : (
                  <span className="text-[#6b7280]">Select team member...</span>
                )}
                <ChevronDown className="w-4 h-4 text-[#6b7280]" />
              </button>
              {teamMemberDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-[rgba(198,156,109,0.15)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, teamMemberId: member.id });
                        setTeamMemberDropdownOpen(false);
                        setErrors({ ...errors, teamMemberId: undefined });
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[rgba(198,156,109,0.1)] transition-colors"
                    >
                      <span className="text-[#f5f5f7]">{member.name}</span>
                      <span className="text-[#6b7280] ml-2">• {member.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.teamMemberId && (
              <p className="mt-1 text-xs text-red-500">{errors.teamMemberId}</p>
            )}
          </div>

          {/* Skill Name */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Skill Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.skillName || ''}
              onChange={(e) => {
                setFormData({ ...formData, skillName: e.target.value });
                setErrors({ ...errors, skillName: undefined });
              }}
              placeholder="e.g., AWS Lambda, Python, Project Management"
              className={`w-full px-4 py-3 bg-[#1a1f2e] border rounded-lg text-[#f5f5f7] placeholder-[#6b7280] outline-none transition-colors ${
                errors.skillName
                  ? 'border-red-500'
                  : 'border-[rgba(198,156,109,0.15)] focus:border-[#c69c6d]'
              }`}
            />
            {errors.skillName && (
              <p className="mt-1 text-xs text-red-500">{errors.skillName}</p>
            )}
          </div>

          {/* Skill Category */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Skill Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className={`w-full px-4 py-3 bg-[#1a1f2e] border rounded-lg text-left flex items-center justify-between transition-colors ${
                  errors.category
                    ? 'border-red-500'
                    : 'border-[rgba(198,156,109,0.15)] focus:border-[#c69c6d]'
                }`}
              >
                {selectedCategory ? (
                  <span className="text-[#f5f5f7]">{selectedCategory.label}</span>
                ) : (
                  <span className="text-[#6b7280]">Select category...</span>
                )}
                <ChevronDown className="w-4 h-4 text-[#6b7280]" />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1f2e] border border-[rgba(198,156,109,0.15)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {categoryOptions.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: category.key });
                        setCategoryDropdownOpen(false);
                        setErrors({ ...errors, category: undefined });
                      }}
                      className="w-full px-4 py-3 text-left text-[#f5f5f7] hover:bg-[rgba(198,156,109,0.1)] transition-colors"
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Proficiency Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {proficiencyOptions.map((option) => {
                const isSelected = formData.proficiencyLevel === option.key;
                const levelData = PROFICIENCY_LEVELS[option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, proficiencyLevel: option.key });
                      setErrors({ ...errors, proficiencyLevel: undefined });
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[#c69c6d] bg-[rgba(198,156,109,0.1)]'
                        : 'border-[rgba(198,156,109,0.15)] bg-[#1a1f2e] hover:border-[rgba(198,156,109,0.3)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#f5f5f7]">
                      {option.value}
                    </div>
                    <div className="text-[10px] text-[#6b7280] mt-1">
                      {levelData.label}
                    </div>
                  </button>
                );
              })}
            </div>
            {formData.proficiencyLevel && (
              <p className="mt-2 text-xs text-[#9ca3af]">
                {PROFICIENCY_LEVELS[formData.proficiencyLevel].description}
              </p>
            )}
            {errors.proficiencyLevel && (
              <p className="mt-1 text-xs text-red-500">{errors.proficiencyLevel}</p>
            )}
          </div>

          {/* Years of Experience */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Years of Experience
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={formData.yearsExperience || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearsExperience: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="e.g., 3"
              className="w-full px-4 py-3 bg-[#1a1f2e] border border-[rgba(198,156,109,0.15)] rounded-lg text-[#f5f5f7] placeholder-[#6b7280] outline-none focus:border-[#c69c6d] transition-colors"
            />
          </div>

          {/* Related Certification */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Related Certification
            </label>
            <input
              type="text"
              value={formData.certification || ''}
              onChange={(e) =>
                setFormData({ ...formData, certification: e.target.value })
              }
              placeholder="e.g., AWS Solutions Architect Professional"
              className="w-full px-4 py-3 bg-[#1a1f2e] border border-[rgba(198,156,109,0.15)] rounded-lg text-[#f5f5f7] placeholder-[#6b7280] outline-none focus:border-[#c69c6d] transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#9ca3af] mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add any additional context..."
              className="w-full px-4 py-3 bg-[#1a1f2e] border border-[rgba(198,156,109,0.15)] rounded-lg text-[#f5f5f7] placeholder-[#6b7280] outline-none focus:border-[#c69c6d] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-[rgba(198,156,109,0.15)] mt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-[rgba(198,156,109,0.3)] text-[#9ca3af] rounded-lg font-medium hover:bg-[#242938] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-[#c69c6d] text-[#1a1f2e] rounded-lg font-medium hover:bg-[#d4b08c] transition-colors"
          >
            Save Skill Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillAssessmentForm;

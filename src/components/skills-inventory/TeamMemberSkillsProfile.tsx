import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Award, 
  ExternalLink, 
  Edit2, 
  Code, 
  Cloud, 
  BarChart3, 
  Shield, 
  Users, 
  Heart, 
  BookOpen, 
  GitBranch,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { PROFICIENCY_LEVELS, SKILL_CATEGORIES, SkillProficiencyLevel, SkillCategory } from '@/types/skills';
import { SkillAssessmentForm } from './SkillAssessmentForm';

interface TeamMemberSkillsProfileProps {
  memberId?: string;
  onBack: () => void;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  expiryDate: string;
  credentialUrl: string;
}

interface MemberSkill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel: SkillProficiencyLevel;
  yearsExperience: number;
  emoji: string;
}

const CategoryIcons: Record<SkillCategory, React.ElementType> = {
  technical: Code,
  cloud_infrastructure: Cloud,
  data_analytics: BarChart3,
  security: Shield,
  leadership: Users,
  soft_skills: Heart,
  domain_knowledge: BookOpen,
  methodology: GitBranch,
};

// Sample data for Ahmad Khalid
const memberData = {
  id: '1',
  name: 'Ahmad Khalid',
  role: 'Senior Cloud Architect',
  email: 'ahmad.khalid@company.com',
  initials: 'AK',
};

const certifications: Certification[] = [
  {
    id: '1',
    name: 'AWS Solutions Architect Professional',
    issuer: 'Amazon Web Services',
    expiryDate: '2025-08-15',
    credentialUrl: 'https://aws.amazon.com/verification',
  },
  {
    id: '2',
    name: 'Google Cloud Professional Architect',
    issuer: 'Google Cloud',
    expiryDate: '2025-01-20',
    credentialUrl: 'https://cloud.google.com/certification',
  },
  {
    id: '3',
    name: 'Certified Kubernetes Administrator',
    issuer: 'CNCF',
    expiryDate: '2024-11-30',
    credentialUrl: 'https://www.cncf.io/certification',
  },
];

const memberSkills: MemberSkill[] = [
  { id: '1', name: 'AWS', category: 'cloud_infrastructure', proficiencyLevel: 'expert', yearsExperience: 6, emoji: '☁️' },
  { id: '2', name: 'Azure', category: 'cloud_infrastructure', proficiencyLevel: 'advanced', yearsExperience: 4, emoji: '🔷' },
  { id: '3', name: 'Google Cloud Platform', category: 'cloud_infrastructure', proficiencyLevel: 'advanced', yearsExperience: 3, emoji: '🌐' },
  { id: '4', name: 'Kubernetes', category: 'cloud_infrastructure', proficiencyLevel: 'expert', yearsExperience: 4, emoji: '⚙️' },
  { id: '5', name: 'Docker', category: 'cloud_infrastructure', proficiencyLevel: 'expert', yearsExperience: 5, emoji: '🐳' },
  { id: '6', name: 'Terraform', category: 'cloud_infrastructure', proficiencyLevel: 'advanced', yearsExperience: 3, emoji: '🏗️' },
  { id: '7', name: 'Python', category: 'technical', proficiencyLevel: 'advanced', yearsExperience: 5, emoji: '🐍' },
  { id: '8', name: 'TypeScript', category: 'technical', proficiencyLevel: 'intermediate', yearsExperience: 2, emoji: '📘' },
  { id: '9', name: 'PostgreSQL', category: 'data_analytics', proficiencyLevel: 'advanced', yearsExperience: 4, emoji: '🐘' },
  { id: '10', name: 'Cybersecurity', category: 'security', proficiencyLevel: 'intermediate', yearsExperience: 2, emoji: '🔒' },
  { id: '11', name: 'Agile/Scrum', category: 'methodology', proficiencyLevel: 'advanced', yearsExperience: 5, emoji: '🔄' },
  { id: '12', name: 'Team Leadership', category: 'leadership', proficiencyLevel: 'intermediate', yearsExperience: 3, emoji: '👥' },
];

const getExpiryStatus = (expiryDate: string): { label: string; color: string; bgColor: string } => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return { label: 'Expired', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
  } else if (daysUntilExpiry <= 30) {
    return { label: 'Expiring Soon', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' };
  }
  return { label: 'Valid', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' };
};

const StarRating: React.FC<{ level: SkillProficiencyLevel }> = ({ level }) => {
  const value = PROFICIENCY_LEVELS[level].value;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= value ? 'text-[#c69c6d] fill-[#c69c6d]' : 'text-[#3d4454]'}`}
        />
      ))}
    </div>
  );
};

export const TeamMemberSkillsProfile: React.FC<TeamMemberSkillsProfileProps> = ({
  memberId,
  onBack,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<SkillCategory>>(
    new Set(Object.keys(SKILL_CATEGORIES) as SkillCategory[])
  );
  const [editingSkill, setEditingSkill] = useState<MemberSkill | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const toggleCategory = (category: SkillCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const skillsByCategory = memberSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<SkillCategory, MemberSkill[]>);

  const totalSkills = memberSkills.length;
  const expertSkills = memberSkills.filter((s) => s.proficiencyLevel === 'expert').length;

  const handleEditSkill = (skill: MemberSkill) => {
    setEditingSkill(skill);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0f1219]">
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-[320px] min-h-screen bg-[#1a1f2e] border-r border-[rgba(198,156,109,0.15)] p-6">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#9ca3af] hover:text-[#f5f5f7] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Inventory</span>
          </button>

          {/* Profile Card */}
          <div className="bg-[#2d3344] rounded-xl p-6 border border-[rgba(198,156,109,0.15)]">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#c69c6d] to-[#a67c4e] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#1a1f2e]">
                {memberData.initials}
              </span>
            </div>
            
            {/* Info */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[#f5f5f7]">{memberData.name}</h2>
              <p className="text-sm text-[#9ca3af] mt-1">{memberData.role}</p>
              <p className="text-xs text-[#6b7280] mt-1">{memberData.email}</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-6">
              <div className="bg-[#1a1f2e] rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-[#f5f5f7]">{totalSkills}</div>
                <div className="text-[10px] text-[#6b7280]">Total Skills</div>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg font-semibold text-[#f5f5f7]">{expertSkills}</span>
                  <Star className="w-3 h-3 text-[#c69c6d] fill-[#c69c6d]" />
                </div>
                <div className="text-[10px] text-[#6b7280]">Expert Level</div>
              </div>
              <div className="bg-[#1a1f2e] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg font-semibold text-[#f5f5f7]">{certifications.length}</span>
                  <Award className="w-3 h-3 text-[#c69c6d]" />
                </div>
                <div className="text-[10px] text-[#6b7280]">Certifications</div>
              </div>
            </div>
          </div>

          {/* Certifications Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-[#c69c6d]" />
              <h3 className="text-sm font-semibold text-[#f5f5f7]">Certifications</h3>
            </div>
            
            <div className="space-y-3">
              {certifications.map((cert) => {
                const status = getExpiryStatus(cert.expiryDate);
                return (
                  <div
                    key={cert.id}
                    className="bg-[#2d3344] rounded-xl p-4 border border-[rgba(198,156,109,0.15)]"
                  >
                    <h4 className="font-medium text-[#f5f5f7] text-sm">{cert.name}</h4>
                    <p className="text-xs text-[#6b7280] mt-1">{cert.issuer}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ color: status.color, backgroundColor: status.bgColor }}
                      >
                        {status.label}
                      </span>
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#c69c6d] hover:text-[#d4b08c] transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-semibold text-[#f5f5f7] mb-6">Skills Profile</h1>

          {/* Skills by Category */}
          <div className="space-y-4">
            {(Object.entries(skillsByCategory) as [SkillCategory, MemberSkill[]][]).map(
              ([category, skills]) => {
                const CategoryIcon = CategoryIcons[category];
                const isExpanded = expandedCategories.has(category);
                const categoryInfo = SKILL_CATEGORIES[category];

                return (
                  <div
                    key={category}
                    className="bg-[#1a1f2e] rounded-xl border border-[rgba(198,156,109,0.15)] overflow-hidden"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[rgba(198,156,109,0.05)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-5 h-5 text-[#c69c6d]" />
                        <span className="font-medium text-[#f5f5f7]">
                          {categoryInfo.label}
                        </span>
                        <span className="px-2 py-0.5 bg-[rgba(198,156,109,0.15)] text-[#c69c6d] text-xs rounded-full">
                          {skills.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[#6b7280]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[#6b7280]" />
                      )}
                    </button>

                    {/* Skills Grid */}
                    {isExpanded && (
                      <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {skills.map((skill) => {
                          const levelData = PROFICIENCY_LEVELS[skill.proficiencyLevel];
                          return (
                            <div
                              key={skill.id}
                              className="bg-[#2d3344] rounded-xl p-4 border border-[rgba(198,156,109,0.15)]"
                            >
                              {/* Row 1: Emoji + Name + Years */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{skill.emoji}</span>
                                  <span className="font-medium text-[#f5f5f7]">
                                    {skill.name}
                                  </span>
                                </div>
                                <span className="text-xs text-[#6b7280] bg-[#1a1f2e] px-2 py-1 rounded">
                                  {skill.yearsExperience} yrs
                                </span>
                              </div>

                              {/* Row 2: Star Rating */}
                              <div className="mb-3">
                                <StarRating level={skill.proficiencyLevel} />
                              </div>

                              {/* Row 3: Badge + Edit */}
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-xs px-2 py-1 rounded font-medium"
                                  style={{
                                    color: levelData.color,
                                    backgroundColor: levelData.bgColor,
                                  }}
                                >
                                  {levelData.label}
                                </span>
                                <button
                                  onClick={() => handleEditSkill(skill)}
                                  className="p-1.5 rounded-lg hover:bg-[rgba(198,156,109,0.1)] transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 text-[#6b7280] hover:text-[#c69c6d]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      <SkillAssessmentForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSkill(null);
        }}
        onSubmit={(data) => {
          console.log('Updated skill:', data);
          setIsFormOpen(false);
          setEditingSkill(null);
        }}
      />
    </div>
  );
};

export default TeamMemberSkillsProfile;

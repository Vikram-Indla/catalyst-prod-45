// src/pages/enterprise/SkillsInventoryPage.tsx
// Skills Inventory page for Enterprise Room

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Target, 
  Users, 
  BarChart3, 
  AlertTriangle, 
  Filter, 
  Download, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  X
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type SkillProficiencyLevel = 'awareness' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
type SkillCategory = 'technical' | 'cloud_infrastructure' | 'data_analytics' | 'security' | 'leadership' | 'soft_skills' | 'domain_knowledge' | 'methodology';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
}

interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

interface TeamMemberSkill {
  id: string;
  team_member_id: string;
  skill_id: string;
  proficiency_level: SkillProficiencyLevel;
  years_experience?: number;
  is_primary_skill: boolean;
  skill?: Skill;
  team_member?: TeamMember;
}

interface SkillInventoryRow {
  team_member: TeamMember;
  primary_skill?: TeamMemberSkill;
  total_skills: number;
  expert_skills: number;
  certifications_count: number;
  coverage_percentage: number;
  last_updated: string;
}

interface SkillsInventoryStats {
  total_skills_tracked: number;
  total_team_members: number;
  average_coverage: number;
  critical_gaps: number;
}

interface Filters {
  program_id?: string;
  team_id?: string;
  category?: SkillCategory;
  search_query?: string;
}

// ============================================
// CONSTANTS
// ============================================

const PROFICIENCY_LEVELS: Record<SkillProficiencyLevel, {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}> = {
  awareness: { label: 'Awareness', value: 1, color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
  beginner: { label: 'Beginner', value: 2, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  intermediate: { label: 'Intermediate', value: 3, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  advanced: { label: 'Advanced', value: 4, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  expert: { label: 'Expert', value: 5, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' }
};

const SKILL_CATEGORIES: Record<SkillCategory, { label: string }> = {
  technical: { label: 'Technical' },
  cloud_infrastructure: { label: 'Cloud & Infrastructure' },
  data_analytics: { label: 'Data & Analytics' },
  security: { label: 'Security' },
  leadership: { label: 'Leadership' },
  soft_skills: { label: 'Soft Skills' },
  domain_knowledge: { label: 'Domain Knowledge' },
  methodology: { label: 'Methodology' }
};

// ============================================
// SAMPLE DATA
// ============================================

const SAMPLE_STATS: SkillsInventoryStats = {
  total_skills_tracked: 247,
  total_team_members: 68,
  average_coverage: 78,
  critical_gaps: 5
};

const SAMPLE_PROGRAMS = [
  { id: '1', name: 'Digital Transformation' },
  { id: '2', name: 'Investment Portal' },
  { id: '3', name: 'Data Analytics Platform' }
];

const SAMPLE_TEAMS = [
  { id: '1', name: 'Platform Engineering' },
  { id: '2', name: 'Product Development' },
  { id: '3', name: 'Data Science' }
];

const SAMPLE_DATA: SkillInventoryRow[] = [
  {
    team_member: { id: '1', name: 'Ahmad Khalid', email: 'ahmad@misa.gov.sa', role: 'Senior Cloud Architect', is_active: true },
    primary_skill: { id: 's1', team_member_id: '1', skill_id: 'sk1', proficiency_level: 'expert', is_primary_skill: true, skill: { id: 'sk1', name: 'AWS', category: 'cloud_infrastructure' } },
    total_skills: 12,
    expert_skills: 4,
    certifications_count: 3,
    coverage_percentage: 92,
    last_updated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    team_member: { id: '2', name: 'Fatima Al-Rashid', email: 'fatima@misa.gov.sa', role: 'Lead Developer', is_active: true },
    primary_skill: { id: 's2', team_member_id: '2', skill_id: 'sk2', proficiency_level: 'expert', is_primary_skill: true, skill: { id: 'sk2', name: 'React', category: 'technical' } },
    total_skills: 15,
    expert_skills: 3,
    certifications_count: 2,
    coverage_percentage: 85,
    last_updated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    team_member: { id: '3', name: 'Omar Hassan', email: 'omar@misa.gov.sa', role: 'Data Engineer', is_active: true },
    primary_skill: { id: 's3', team_member_id: '3', skill_id: 'sk3', proficiency_level: 'advanced', is_primary_skill: true, skill: { id: 'sk3', name: 'Python', category: 'technical' } },
    total_skills: 10,
    expert_skills: 2,
    certifications_count: 4,
    coverage_percentage: 72,
    last_updated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    team_member: { id: '4', name: 'Sara Mohammed', email: 'sara@misa.gov.sa', role: 'Product Manager', is_active: true },
    primary_skill: { id: 's4', team_member_id: '4', skill_id: 'sk4', proficiency_level: 'advanced', is_primary_skill: true, skill: { id: 'sk4', name: 'Agile', category: 'methodology' } },
    total_skills: 8,
    expert_skills: 1,
    certifications_count: 2,
    coverage_percentage: 68,
    last_updated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    team_member: { id: '5', name: 'Khalid Sultan', email: 'khalid@misa.gov.sa', role: 'Security Analyst', is_active: true },
    primary_skill: { id: 's5', team_member_id: '5', skill_id: 'sk5', proficiency_level: 'expert', is_primary_skill: true, skill: { id: 'sk5', name: 'Cybersecurity', category: 'security' } },
    total_skills: 11,
    expert_skills: 3,
    certifications_count: 5,
    coverage_percentage: 88,
    last_updated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TeamMemberAvatar({ member, size = 'md' }: { member: TeamMember; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name}
        className={`${sizeClasses[size]} rounded-lg object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-semibold text-primary-foreground bg-gradient-to-br from-brand-gold to-brand-gold/80`}
    >
      {getInitials(member.name)}
    </div>
  );
}

function SkillLevelBadge({ level }: { level: SkillProficiencyLevel }) {
  const config = PROFICIENCY_LEVELS[level];
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}

function SkillProgressBar({ value }: { value: number }) {
  const getColor = (val: number) => {
    if (val >= 75) return 'hsl(var(--success))';
    if (val >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: getColor(value) }}
        />
      </div>
      <span className="text-xs text-muted-foreground min-w-[35px] text-right">{value}%</span>
    </div>
  );
}

function StatsCard({ 
  label, 
  value, 
  icon, 
  change, 
  changeLabel,
  isNegativeGood = false 
}: { 
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  isNegativeGood?: boolean;
}) {
  const isPositive = change !== undefined ? (isNegativeGood ? change < 0 : change > 0) : true;
  
  return (
    <div className="bg-card rounded-xl p-5 border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-[28px] font-semibold text-foreground">{value}</div>
      {change !== undefined && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change > 0 ? '+' : ''}{Math.abs(change)} {changeLabel}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SkillsInventoryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [stats] = useState<SkillsInventoryStats>(SAMPLE_STATS);
  const [data] = useState<SkillInventoryRow[]>(SAMPLE_DATA);

  const handleClearFilters = () => setFilters({});
  
  const handleExport = () => {
    const csvContent = [
      ['Name', 'Role', 'Primary Skill', 'Proficiency', 'Total Skills', 'Coverage'].join(','),
      ...data.map(row => [
        row.team_member.name,
        row.team_member.role,
        row.primary_skill?.skill?.name || '',
        row.primary_skill?.proficiency_level || '',
        row.total_skills,
        `${row.coverage_percentage}%`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skills-inventory.csv';
    a.click();
  };

  const handleRowClick = (teamMemberId: string) => {
    navigate(`/enterprise/skills-inventory/profile/${teamMemberId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-card to-muted border-b border-brand-gold/30 px-8 py-6">
        <h1 className="text-2xl font-semibold text-brand-gold">Skills Inventory</h1>
        <p className="text-muted-foreground text-sm mt-1">Track team skills, certifications, and identify capability gaps</p>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid grid-cols-[280px_1fr] gap-6">
          {/* Sidebar Filters */}
          <aside className="bg-card rounded-xl p-5 border border-border h-fit">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Filter className="w-[18px] h-[18px] text-brand-gold" />
              Filters
            </h3>

            {/* Program Filter */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Program</label>
              <select
                value={filters.program_id || ''}
                onChange={(e) => setFilters({ ...filters, program_id: e.target.value || undefined })}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-brand-gold"
              >
                <option value="">All Programs</option>
                {SAMPLE_PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Team Filter */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Team</label>
              <select
                value={filters.team_id || ''}
                onChange={(e) => setFilters({ ...filters, team_id: e.target.value || undefined })}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-brand-gold"
              >
                <option value="">All Teams</option>
                {SAMPLE_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Category Filter */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value as SkillCategory || undefined })}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-sm focus:outline-none focus:border-brand-gold"
              >
                <option value="">All Categories</option>
                {Object.entries(SKILL_CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </aside>

          {/* Main Content Area */}
          <main className="flex flex-col gap-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <StatsCard
                label="Total Skills Tracked"
                value={stats.total_skills_tracked}
                change={12}
                changeLabel="this quarter"
                icon={<Target className="w-5 h-5 text-brand-gold" />}
              />
              <StatsCard
                label="Team Members"
                value={stats.total_team_members}
                change={5}
                changeLabel="new"
                icon={<Users className="w-5 h-5 text-brand-gold" />}
              />
              <StatsCard
                label="Avg. Coverage"
                value={`${stats.average_coverage}%`}
                change={4}
                changeLabel=""
                icon={<BarChart3 className="w-5 h-5 text-brand-gold" />}
              />
              <StatsCard
                label="Critical Gaps"
                value={stats.critical_gaps}
                change={-2}
                changeLabel="resolved"
                isNegativeGood
                icon={<AlertTriangle className="w-5 h-5 text-brand-gold" />}
              />
            </div>

            {/* Skills Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Table Header */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-border">
                <h3 className="text-base font-semibold text-foreground">Skills Inventory</h3>
                <div className="flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-transparent border border-border rounded-md hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-brand-gold rounded-md hover:bg-brand-gold/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Skill
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Member</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Skill</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proficiency</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certifications</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coverage</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr
                        key={row.team_member.id}
                        onClick={() => handleRowClick(row.team_member.id)}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <TeamMemberAvatar member={row.team_member} size="md" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{row.team_member.name}</span>
                              <span className="text-xs text-muted-foreground">{row.team_member.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-foreground">
                          {row.primary_skill?.skill?.name || '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          {row.primary_skill ? (
                            <SkillLevelBadge level={row.primary_skill.proficiency_level} />
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-foreground">
                          {row.certifications_count}
                        </td>
                        <td className="px-4 py-3.5 min-w-[150px]">
                          <SkillProgressBar value={row.coverage_percentage} />
                        </td>
                        <td className="px-4 py-3.5 text-sm text-muted-foreground">
                          {formatRelativeTime(row.last_updated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">No skills data found</p>
                  <p className="text-sm text-muted-foreground">Add skills to team members to start tracking</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Add Skill Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <SkillAssessmentForm onClose={() => setIsFormOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SKILL ASSESSMENT FORM COMPONENT
// ============================================

function SkillAssessmentForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    team_member_id: '',
    skill_name: '',
    skill_category: 'technical' as SkillCategory,
    proficiency_level: 'intermediate' as SkillProficiencyLevel,
    years_experience: '',
    certification_name: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting:', formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Add New Skill Assessment</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-5">
        {/* Team Member */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Team Member <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.team_member_id}
            onChange={(e) => setFormData({ ...formData, team_member_id: e.target.value })}
            required
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-brand-gold"
          >
            <option value="">Select team member...</option>
            {SAMPLE_DATA.map(row => (
              <option key={row.team_member.id} value={row.team_member.id}>
                {row.team_member.name} - {row.team_member.role}
              </option>
            ))}
          </select>
        </div>

        {/* Skill Name */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Skill Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.skill_name}
            onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
            required
            placeholder="e.g., AWS Lambda, Python, Project Management"
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Skill Category */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Skill Category <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.skill_category}
            onChange={(e) => setFormData({ ...formData, skill_category: e.target.value as SkillCategory })}
            required
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-brand-gold"
          >
            {Object.entries(SKILL_CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {/* Proficiency Level */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Proficiency Level <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(PROFICIENCY_LEVELS).map(([level, config]) => (
              <button
                key={level}
                type="button"
                onClick={() => setFormData({ ...formData, proficiency_level: level as SkillProficiencyLevel })}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  formData.proficiency_level === level
                    ? 'border-brand-gold bg-brand-gold/10'
                    : 'border-border bg-muted hover:border-brand-gold/50'
                }`}
              >
                <div className="text-sm font-semibold text-foreground mb-0.5">{config.value}</div>
                <div className="text-[10px] text-muted-foreground">{config.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Years of Experience */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Years of Experience</label>
          <input
            type="number"
            min="0"
            max="50"
            step="0.5"
            value={formData.years_experience}
            onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
            placeholder="e.g., 3"
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Related Certification */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Related Certification</label>
          <input
            type="text"
            value={formData.certification_name}
            onChange={(e) => setFormData({ ...formData, certification_name: e.target.value })}
            placeholder="e.g., AWS Solutions Architect Professional"
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any additional context..."
            rows={3}
            className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-gold resize-none"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 mt-8 pt-6 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-6 py-3 text-sm font-medium text-muted-foreground bg-transparent border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 text-sm font-medium text-primary-foreground bg-brand-gold rounded-lg hover:bg-brand-gold/90 transition-colors"
        >
          Save Skill Assessment
        </button>
      </div>
    </form>
  );
}

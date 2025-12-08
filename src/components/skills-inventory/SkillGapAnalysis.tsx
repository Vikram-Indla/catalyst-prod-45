import React from 'react';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface SkillGap {
  skill: string;
  current: number;
  required: number;
  gap: number;
}

interface SkillCoverage {
  skill: string;
  covered: number;
  total: number;
  percentage: number;
}

interface CriticalSkill {
  skill: string;
  severity: 'critical' | 'warning' | 'healthy';
  requiredFor: string;
  coverage: number;
  recommendation: string;
}

// Sample data
const skillGaps: SkillGap[] = [
  { skill: 'Cloud Architecture', current: 4, required: 5, gap: -20 },
  { skill: 'React/Frontend', current: 5, required: 6, gap: -17 },
  { skill: 'Database Design', current: 3, required: 5, gap: -40 },
  { skill: 'DevOps/CI/CD', current: 4, required: 4, gap: 0 },
  { skill: 'Security', current: 2, required: 5, gap: -60 },
  { skill: 'Node.js/Backend', current: 5, required: 5, gap: 0 },
  { skill: 'Agile/Scrum', current: 6, required: 5, gap: 20 },
];

const skillCoverages: SkillCoverage[] = [
  { skill: 'AWS', covered: 5, total: 6, percentage: 83 },
  { skill: 'React', covered: 4, total: 6, percentage: 67 },
  { skill: 'Python', covered: 4, total: 6, percentage: 67 },
  { skill: 'Kubernetes', covered: 3, total: 6, percentage: 50 },
  { skill: 'Security', covered: 2, total: 6, percentage: 33 },
  { skill: 'PostgreSQL', covered: 5, total: 6, percentage: 83 },
];

const criticalSkills: CriticalSkill[] = [
  {
    skill: 'Database Design',
    severity: 'critical',
    requiredFor: 'Data Analytics Platform',
    coverage: 45,
    recommendation: 'Hire 2 database specialists or upskill existing team',
  },
  {
    skill: 'Security',
    severity: 'critical',
    requiredFor: 'All Programs',
    coverage: 40,
    recommendation: 'Prioritize security certifications for 3 team members',
  },
  {
    skill: 'React/Frontend',
    severity: 'warning',
    requiredFor: 'Investment Portal',
    coverage: 62,
    recommendation: 'Schedule React advanced training',
  },
];

const getSeverityStyles = (severity: CriticalSkill['severity']) => {
  switch (severity) {
    case 'critical':
      return { bg: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' };
    case 'warning':
      return { bg: 'hsl(var(--warning) / 0.1)', color: 'hsl(var(--warning))' };
    case 'healthy':
      return { bg: 'hsl(var(--health-green) / 0.1)', color: 'hsl(var(--health-green))' };
  }
};

const getCoverageColor = (percentage: number) => {
  if (percentage >= 75) return 'hsl(var(--health-green))';
  if (percentage >= 50) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
};

const getGapBadgeStyles = (gapCount: number) => {
  if (gapCount > 3) return { bg: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' };
  if (gapCount >= 1) return { bg: 'hsl(var(--warning) / 0.1)', color: 'hsl(var(--warning))' };
  return { bg: 'hsl(var(--health-green) / 0.1)', color: 'hsl(var(--health-green))' };
};

export const SkillGapAnalysis: React.FC = () => {
  const gapCount = skillGaps.filter((s) => s.gap < 0).length;
  const gapBadgeStyles = getGapBadgeStyles(gapCount);

  const overallCoverage = Math.round(
    skillCoverages.reduce((sum, s) => sum + s.percentage, 0) / skillCoverages.length
  );

  return (
    <div className="space-y-6 p-6">
      {/* Top Row: 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Current vs Required Skills */}
        <div className="bg-brand-dark rounded-xl border border-brand-gold-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Current vs Required Skills
            </h3>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: gapBadgeStyles.bg, color: gapBadgeStyles.color }}
            >
              {gapCount} Gaps Identified
            </span>
          </div>

          <div className="space-y-4">
            {skillGaps.map((skill) => {
              const percentage = Math.min((skill.current / skill.required) * 100, 100);
              return (
                <div key={skill.skill} className="flex items-center gap-4">
                  <span className="w-32 text-sm text-muted-foreground truncate">
                    {skill.skill}
                  </span>
                  <div className="flex-1 h-6 bg-brand-gold/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-info rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span
                    className={`w-12 text-sm font-medium text-right ${
                      skill.gap < 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {skill.gap > 0 ? '+' : ''}{skill.gap}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Team Skill Coverage */}
        <div className="bg-brand-dark rounded-xl border border-brand-gold-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Team Skill Coverage
            </h3>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'hsl(var(--health-green) / 0.1)', color: 'hsl(var(--health-green))' }}
            >
              {overallCoverage}% Overall
            </span>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {skillCoverages.map((skill) => {
              const color = getCoverageColor(skill.percentage);
              return (
                <div
                  key={skill.skill}
                  className="bg-secondary rounded-lg p-4"
                >
                  <span className="font-medium text-foreground text-sm">
                    {skill.skill}
                  </span>
                  <div className="h-2 bg-card rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${skill.percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2 block">
                    {skill.covered}/{skill.total} members
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Critical Skills Table */}
      <div className="bg-brand-dark rounded-xl border border-brand-gold-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground">
              Critical Skills Requiring Attention
            </h3>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-dark rounded-lg font-medium text-sm hover:bg-brand-gold-hover transition-colors">
            <FileText className="w-4 h-4" />
            Create Training Plan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-gold-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Skill
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gap Severity
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Required For
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Coverage
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recommendation
                </th>
              </tr>
            </thead>
            <tbody>
              {criticalSkills.map((skill, index) => {
                const severityStyles = getSeverityStyles(skill.severity);
                const coverageColor = getCoverageColor(skill.coverage);
                return (
                  <tr
                    key={skill.skill}
                    className={`${
                      index < criticalSkills.length - 1
                        ? 'border-b border-brand-gold-border/30'
                        : ''
                    } hover:bg-brand-gold/5 transition-colors`}
                  >
                    <td className="py-4 px-4">
                      <span className="font-medium text-foreground">{skill.skill}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium capitalize"
                        style={{
                          backgroundColor: severityStyles.bg,
                          color: severityStyles.color,
                        }}
                      >
                        {skill.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">{skill.requiredFor}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-card rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${skill.coverage}%`,
                              backgroundColor: coverageColor,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{skill.coverage}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">{skill.recommendation}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SkillGapAnalysis;

import React, { useState } from 'react';
import { Users, Target, Star, Award, AlertTriangle, Download } from 'lucide-react';

interface ProgramFilter {
  id: string;
  name: string;
}

interface ProficiencyData {
  level: string;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryData {
  name: string;
  count: number;
}

const programs: ProgramFilter[] = [
  { id: 'all', name: 'All Programs' },
  { id: 'digital', name: 'Digital Transformation' },
  { id: 'investment', name: 'Investment Portal' },
  { id: 'data', name: 'Data Platform' },
];

const statsData = [
  { icon: Users, value: 68, label: 'Team Members' },
  { icon: Target, value: 247, label: 'Total Skills' },
  { icon: Star, value: 52, label: 'Expert Level' },
  { icon: Award, value: 89, label: 'Certifications' },
  { icon: AlertTriangle, value: 5, label: 'Critical Gaps' },
];

const proficiencyData: ProficiencyData[] = [
  { level: 'Expert', count: 52, percentage: 21, color: '#22c55e' },
  { level: 'Advanced', count: 69, percentage: 28, color: '#3b82f6' },
  { level: 'Intermediate', count: 74, percentage: 30, color: '#f59e0b' },
  { level: 'Beginner', count: 37, percentage: 15, color: '#8b5cf6' },
  { level: 'Awareness', count: 15, percentage: 6, color: '#6b7280' },
];

const categoryData: CategoryData[] = [
  { name: 'Technical', count: 112 },
  { name: 'Cloud & Infra', count: 78 },
  { name: 'Leadership', count: 42 },
  { name: 'Soft Skills', count: 32 },
  { name: 'Data & Analytics', count: 28 },
];

const maxCategoryCount = Math.max(...categoryData.map((c) => c.count));

export const SkillsInventoryReport: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState('all');

  // Generate conic-gradient for donut chart
  const generateConicGradient = () => {
    let currentAngle = 0;
    const segments = proficiencyData.map((item) => {
      const startAngle = currentAngle;
      const endAngle = currentAngle + (item.percentage / 100) * 360;
      currentAngle = endAngle;
      return `${item.color} ${startAngle}deg ${endAngle}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  };

  const totalSkills = proficiencyData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {programs.map((program) => (
            <button
              key={program.id}
              onClick={() => setSelectedProgram(program.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedProgram === program.id
                  ? 'bg-[#c69c6d] text-[#1a1f2e]'
                  : 'bg-[#2d3344] text-[#9ca3af] hover:bg-[#3d4454]'
              }`}
            >
              {program.name}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-[rgba(198,156,109,0.3)] text-[#9ca3af] rounded-lg font-medium text-sm hover:bg-[#242938] transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#2d3344] rounded-xl p-5 border border-[rgba(198,156,109,0.15)]"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(198,156,109,0.15)] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-[#c69c6d]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#f5f5f7]">{stat.value}</div>
                  <div className="text-xs text-[#6b7280] uppercase tracking-wider mt-1">
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proficiency Distribution Donut Chart */}
        <div className="bg-[#2d3344] rounded-xl border border-[rgba(198,156,109,0.15)] p-6">
          <h3 className="text-base font-semibold text-[#f5f5f7] mb-6">
            Proficiency Distribution
          </h3>

          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-48 h-48 flex-shrink-0">
              <div
                className="w-full h-full rounded-full"
                style={{ background: generateConicGradient() }}
              />
              {/* Inner circle for donut effect */}
              <div className="absolute inset-6 bg-[#2d3344] rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#f5f5f7]">{totalSkills}</div>
                  <div className="text-xs text-[#6b7280]">Total</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {proficiencyData.map((item) => (
                <div key={item.level} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-[#9ca3af]">{item.level}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#f5f5f7] font-medium w-8 text-right">
                      {item.count}
                    </span>
                    <span className="text-sm text-[#6b7280] w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills by Category Bar Chart */}
        <div className="bg-[#2d3344] rounded-xl border border-[rgba(198,156,109,0.15)] p-6">
          <h3 className="text-base font-semibold text-[#f5f5f7] mb-6">
            Skills by Category
          </h3>

          <div className="space-y-4">
            {categoryData.map((category) => {
              const widthPercentage = (category.count / maxCategoryCount) * 100;
              return (
                <div key={category.name} className="flex items-center gap-4">
                  <span className="w-28 text-sm text-[#9ca3af] truncate flex-shrink-0">
                    {category.name}
                  </span>
                  <div className="flex-1 h-8 bg-[#1a1f2e] rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-[#3b82f6] rounded-lg flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${widthPercentage}%` }}
                    >
                      <span className="text-sm font-medium text-white">
                        {category.count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsInventoryReport;

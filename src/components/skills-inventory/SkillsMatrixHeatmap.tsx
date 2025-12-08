import React, { useState } from 'react';
import { PROFICIENCY_LEVELS } from '@/types/skills';

interface TeamMemberRow {
  id: string;
  name: string;
  role: string;
}

interface SkillColumn {
  id: string;
  name: string;
}

const PROFICIENCY_COLORS: Record<number, string> = {
  1: 'hsl(var(--muted-foreground) / 0.3)',
  2: 'hsl(280 70% 50%)',
  3: 'hsl(var(--warning))',
  4: 'hsl(var(--info))',
  5: 'hsl(var(--health-green))',
};

const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'None',
  2: 'Beginner',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

// Sample data
const teamMembers: TeamMemberRow[] = [
  { id: '1', name: 'Sarah Chen', role: 'Lead Engineer' },
  { id: '2', name: 'Mohammed Al-Rashid', role: 'Senior Developer' },
  { id: '3', name: 'Alex Kim', role: 'DevOps Engineer' },
  { id: '4', name: 'Fatima Hassan', role: 'Full Stack Dev' },
  { id: '5', name: 'James Wilson', role: 'Security Engineer' },
  { id: '6', name: 'Priya Patel', role: 'Data Engineer' },
];

const skills: SkillColumn[] = [
  { id: 'cloud', name: 'Cloud Architecture' },
  { id: 'react', name: 'React/Frontend' },
  { id: 'node', name: 'Node.js/Backend' },
  { id: 'database', name: 'Database Design' },
  { id: 'devops', name: 'DevOps/CI/CD' },
  { id: 'security', name: 'Security' },
  { id: 'agile', name: 'Agile/Scrum' },
];

const matrixData: Record<string, Record<string, number>> = {
  '1': { cloud: 5, react: 4, node: 4, database: 4, devops: 3, security: 3, agile: 5 },
  '2': { cloud: 4, react: 5, node: 4, database: 3, devops: 3, security: 2, agile: 4 },
  '3': { cloud: 5, react: 2, node: 3, database: 3, devops: 5, security: 4, agile: 4 },
  '4': { cloud: 3, react: 4, node: 5, database: 4, devops: 3, security: 2, agile: 3 },
  '5': { cloud: 4, react: 2, node: 3, database: 3, devops: 4, security: 5, agile: 3 },
  '6': { cloud: 4, react: 3, node: 4, database: 5, devops: 3, security: 3, agile: 4 },
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  memberName: string;
  skillName: string;
  level: number;
}

export const SkillsMatrixHeatmap: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    memberName: '',
    skillName: '',
    level: 0,
  });

  const handleCellHover = (
    e: React.MouseEvent,
    memberName: string,
    skillName: string,
    level: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      memberName,
      skillName,
      level,
    });
  };

  const handleCellLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const legendItems = [
    { level: 5, label: 'Expert (5)', color: PROFICIENCY_COLORS[5] },
    { level: 4, label: 'Advanced (4)', color: PROFICIENCY_COLORS[4] },
    { level: 3, label: 'Intermediate (3)', color: PROFICIENCY_COLORS[3] },
    { level: 2, label: 'Beginner (2)', color: PROFICIENCY_COLORS[2] },
    { level: 1, label: 'None (1)', color: PROFICIENCY_COLORS[1] },
  ];

  return (
    <div className="bg-white rounded-xl border border-brand-gold/20 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-brand-dark">
            Skills Matrix - Platform Engineering Team
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Hover over cells for detailed proficiency information
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-5">
          {legendItems.map((item) => (
            <div key={item.level} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-neutral-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="w-[200px] bg-white text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Team Member
              </th>
              {skills.map((skill) => (
                <th
                  key={skill.id}
                  className="bg-white text-center py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider"
                >
                  {skill.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, rowIndex) => (
              <tr key={member.id} className="border-b border-neutral-100 last:border-b-0">
                <td className="w-[200px] bg-white py-4 px-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-brand-dark">
                      {member.name}
                    </span>
                    <span className="text-xs text-neutral-500">{member.role}</span>
                  </div>
                </td>
                {skills.map((skill) => {
                  const level = matrixData[member.id]?.[skill.id] || 1;
                  return (
                    <td key={skill.id} className="py-2 px-2">
                      <div
                        className="h-14 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10 hover:shadow-lg relative"
                        style={{ backgroundColor: PROFICIENCY_COLORS[level] }}
                        onMouseEnter={(e) =>
                          handleCellHover(e, member.name, skill.name, level)
                        }
                        onMouseLeave={handleCellLeave}
                      >
                        <span className="text-lg font-semibold text-white">
                          {level}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-xl min-w-[180px]">
            <p className="font-semibold text-brand-dark text-sm">
              {tooltip.memberName}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-neutral-500 text-xs">{tooltip.skillName}:</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded text-white"
                style={{
                  backgroundColor: PROFICIENCY_COLORS[tooltip.level],
                }}
              >
                {PROFICIENCY_LABELS[tooltip.level]}
              </span>
            </div>
          </div>
          {/* Arrow */}
          <div
            className="w-0 h-0 mx-auto border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-neutral-200"
          />
        </div>
      )}
    </div>
  );
};

export default SkillsMatrixHeatmap;

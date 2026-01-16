/**
 * Team Contribution List
 */

import { motion } from 'framer-motion';
import type { TeamMember } from '../types';

interface TeamContributionListProps {
  team: TeamMember[];
}

export function TeamContributionList({ team }: TeamContributionListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Team Contribution</h3>
      <div className="space-y-3">
        {team.map((member) => (
          <div key={member.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: member.avatarColor }}
            >
              {member.initials}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">{member.name}</div>
              <div className="text-xs text-slate-500">{member.role}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">{member.stats.executed}</div>
              <div className="text-xs text-slate-500">{member.stats.passRate}% pass</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

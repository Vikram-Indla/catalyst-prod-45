// ============================================================
// CAPACITY PANEL
// Team workload visualization with daily load bars
// ============================================================

import { useMemo } from 'react';
import { format, addDays, isSameDay, isWeekend as isWeekendDay } from 'date-fns';
import type { PlannerTask } from '../../types';
import '../../styles/planner-calendar.css';

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  avatarColor?: string;
}

interface CapacityPanelProps {
  visible: boolean;
  weekStart: Date;
  teamMembers: TeamMember[];
  tasks: PlannerTask[];
  dailyCapacity?: number;
}

interface DailyLoad {
  date: Date;
  count: number;
  percentage: number;
  isWeekend: boolean;
}

interface MemberCapacity {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  dailyCapacity: number;
  dailyLoad: DailyLoad[];
}

function getLoadClass(percentage: number): string {
  if (percentage >= 80) return 'overload';
  if (percentage >= 60) return 'warning';
  return 'normal';
}

export function CapacityPanel({ 
  visible, 
  weekStart, 
  teamMembers, 
  tasks,
  dailyCapacity = 5,
}: CapacityPanelProps) {
  if (!visible) return null;

  // Generate week days
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Calculate capacity data for each member
  const capacityData: MemberCapacity[] = useMemo(() => {
    // Get unique assignees from tasks
    const assigneeSet = new Set<string>();
    tasks.forEach(t => {
      if (t.assigneeId) {
        assigneeSet.add(t.assigneeId);
      }
    });

    // Use teamMembers if provided, otherwise derive from tasks
    const members = teamMembers.length > 0 
      ? teamMembers 
      : Array.from(assigneeSet).map(id => {
          const task = tasks.find(t => t.assigneeId === id);
          return {
            id,
            name: task?.assigneeName || 'Unknown',
            initials: task?.assigneeInitials || '??',
            avatarColor: task?.teamColor || '#6366f1',
          };
        });

    return members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id);
      
      const dailyLoad = days.map(day => {
        const dayTasks = memberTasks.filter(t => {
          if (!t.dueDate) return false;
          return isSameDay(new Date(t.dueDate), day);
        });
        
        const isWeekend = isWeekendDay(day);
        const effectiveCapacity = isWeekend ? 0 : dailyCapacity;
        const percentage = effectiveCapacity > 0 
          ? Math.min((dayTasks.length / effectiveCapacity) * 100, 100)
          : 0;
        
        return {
          date: day,
          count: dayTasks.length,
          percentage,
          isWeekend,
        };
      });

      return {
        id: member.id,
        name: member.name,
        initials: member.initials,
        avatarColor: member.avatarColor || '#6366f1',
        dailyCapacity,
        dailyLoad,
      };
    });
  }, [teamMembers, tasks, days, dailyCapacity]);

  if (capacityData.length === 0) {
    return (
      <div className="planner-calendar-content">
        <div className="cal-capacity-panel">
          <div className="p-4 text-center text-sm text-slate-500">
            No team members with assigned tasks
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="planner-calendar-content">
      <div className="cal-capacity-panel">
        {/* Header */}
        <div className="cal-capacity-header">
          <div>Team Member</div>
          {days.map(day => (
            <div key={day.toISOString()}>
              <div>{format(day, 'EEE')}</div>
              <div className="text-xs font-normal opacity-60">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Member Rows */}
        {capacityData.map(member => (
          <div key={member.id} className="cal-capacity-row">
            <div className="cal-capacity-user">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ background: member.avatarColor }}
              >
                {member.initials}
              </div>
              <span className="truncate">{member.name}</span>
            </div>
            
            {member.dailyLoad.map((load, idx) => (
              <div 
                key={idx} 
                className="cal-capacity-cell"
                style={{ opacity: load.isWeekend ? 0.4 : 1 }}
              >
                {load.isWeekend ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  <>
                    <div className="cal-capacity-bar">
                      <div 
                        className={`cal-capacity-fill ${getLoadClass(load.percentage)}`}
                        style={{ width: `${load.percentage}%` }}
                      />
                    </div>
                    <span className={`cal-capacity-label ${load.percentage >= 100 ? 'overload' : ''}`}>
                      {load.count}/{member.dailyCapacity}
                      {load.percentage >= 100 && ' FULL'}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

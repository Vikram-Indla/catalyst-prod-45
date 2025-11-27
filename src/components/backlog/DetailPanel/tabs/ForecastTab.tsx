import { useState } from 'react';
import { ChevronRight, ChevronDown, X, Info } from 'lucide-react';
import { ForecastData, ProgramIncrement } from '@/types/backlog.types';

interface ForecastTabProps {
  forecastData: ForecastData;
  programIncrements: ProgramIncrement[];
  onPIChange: (piId: string) => void;
  onEstimateChange: (programId: string, teamId: string | null, value: number) => void;
}

export function ForecastTab({ 
  forecastData, 
  programIncrements,
  onPIChange,
  onEstimateChange 
}: ForecastTabProps) {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set(['ai']));
  const [showAutosaveNotice, setShowAutosaveNotice] = useState(true);

  const toggleProgram = (programId: string) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  return (
    <div className="p-6">
      {/* PI Selector */}
      <div className="mb-4">
        <label className="block text-sm text-muted-foreground mb-2">Program Increment estimate</label>
        <div className="flex items-center justify-between">
          <select
            value={forecastData.selectedPI}
            onChange={(e) => onPIChange(e.target.value)}
            className="px-3 py-2 min-w-[200px] text-sm bg-background border border-border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {programIncrements.map((pi) => (
              <option key={pi.id} value={pi.id}>{pi.name}</option>
            ))}
          </select>
          <div className="text-xl font-semibold text-foreground">{forecastData.totalPts} <span className="text-sm text-muted-foreground">PTS</span></div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
        Estimate the number of points needed for this epic during a program increment at the team, program, and program increment levels.
        You can also view and edit these fields on the forecast page, depending on the page filters.
      </p>

      <button className="px-4 py-2 text-sm text-primary bg-[#DEEBFF] border-none rounded hover:bg-[#DEEBFF]/80 mb-6">
        Learn more
      </button>

      {/* Autosave Notice */}
      {showAutosaveNotice && (
        <div className="flex items-center justify-between px-4 py-3 mb-6 bg-[#E3FCEF] text-[#006644] rounded">
          <div className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4" />
            Estimations now save automatically
          </div>
          <button onClick={() => setShowAutosaveNotice(false)} className="text-[#006644] hover:text-[#006644]/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Program and Team Estimates */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Program and team estimates</h3>
        
        {forecastData.programs.map((program) => {
          const isExpanded = expandedPrograms.has(program.programId);
          
          return (
            <div key={program.programId} className="mb-3 border border-border rounded-lg overflow-hidden">
              {/* Program Header */}
              <div
                onClick={() => toggleProgram(program.programId)}
                className="flex items-center justify-between px-4 py-3 bg-muted cursor-pointer hover:bg-muted/80"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">{program.programName}</span>
                </div>
                <div className="text-sm font-semibold text-foreground">{program.totalPts} <span className="text-muted-foreground">PTS</span></div>
              </div>

              {/* Teams */}
              {isExpanded && program.teams.length > 0 && (
                <div className="px-4 py-3 pl-10">
                  {program.teams.map((team) => (
                    <div key={team.teamId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{team.teamName}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={team.pts || ''}
                          onChange={(e) => onEstimateChange(program.programId, team.teamId, parseInt(e.target.value) || 0)}
                          placeholder="Estimate"
                          className="w-20 px-2 py-1.5 text-sm text-right bg-background border border-border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-xs text-muted-foreground">PTS</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Program Estimate Sum */}
                  <div className="flex items-center justify-between py-3 mt-2 border-t border-border">
                    <span className="text-sm font-medium text-foreground">Program Estimate</span>
                    <div className="text-sm font-semibold text-foreground">{program.totalPts} <span className="text-muted-foreground">PTS</span></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
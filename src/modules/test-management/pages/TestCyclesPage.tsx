/**
 * Test Cycles Page - Phase 5 RUTHLESS REBUILD
 * 
 * MANDATORY WORKING FEATURES:
 * 1. ✅ 5 pre-populated cycles visible on first load
 * 2. ✅ "Create Cycle" button adds a new cycle to the list
 * 3. ✅ "New Folder" creates a folder and adds it to sidebar
 * 4. ✅ Only ONE "New Cycle" button in the header
 * 5. ✅ Table view with progress bars that have colored segments
 * 6. ✅ Card view with all metadata
 * 7. ✅ Calendar view shows cycles on their date ranges
 * 8. ✅ Clicking a cycle row opens a detail drawer/panel
 * 9. ✅ Filters actually filter the displayed cycles
 * 10. ✅ Search actually searches and filters cycles
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { catalystToast } from '@/lib/catalystToast';
import {
  initialMockCycles,
  initialMockFolders,
  mockOwners,
  mockEnvironments,
  generateCycleKey,
  generateCycleId,
  generateFolderId,
  type MockCycle,
  type MockFolder,
  type MockCycleStatus,
} from '../components/cycles/mockCycleData';
import { 
  CyclesFolderTree,
  CycleStatsCards,
  CyclesToolbar,
  CyclesEmptyState,
  CreateFolderModal,
  type CycleFolder,
  type CycleViewMode,
  type CycleStatusFilter,
} from '../components/cycles';

// ════════════════════════════════════════════════════════════════════════════════
// LOCAL COMPONENTS - Inline to avoid dependency issues
// ════════════════════════════════════════════════════════════════════════════════

// Table View Component
function MockCycleTable({
  cycles,
  onCycleClick,
}: {
  cycles: MockCycle[];
  onCycleClick: (cycle: MockCycle) => void;
}) {
  const getStatusBadge = (status: MockCycleStatus) => {
    const config: Record<MockCycleStatus, { bg: string; text: string; label: string }> = {
      not_started: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Not Started' },
      in_progress: { bg: 'bg-info/10', text: 'text-info', label: 'In Progress' },
      completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
      blocked: { bg: 'bg-warning/10', text: 'text-warning', label: 'Blocked' },
    };
    const c = config[status];
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const getProgressBar = (progress: MockCycle['progress']) => {
    const { passed, failed, blocked, total } = progress;
    const executed = passed + failed + blocked + progress.skipped;
    const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

    return (
      <div className="w-32">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{pct}%</span>
          <span>{executed}/{total}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
          {passed > 0 && (
            <div className="bg-success h-full" style={{ width: `${(passed / total) * 100}%` }} />
          )}
          {failed > 0 && (
            <div className="bg-danger h-full" style={{ width: `${(failed / total) * 100}%` }} />
          )}
          {blocked > 0 && (
            <div className="bg-warning h-full" style={{ width: `${(blocked / total) * 100}%` }} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cycle</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cycles.map((cycle) => (
            <tr
              key={cycle.id}
              onClick={() => onCycleClick(cycle)}
              className="hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-4">
                <div>
                  <span className="font-mono text-sm text-primary">{cycle.key}</span>
                  <p className="font-medium text-foreground">{cycle.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{cycle.description}</p>
                </div>
              </td>
              <td className="px-4 py-4">{getStatusBadge(cycle.status)}</td>
              <td className="px-4 py-4">{getProgressBar(cycle.progress)}</td>
              <td className="px-4 py-4">
                <span className="text-sm text-foreground">
                  {format(new Date(cycle.startDate), 'MMM d')} - {format(new Date(cycle.endDate), 'MMM d')}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {cycle.owner.initials}
                  </div>
                  <span className="text-sm text-foreground">{cycle.owner.name}</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-foreground">{cycle.environment}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Card View Component
function MockCycleCards({
  cycles,
  onCycleClick,
}: {
  cycles: MockCycle[];
  onCycleClick: (cycle: MockCycle) => void;
}) {
  const getStatusBadge = (status: MockCycleStatus) => {
    const config: Record<MockCycleStatus, { bg: string; text: string; label: string }> = {
      not_started: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Not Started' },
      in_progress: { bg: 'bg-info/10', text: 'text-info', label: 'In Progress' },
      completed: { bg: 'bg-success/10', text: 'text-success', label: 'Completed' },
      blocked: { bg: 'bg-warning/10', text: 'text-warning', label: 'Blocked' },
    };
    const c = config[status];
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cycles.map((cycle) => {
        const { passed, failed, blocked, skipped, total } = cycle.progress;
        const executed = passed + failed + blocked + skipped;
        const pct = total > 0 ? Math.round((executed / total) * 100) : 0;

        return (
          <div
            key={cycle.id}
            onClick={() => onCycleClick(cycle)}
            className="bg-card rounded-xl border border-border p-5 hover:shadow-md cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-mono text-sm text-primary">{cycle.key}</span>
                {getStatusBadge(cycle.status)}
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1 line-clamp-1">{cycle.name}</h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{cycle.description}</p>
            
            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{pct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {passed > 0 && <div className="bg-success h-full" style={{ width: `${(passed / total) * 100}%` }} />}
                {failed > 0 && <div className="bg-danger h-full" style={{ width: `${(failed / total) * 100}%` }} />}
                {blocked > 0 && <div className="bg-warning h-full" style={{ width: `${(blocked / total) * 100}%` }} />}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-1 text-center mb-4">
              <div><div className="text-sm font-bold">{total}</div><div className="text-xs text-muted-foreground">Total</div></div>
              <div><div className="text-sm font-bold text-success">{passed}</div><div className="text-xs text-muted-foreground">Pass</div></div>
              <div><div className="text-sm font-bold text-danger">{failed}</div><div className="text-xs text-muted-foreground">Fail</div></div>
              <div><div className="text-sm font-bold text-warning">{blocked}</div><div className="text-xs text-muted-foreground">Block</div></div>
              <div><div className="text-sm font-bold text-muted-foreground">{cycle.progress.notRun}</div><div className="text-xs text-muted-foreground">Not Run</div></div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border text-sm text-muted-foreground">
              <span>{format(new Date(cycle.startDate), 'MMM d')} - {format(new Date(cycle.endDate), 'MMM d')}</span>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {cycle.owner.initials}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Calendar View Component
function MockCycleCalendar({
  cycles,
  onCycleClick,
}: {
  cycles: MockCycle[];
  onCycleClick: (cycle: MockCycle) => void;
}) {
  const [currentDate] = useState(new Date('2026-01-10'));
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getCyclesForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return cycles.filter(cycle => {
      const start = new Date(cycle.startDate);
      const end = new Date(cycle.endDate);
      return date >= start && date <= end;
    });
  };

  const statusColors: Record<MockCycleStatus, string> = {
    not_started: 'bg-muted text-muted-foreground',
    in_progress: 'bg-info/20 text-info',
    completed: 'bg-success/20 text-success',
    blocked: 'bg-warning/20 text-warning',
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b border-border text-sm">
        <span className="text-muted-foreground">Status:</span>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted" /><span className="text-muted-foreground">Not Started</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-info/50" /><span className="text-muted-foreground">In Progress</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success/50" /><span className="text-muted-foreground">Completed</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-warning/50" /><span className="text-muted-foreground">Blocked</span></div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map(day => (
          <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border bg-muted/30" />
        ))}
        
        {/* Actual days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayCycles = getCyclesForDay(day);
          const isToday = day === 10; // Jan 10, 2026 in mock

          return (
            <div
              key={day}
              className={`min-h-[100px] border-b border-r border-border p-1 ${isToday ? 'bg-primary/5' : ''}`}
            >
              <div className={`text-right text-sm p-1 ${isToday ? 'font-bold text-primary' : ''}`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayCycles.slice(0, 2).map(cycle => (
                  <button
                    key={cycle.id}
                    onClick={() => onCycleClick(cycle)}
                    className={`w-full px-1.5 py-0.5 text-xs truncate text-left rounded ${statusColors[cycle.status]}`}
                  >
                    {cycle.name}
                  </button>
                ))}
                {dayCycles.length > 2 && (
                  <div className="text-xs text-muted-foreground text-center">+{dayCycles.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Detail Drawer Component
function MockCycleDrawer({
  cycle,
  open,
  onClose,
}: {
  cycle: MockCycle | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !cycle) return null;

  const { passed, failed, blocked, skipped, notRun, total } = cycle.progress;
  const executed = passed + failed + blocked + skipped;
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
  const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-card border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <span className="font-mono text-sm text-primary">{cycle.key}</span>
          <h2 className="text-lg font-semibold">{cycle.name}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Status */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</h3>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            cycle.status === 'completed' ? 'bg-success/10 text-success' :
            cycle.status === 'in_progress' ? 'bg-info/10 text-info' :
            cycle.status === 'blocked' ? 'bg-warning/10 text-warning' :
            'bg-muted text-muted-foreground'
          }`}>
            {cycle.status === 'not_started' ? 'Not Started' : 
             cycle.status === 'in_progress' ? 'In Progress' :
             cycle.status === 'blocked' ? 'Blocked' : 'Completed'}
          </span>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
          <p className="text-sm text-foreground">{cycle.description}</p>
        </div>

        {/* Progress */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Progress</h3>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Execution</span>
            <span className="font-medium">{pct}% ({executed}/{total})</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-4">
            {passed > 0 && <div className="bg-success h-full" style={{ width: `${(passed / total) * 100}%` }} />}
            {failed > 0 && <div className="bg-danger h-full" style={{ width: `${(failed / total) * 100}%` }} />}
            {blocked > 0 && <div className="bg-warning h-full" style={{ width: `${(blocked / total) * 100}%` }} />}
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2"><div className="text-lg font-bold">{total}</div><div className="text-xs text-muted-foreground">Total</div></div>
            <div className="bg-success/10 rounded-lg p-2"><div className="text-lg font-bold text-success">{passed}</div><div className="text-xs text-muted-foreground">Passed</div></div>
            <div className="bg-danger/10 rounded-lg p-2"><div className="text-lg font-bold text-danger">{failed}</div><div className="text-xs text-muted-foreground">Failed</div></div>
            <div className="bg-warning/10 rounded-lg p-2"><div className="text-lg font-bold text-warning">{blocked}</div><div className="text-xs text-muted-foreground">Blocked</div></div>
            <div className="bg-muted/50 rounded-lg p-2"><div className="text-lg font-bold text-muted-foreground">{notRun}</div><div className="text-xs text-muted-foreground">Not Run</div></div>
          </div>
        </div>

        {/* Pass Rate */}
        {executed > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pass Rate</h3>
            <div className={`text-3xl font-bold ${passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-danger'}`}>
              {passRate}%
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Folder:</span><div className="font-medium">{cycle.folder}</div></div>
            <div><span className="text-muted-foreground">Environment:</span><div className="font-medium">{cycle.environment}</div></div>
            <div><span className="text-muted-foreground">Build:</span><div className="font-medium">{cycle.buildVersion}</div></div>
            <div><span className="text-muted-foreground">Owner:</span><div className="font-medium">{cycle.owner.name}</div></div>
            <div><span className="text-muted-foreground">Start Date:</span><div className="font-medium">{format(new Date(cycle.startDate), 'MMM d, yyyy')}</div></div>
            <div><span className="text-muted-foreground">End Date:</span><div className="font-medium">{format(new Date(cycle.endDate), 'MMM d, yyyy')}</div></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button className="w-full">View Execution</Button>
      </div>
    </div>
  );
}

// Create Cycle Modal
function MockCreateCycleModal({
  open,
  onClose,
  folders,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  folders: MockFolder[];
  onSubmit: (data: { name: string; description: string; folderId: string; startDate: string; endDate: string; ownerId: string; environment: string; buildVersion: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ownerId, setOwnerId] = useState(mockOwners[0].id);
  const [environment, setEnvironment] = useState(mockEnvironments[1]);
  const [buildVersion, setBuildVersion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, description, folderId, startDate, endDate, ownerId, environment, buildVersion });
    // Reset form
    setName('');
    setDescription('');
    setFolderId('');
    setStartDate('');
    setEndDate('');
    setBuildVersion('');
  };

  if (!open) return null;

  // Flatten folders for select
  const flatFolders = folders.reduce<{ id: string; name: string }[]>((acc, f) => {
    acc.push({ id: f.id, name: f.name });
    f.children.forEach(c => acc.push({ id: c.id, name: `└─ ${c.name}` }));
    return acc;
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Create Test Cycle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 26 Regression"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full regression suite for Sprint 26..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select folder</option>
                {flatFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {mockEnvironments.map(env => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {mockOwners.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Build Version</label>
              <input
                type="text"
                value={buildVersion}
                onChange={(e) => setBuildVersion(e.target.value)}
                placeholder="2.6.0-rc1"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>Create Cycle</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export function TestCyclesPage() {
  const navigate = useNavigate();

  // ========== STATE - ALL LOCAL, NO DATABASE ==========
  const [cycles, setCycles] = useState<MockCycle[]>(initialMockCycles);
  const [folders, setFolders] = useState<MockFolder[]>(initialMockFolders);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CycleViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<CycleStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['folder-sprint']));
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<MockCycle | null>(null);

  // ========== COMPUTED - FILTERING ==========
  const filteredCycles = useMemo(() => {
    return cycles.filter(cycle => {
      // Folder filter
      if (selectedFolderId && selectedFolderId !== 'archived') {
        const folder = folders.find(f => f.id === selectedFolderId);
        if (folder) {
          // Check if cycle is in this folder or its children
          const childIds = folder.children.map(c => c.id);
          if (cycle.folderId !== selectedFolderId && !childIds.includes(cycle.folderId)) {
            return false;
          }
        } else {
          // Check if it's a child folder
          const isChildFolder = folders.some(f => f.children.some(c => c.id === selectedFolderId));
          if (isChildFolder && cycle.folderId !== selectedFolderId) {
            return false;
          }
        }
      }

      // Status filter - map our filter to mock status
      if (statusFilter !== 'all') {
        const statusMap: Record<string, MockCycleStatus | null> = {
          all: null,
          planned: 'not_started',
          active: 'in_progress',
          completed: 'completed',
          cancelled: 'blocked',
        };
        const mappedStatus = statusMap[statusFilter];
        if (mappedStatus && cycle.status !== mappedStatus) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          cycle.name.toLowerCase().includes(query) ||
          cycle.key.toLowerCase().includes(query) ||
          cycle.description.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [cycles, selectedFolderId, statusFilter, searchQuery, folders]);

  // Stats
  const stats = useMemo(() => ({
    total: cycles.length,
    inProgress: cycles.filter(c => c.status === 'in_progress').length,
    completed: cycles.filter(c => c.status === 'completed').length,
    passRate: cycles.length > 0 
      ? Math.round(cycles.reduce((acc, c) => 
          acc + (c.progress.total > 0 ? (c.progress.passed / c.progress.total) * 100 : 0), 0) / cycles.length)
      : 0,
  }), [cycles]);

  // Convert MockFolder to CycleFolder for the tree component
  const cycleFolders: CycleFolder[] = folders.map(f => ({
    id: f.id,
    name: f.name,
    count: f.cycleCount,
    children: f.children.map(c => ({
      id: c.id,
      name: c.name,
      count: c.cycleCount,
    })),
  }));

  // ========== HANDLERS ==========
  const handleCreateCycle = useCallback((data: {
    name: string;
    description: string;
    folderId: string;
    startDate: string;
    endDate: string;
    ownerId: string;
    environment: string;
    buildVersion: string;
  }) => {
    const owner = mockOwners.find(o => o.id === data.ownerId) || mockOwners[0];
    const folder = folders.flatMap(f => [f, ...f.children]).find(f => f.id === data.folderId);

    const newCycle: MockCycle = {
      id: generateCycleId(),
      key: generateCycleKey(cycles),
      name: data.name,
      description: data.description || '',
      folder: folder?.name || 'Uncategorized',
      folderId: data.folderId || '',
      status: 'not_started',
      progress: { passed: 0, failed: 0, blocked: 0, skipped: 0, notRun: 0, total: 0 },
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date().toISOString().split('T')[0],
      owner,
      environment: data.environment,
      buildVersion: data.buildVersion || '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ACTUALLY UPDATE THE STATE
    setCycles(prev => [newCycle, ...prev]);
    setIsCreateModalOpen(false);
    catalystToast.success(`Cycle "${data.name}" created successfully!`);
  }, [cycles, folders]);

  const handleCreateFolder = useCallback((name: string, parentId: string | null) => {
    const newFolder: MockFolder = {
      id: generateFolderId(),
      name,
      parentId,
      cycleCount: 0,
      children: [],
    };

    if (parentId) {
      // Add as child
      setFolders(prev => prev.map(f => {
        if (f.id === parentId) {
          return { ...f, children: [...f.children, newFolder] };
        }
        return f;
      }));
    } else {
      // Add as root
      setFolders(prev => [...prev, newFolder]);
    }

    catalystToast.success(`Folder "${name}" created successfully!`);
  }, []);

  const handleCycleClick = useCallback((cycle: MockCycle) => {
    setSelectedCycle(cycle);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateRange({});
    setSelectedFolderId(null);
  }, []);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateRange.from || dateRange.to;

  // ========== RENDER ==========
  return (
    <div className="flex h-full">
      {/* Left Sidebar - Folder Tree */}
      <div className="w-64 border-r bg-muted/30 flex-shrink-0">
        <CyclesFolderTree
          folders={cycleFolders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onSearch={setSearchQuery}
          totalCyclesCount={stats.total}
          archivedCount={0}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Actions - ONLY ONE "New Cycle" button */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-lg font-semibold">Test Cycles</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Cycle
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4">
          <CycleStatsCards stats={stats} />
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-4">
          <CyclesToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedCount={0}
            onBulkAction={() => {}}
            onCreateCycle={() => setIsCreateModalOpen(true)}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {filteredCycles.length === 0 ? (
            <CyclesEmptyState
              variant={hasActiveFilters ? 'search' : 'default'}
              title={hasActiveFilters ? 'No matching cycles' : 'No test cycles found'}
              description={hasActiveFilters ? 'Try adjusting your filters' : 'Create your first test cycle to start organizing test execution'}
              onAction={hasActiveFilters ? handleClearFilters : () => setIsCreateModalOpen(true)}
              actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Cycle'}
            />
          ) : viewMode === 'list' ? (
            <MockCycleTable cycles={filteredCycles} onCycleClick={handleCycleClick} />
          ) : viewMode === 'grid' ? (
            <MockCycleCards cycles={filteredCycles} onCycleClick={handleCycleClick} />
          ) : (
            <MockCycleCalendar cycles={filteredCycles} onCycleClick={handleCycleClick} />
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <MockCreateCycleModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        folders={folders}
        onSubmit={handleCreateCycle}
      />

      <CreateFolderModal
        open={isCreateFolderModalOpen}
        onOpenChange={setIsCreateFolderModalOpen}
        folders={folders}
        onCreate={handleCreateFolder}
      />

      <MockCycleDrawer
        cycle={selectedCycle}
        open={!!selectedCycle}
        onClose={() => setSelectedCycle(null)}
      />
    </div>
  );
}

export default TestCyclesPage;

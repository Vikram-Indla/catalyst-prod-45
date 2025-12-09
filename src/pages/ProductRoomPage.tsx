import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, Check, Rocket, Zap, Clock, TrendingUp, 
  X, Users, Search, LayoutGrid, Target, Calendar, Settings, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Brand Colors
const COLORS = {
  gold: '#c69c6d',
  goldLight: '#f5efe8',
  goldDark: '#a67c4d',
  bronze: '#8b7355',
  olive: '#5c7c5c',
  oliveLight: '#e8f0e8',
  champagne: '#d4b896',
  grey: '#c8ccd0',
  dark: '#1a1a2e',
  red: '#dc2626',
  amber: '#f59e0b',
};

const FUNNEL_COLORS: Record<string, string> = {
  'New Request': COLORS.dark,
  'Analyse': COLORS.bronze,
  'Ready to Implement': COLORS.champagne,
  'Approved': COLORS.gold,
  'Implement': COLORS.goldDark,
  'Closed': COLORS.olive,
};

// Sample Data
const SAMPLE_RESOURCES = [
  { name: 'Sulaiman Alessa', role: 'Product Owner', initials: 'SA', analyse: 1, approved: 0, implement: 1, closed: 2 },
  { name: 'Maali Alanazi', role: 'Business Analyst', initials: 'MA', analyse: 2, approved: 2, implement: 1, closed: 3 },
  { name: 'Alaa Ali', role: 'Product Owner', initials: 'AA', analyse: 1, approved: 1, implement: 2, closed: 0 },
  { name: 'Khaled Alghithy', role: 'Business Analyst', initials: 'KA', analyse: 1, approved: 1, implement: 5, closed: 2 },
  { name: 'Nora Alshahrani', role: 'Business Analyst', initials: 'NA', analyse: 3, approved: 2, implement: 1, closed: 4 },
  { name: 'Fahad Almutairi', role: 'Product Owner', initials: 'FA', analyse: 2, approved: 3, implement: 2, closed: 1 },
  { name: 'Sara Almohammad', role: 'Business Analyst', initials: 'SM', analyse: 4, approved: 1, implement: 3, closed: 2 },
  { name: 'Omar Alkhalid', role: 'Product Owner', initials: 'OK', analyse: 1, approved: 2, implement: 4, closed: 3 },
];

const FUNNEL_DATA = [
  { step: 'New Request', count: 12, aging: 3 },
  { step: 'Analyse', count: 8, aging: 2 },
  { step: 'Ready to Implement', count: 5, aging: 0 },
  { step: 'Approved', count: 4, aging: 1 },
  { step: 'Implement', count: 6, aging: 0 },
  { step: 'Closed', count: 23, aging: 0 },
];

const IMPLEMENTATION_ITEMS = [
  { id: 'BR-2024-089', summary: 'نظام تجديد رخصة الاستثمار', type: 'BR', owner: 'Sulaiman A.', cycle: 45 },
  { id: 'BR-2024-091', summary: 'توقيع الخطاب الإلكتروني', type: 'BR', owner: 'Maali A.', cycle: 32 },
  { id: 'BR-2024-094', summary: 'طلب تعديل رخصة', type: 'BR', owner: 'Khaled A.', cycle: 128 },
  { id: 'BR-2024-096', summary: 'نظام إدارة الشكاوى', type: 'BR', owner: 'Alaa A.', cycle: 67 },
  { id: 'BR-2024-098', summary: 'بوابة الخدمات الإلكترونية', type: 'BR', owner: 'Fahad A.', cycle: 89 },
  { id: 'BR-2024-101', summary: 'تحديث بيانات المنشأة', type: 'BR', owner: 'Nora A.', cycle: 23 },
];

const DECISIONS_DUE = [
  { id: 'BR-2024-072', summary: 'طلب ترخيص جديد للمصنع', status: 'Analyse', reason: 'Missing PO', age: 14 },
  { id: 'BR-2024-078', summary: 'تعديل السجل التجاري', status: 'New Request', reason: 'No decision', age: 21 },
  { id: 'BR-2024-081', summary: 'نقل ملكية المنشأة', status: 'Analyse', reason: 'Missing BA', age: 18 },
];

const AGING_BREACHES = [
  { id: 'BR-2024-065', summary: 'إصدار شهادة المطابقة', status: 'New Request', owner: 'Unassigned', days: 28, max: 14 },
  { id: 'BR-2024-070', summary: 'تجديد الترخيص الصناعي', status: 'Analyse', owner: 'Maali A.', days: 35, max: 21 },
  { id: 'BR-2024-074', summary: 'طلب دعم فني', status: 'Approved', owner: 'Khaled A.', days: 15, max: 7 },
];

const MONTHS_BY_QUARTER: Record<string, string[]> = {
  Q1: ['Jan', 'Feb', 'Mar'],
  Q2: ['Apr', 'May', 'Jun'],
  Q3: ['Jul', 'Aug', 'Sep'],
  Q4: ['Oct', 'Nov', 'Dec'],
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

// Helper to get current quarter and dynamic years
const getCurrentQuarterInfo = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentQuarterIndex = Math.floor(currentMonth / 3); // 0-3
  const currentQuarter = QUARTERS[currentQuarterIndex];
  
  // Generate years: previous year, current year, next year
  const years = [currentYear - 1, currentYear, currentYear + 1];
  
  return { currentYear, currentQuarter, currentQuarterIndex, years };
};

// Generate heat map data
const generateHeatMapData = () => {
  const statuses = ['New Request', 'Analyse', 'Ready to Implement', 'Approved', 'Implement', 'Closed'];
  return SAMPLE_RESOURCES.slice(0, 6).map(resource => ({
    ...resource,
    weeks: Array.from({ length: 12 }, () => {
      const rand = Math.random();
      if (rand < 0.15) return { status: null, count: 0 }; // Empty
      if (rand < 0.25) return { status: 'leave', count: 0 }; // Leave
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      return { status, count: Math.floor(Math.random() * 4) + 1 };
    }),
  }));
};

// Components
const QuarterSelector: React.FC<{
  quarters: { q: string; year: number }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onShift: (dir: -1 | 1) => void;
  canShiftLeft: boolean;
  canShiftRight: boolean;
}> = ({ quarters, selectedIndex, onSelect, onShift, canShiftLeft, canShiftRight }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onShift(-1)}
        disabled={!canShiftLeft}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
          canShiftLeft
            ? "border-gray-200 hover:bg-gray-50 text-gray-600"
            : "border-gray-100 text-gray-300 cursor-not-allowed"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      
      <div className="flex bg-gray-100 rounded-xl p-1">
        {quarters.map((q, i) => (
          <button
            key={`${q.q}-${q.year}`}
            onClick={() => onSelect(i)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              selectedIndex === i
                ? "text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
            style={selectedIndex === i ? { backgroundColor: COLORS.gold } : {}}
          >
            {q.q} {q.year}
          </button>
        ))}
      </div>

      <button
        onClick={() => onShift(1)}
        disabled={!canShiftRight}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
          canShiftRight
            ? "border-gray-200 hover:bg-gray-50 text-gray-600"
            : "border-gray-100 text-gray-300 cursor-not-allowed"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const MetricBadge: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
}> = ({ icon, value, label, color, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "bg-white rounded-xl border-2 border-gray-100 px-4 py-3 flex items-center gap-3 transition-all",
        onClick ? "hover:border-gray-200 hover:shadow-sm cursor-pointer" : "cursor-default"
      )}
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <div className="text-left">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </button>
  );
};

const FunnelWidget: React.FC<{ quarter: string; data: typeof FUNNEL_DATA }> = ({ quarter, data }) => {
  const totalWidth = 100;
  const heights = [100, 85, 70, 55, 45, 35];
  
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">Flow Health</h3>
        <span className="text-xs text-gray-400">{quarter}</span>
      </div>
      
      <div className="flex items-end justify-between gap-1 h-48">
        {data.map((item, i) => {
          const height = heights[i];
          return (
            <div key={item.step} className="flex-1 flex flex-col items-center">
              <div className="relative w-full flex justify-center mb-2">
                {item.aging > 0 && (
                  <div 
                    className="absolute -top-2 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: COLORS.amber }}
                  >
                    {item.aging}
                  </div>
                )}
                <div
                  className="w-full rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all hover:opacity-90"
                  style={{ 
                    backgroundColor: FUNNEL_COLORS[item.step],
                    height: `${height}px`,
                  }}
                >
                  {item.count}
                </div>
              </div>
              <div className="text-[10px] text-gray-500 text-center leading-tight">
                {item.step.split(' ').map((word, wi) => (
                  <span key={wi}>{word}<br/></span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ConversionsWidget: React.FC<{ quarter: string }> = ({ quarter }) => {
  // Conversions: Items that moved from New Request to Ready to Implement
  const conversionData = {
    total: 14,
    months: [4, 6, 4], // Monthly breakdown
    avgCycleTime: 8, // Average days to convert
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">Conversions</h3>
        <span className="text-xs text-gray-400">{quarter}</span>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            New Request → Ready to Implement
          </span>
          <span className="text-2xl font-bold" style={{ color: COLORS.gold }}>{conversionData.total}</span>
        </div>
        
        <div className="flex items-end gap-3 h-16 mb-3">
          {['M1', 'M2', 'M3'].map((label, mi) => (
            <div key={mi} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full rounded-t"
                style={{ 
                  backgroundColor: COLORS.champagne,
                  height: `${(conversionData.months[mi] / Math.max(...conversionData.months)) * 100}%`,
                  minHeight: '8px'
                }}
              />
              <span className="text-[10px] text-gray-400 mt-1">{conversionData.months[mi]}</span>
              <span className="text-[9px] text-gray-300">{label}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-500">Avg. cycle time</span>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: COLORS.goldLight, color: COLORS.bronze }}
          >
            {conversionData.avgCycleTime} days
          </span>
        </div>
      </div>
    </div>
  );
};

const ResourceHeatMap: React.FC<{ 
  quarter: string; 
  resources: ReturnType<typeof generateHeatMapData>;
  leaveRecords: Record<string, boolean>;
  onToggleLeave: (key: string) => void;
}> = ({ quarter, resources, leaveRecords, onToggleLeave }) => {
  const months = MONTHS_BY_QUARTER[quarter] || ['Jan', 'Feb', 'Mar'];
  const weeks = ['W1', 'W2', 'W3', 'W4'];
  
  const leaveCount = Object.values(leaveRecords).filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Resource Allocation Heat Map</h3>
          <span className="text-xs text-gray-400">Who is working on what, when</span>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          {Object.entries(FUNNEL_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-gray-500">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span className="text-gray-500">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.grey }} />
            <span className="text-gray-500">L (Leave)</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 mb-2">
        <div />
        {months.map(month => (
          <div key={month} className="col-span-4 text-center text-xs font-medium text-gray-500">
            {month}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 mb-3">
        <div />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400">
            {weeks[i % 4]}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {resources.map((resource) => {
          const isPO = resource.role === 'Product Owner';
          return (
            <div key={resource.name} className="grid grid-cols-[200px_repeat(12,1fr)] gap-1 items-center">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: isPO ? COLORS.bronze : COLORS.olive }}
                >
                  {resource.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{resource.name}</div>
                  <span 
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: isPO ? COLORS.goldLight : COLORS.oliveLight,
                      color: isPO ? COLORS.bronze : COLORS.olive
                    }}
                  >
                    {isPO ? 'PO' : 'BA'}
                  </span>
                </div>
              </div>
              {resource.weeks.map((week, wi) => {
                const leaveKey = `${resource.name}-${wi}`;
                const isLeave = leaveRecords[leaveKey] || week.status === 'leave';
                
                if (isLeave) {
                  return (
                    <div
                      key={wi}
                      className="h-8 rounded flex items-center justify-center text-[10px] font-bold text-gray-600"
                      style={{ backgroundColor: COLORS.grey }}
                    >
                      L
                    </div>
                  );
                }
                
                if (!week.status || week.count === 0) {
                  return (
                    <button
                      key={wi}
                      onClick={() => onToggleLeave(leaveKey)}
                      className="h-8 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                    />
                  );
                }
                
                return (
                  <div
                    key={wi}
                    className="h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: FUNNEL_COLORS[week.status] }}
                  >
                    {week.count}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <span>Click gray cells to mark leave</span>
        <span>{leaveCount} leave day(s) marked</span>
      </div>
    </div>
  );
};

const POBAWidget: React.FC<{
  resources: typeof SAMPLE_RESOURCES;
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
}> = ({ resources, selected, onSelectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredResources = resources.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedResources = resources.filter(r => selected.includes(r.name));
  const totalClosed = selectedResources.reduce((sum, r) => sum + r.closed, 0);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Product Owner / Business Analyst</h3>
          <span className="text-xs text-gray-400">Q4 2024</span>
        </div>

        {/* Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-200 hover:bg-gray-50 transition-all"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span>Select Resources</span>
            {selected.length > 0 && (
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: COLORS.gold }}
              >
                {selected.length}
              </span>
            )}
            <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-90")} />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                <button 
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  onClick={() => onSelectionChange(resources.map(r => r.name))}
                >
                  Select All
                </button>
                <span className="text-xs text-gray-400">{selected.length} of {resources.length} selected</span>
                <button 
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  onClick={() => onSelectionChange([])}
                >
                  Clear
                </button>
              </div>

              <div className="max-h-64 overflow-auto">
                {filteredResources.map(resource => {
                  const isSelected = selected.includes(resource.name);
                  const isPO = resource.role === 'Product Owner';
                  return (
                    <button
                      key={resource.name}
                      onClick={() => {
                        if (isSelected) {
                          onSelectionChange(selected.filter(n => n !== resource.name));
                        } else {
                          onSelectionChange([...selected, resource.name]);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors",
                        isSelected && "bg-amber-50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: isPO ? COLORS.bronze : COLORS.olive }}
                      >
                        {resource.initials}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-800">{resource.name}</div>
                      </div>
                      <span 
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: isPO ? COLORS.goldLight : COLORS.oliveLight,
                          color: isPO ? COLORS.bronze : COLORS.olive
                        }}
                      >
                        {isPO ? 'PO' : 'BA'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: COLORS.gold }}
                >
                  Apply Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource Cards */}
      {selectedResources.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No resources selected</p>
          <p className="text-xs text-gray-400 mt-1">Use the dropdown above to select resources</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {selectedResources.map(resource => {
            const isPO = resource.role === 'Product Owner';
            return (
              <div 
                key={resource.name}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: isPO ? COLORS.bronze : COLORS.olive }}
                >
                  {resource.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-gray-800 truncate">{resource.name}</span>
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{
                        backgroundColor: isPO ? COLORS.goldLight : COLORS.oliveLight,
                        color: isPO ? COLORS.bronze : COLORS.olive
                      }}
                    >
                      {isPO ? 'PO' : 'BA'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-gray-500">Analyse: <strong className="text-gray-700">{resource.analyse}</strong></span>
                    <span className="text-gray-500">Approved: <strong className="text-gray-700">{resource.approved}</strong></span>
                    <span className="text-gray-500">Implement: <strong className="text-gray-700">{resource.implement}</strong></span>
                    <span className="text-gray-500">Closed: <strong style={{ color: COLORS.olive }}>{resource.closed}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Showing {selectedResources.length} of {resources.length} resources</span>
        <span>Total Closed: <strong style={{ color: COLORS.olive }}>{totalClosed}</strong></span>
      </div>
    </div>
  );
};

const ImplementationList: React.FC<{ items: typeof IMPLEMENTATION_ITEMS }> = ({ items }) => {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">In Implementation</h3>
          <span className="text-xs text-gray-400">{items.length} items</span>
        </div>
      </div>

      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left py-2 w-8">#</th>
              <th className="text-left py-2 w-28">ID</th>
              <th className="text-left py-2">Summary</th>
              <th className="text-left py-2 w-16">Type</th>
              <th className="text-left py-2 w-24">Owner</th>
              <th className="text-right py-2 w-16">Cycle</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3">
                  <span 
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: COLORS.gold }}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="py-3 font-mono text-xs text-gray-600">{item.id}</td>
                <td className="py-3 text-gray-800" dir="auto">{item.summary}</td>
                <td className="py-3">
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-semibold"
                    style={{ backgroundColor: COLORS.goldLight, color: COLORS.bronze }}
                  >
                    {item.type}
                  </span>
                </td>
                <td className="py-3 text-gray-600 text-xs">{item.owner}</td>
                <td className={cn(
                  "py-3 text-right font-medium",
                  item.cycle > 100 ? "text-red-600" : "text-gray-700"
                )}>
                  {item.cycle}d
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SlidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  count: number;
  variant: 'amber' | 'red';
  children: React.ReactNode;
}> = ({ open, onClose, title, count, variant, children }) => {
  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: variant === 'amber' ? COLORS.amber : COLORS.red }} />
            <h3 className="font-bold text-gray-900">{title}</h3>
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: variant === 'amber' ? COLORS.amber : COLORS.red }}
            >
              {count}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
};

// Main Component
export default function ProductRoomPage() {
  // Get current quarter info for default selection
  const { currentYear, currentQuarterIndex, years } = getCurrentQuarterInfo();
  
  // Generate quarters array
  const allQuarters: { q: string; year: number }[] = [];
  years.forEach(year => {
    QUARTERS.forEach(q => {
      allQuarters.push({ q, year });
    });
  });
  
  // Find the index of current quarter in allQuarters
  const currentQuarterGlobalIndex = allQuarters.findIndex(
    q => q.year === currentYear && q.q === QUARTERS[currentQuarterIndex]
  );
  
  // Calculate initial offset to show current quarter in the middle (index 1 of visible 3)
  const initialOffset = Math.max(0, Math.min(allQuarters.length - 3, currentQuarterGlobalIndex - 1));
  const initialSelectedIndex = currentQuarterGlobalIndex - initialOffset;
  
  const [quarterOffset, setQuarterOffset] = useState(initialOffset);
  const [selectedQuarterIndex, setSelectedQuarterIndex] = useState(initialSelectedIndex);
  const [showDecisions, setShowDecisions] = useState(false);
  const [showAging, setShowAging] = useState(false);
  const [leaveRecords, setLeaveRecords] = useState<Record<string, boolean>>({});
  const [selectedPOBA, setSelectedPOBA] = useState<string[]>(
    SAMPLE_RESOURCES.slice(0, 4).map(r => r.name)
  );
  const [heatMapData] = useState(generateHeatMapData);

  const visibleQuarters = allQuarters.slice(quarterOffset, quarterOffset + 3);
  const selectedQuarter = visibleQuarters[selectedQuarterIndex];
  const currentQuarterLabel = selectedQuarter ? `${selectedQuarter.q} ${selectedQuarter.year}` : 'Q4 2024';

  const canShiftLeft = quarterOffset > 0;
  const canShiftRight = quarterOffset < allQuarters.length - 3;

  const handleShift = (dir: -1 | 1) => {
    setQuarterOffset(prev => Math.max(0, Math.min(allQuarters.length - 3, prev + dir)));
  };

  const handleToggleLeave = (key: string) => {
    setLeaveRecords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get current date for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b-2 border-gray-100 px-6 py-4 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{greeting}, Vikram</h1>
              <p className="text-sm text-gray-500">MDT Portfolio Overview</p>
            </div>
            <QuarterSelector
              quarters={visibleQuarters}
              selectedIndex={selectedQuarterIndex}
              onSelect={setSelectedQuarterIndex}
              onShift={handleShift}
              canShiftLeft={canShiftLeft}
              canShiftRight={canShiftRight}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 space-y-6">
          {/* Quarter Label */}
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{currentQuarterLabel}</h2>
            <span 
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ 
                backgroundColor: selectedQuarterIndex === 1 ? COLORS.oliveLight : COLORS.goldLight,
                color: selectedQuarterIndex === 1 ? COLORS.olive : COLORS.bronze
              }}
            >
              {selectedQuarterIndex === 0 ? 'Previous Quarter' : selectedQuarterIndex === 1 ? 'This Quarter' : 'Next Quarter'}
            </span>
          </div>

          {/* Metrics Row */}
          <div className="flex flex-wrap gap-3">
            <MetricBadge
              icon={<Check className="w-5 h-5" />}
              value={23}
              label="Committed"
              color={COLORS.gold}
            />
            <MetricBadge
              icon={<Rocket className="w-5 h-5" />}
              value={6}
              label="Ready to Implement"
              color={COLORS.olive}
            />
            <MetricBadge
              icon={<Zap className="w-5 h-5" />}
              value={DECISIONS_DUE.length}
              label="Decisions Due"
              color={COLORS.amber}
              onClick={() => setShowDecisions(true)}
            />
            <MetricBadge
              icon={<Clock className="w-5 h-5" />}
              value={AGING_BREACHES.length}
              label="Aging Breaches"
              color={COLORS.red}
              onClick={() => setShowAging(true)}
            />
            <MetricBadge
              icon={<TrendingUp className="w-5 h-5" />}
              value={18}
              label="New → Implement"
              color={COLORS.bronze}
            />
          </div>

          {/* Funnel Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <FunnelWidget quarter={currentQuarterLabel} data={FUNNEL_DATA} />
            </div>
            <div className="lg:col-span-2">
              <ConversionsWidget quarter={currentQuarterLabel} />
            </div>
          </div>

          {/* Heat Map */}
          <ResourceHeatMap
            quarter={selectedQuarter?.q || 'Q4'}
            resources={heatMapData}
            leaveRecords={leaveRecords}
            onToggleLeave={handleToggleLeave}
          />

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <POBAWidget
              resources={SAMPLE_RESOURCES}
              selected={selectedPOBA}
              onSelectionChange={setSelectedPOBA}
            />
            <ImplementationList items={IMPLEMENTATION_ITEMS} />
          </div>
        </main>
      </div>

      {/* Slide Panels */}
      <SlidePanel
        open={showDecisions}
        onClose={() => setShowDecisions(false)}
        title="Decisions Due"
        count={DECISIONS_DUE.length}
        variant="amber"
      >
        <div className="space-y-3">
          {DECISIONS_DUE.map(item => (
            <div 
              key={item.id}
              className="p-4 rounded-xl border-2 transition-colors hover:bg-amber-50"
              style={{ borderColor: COLORS.amber }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-medium text-gray-700">{item.id}</span>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: COLORS.amber }}
                >
                  {item.reason}
                </span>
              </div>
              <p className="text-sm text-gray-800 mb-2" dir="auto">{item.summary}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{item.status}</span>
                <span>{item.age} days</span>
              </div>
            </div>
          ))}
        </div>
      </SlidePanel>

      <SlidePanel
        open={showAging}
        onClose={() => setShowAging(false)}
        title="Aging Breaches"
        count={AGING_BREACHES.length}
        variant="red"
      >
        <div className="space-y-3">
          {AGING_BREACHES.map(item => (
            <div 
              key={item.id}
              className="p-4 rounded-xl border-2 transition-colors hover:bg-red-50"
              style={{ borderColor: COLORS.red }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-medium text-gray-700">{item.id}</span>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: COLORS.red }}
                >
                  {item.days}d / {item.max}d max
                </span>
              </div>
              <p className="text-sm text-gray-800 mb-2" dir="auto">{item.summary}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{item.status}</span>
                <span>{item.owner}</span>
              </div>
            </div>
          ))}
        </div>
      </SlidePanel>
    </div>
  );
}

import { useState, useMemo, useRef, useEffect } from 'react';
import { Target, Users, BarChart3, AlertTriangle, Filter, Download, Plus, TrendingUp, TrendingDown, X, List, Grid3X3, PieChart, ChevronDown, FileSpreadsheet, FileText, Loader2, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkillsMatrixHeatmap } from '@/components/skills-inventory/SkillsMatrixHeatmap';
import { SkillGapAnalysis } from '@/components/skills-inventory/SkillGapAnalysis';
import { SkillsInventoryReport } from '@/components/skills-inventory/SkillsInventoryReport';
import { SkillsFiltersDialog, SkillsInventoryFilters } from '@/components/skills-inventory/SkillsFiltersDialog';
import { EditSkillModal } from '@/components/skills-inventory/EditSkillModal';
import { DeleteSkillDialog } from '@/components/skills-inventory/DeleteSkillDialog';
import { AddSkillModal } from '@/components/skills-inventory/AddSkillModal';
import { toast } from 'sonner';

type ViewMode = 'table' | 'matrix' | 'gap-analysis' | 'report';

type SkillData = {
  id: number;
  name: string;
  role: string;
  project: string;
  skill: string;
  proficiency: string;
  coverage: number;
  lastUpdated: string;
};

const viewTabs = [
  { id: 'table' as ViewMode, label: 'Table', icon: List },
  { id: 'matrix' as ViewMode, label: 'Matrix', icon: Grid3X3 },
  { id: 'gap-analysis' as ViewMode, label: 'Gap Analysis', icon: AlertTriangle },
  { id: 'report' as ViewMode, label: 'Report', icon: PieChart },
];

// Sample data based on the Excel file
const teamMembersData = [
  { id: 1, name: 'Hasan Elsherby', role: '.Net Developer', project: 'Tahommena', skill: 'C# / .NET', proficiency: 'Expert', coverage: 92, lastUpdated: '2024-12-01' },
  { id: 2, name: 'Yousif Shalaby', role: '.Net Developer', project: 'Tahommena', skill: 'ASP.NET Core', proficiency: 'Advanced', coverage: 85, lastUpdated: '2024-11-28' },
  { id: 3, name: 'Mohammed Alaa', role: '.Net Developer', project: 'Tahommena', skill: 'Entity Framework', proficiency: 'Advanced', coverage: 78, lastUpdated: '2024-11-25' },
  { id: 4, name: 'Ahmed Yousry', role: '.Net Developer', project: 'Tahommena', skill: 'Azure DevOps', proficiency: 'Intermediate', coverage: 65, lastUpdated: '2024-12-02' },
  { id: 5, name: 'Ayaz Muhammad', role: 'Backend Developer', project: 'Sectorial', skill: 'Node.js', proficiency: 'Expert', coverage: 95, lastUpdated: '2024-12-03' },
  { id: 6, name: 'Mazen Yehia', role: 'Backend Developer', project: 'ICP', skill: 'Python', proficiency: 'Advanced', coverage: 88, lastUpdated: '2024-11-30' },
  { id: 7, name: 'Raza Bangi', role: 'Backend Developer', project: 'Sectorial', skill: 'Java', proficiency: 'Intermediate', coverage: 72, lastUpdated: '2024-11-27' },
  { id: 8, name: 'Syed Habib', role: 'Backend Developer', project: 'Sectorial', skill: 'PostgreSQL', proficiency: 'Advanced', coverage: 82, lastUpdated: '2024-12-01' },
  { id: 9, name: 'Ubaid Nawab', role: 'Backend Developer', project: 'Inspection', skill: 'MongoDB', proficiency: 'Intermediate', coverage: 68, lastUpdated: '2024-11-29' },
  { id: 10, name: 'Waqas Ali', role: 'Backend Developer', project: 'Senaei', skill: 'GraphQL', proficiency: 'Beginner', coverage: 45, lastUpdated: '2024-12-03' },
  { id: 11, name: 'Hassan Raza Hasrat', role: 'Backend Lead', project: 'Senaei', skill: 'System Design', proficiency: 'Expert', coverage: 96, lastUpdated: '2024-12-03' },
  { id: 12, name: 'Amadou Ndiaye', role: 'Data Engineer', project: 'Inspection', skill: 'Apache Spark', proficiency: 'Advanced', coverage: 84, lastUpdated: '2024-11-26' },
  { id: 13, name: 'Maaz Majid', role: 'Data Engineer', project: 'I360', skill: 'ETL Pipelines', proficiency: 'Expert', coverage: 91, lastUpdated: '2024-12-01' },
  { id: 14, name: 'Arslan Malik', role: 'Devops', project: 'Devops', skill: 'Kubernetes', proficiency: 'Expert', coverage: 98, lastUpdated: '2024-12-03' },
  { id: 15, name: 'Andrew Fayyaz', role: 'Frontend', project: 'Sectorial', skill: 'React', proficiency: 'Advanced', coverage: 86, lastUpdated: '2024-11-28' },
  { id: 16, name: 'Adnan Ali', role: 'Frontend developer', project: 'ICP', skill: 'TypeScript', proficiency: 'Expert', coverage: 93, lastUpdated: '2024-12-02' },
  { id: 17, name: 'Divyam Kshatriya', role: 'Frontend developer', project: 'Senaei', skill: 'Vue.js', proficiency: 'Intermediate', coverage: 70, lastUpdated: '2024-11-30' },
  { id: 18, name: 'Menna Tula Nasser', role: 'Frontend developer', project: 'ICP', skill: 'CSS/Tailwind', proficiency: 'Advanced', coverage: 81, lastUpdated: '2024-12-01' },
  { id: 19, name: 'Sherif Gjini', role: 'Frontend developer', project: 'MIM Website', skill: 'Next.js', proficiency: 'Advanced', coverage: 79, lastUpdated: '2024-11-27' },
  { id: 20, name: 'Waseem Ahmad', role: 'Frontend developer', project: 'Sectorial', skill: 'Angular', proficiency: 'Intermediate', coverage: 62, lastUpdated: '2024-12-03' },
];

const proficiencyLevels = [
  { label: 'Expert', colorClass: 'bg-health-green' },
  { label: 'Advanced', colorClass: 'bg-info' },
  { label: 'Intermediate', colorClass: 'bg-warning' },
  { label: 'Beginner', colorClass: 'bg-destructive' },
  { label: 'No Skill', colorClass: 'bg-muted-foreground' },
];

const getProficiencyColor = (level: string) => {
  switch (level) {
    case 'Expert': return 'hsl(var(--health-green))';
    case 'Advanced': return 'hsl(var(--info))';
    case 'Intermediate': return 'hsl(var(--warning))';
    case 'Beginner': return 'hsl(var(--destructive))';
    default: return 'hsl(var(--muted-foreground))';
  }
};

const projects = ['All Projects', 'Tahommena', 'Sectorial', 'ICP', 'Inspection', 'Senaei', 'I360', 'Devops', 'MIM Website', 'IR platform'];
const skillCategories = ['All Categories', 'Backend', 'Frontend', 'Data', 'DevOps', 'Mobile', 'QA', 'Management'];

export default function SkillsInventory() {
  const [selectedProgram, setSelectedProgram] = useState('All Projects');
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedProficiencies, setSelectedProficiencies] = useState<string[]>([]);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SkillsInventoryFilters>({});
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [skillsData, setSkillsData] = useState(teamMembersData);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditClick = (skill: SkillData) => {
    setSelectedSkill(skill);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (skill: SkillData) => {
    setSelectedSkill(skill);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedSkill) return;
    setIsDeleting(true);
    // Simulate deletion
    setTimeout(() => {
      setSkillsData(prev => prev.filter(s => s.id !== selectedSkill.id));
      toast.success('Skill assessment deleted');
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEditModalOpen(false);
      setSelectedSkill(null);
    }, 500);
  };

  const handleSaveSkill = (id: number, data: { skill: string; proficiency: string; notes: string }) => {
    setSkillsData(prev => prev.map(s => 
      s.id === id ? { ...s, skill: data.skill, proficiency: data.proficiency } : s
    ));
  };

  const handleAddSkill = (data: { 
    teamMemberId: number; 
    teamMemberName: string;
    teamMemberRole: string;
    skill: string; 
    proficiency: string; 
    notes: string 
  }) => {
    const newId = Math.max(...skillsData.map(s => s.id)) + 1;
    const newSkill: SkillData = {
      id: newId,
      name: data.teamMemberName,
      role: data.teamMemberRole,
      project: 'Unassigned',
      skill: data.skill,
      proficiency: data.proficiency,
      coverage: 50,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setSkillsData(prev => [newSkill, ...prev]);
  };

  // Get unique team members for AddSkillModal dropdown
  const teamMembersForDropdown = useMemo(() => {
    const seen = new Set<string>();
    return teamMembersData.filter(m => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    }).map(m => ({ id: m.id, name: m.name, role: m.role }));
  }, []);

  // Extract unique values for filter options
  const uniqueTeamMembers = useMemo(() => [...new Set(teamMembersData.map(m => m.name))], []);
  const uniqueSkills = useMemo(() => [...new Set(teamMembersData.map(m => m.skill))], []);
  const uniqueTeams = useMemo(() => ['Backend', 'Frontend', 'Data', 'DevOps', 'QA'], []);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    return Object.entries(advancedFilters).filter(([key, value]) => {
      if (key === 'activeQuickFilter') return false;
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '' && value !== null && value !== 'all';
    }).length;
  }, [advancedFilters]);

  // Filter data based on sidebar and advanced filters
  const filteredData = useMemo(() => {
    return skillsData.filter(member => {
      // Sidebar filters
      if (selectedProgram !== 'All Projects' && member.project !== selectedProgram) return false;
      if (selectedProficiencies.length > 0 && !selectedProficiencies.includes(member.proficiency)) return false;

      // Advanced filters from dialog
      if (advancedFilters.teamMemberNames?.length && !advancedFilters.teamMemberNames.includes(member.name)) return false;
      if (advancedFilters.skillNames?.length && !advancedFilters.skillNames.includes(member.skill)) return false;
      if (advancedFilters.proficiencyLevels?.length && !advancedFilters.proficiencyLevels.includes(member.proficiency)) return false;
      
      // Coverage filter
      if (advancedFilters.coverageMin !== null && advancedFilters.coverageMin !== undefined && member.coverage < advancedFilters.coverageMin) return false;
      if (advancedFilters.coverageMax !== null && advancedFilters.coverageMax !== undefined && member.coverage > advancedFilters.coverageMax) return false;

      return true;
    });
  }, [skillsData, selectedProgram, selectedProficiencies, advancedFilters]);

  // Calculate stats
  const totalSkills = 48;
  const teamMembers = 33;
  const avgCoverage = Math.round(filteredData.reduce((sum, m) => sum + m.coverage, 0) / filteredData.length) || 0;
  const criticalGaps = filteredData.filter(m => m.coverage < 50).length;

  const handleProficiencyToggle = (level: string) => {
    setSelectedProficiencies(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const clearFilters = () => {
    setSelectedProgram('All Projects');
    setSelectedTeam('All Teams');
    setSelectedCategory('All Categories');
    setSelectedProficiencies([]);
    setAdvancedFilters({});
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Role', 'Project', 'Primary Skill', 'Proficiency', 'Coverage %', 'Last Updated'];
    const rows = filteredData.map(m => [m.name, m.role, m.project, m.skill, m.proficiency, m.coverage, m.lastUpdated]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skills_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      // Calculate summary statistics
      const totalSkillsCount = filteredData.length;
      const uniqueMembers = [...new Set(filteredData.map(m => m.name))].length;
      const avgCoverageVal = Math.round(filteredData.reduce((sum, m) => sum + m.coverage, 0) / totalSkillsCount) || 0;
      const expertCount = filteredData.filter(m => m.proficiency === 'Expert').length;
      const advancedCount = filteredData.filter(m => m.proficiency === 'Advanced').length;
      const intermediateCount = filteredData.filter(m => m.proficiency === 'Intermediate').length;
      const beginnerCount = filteredData.filter(m => m.proficiency === 'Beginner').length;

      // Skills by project
      const projectDist = filteredData.reduce((acc, m) => {
        acc[m.project] = (acc[m.project] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build comprehensive report CSV
      const reportSections = [
        '=== SKILLS INVENTORY REPORT ===',
        `Generated: ${new Date().toLocaleString()}`,
        '',
        '=== SUMMARY STATISTICS ===',
        `Total Skills Tracked,${totalSkillsCount}`,
        `Team Members,${uniqueMembers}`,
        `Average Coverage,${avgCoverageVal}%`,
        `Critical Gaps (< 50% coverage),${filteredData.filter(m => m.coverage < 50).length}`,
        '',
        '=== PROFICIENCY DISTRIBUTION ===',
        `Expert,${expertCount}`,
        `Advanced,${advancedCount}`,
        `Intermediate,${intermediateCount}`,
        `Beginner,${beginnerCount}`,
        '',
        '=== SKILLS BY PROJECT ===',
        ...Object.entries(projectDist).map(([proj, count]) => `${proj},${count}`),
        '',
        '=== DETAILED SKILLS DATA ===',
        'Name,Role,Project,Primary Skill,Proficiency,Coverage %,Last Updated',
        ...filteredData.map(m => 
          `${m.name},${m.role},${m.project},${m.skill},${m.proficiency},${m.coverage},${m.lastUpdated}`
        )
      ];

      const csvContent = reportSections.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `skills-inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Skills report exported successfully');
    } finally {
      setIsExporting(false);
      setExportMenuOpen(false);
    }
  };

  const handleExportMatrix = () => {
    const skills = [...new Set(teamMembersData.map(m => m.skill))];
    const members = [...new Set(teamMembersData.map(m => m.name))];
    
    const headers = ['Team Member', ...skills];
    const rows = members.map(member => {
      const memberData = teamMembersData.filter(m => m.name === member);
      const skillLevels = skills.map(skill => {
        const found = memberData.find(m => m.skill === skill);
        return found ? found.proficiency : '-';
      });
      return [member, ...skillLevels];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `skills-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Skills matrix exported successfully');
    setExportMenuOpen(false);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  // Render the appropriate view based on viewMode
  const renderContent = () => {
    switch (viewMode) {
      case 'matrix':
        return <SkillsMatrixHeatmap />;
      case 'gap-analysis':
        return <SkillGapAnalysis />;
      case 'report':
        return <SkillsInventoryReport />;
      default:
        return renderTableView();
    }
  };

  const renderTableView = () => (
    <>
      {/* Stats Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-5">
          <StatsCard icon={Target} label="Total Skills Tracked" value={totalSkills} change="+3" positive />
          <StatsCard icon={Users} label="Team Members" value={teamMembers} change="+2" positive />
          <StatsCard icon={BarChart3} label="Avg. Coverage" value={`${avgCoverage}%`} change="+5%" positive />
          <StatsCard icon={AlertTriangle} label="Critical Gaps" value={criticalGaps} change="-2" positive />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-8">
        {/* Table Area */}
        <div className="rounded-xl overflow-hidden bg-card border border-brand-gold-border">
          {/* Table Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-brand-gold-border">
            <h2 className="text-base font-semibold text-foreground">Skills Inventory</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-brand-gold-border text-muted-foreground hover:bg-secondary relative"
                onClick={() => setFiltersDialogOpen(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-brand-gold text-white text-xs flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-brand-gold-border text-muted-foreground hover:bg-secondary"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="gold" size="sm" onClick={() => setAddSkillOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
            </div>
          </div>

          {/* Table - Catalyst Table Style */}
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead style={{ background: 'hsl(35 46% 97%)' }}>
                <tr style={{ background: 'hsl(35 46% 97%)' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Team Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Primary Skill</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Proficiency</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Coverage</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Last Updated</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(member => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-brand-gold/5 border-b border-brand-gold-border"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleEditClick(member)}
                        className="flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-brand-gold to-brand-gold-dark text-brand-dark">
                          {getInitials(member.name)}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-foreground group-hover:text-brand-gold group-hover:underline transition-colors">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleEditClick(member)}
                        className="text-sm text-foreground hover:text-brand-gold hover:underline transition-colors cursor-pointer"
                      >
                        {member.skill}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: `${getProficiencyColor(member.proficiency)}20`,
                          color: getProficiencyColor(member.proficiency),
                        }}
                      >
                        {member.proficiency}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full overflow-hidden bg-brand-dark">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${member.coverage}%`,
                              background: member.coverage >= 80
                                ? 'hsl(var(--health-green))'
                                : member.coverage >= 60
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--destructive))',
                            }}
                          />
                        </div>
                        <span className="text-sm text-foreground">{member.coverage}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">{member.lastUpdated}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(member)}
                          className="p-2 hover:bg-brand-gold/10 rounded-lg transition-colors text-muted-foreground hover:text-brand-gold"
                          title="Edit skill"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                          title="Delete skill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-8 py-6 border-b border-brand-gold-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Skills Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and manage team skills, proficiency levels, and identify capability gaps
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1 p-1 bg-white border border-brand-gold rounded-lg w-fit">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-brand-gold text-white'
                    : 'text-brand-dark hover:text-brand-gold hover:bg-brand-gold/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Skills Filters Dialog */}
      <SkillsFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        teamMembers={uniqueTeamMembers}
        skills={uniqueSkills}
        skillCategories={skillCategories.filter(c => c !== 'All Categories')}
        teams={uniqueTeams}
      />

      {/* Edit Skill Modal */}
      <EditSkillModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSkill(null);
        }}
        skill={selectedSkill}
        onDelete={() => {
          setEditModalOpen(false);
          setDeleteDialogOpen(true);
        }}
        onSave={handleSaveSkill}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSkillDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedSkill(null);
        }}
        onConfirm={handleDeleteConfirm}
        skillName={selectedSkill?.skill || ''}
        teamMemberName={selectedSkill?.name || ''}
        isDeleting={isDeleting}
      />

      {/* Add Skill Modal */}
      <AddSkillModal
        open={addSkillOpen}
        onClose={() => setAddSkillOpen(false)}
        teamMembers={teamMembersForDropdown}
        onSave={handleAddSkill}
      />
    </div>
  );
}

// Stats Card Component
function StatsCard({ icon: Icon, label, value, change, positive }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl p-5 bg-card border border-brand-gold-border">
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-lg bg-brand-gold/15">
          <Icon className="h-5 w-5 text-brand-gold" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-health-green' : 'text-destructive'}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

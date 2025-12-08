import { useState } from 'react';
import { Target, Users, BarChart3, AlertTriangle, Filter, Download, Plus, TrendingUp, TrendingDown, X, List, Grid3X3, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SkillsMatrixHeatmap } from '@/components/skills-inventory/SkillsMatrixHeatmap';
import { SkillGapAnalysis } from '@/components/skills-inventory/SkillGapAnalysis';
import { SkillsInventoryReport } from '@/components/skills-inventory/SkillsInventoryReport';

type ViewMode = 'table' | 'matrix' | 'gap-analysis' | 'report';

const viewTabs = [
  { id: 'table' as ViewMode, label: 'Table', icon: List },
  { id: 'matrix' as ViewMode, label: 'Matrix', icon: Grid3X3 },
  { id: 'gap-analysis' as ViewMode, label: 'Gap Analysis', icon: AlertTriangle },
  { id: 'report' as ViewMode, label: 'Report', icon: PieChart },
];

// Sample data based on the Excel file
const teamMembersData = [
  { id: 1, name: 'Hasan Elsherby', role: '.Net Developer', project: 'Tahommena', skill: 'C# / .NET', proficiency: 'Expert', certifications: 2, coverage: 92, lastUpdated: '2024-12-01' },
  { id: 2, name: 'Yousif Shalaby', role: '.Net Developer', project: 'Tahommena', skill: 'ASP.NET Core', proficiency: 'Advanced', certifications: 1, coverage: 85, lastUpdated: '2024-11-28' },
  { id: 3, name: 'Mohammed Alaa', role: '.Net Developer', project: 'Tahommena', skill: 'Entity Framework', proficiency: 'Advanced', certifications: 1, coverage: 78, lastUpdated: '2024-11-25' },
  { id: 4, name: 'Ahmed Yousry', role: '.Net Developer', project: 'Tahommena', skill: 'Azure DevOps', proficiency: 'Intermediate', certifications: 0, coverage: 65, lastUpdated: '2024-12-02' },
  { id: 5, name: 'Ayaz Muhammad', role: 'Backend Developer', project: 'Sectorial', skill: 'Node.js', proficiency: 'Expert', certifications: 3, coverage: 95, lastUpdated: '2024-12-03' },
  { id: 6, name: 'Mazen Yehia', role: 'Backend Developer', project: 'ICP', skill: 'Python', proficiency: 'Advanced', certifications: 2, coverage: 88, lastUpdated: '2024-11-30' },
  { id: 7, name: 'Raza Bangi', role: 'Backend Developer', project: 'Sectorial', skill: 'Java', proficiency: 'Intermediate', certifications: 1, coverage: 72, lastUpdated: '2024-11-27' },
  { id: 8, name: 'Syed Habib', role: 'Backend Developer', project: 'Sectorial', skill: 'PostgreSQL', proficiency: 'Advanced', certifications: 1, coverage: 82, lastUpdated: '2024-12-01' },
  { id: 9, name: 'Ubaid Nawab', role: 'Backend Developer', project: 'Inspection', skill: 'MongoDB', proficiency: 'Intermediate', certifications: 0, coverage: 68, lastUpdated: '2024-11-29' },
  { id: 10, name: 'Waqas Ali', role: 'Backend Developer', project: 'Senaei', skill: 'GraphQL', proficiency: 'Beginner', certifications: 0, coverage: 45, lastUpdated: '2024-12-02' },
  { id: 11, name: 'Hassan Raza Hasrat', role: 'Backend Lead', project: 'Senaei', skill: 'System Design', proficiency: 'Expert', certifications: 4, coverage: 96, lastUpdated: '2024-12-03' },
  { id: 12, name: 'Amadou Ndiaye', role: 'Data Engineer', project: 'Inspection', skill: 'Apache Spark', proficiency: 'Advanced', certifications: 2, coverage: 84, lastUpdated: '2024-11-26' },
  { id: 13, name: 'Maaz Majid', role: 'Data Engineer', project: 'I360', skill: 'ETL Pipelines', proficiency: 'Expert', certifications: 3, coverage: 91, lastUpdated: '2024-12-01' },
  { id: 14, name: 'Arslan Malik', role: 'Devops', project: 'Devops', skill: 'Kubernetes', proficiency: 'Expert', certifications: 5, coverage: 98, lastUpdated: '2024-12-03' },
  { id: 15, name: 'Andrew Fayyaz', role: 'Frontend', project: 'Sectorial', skill: 'React', proficiency: 'Advanced', certifications: 1, coverage: 86, lastUpdated: '2024-11-28' },
  { id: 16, name: 'Adnan Ali', role: 'Frontend developer', project: 'ICP', skill: 'TypeScript', proficiency: 'Expert', certifications: 2, coverage: 93, lastUpdated: '2024-12-02' },
  { id: 17, name: 'Divyam Kshatriya', role: 'Frontend developer', project: 'Senaei', skill: 'Vue.js', proficiency: 'Intermediate', certifications: 0, coverage: 70, lastUpdated: '2024-11-30' },
  { id: 18, name: 'Menna Tula Nasser', role: 'Frontend developer', project: 'ICP', skill: 'CSS/Tailwind', proficiency: 'Advanced', certifications: 1, coverage: 81, lastUpdated: '2024-12-01' },
  { id: 19, name: 'Sherif Gjini', role: 'Frontend developer', project: 'MIM Website', skill: 'Next.js', proficiency: 'Advanced', certifications: 1, coverage: 79, lastUpdated: '2024-11-27' },
  { id: 20, name: 'Waseem Ahmad', role: 'Frontend developer', project: 'Sectorial', skill: 'Angular', proficiency: 'Intermediate', certifications: 0, coverage: 62, lastUpdated: '2024-12-03' },
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

  // Filter data based on selections
  const filteredData = teamMembersData.filter(member => {
    if (selectedProgram !== 'All Projects' && member.project !== selectedProgram) return false;
    if (selectedProficiencies.length > 0 && !selectedProficiencies.includes(member.proficiency)) return false;
    return true;
  });

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
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Role', 'Project', 'Primary Skill', 'Proficiency', 'Certifications', 'Coverage %', 'Last Updated'];
    const rows = filteredData.map(m => [m.name, m.role, m.project, m.skill, m.proficiency, m.certifications, m.coverage, m.lastUpdated]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skills_inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="px-8 pb-8 flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-[280px] flex-shrink-0 rounded-xl p-5 bg-card border border-brand-gold-border">
          <div className="flex items-center gap-2 mb-5">
            <Filter className="h-4 w-4 text-brand-gold" />
            <span className="text-sm font-semibold text-foreground">Filters</span>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block text-muted-foreground">Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-full border-brand-gold-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-brand-gold-border">
                  {projects.map(p => (
                    <SelectItem key={p} value={p} className="text-foreground focus:bg-brand-gold/10">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block text-muted-foreground">Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full border-brand-gold-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-brand-gold-border">
                  <SelectItem value="All Teams" className="text-foreground focus:bg-brand-gold/10">All Teams</SelectItem>
                  <SelectItem value="Backend" className="text-foreground focus:bg-brand-gold/10">Backend</SelectItem>
                  <SelectItem value="Frontend" className="text-foreground focus:bg-brand-gold/10">Frontend</SelectItem>
                  <SelectItem value="Data" className="text-foreground focus:bg-brand-gold/10">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block text-muted-foreground">Skill Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full border-brand-gold-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-brand-gold-border">
                  {skillCategories.map(c => (
                    <SelectItem key={c} value={c} className="text-foreground focus:bg-brand-gold/10">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-3 block text-muted-foreground">Proficiency Level</label>
              <div className="space-y-2.5">
                {proficiencyLevels.map(level => (
                  <label key={level.label} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedProficiencies.includes(level.label)}
                      onCheckedChange={() => handleProficiencyToggle(level.label)}
                      className="border-brand-gold-border data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                    />
                    <span className={`h-2.5 w-2.5 rounded-full ${level.colorClass}`} />
                    <span className="text-sm text-muted-foreground">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 border-brand-gold-border text-muted-foreground hover:bg-secondary"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 rounded-xl overflow-hidden bg-card border border-brand-gold-border">
          {/* Table Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-brand-gold-border">
            <h2 className="text-base font-semibold text-foreground">Skills Inventory</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-brand-gold-border text-muted-foreground hover:bg-secondary"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-brand-dark border-2 border-brand-gold hover:bg-brand-gold/10 px-6 py-2.5 h-auto text-base font-medium">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Skill
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-brand-gold-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Skill</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 text-center text-muted-foreground">
                    Form implementation coming in next prompt
                  </div>
                </DialogContent>
              </Dialog>
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
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Certifications</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Coverage</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200" style={{ background: 'hsl(35 46% 97%)' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(member => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-brand-gold/5 border-b border-brand-gold-border"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-brand-gold to-brand-gold-dark text-brand-dark">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-foreground">{member.skill}</span>
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
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm text-foreground">{member.certifications}</span>
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
        <div className="flex gap-1 p-1 bg-brand-dark rounded-lg w-fit">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-brand-gold text-brand-dark'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
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

import { useState } from 'react';
import { Target, Users, BarChart3, AlertTriangle, Filter, Download, Plus, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  { label: 'Expert', color: '#22c55e' },
  { label: 'Advanced', color: '#3b82f6' },
  { label: 'Intermediate', color: '#f59e0b' },
  { label: 'Beginner', color: '#ef4444' },
  { label: 'No Skill', color: '#6b7280' },
];

const projects = ['All Projects', 'Tahommena', 'Sectorial', 'ICP', 'Inspection', 'Senaei', 'I360', 'Devops', 'MIM Website', 'IR platform'];
const skillCategories = ['All Categories', 'Backend', 'Frontend', 'Data', 'DevOps', 'Mobile', 'QA', 'Management'];

export default function SkillsInventory() {
  const [selectedProgram, setSelectedProgram] = useState('All Projects');
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedProficiencies, setSelectedProficiencies] = useState<string[]>([]);
  const [addSkillOpen, setAddSkillOpen] = useState(false);

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

  const getProficiencyColor = (level: string) => {
    const found = proficiencyLevels.find(p => p.label === level);
    return found?.color || '#6b7280';
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f1219' }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ borderColor: 'rgba(198, 156, 109, 0.15)' }}>
        <h1 className="text-2xl font-bold" style={{ color: '#c69c6d' }}>Skills Inventory</h1>
        <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Track team skills, proficiencies, and identify capability gaps</p>
      </div>

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
        <div className="w-[280px] flex-shrink-0 rounded-xl p-5" style={{ background: '#2d3344', border: '1px solid rgba(198, 156, 109, 0.15)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Filter className="h-4 w-4" style={{ color: '#c69c6d' }} />
            <span className="text-sm font-semibold" style={{ color: '#f5f5f7' }}>Filters</span>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: '#6b7280' }}>Program</label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-full border-[rgba(198,156,109,0.3)] bg-[#242938] text-[#f5f5f7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#242938] border-[rgba(198,156,109,0.3)]">
                  {projects.map(p => (
                    <SelectItem key={p} value={p} className="text-[#f5f5f7] focus:bg-[rgba(198,156,109,0.1)]">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: '#6b7280' }}>Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full border-[rgba(198,156,109,0.3)] bg-[#242938] text-[#f5f5f7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#242938] border-[rgba(198,156,109,0.3)]">
                  <SelectItem value="All Teams" className="text-[#f5f5f7] focus:bg-[rgba(198,156,109,0.1)]">All Teams</SelectItem>
                  <SelectItem value="Backend" className="text-[#f5f5f7] focus:bg-[rgba(198,156,109,0.1)]">Backend</SelectItem>
                  <SelectItem value="Frontend" className="text-[#f5f5f7] focus:bg-[rgba(198,156,109,0.1)]">Frontend</SelectItem>
                  <SelectItem value="Data" className="text-[#f5f5f7] focus:bg-[rgba(198,156,109,0.1)]">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: '#6b7280' }}>Skill Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full border-[rgba(198,156,109,0.3)] bg-[#242938] text-[#f5f5f7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#242938] border-[rgba(198,156,109,0.3)]">
                  {skillCategories.map(c => (
                    <SelectItem key={c} value={c} className="text-[#f5f5f7] focus:bg-[rgba(198,156,109,0.1)]">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider mb-3 block" style={{ color: '#6b7280' }}>Proficiency Level</label>
              <div className="space-y-2.5">
                {proficiencyLevels.map(level => (
                  <label key={level.label} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedProficiencies.includes(level.label)}
                      onCheckedChange={() => handleProficiencyToggle(level.label)}
                      className="border-[rgba(198,156,109,0.3)] data-[state=checked]:bg-[#c69c6d] data-[state=checked]:border-[#c69c6d]"
                    />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: level.color }} />
                    <span className="text-sm" style={{ color: '#9ca3af' }}>{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 border-[rgba(198,156,109,0.3)] text-[#9ca3af] hover:bg-[#242938]"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 rounded-xl overflow-hidden" style={{ background: '#2d3344', border: '1px solid rgba(198, 156, 109, 0.15)' }}>
          {/* Table Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(198, 156, 109, 0.15)' }}>
            <h2 className="text-base font-semibold" style={{ color: '#f5f5f7' }}>Skills Inventory</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-[rgba(198,156,109,0.3)] text-[#9ca3af] hover:bg-[#242938]"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#c69c6d] text-[#1a1f2e] hover:bg-[#d4b08c]">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#2d3344] border-[rgba(198,156,109,0.3)]">
                  <DialogHeader>
                    <DialogTitle className="text-[#f5f5f7]">Add New Skill</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 text-center text-[#9ca3af]">
                    Form implementation coming in next prompt
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#1a1f2e' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Team Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Primary Skill</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Proficiency</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Certifications</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Coverage</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(member => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-[rgba(198,156,109,0.05)]"
                    style={{ borderBottom: '1px solid rgba(198, 156, 109, 0.15)' }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold"
                          style={{ background: 'linear-gradient(135deg, #c69c6d 0%, #a67c4e 100%)', color: '#1a1f2e' }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#f5f5f7' }}>{member.name}</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>{member.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: '#f5f5f7' }}>{member.skill}</span>
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
                      <span className="text-sm" style={{ color: '#f5f5f7' }}>{member.certifications}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: '#1a1f2e' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${member.coverage}%`,
                              background: member.coverage >= 80 ? '#22c55e' : member.coverage >= 60 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: '#9ca3af' }}>{member.coverage}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: '#9ca3af' }}>{member.lastUpdated}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ icon: Icon, label, value, change, positive }: {
  icon: any;
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#2d3344', border: '1px solid rgba(198, 156, 109, 0.15)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>{label}</span>
        <Icon className="h-5 w-5" style={{ color: '#c69c6d' }} />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[28px] font-semibold" style={{ color: '#f5f5f7' }}>{value}</span>
        <div className="flex items-center gap-1">
          {positive ? (
            <TrendingUp className="h-4 w-4 text-[#22c55e]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[#ef4444]" />
          )}
          <span className="text-xs" style={{ color: positive ? '#22c55e' : '#ef4444' }}>{change}</span>
        </div>
      </div>
    </div>
  );
}

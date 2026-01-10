import React from 'react';
import { Database, Check, FileText, Layers, BookOpen, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConfigureStepProps {
  selectedProgram: {
    id: string;
    name: string;
    nextEpic: string;
    nextFeat: string;
  } | null;
  onProgramChange: (program: ConfigureStepProps['selectedProgram']) => void;
  selectedProject: {
    id: string;
    name: string;
    nextStory: string;
  } | null;
  onProjectChange: (project: ConfigureStepProps['selectedProject']) => void;
  selectedTheme: string | null;
  onThemeChange: (theme: string | null) => void;
}

const programs = [
  { id: 'dsp', name: 'Digital Services Program', nextEpic: 'EPIC-049', nextFeat: 'FEAT-117' },
  { id: 'infra', name: 'Infrastructure Modernization', nextEpic: 'EPIC-078', nextFeat: 'FEAT-234' },
  { id: 'citizen', name: 'Citizen Experience', nextEpic: 'EPIC-023', nextFeat: 'FEAT-089' },
];

const projects = [
  { id: 'dms', name: 'DMS Implementation', nextStory: 'US-513' },
  { id: 'portal', name: 'Portal Redesign', nextStory: 'US-891' },
  { id: 'api', name: 'API Gateway', nextStory: 'US-234' },
];

const themes = [
  { id: 'none', name: 'None' },
  { id: 'digital-transform', name: 'Digital Transformation' },
  { id: 'customer-exp', name: 'Customer Experience' },
  { id: 'ops-excellence', name: 'Operational Excellence' },
];

export function ConfigureStep({
  selectedProgram,
  onProgramChange,
  selectedProject,
  onProjectChange,
  selectedTheme,
  onThemeChange,
}: ConfigureStepProps) {
  const handleProgramChange = (id: string) => {
    const program = programs.find(p => p.id === id);
    onProgramChange(program || null);
  };

  const handleProjectChange = (id: string) => {
    const project = projects.find(p => p.id === id);
    onProjectChange(project || null);
  };

  return (
    <div className="flex gap-5 flex-1">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-4">
        <Card>
          <CardHeader className="py-3.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" /> Hierarchy Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-5">
            {/* Program Selection */}
            <div>
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-2.5">
                <div className="w-[22px] h-[22px] rounded bg-violet-100 flex items-center justify-center">
                  <Layers className="w-3 h-3 text-violet-600" />
                </div>
                <div className="w-[22px] h-[22px] rounded bg-teal-100 flex items-center justify-center">
                  <Layers className="w-3 h-3 text-teal-600" />
                </div>
                Program (for Epics & Features)
              </div>
              <Select value={selectedProgram?.id || ''} onValueChange={handleProgramChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a program..." />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProgram && (
                <div className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-md mt-2.5 text-xs text-muted-foreground">
                  <Database className="w-4 h-4 text-primary" />
                  Next Epic: <strong className="text-foreground">{selectedProgram.nextEpic}</strong> | 
                  Next Feature: <strong className="text-foreground">{selectedProgram.nextFeat}</strong>
                </div>
              )}
            </div>

            {/* Project Selection */}
            <div>
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-2.5">
                <div className="w-[22px] h-[22px] rounded bg-emerald-100 flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-emerald-600" />
                </div>
                Project (for Stories)
              </div>
              <Select value={selectedProject?.id || ''} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject && (
                <div className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-md mt-2.5 text-xs text-muted-foreground">
                  <Database className="w-4 h-4 text-primary" />
                  Next Story: <strong className="text-foreground">{selectedProject.nextStory}</strong>
                </div>
              )}
            </div>

            {/* Theme Selection */}
            <div>
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground mb-2.5">
                Strategic Theme (optional)
              </div>
              <Select value={selectedTheme || 'none'} onValueChange={(v) => onThemeChange(v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme..." />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Generation Preview */}
        <Card>
          <CardHeader className="py-3.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> Generation Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'PRD', count: '1', color: 'bg-primary', icon: FileText },
                { label: 'Epics', count: '2-3', color: 'bg-violet-500', icon: Layers },
                { label: 'Features', count: '5-8', color: 'bg-teal-500', icon: Layers },
                { label: 'Stories', count: '12-18', color: 'bg-emerald-500', icon: BookOpen },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-lg text-center">
                  <div className={`w-10 h-10 ${item.color} rounded-lg mx-auto mb-2 flex items-center justify-center text-white`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-bold">{item.count}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Context Panel */}
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardHeader className="py-3.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" /> Compliance Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {[
                { label: 'DGA controls', count: 12, icon: Shield, color: 'text-primary' },
                { label: 'NCA requirements', count: 8, icon: Shield, color: 'text-teal-600' },
                { label: 'BABOK validation', count: 6, icon: Check, color: 'text-violet-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.count} {item.label}</div>
                    <div className="text-xs text-muted-foreground">Will be validated</div>
                  </div>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

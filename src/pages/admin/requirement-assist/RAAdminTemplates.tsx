import React, { useState, useEffect } from 'react';
import { FileText, Plus, Pen, Copy, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  type: 'PRD' | 'Epic' | 'Feature' | 'Story';
  description: string;
  version: string;
  lastUpdated: string;
}

const initialTemplates: Template[] = [
  {
    id: '1',
    name: 'Ministry PRD Template',
    type: 'PRD',
    description: 'Standard PRD format for Ministry of Industry projects with compliance sections',
    version: 'v3.2',
    lastUpdated: 'Jan 5, 2026',
  },
  {
    id: '2',
    name: 'SAFe Epic Template',
    type: 'Epic',
    description: 'Scaled Agile Framework epic format with lean business case',
    version: 'v2.0',
    lastUpdated: 'Dec 28, 2025',
  },
  {
    id: '3',
    name: 'SAFe Feature Template',
    type: 'Feature',
    description: 'Feature format with acceptance criteria and benefit hypothesis',
    version: 'v2.0',
    lastUpdated: 'Dec 28, 2025',
  },
  {
    id: '4',
    name: 'Gherkin Story Template',
    type: 'Story',
    description: 'User story format with Given-When-Then acceptance criteria',
    version: 'v1.5',
    lastUpdated: 'Dec 20, 2025',
  },
];

const typeColors: Record<string, { bg: string; text: string }> = {
  PRD: { bg: 'bg-[#2563eb]/10', text: 'text-[#2563eb]' },
  Epic: { bg: 'bg-[#7c3aed]/10', text: 'text-[#7c3aed]' },
  Feature: { bg: 'bg-[#0d9488]/10', text: 'text-[#0d9488]' },
  Story: { bg: 'bg-[#10b981]/10', text: 'text-[#10b981]' },
};

export default function RAAdminTemplates() {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showModal, setShowModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'PRD' as Template['type'], description: '' });

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    const template: Template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      type: newTemplate.type,
      description: newTemplate.description,
      version: 'v1.0',
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setTemplates([...templates, template]);
    setShowModal(false);
    setNewTemplate({ name: '', type: 'PRD', description: '' });
    toast.success(`Created "${template.name}"`);
  };

  const handleDuplicate = (template: Template) => {
    const duplicate: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      version: 'v1.0',
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setTemplates([...templates, duplicate]);
    toast.success(`Duplicated "${template.name}"`);
  };

  const handleDelete = (template: Template) => {
    setTemplates(templates.filter(t => t.id !== template.id));
    toast.success(`Deleted "${template.name}"`);
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">Templates</h1>
        <p className="text-sm text-[#64748b] mt-1">Manage templates for generating requirements</p>
      </div>

      {/* Template Library Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#64748b]" />
            Template Library
          </CardTitle>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {templates.map(template => {
              const colors = typeColors[template.type];
              return (
                <div 
                  key={template.id}
                  className="border border-[#e2e8f0] rounded-lg p-4 hover:border-[#2563eb]/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded', colors.bg, colors.text)}>
                      {template.type}
                    </span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => toast.info('Edit functionality coming soon')}
                        className="p-1.5 rounded hover:bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a]"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDuplicate(template)}
                        className="p-1.5 rounded hover:bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a]"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(template)}
                        className="p-1.5 rounded hover:bg-[#f8fafc] text-[#64748b] hover:text-[#ef4444]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-[#0f172a] mb-1">{template.name}</h3>
                  <p className="text-sm text-[#475569] mb-3">{template.description}</p>
                  <p className="text-xs text-[#64748b]">{template.version} • Last updated {template.lastUpdated}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* New Template Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <h2 className="text-lg font-semibold text-[#0f172a]">New Template</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-[#f8fafc] text-[#64748b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">Template Name</label>
                <Input 
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">Type</label>
                <Select 
                  value={newTemplate.type} 
                  onValueChange={(value) => setNewTemplate({ ...newTemplate, type: value as Template['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRD">PRD</SelectItem>
                    <SelectItem value="Epic">Epic</SelectItem>
                    <SelectItem value="Feature">Feature</SelectItem>
                    <SelectItem value="Story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">Description</label>
                <Textarea 
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Enter template description"
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[#e2e8f0]">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateTemplate}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                Create Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

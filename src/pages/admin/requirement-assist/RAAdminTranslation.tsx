import React, { useState, useEffect } from 'react';
import { Globe, Plus, Pen, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface GlossaryTerm {
  id: string;
  englishTerm: string;
  arabicTranslation: string;
  category: string;
}

const initialGlossary: GlossaryTerm[] = [
  { id: '1', englishTerm: 'Digital Transformation', arabicTranslation: 'التحول الرقمي', category: 'Strategy' },
  { id: '2', englishTerm: 'Industrial License', arabicTranslation: 'الرخصة الصناعية', category: 'Operations' },
  { id: '3', englishTerm: 'Stakeholder', arabicTranslation: 'صاحب المصلحة', category: 'General' },
  { id: '4', englishTerm: 'Compliance', arabicTranslation: 'الامتثال', category: 'Governance' },
  { id: '5', englishTerm: 'User Story', arabicTranslation: 'قصة المستخدم', category: 'Agile' },
];

const categories = ['Strategy', 'Operations', 'General', 'Governance', 'Agile', 'Technical'];

export default function RAAdminTranslation() {
  const [primaryLanguage, setPrimaryLanguage] = useState('english');
  const [secondaryLanguage, setSecondaryLanguage] = useState('arabic');
  const [autoDetect, setAutoDetect] = useState('enabled');
  const [glossary, setGlossary] = useState<GlossaryTerm[]>(initialGlossary);
  const [showModal, setShowModal] = useState(false);
  const [newTerm, setNewTerm] = useState({ englishTerm: '', arabicTranslation: '', category: 'General' });

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

  const handleAddTerm = () => {
    if (!newTerm.englishTerm.trim() || !newTerm.arabicTranslation.trim()) {
      toast.error('Please fill in both English and Arabic terms');
      return;
    }
    const term: GlossaryTerm = {
      id: Date.now().toString(),
      ...newTerm,
    };
    setGlossary([...glossary, term]);
    setShowModal(false);
    setNewTerm({ englishTerm: '', arabicTranslation: '', category: 'General' });
    toast.success(`Added "${term.englishTerm}"`);
  };

  const handleDeleteTerm = (term: GlossaryTerm) => {
    setGlossary(glossary.filter(t => t.id !== term.id));
    toast.success(`Deleted "${term.englishTerm}"`);
  };

  return (
    <div className="p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a]">Translation</h1>
        <p className="text-sm text-[#64748b] mt-1">Configure language settings and manage translation glossary</p>
      </div>

      {/* Language Settings Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-[#0f172a] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#64748b]" />
            Language Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-[#0f172a] mb-2 block">Primary Language</label>
              <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="arabic">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0f172a] mb-2 block">Secondary Language</label>
              <Select value={secondaryLanguage} onValueChange={setSecondaryLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arabic">Arabic</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#0f172a] mb-2 block">Auto-detect Language</label>
              <Select value={autoDetect} onValueChange={setAutoDetect}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ministry Glossary Card */}
      <Card className="bg-white border-[#e2e8f0]">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[#0f172a]">Ministry Glossary</CardTitle>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Term
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8fafc] border-y border-[#e2e8f0]">
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3">English Term</th>
                <th className="text-right text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3">Arabic Translation</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-[#64748b] uppercase tracking-wide px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {glossary.map((term, index) => (
                <tr 
                  key={term.id}
                  className={index < glossary.length - 1 ? 'border-b border-[#e2e8f0]' : ''}
                >
                  <td className="px-4 py-3 text-sm text-[#0f172a]">{term.englishTerm}</td>
                  <td className="px-4 py-3 text-sm text-[#0f172a] text-right" dir="rtl">{term.arabicTranslation}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded bg-[#f8fafc] text-[#475569]">
                      {term.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => toast.info('Edit functionality coming soon')}
                        className="p-1.5 rounded hover:bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a]"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTerm(term)}
                        className="p-1.5 rounded hover:bg-[#f8fafc] text-[#64748b] hover:text-[#ef4444]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add Term Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <h2 className="text-lg font-semibold text-[#0f172a]">Add Term</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-[#f8fafc] text-[#64748b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">English Term</label>
                <Input 
                  value={newTerm.englishTerm}
                  onChange={(e) => setNewTerm({ ...newTerm, englishTerm: e.target.value })}
                  placeholder="Enter English term"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">Arabic Translation</label>
                <Input 
                  value={newTerm.arabicTranslation}
                  onChange={(e) => setNewTerm({ ...newTerm, arabicTranslation: e.target.value })}
                  placeholder="أدخل الترجمة العربية"
                  dir="rtl"
                  className="text-right"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] mb-1.5 block">Category</label>
                <Select 
                  value={newTerm.category} 
                  onValueChange={(value) => setNewTerm({ ...newTerm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-[#e2e8f0]">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button 
                onClick={handleAddTerm}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                Add Term
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

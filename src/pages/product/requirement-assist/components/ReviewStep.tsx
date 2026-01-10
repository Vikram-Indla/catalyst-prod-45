import React, { useState } from 'react';
import { Check, Pen, RotateCw, Trash2, ChevronDown, Link, X, FileText, Layers, Puzzle, Bookmark, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GeneratedItem } from '../types';
import { toast } from 'sonner';

interface ReviewStepProps {
  items: GeneratedItem[];
  generationId?: string | null;
  onUpdateItem: (id: string, updates: Partial<GeneratedItem>) => void;
  onRemoveItem: (id: string) => void;
}

// Mock work items (PRD is NOT a work item - it's a background document)
const mockItems: GeneratedItem[] = [
  {
    id: 'item1',
    type: 'epic',
    key: 'EPIC-049',
    title: 'Document Upload & Processing',
    description: 'Enable users to upload, process, and manage documents with support for multiple formats, OCR extraction, and metadata tagging.',
    confidence: 94,
    confidenceBreakdown: { scopeClarity: 98, functionalReqs: 95, nfrCoverage: 87, compliance: 100 },
  },
  {
    id: 'item2',
    type: 'feature',
    key: 'FEAT-117',
    title: 'Multi-format File Upload',
    description: 'Allow users to upload documents in PDF, DOCX, and TXT formats with automatic type detection.',
    confidence: 96,
    confidenceBreakdown: { scopeClarity: 98, functionalReqs: 96, nfrCoverage: 94, compliance: 100 },
  },
  {
    id: 'item3',
    type: 'story',
    key: 'US-513',
    title: 'Upload PDF Document',
    description: 'As a user, I want to upload PDF documents so that I can store and manage my files digitally.',
    confidence: 98,
    confidenceBreakdown: { scopeClarity: 100, functionalReqs: 97, nfrCoverage: 98, compliance: 100 },
  },
];

export function ReviewStep({ items = mockItems, generationId, onUpdateItem, onRemoveItem }: ReviewStepProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitles, setEditTitles] = useState<Record<string, string>>({});
  const [editDescriptions, setEditDescriptions] = useState<Record<string, string>>({});
  const [expandedConfidence, setExpandedConfidence] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'epic' | 'feature' | 'story' | 'test_case'>('all');

  // Filter out PRD items - PRD is a background document, not a work item
  const workItems = items.length > 0 
    ? items.filter(item => item.type !== 'prd') 
    : mockItems;
  
  const displayItems = workItems;
  const filteredItems = filter === 'all' ? displayItems : displayItems.filter(item => item.type === filter);
  
  const counts = {
    all: displayItems.length,
    epic: displayItems.filter(i => i.type === 'epic').length,
    feature: displayItems.filter(i => i.type === 'feature').length,
    story: displayItems.filter(i => i.type === 'story').length,
    test_case: displayItems.filter(i => i.type === 'test_case').length,
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleConfidence = (id: string) => {
    setExpandedConfidence(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleBatchLink = () => {
    toast.success(`Linking ${selectedItems.size} items...`);
    clearSelection();
  };

  const handleBatchRegenerate = () => {
    toast.success(`Regenerating ${selectedItems.size} items...`);
    clearSelection();
  };

  const toggleEdit = (id: string) => {
    const item = displayItems.find(i => i.id === id);
    if (!item) return;

    if (editingItem === id) {
      // Save and exit edit mode
      const newTitle = editTitles[id] ?? item.title;
      const newDesc = editDescriptions[id] ?? item.description;
      onUpdateItem?.(id, { title: newTitle, description: newDesc });
      setEditingItem(null);
      toast.success('Changes saved');
    } else {
      // Enter edit mode
      setEditTitles(prev => ({ ...prev, [id]: item.title }));
      setEditDescriptions(prev => ({ ...prev, [id]: item.description }));
      setEditingItem(id);
    }
  };

  const saveEdit = (id: string) => {
    const item = displayItems.find(i => i.id === id);
    if (!item) return;
    
    const newTitle = editTitles[id] ?? item.title;
    const newDesc = editDescriptions[id] ?? item.description;
    onUpdateItem?.(id, { title: newTitle, description: newDesc });
    setEditingItem(null);
    toast.success('Changes saved');
  };

  const handleRegenerate = (id: string) => {
    toast.success('Regenerating item...');
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this item?')) {
      onRemoveItem?.(id);
      selectedItems.delete(id);
      setSelectedItems(new Set(selectedItems));
      toast.success('Item removed');
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'epic': return 'bg-violet-100 text-violet-600';
      case 'feature': return 'bg-teal-100 text-teal-600';
      case 'story': return 'bg-emerald-100 text-emerald-600';
      case 'test_case': return 'bg-orange-100 text-orange-600';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const getStatIcon = (type: string) => {
    switch (type) {
      case 'epic': return Layers;
      case 'feature': return Puzzle;
      case 'story': return Bookmark;
      case 'test_case': return CheckCircle;
      default: return FileText;
    }
  };

  const getStatBg = (type: string) => {
    switch (type) {
      case 'all': return 'bg-primary/10 text-primary';
      case 'epic': return 'bg-violet-100 text-violet-600';
      case 'feature': return 'bg-teal-100 text-teal-600';
      case 'story': return 'bg-emerald-100 text-emerald-600';
      case 'test_case': return 'bg-orange-100 text-orange-600';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="flex gap-5 flex-1">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Batch Selection Bar */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-primary text-white rounded-lg animate-in slide-in-from-top-2">
            <span className="text-sm font-medium">{selectedItems.size} items selected</span>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleBatchLink}>
                <Link className="w-4 h-4 mr-1.5" /> Link
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleBatchRegenerate}>
                <RotateCw className="w-4 h-4 mr-1.5" /> Regenerate
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={clearSelection}>
                <X className="w-4 h-4 mr-1.5" /> Clear
              </Button>
            </div>
          </div>
        )}

        {/* Filter Stats - Work Items Only (PRD is not a work item) */}
        <div className="flex gap-3">
          {(['all', 'epic', 'feature', 'story', 'test_case'] as const).map(f => {
            // Hide test_case tab if no test cases exist
            if (f === 'test_case' && counts.test_case === 0) return null;
            
            const Icon = f === 'all' ? FileText : getStatIcon(f);
            const label = f === 'all' ? 'Total' : 
                          f === 'test_case' ? 'Test Cases' :
                          f.charAt(0).toUpperCase() + f.slice(1) + 's';
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 p-4 rounded-lg border text-center transition-all cursor-pointer",
                  filter === f 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn("w-9 h-9 mx-auto mb-2.5 rounded-lg flex items-center justify-center", getStatBg(f))}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-2xl font-bold">{counts[f]}</h3>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </button>
            );
          })}
        </div>

        {/* Item Cards */}
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card 
              key={item.id} 
              data-type={item.type}
              className={cn(
                "transition-all",
                selectedItems.has(item.id) && "ring-2 ring-primary bg-primary/5",
                editingItem === item.id && "ring-2 ring-primary shadow-lg"
              )}
            >
              <div className="flex items-center gap-3 p-4 border-b">
                <button
                  onClick={() => toggleSelect(item.id)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    selectedItems.has(item.id) ? "bg-primary border-primary text-white" : "border-muted-foreground hover:border-primary"
                  )}
                >
                  {selectedItems.has(item.id) && <Check className="w-3 h-3" />}
                </button>
                
                <span className={cn("px-3 py-1.5 rounded text-xs font-semibold", getBadgeColor(item.type))}>
                  {item.key}
                </span>
                
                {editingItem === item.id ? (
                  <Input
                    value={editTitles[item.id] ?? item.title}
                    onChange={(e) => setEditTitles(prev => ({ ...prev, [item.id]: e.target.value }))}
                    className="flex-1 font-semibold"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-[15px] font-semibold">{item.title}</span>
                )}
                
                <button
                  onClick={() => toggleConfidence(item.id)}
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded text-xs font-semibold hover:bg-emerald-200 transition-colors"
                >
                  {item.confidence}%
                </button>
                
                <div className="flex gap-1">
                  {editingItem === item.id ? (
                    <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50" onClick={() => saveEdit(item.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => toggleEdit(item.id)}>
                      <Pen className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleRegenerate(item.id)}>
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemove(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  {item.type === 'story' ? <Bookmark className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} → {item.type === 'story' ? 'Project' : 'Program'}
                </div>
                
                {editingItem === item.id ? (
                  <Textarea 
                    value={editDescriptions[item.id] ?? item.description}
                    onChange={(e) => setEditDescriptions(prev => ({ ...prev, [item.id]: e.target.value }))}
                    className="mb-3 min-h-[80px]" 
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
                )}
                
                {/* Confidence Breakdown */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    expandedConfidence.has(item.id) ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  {item.confidenceBreakdown && (
                    <div className="p-3.5 bg-muted/30 rounded-lg mb-3">
                      <div className="space-y-2">
                        {Object.entries(item.confidenceBreakdown).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2.5 text-[13px]">
                            {value >= 95 ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : value >= 90 ? (
                              <Info className="w-4 h-4 text-primary" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="flex-1 text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={cn(
                              "font-medium",
                              value >= 95 ? "text-emerald-600" : value >= 90 ? "text-primary" : "text-amber-600"
                            )}>
                              {value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Parent selection */}
                <div className="flex items-center gap-3 pt-2 border-t">
                  <label className="text-xs text-muted-foreground w-16">{item.type === 'story' ? 'Project' : 'Program'}</label>
                  <select className="flex-1 h-9 px-3 border rounded-md text-sm bg-background">
                    <option>{item.type === 'story' ? 'DMS Implementation' : 'Digital Services Program'}</option>
                    <option>Infrastructure Modernization</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Context Panel */}
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardHeader className="py-3.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" /> Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 py-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="flex-1 text-muted-foreground">Total Items</span>
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                  {displayItems.length}
                </span>
              </div>
              <div className="flex items-center gap-2.5 py-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="flex-1 text-muted-foreground">Avg Confidence</span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-semibold">
                  {Math.round(displayItems.reduce((acc, i) => acc + i.confidence, 0) / displayItems.length)}%
                </span>
              </div>
              <div className="flex items-center gap-2.5 py-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="flex-1 text-muted-foreground">Generation Time</span>
                <span className="px-2.5 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                  38s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


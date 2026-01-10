import React, { useState } from 'react';
import { Check, Pen, RotateCw, Trash2, ChevronDown, Link, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GeneratedItem } from '../types';

interface ReviewStepProps {
  items: GeneratedItem[];
  onUpdateItem: (id: string, updates: Partial<GeneratedItem>) => void;
  onRemoveItem: (id: string) => void;
}

const mockItems: GeneratedItem[] = [
  {
    id: 'epic-1',
    type: 'epic',
    key: 'EPIC-049',
    title: 'Document Upload & Processing',
    description: 'Enable users to upload, process, and manage documents with support for multiple formats, OCR extraction, and metadata tagging.',
    confidence: 94,
    confidenceBreakdown: { scopeClarity: 96, functionalReqs: 93, nfrCoverage: 92, compliance: 95 },
  },
  {
    id: 'epic-2',
    type: 'epic',
    key: 'EPIC-050',
    title: 'Document Search & Retrieval',
    description: 'Implement advanced search capabilities with full-text search, filters, and AI-powered semantic search for document discovery.',
    confidence: 91,
    confidenceBreakdown: { scopeClarity: 92, functionalReqs: 90, nfrCoverage: 89, compliance: 93 },
  },
  {
    id: 'feat-1',
    type: 'feature',
    key: 'FEAT-117',
    title: 'Multi-format File Upload',
    description: 'Allow users to upload documents in PDF, DOCX, and TXT formats with automatic type detection.',
    confidence: 96,
    confidenceBreakdown: { scopeClarity: 98, functionalReqs: 95, nfrCoverage: 94, compliance: 97 },
  },
  {
    id: 'feat-2',
    type: 'feature',
    key: 'FEAT-118',
    title: 'OCR Text Extraction',
    description: 'Extract text from scanned documents and images using optical character recognition technology.',
    confidence: 93,
    confidenceBreakdown: { scopeClarity: 94, functionalReqs: 92, nfrCoverage: 91, compliance: 95 },
  },
  {
    id: 'story-1',
    type: 'story',
    key: 'US-513',
    title: 'Upload PDF Document',
    description: 'As a user, I want to upload PDF documents so that I can store and manage my files digitally.',
    confidence: 98,
    confidenceBreakdown: { scopeClarity: 99, functionalReqs: 98, nfrCoverage: 97, compliance: 98 },
  },
  {
    id: 'story-2',
    type: 'story',
    key: 'US-514',
    title: 'Upload DOCX Document',
    description: 'As a user, I want to upload Word documents so that I can manage my office files in the system.',
    confidence: 97,
    confidenceBreakdown: { scopeClarity: 98, functionalReqs: 97, nfrCoverage: 96, compliance: 97 },
  },
];

export function ReviewStep({ items = mockItems, onUpdateItem, onRemoveItem }: ReviewStepProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [expandedConfidence, setExpandedConfidence] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'epic' | 'feature' | 'story'>('all');

  const filteredItems = filter === 'all' ? mockItems : mockItems.filter(item => item.type === filter);
  
  const counts = {
    all: mockItems.length,
    epic: mockItems.filter(i => i.type === 'epic').length,
    feature: mockItems.filter(i => i.type === 'feature').length,
    story: mockItems.filter(i => i.type === 'story').length,
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

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'epic': return 'bg-violet-100 text-violet-600';
      case 'feature': return 'bg-teal-100 text-teal-600';
      case 'story': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-primary/10 text-primary';
    }
  };

  return (
    <div className="flex gap-5 flex-1">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Batch Selection Bar */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-primary text-white rounded-lg">
            <span className="text-sm font-medium">{selectedItems.size} items selected</span>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <Link className="w-4 h-4 mr-1.5" /> Link
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <RotateCw className="w-4 h-4 mr-1.5" /> Regenerate
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setSelectedItems(new Set())}>
                <X className="w-4 h-4 mr-1.5" /> Clear
              </Button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'epic', 'feature', 'story'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === f ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
              )}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Item Cards */}
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} className={cn(
              "transition-all",
              selectedItems.has(item.id) && "ring-2 ring-primary"
            )}>
              <div className="flex items-center gap-3 p-4 border-b">
                <button
                  onClick={() => toggleSelect(item.id)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    selectedItems.has(item.id) ? "bg-primary border-primary text-white" : "border-muted-foreground"
                  )}
                >
                  {selectedItems.has(item.id) && <Check className="w-3 h-3" />}
                </button>
                
                <span className={cn("px-3 py-1.5 rounded text-xs font-semibold", getBadgeColor(item.type))}>
                  {item.key}
                </span>
                
                {editingItem === item.id ? (
                  <Input
                    defaultValue={item.title}
                    className="flex-1"
                    onBlur={(e) => {
                      onUpdateItem?.(item.id, { title: e.target.value });
                      setEditingItem(null);
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-[15px] font-medium">{item.title}</span>
                )}
                
                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-600 rounded text-xs font-semibold">
                  {item.confidence}%
                </span>
                
                <div className="flex gap-1">
                  {editingItem === item.id ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setEditingItem(item.id)}>
                      <Pen className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:text-destructive" onClick={() => onRemoveItem?.(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-2">
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} → Program
                </div>
                
                {editingItem === item.id ? (
                  <Textarea defaultValue={item.description} className="mb-3" />
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                )}
                
                {/* Confidence Breakdown */}
                <button
                  onClick={() => toggleConfidence(item.id)}
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  Confidence Breakdown
                  <ChevronDown className={cn("w-3 h-3 transition-transform", expandedConfidence.has(item.id) && "rotate-180")} />
                </button>
                
                {expandedConfidence.has(item.id) && item.confidenceBreakdown && (
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg grid grid-cols-4 gap-3">
                    {Object.entries(item.confidenceBreakdown).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-lg font-bold text-emerald-600">{value}%</div>
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Context Panel */}
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardHeader className="py-3.5 px-4">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">Total Items</span>
              <span className="font-medium">{mockItems.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">Avg Confidence</span>
              <span className="font-medium text-emerald-600">94%</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">Generation Time</span>
              <span className="font-medium">38s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

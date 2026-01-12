// ============================================================
// SUBMIT IDEA MODAL - WORLD-CLASS REBUILD
// Modal overlay with AI writing assist, visual category grid,
// initiative linking, and progress indication
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Lightbulb, X, Pencil, Layers, Sparkles, AlignLeft, CheckCircle,
  Upload, FileImage, Trash2, Plus, Send, Loader2, Target
} from 'lucide-react';
import { useCreateImprovementIdea, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { ImprovementIdeaCategory } from '@/types/improvement-ideas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SubmitIdeaModalRebuiltProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedInitiative?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
}

// Categories with icons and colors
const CATEGORIES: { id: ImprovementIdeaCategory; label: string; icon: string; color: string }[] = [
  { id: 'process_optimization', label: 'Process', icon: '🔄', color: 'blue' },
  { id: 'reporting_analytics', label: 'Reporting', icon: '📊', color: 'purple' },
  { id: 'digital_service', label: 'Digital Service', icon: '💻', color: 'cyan' },
  { id: 'compliance_automation', label: 'Compliance', icon: '🛡️', color: 'amber' },
  { id: 'investor_experience', label: 'Investor Exp', icon: '👥', color: 'green' },
  { id: 'integration', label: 'Integration', icon: '🔗', color: 'indigo' },
];

// Suggested tags
const SUGGESTED_TAGS = ['automation', 'efficiency', 'reporting', 'analytics', 'integration', 'compliance', 'quality', 'ux'];

export function SubmitIdeaModalRebuilt({ 
  open, 
  onOpenChange,
  preselectedInitiative 
}: SubmitIdeaModalRebuiltProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ImprovementIdeaCategory | ''>('');
  const [initiativeId, setInitiativeId] = useState(preselectedInitiative || '');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks
  const { data: initiatives = [] } = useImprovementInitiatives();
  const createIdea = useCreateImprovementIdea();

  // Active initiatives only
  const activeInitiatives = initiatives.filter(i => 
    ['active', 'collecting'].includes(i.status)
  );

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setCategory('');
      setInitiativeId(preselectedInitiative || '');
      setTags([]);
      setTagInput('');
      setFiles([]);
      setIsAnonymous(false);
    }
  }, [open, preselectedInitiative]);

  // Progress calculation (3 required fields: title, description, category)
  const progress = [
    title.length >= 5, 
    description.length >= 20, 
    category !== ''
  ].filter(Boolean).length;
  const progressPercent = (progress / 3) * 100;

  // Tag handlers
  const handleAddTag = useCallback((tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
      setTags(prev => [...prev, cleanTag]);
      setTagInput('');
    }
  }, [tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // File handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
        .filter(f => f.size <= 10 * 1024 * 1024) // 10MB limit
        .map(file => ({ file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }));
      setFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = ''; // Reset input
  };

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  // AI Assist - Improve text
  const handleImproveWithAI = async () => {
    if (!description || description.length < 10) {
      toast.error('Please write more description to improve');
      return;
    }
    setIsImproving(true);
    // Simulate AI improvement (in production, call actual AI endpoint)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setDescription(prev => {
      if (prev.includes('**Benefits:**')) return prev; // Don't add twice
      return `${prev}\n\n**Benefits:**\n- Improved efficiency and productivity\n- Better user experience\n- Reduced manual effort and errors`;
    });
    setIsImproving(false);
    toast.success('AI improvements applied!');
  };

  // AI Assist - Add structure
  const handleAddStructure = () => {
    if (description.length > 0) {
      toast.info('Structure can only be added to empty descriptions');
      return;
    }
    setDescription(`**Problem Statement:**
Describe the current problem or pain point.

**Proposed Solution:**
Explain your idea and how it would work.

**Expected Benefits:**
- Benefit 1
- Benefit 2
- Benefit 3

**Success Metrics:**
How would we measure success?`);
    toast.success('Template added!');
  };

  // Submit handlers
  const handleSubmit = async (isDraft = false) => {
    if (!title || title.length < 5) {
      toast.error('Title must be at least 5 characters');
      return;
    }
    if (!description || description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }
    if (!category) {
      toast.error('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      await createIdea.mutateAsync({
        title,
        description,
        category,
        initiative_id: initiativeId || undefined,
        is_anonymous: isAnonymous,
        submitter_type: 'employee',
      });
      
      toast.success(isDraft ? 'Draft saved!' : 'Idea submitted successfully!', {
        description: isDraft ? 'You can continue editing later' : 'Your idea will be reviewed by the team.',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to submit idea', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut for submit (Cmd/Ctrl + Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && open && !isSubmitting) {
        e.preventDefault();
        handleSubmit(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, title, description, category, isSubmitting]);

  const canSubmit = title.length >= 5 && description.length >= 20 && category !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-7 py-5 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Submit Your Idea</h2>
              <p className="text-sm text-gray-500">Share your improvement suggestion</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-white/80"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ===== Progress Bar ===== */}
        <div className="px-7 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-6 text-xs font-medium mb-2">
            <span className={progress >= 1 ? 'text-blue-600' : 'text-gray-400'}>① Details</span>
            <span className={progress >= 2 ? 'text-blue-600' : 'text-gray-400'}>② Category</span>
            <span className={progress >= 3 ? 'text-blue-600' : 'text-gray-400'}>③ Submit</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ===== Scrollable Body ===== */}
        <div className="px-7 py-5 overflow-y-auto max-h-[calc(90vh-260px)] space-y-6">
          
          {/* Initiative Selector */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Link to Initiative</p>
                <p className="text-xs text-gray-500">Attach to an active campaign for higher visibility</p>
              </div>
            </div>
            <Select value={initiativeId} onValueChange={setInitiativeId}>
              <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400">
                <SelectValue placeholder="Select an initiative (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="">No specific initiative</SelectItem>
                {activeInitiatives.map(init => (
                  <SelectItem key={init.id} value={init.id}>
                    🎯 {init.code} - {init.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Input */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
              Title <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Pencil className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A clear, concise title for your idea"
                className="pl-10 h-12 text-[15px] border-2 focus:border-blue-500"
                maxLength={200}
              />
            </div>
            <div className="flex justify-end mt-1.5">
              <span className={cn('text-xs', title.length > 180 ? 'text-amber-600' : 'text-gray-400')}>
                {title.length} / 200
              </span>
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your idea in detail. What problem does it solve? How would it work? What benefits would it bring?"
              className="min-h-[140px] text-[15px] border-2 focus:border-blue-500 leading-relaxed rounded-b-none resize-none"
              maxLength={2000}
            />
            
            {/* AI Assist Bar */}
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 border-2 border-t-0 border-gray-200 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
                onClick={handleImproveWithAI}
                disabled={isImproving || description.length < 10}
              >
                {isImproving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Improve with AI
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
                onClick={handleAddStructure}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                Add Structure
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700"
                onClick={() => toast.info('Grammar check coming soon!')}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Check Grammar
              </Button>
            </div>
            
            <div className="flex justify-end mt-1.5">
              <span className={cn('text-xs', description.length > 1800 ? 'text-amber-600' : 'text-gray-400')}>
                {description.length} / 2000
              </span>
            </div>
          </div>

          {/* Category Grid (3x2) */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-3">
              Category <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-center transition-all duration-200',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center text-xl transition-colors',
                      isSelected ? 'bg-blue-500' : 'bg-gray-100'
                    )}>
                      {isSelected ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span>{cat.icon}</span>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs font-medium',
                      isSelected ? 'text-blue-700' : 'text-gray-700'
                    )}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              Tags <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </Label>
            
            <div className="border-2 border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
              <div className="flex flex-wrap gap-2 min-h-[36px] items-center">
                {tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    className="bg-blue-100 text-blue-700 border-0 px-2.5 py-1 text-sm gap-1.5 hover:bg-blue-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? 'Add tags...' : ''}
                  className="flex-1 min-w-[100px] outline-none text-sm py-1 bg-transparent"
                />
              </div>
            </div>
            
            {/* Suggested Tags */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs text-gray-600 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              Attachments <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </Label>
            
            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
              />
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm mx-auto mb-3 flex items-center justify-center border">
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
              </div>
              <div className="text-xs text-gray-400">
                PNG, JPG, PDF, DOC up to 10MB each
              </div>
            </label>
            
            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      {item.preview ? (
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileImage className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">
                        {item.file.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="px-7 py-4 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              id="anonymous"
            />
            <Label htmlFor="anonymous" className="text-sm text-gray-600 cursor-pointer">
              Submit anonymously
            </Label>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !title}
            >
              Save Draft
            </Button>
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25"
              onClick={() => handleSubmit(false)}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit Idea
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 border border-white/30 rounded font-mono">
                ⌘↵
              </kbd>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SubmitIdeaModalRebuilt;

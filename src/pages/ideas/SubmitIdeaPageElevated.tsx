// ============================================================
// SUBMIT IDEA PAGE ELEVATED - Modal/Drawer Style with Tabs
// Target: Match reference design with DETAILS/CATEGORY/ATTACHMENTS tabs
// ============================================================

import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Lightbulb, 
  X,
  Sparkles,
  Send,
  Loader2,
  Layers,
  Paperclip,
  FileText,
  AlignLeft,
  CheckCircle,
  Save,
  Command,
  CornerDownLeft,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateImprovementIdea, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { IDEA_CATEGORY_LABELS } from '@/types/improvement-ideas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ideaSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  category: z.enum([
    'licensing_improvement',
    'compliance_automation',
    'investor_experience',
    'process_optimization',
    'digital_service',
    'integration',
    'data_quality',
    'accessibility',
    'security_enhancement',
    'reporting_analytics',
    'mobile_capability',
    'other',
  ] as const),
  initiative_id: z.string().optional(),
  is_anonymous: z.boolean().default(false),
});

type IdeaFormValues = z.infer<typeof ideaSchema>;
type TabKey = 'details' | 'category' | 'attachments';

export default function SubmitIdeaPageElevated() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInitiative = searchParams.get('initiative') || undefined;
  
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const { data: initiatives = [] } = useImprovementInitiatives();
  const createIdea = useCreateImprovementIdea();

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'process_optimization',
      initiative_id: preselectedInitiative,
      is_anonymous: false,
    },
  });

  const titleValue = form.watch('title');
  const descriptionValue = form.watch('description');

  const onSubmit = async (data: IdeaFormValues) => {
    setIsSubmitting(true);
    try {
      await createIdea.mutateAsync({
        title: data.title,
        description: data.description,
        category: data.category,
        initiative_id: data.initiative_id || undefined,
        is_anonymous: data.is_anonymous,
        submitter_type: 'employee',
      });
      toast.success('Idea submitted successfully!', {
        description: 'Your idea will be reviewed by the team.',
      });
      navigate('/producthub/ideas/all');
    } catch (error) {
      toast.error('Failed to submit idea', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    setTimeout(() => {
      toast.success('Draft saved');
      setIsSavingDraft(false);
    }, 500);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'DETAILS' },
    { key: 'category', label: 'CATEGORY' },
    { key: 'attachments', label: 'ATTACHMENTS' },
  ];

  return (
    <div className="min-h-screen bg-slate-900/50 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Submit Your Idea</h1>
              <p className="text-sm text-slate-500 mt-0.5">Share your improvement suggestion</p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "pb-3 text-sm font-semibold tracking-wide transition-colors relative",
                  activeTab === tab.key 
                    ? "text-emerald-600" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'details' && (
            <>
              {/* Link to Initiative */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Link to Initiative</h3>
                    <p className="text-sm text-slate-500">Attach your idea to an active campaign for higher visibility</p>
                  </div>
                </div>
                <Select 
                  value={form.watch('initiative_id') || '__none__'}
                  onValueChange={(val) => form.setValue('initiative_id', val === '__none__' ? undefined : val)}
                >
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="No specific initiative (General submission)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No specific initiative (General submission)</SelectItem>
                    {initiatives.map((init) => (
                      <SelectItem key={init.id} value={init.id}>
                        {init.code} - {init.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Title <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    {...form.register('title')}
                    placeholder="Add export button to quarterly reports dashboard"
                    className="pl-10 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-slate-400">{titleValue.length}/200</span>
                </div>
                {form.formState.errors.title && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Users frequently need to export quarterly reports in various formats (PDF, Excel, CSV) for external stakeholders and offline analysis.

Problem: The quarterly reports dashboard lacks native export functionality, forcing users to resort to manual workarounds."
                  rows={6}
                  className="mt-1.5 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                      <Sparkles className="w-3 h-3" />
                      Improve with AI
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                      <AlignLeft className="w-3 h-3" />
                      Add Structure
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                      <CheckCircle className="w-3 h-3" />
                      Check Grammar
                    </Button>
                  </div>
                  <span className="text-xs text-slate-400">{descriptionValue.length}/2000</span>
                </div>
                {form.formState.errors.description && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.description.message}</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'category' && (
            <>
              {/* Category Selection */}
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={form.watch('category')}
                  onValueChange={(val) => form.setValue('category', val as any)}
                >
                  <SelectTrigger className="mt-1.5 bg-white border-slate-200">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IDEA_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags - Placeholder */}
              <div>
                <Label className="text-sm font-medium text-slate-700">Tags (Optional)</Label>
                <Input
                  placeholder="Add tags separated by commas..."
                  className="mt-1.5 bg-white border-slate-200"
                />
                <p className="text-xs text-slate-400 mt-1">Help others find your idea with relevant tags</p>
              </div>
            </>
          )}

          {activeTab === 'attachments' && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                <Paperclip className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-700 mb-1">Drop files here or click to upload</h3>
              <p className="text-sm text-slate-500">
                Attach screenshots, documents, or other files to support your idea
              </p>
              <Button variant="outline" className="mt-4">
                Browse Files
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch('is_anonymous')}
                onCheckedChange={(checked) => form.setValue('is_anonymous', checked)}
              />
              <Label className="text-sm text-slate-600">Submit anonymously</Label>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="gap-2"
              >
                {isSavingDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Draft
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Idea
                  </>
                )}
                <span className="flex items-center gap-0.5 ml-1 text-blue-200">
                  <Command className="w-3 h-3" />
                  <CornerDownLeft className="w-3 h-3" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, ChevronLeft, X, AlertCircle } from 'lucide-react';
import { useCreateSnapshot, generateQuarterOptions } from '@/hooks/useStrategicSnapshots';
import { cn } from '@/lib/utils';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateSnapshotModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSnapshotModal({ open, onClose }: CreateSnapshotModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    total_funding: '',
  });
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedOrgStructures, setSelectedOrgStructures] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [notifyOnActivation, setNotifyOnActivation] = useState(true);
  const [notifyOnChanges, setNotifyOnChanges] = useState(false);

  const createSnapshot = useCreateSnapshot();
  const quarterOptions = generateQuarterOptions();

  // Fetch themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Auto-select all themes when entering step 2 if none selected yet
  // This improves UX since most users want all themes included
  const handleStepChange = (newStep: number) => {
    if (newStep === 2 && selectedThemes.length === 0 && themes.length > 0) {
      setSelectedThemes(themes.map(t => t.id));
    }
    setStep(newStep);
  };

  // Products - empty for now as table may not exist
  const products: Array<{ id: string; name: string }> = [];

  const handleClose = () => {
    setStep(1);
    setFormData({ name: '', description: '', start_date: '', end_date: '', total_funding: '' });
    setSelectedQuarters([]);
    setSelectedThemes([]);
    setSelectedOrgStructures([]);
    setSelectedProducts([]);
    setNotifyOnActivation(true);
    setNotifyOnChanges(false);
    onClose();
  };

  const canProceedStep1 = formData.name.trim() && formData.description.trim() && formData.start_date && formData.end_date;
  const canProceedStep2 = selectedQuarters.length > 0 && selectedThemes.length > 0;

  const handleCreate = async (setActive: boolean) => {
    await createSnapshot.mutateAsync({
      snapshot: {
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_funding: formData.total_funding ? parseFloat(formData.total_funding) : undefined,
      },
      configuration: {
        quarters: selectedQuarters,
        themes: selectedThemes,
        org_structures: selectedOrgStructures,
        products: selectedProducts,
        notify_on_activation: notifyOnActivation,
        notify_on_changes: notifyOnChanges,
      },
      setActive,
    });
    handleClose();
  };

  const toggleQuarter = (quarter: string) => {
    setSelectedQuarters(prev =>
      prev.includes(quarter)
        ? prev.filter(q => q !== quarter)
        : [...prev, quarter]
    );
  };

  const toggleTheme = (themeId: string) => {
    setSelectedThemes(prev =>
      prev.includes(themeId)
        ? prev.filter(t => t !== themeId)
        : [...prev, themeId]
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(p => p !== productId)
        : [...prev, productId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col overflow-hidden",
        "bg-white dark:bg-[#141414]",
        "rounded-lg",
        "shadow-xl",
        "border border-gray-200 dark:border-[#333333]",
        "[&>button]:hidden"
      )}>
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-[#2563eb] via-[#0d9488] to-[#60a5fa] flex-shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#333333] flex-shrink-0 bg-white dark:bg-[#141414]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#2563eb]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#f5f5f5]">
                Create Strategic Snapshot
              </h2>
            </div>
            <button 
              onClick={handleClose} 
              className={cn(
                "p-1.5 rounded-md",
                "text-gray-400 hover:text-gray-600 dark:text-[#737373] dark:hover:text-[#a3a3a3]",
                "hover:bg-gray-100 dark:hover:bg-[#1a1a1a]",
                "transition-colors"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#1a1a1a]">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s
                    ? 'bg-[#2563eb] text-white'
                    : step > s
                    ? 'bg-[#2563eb]/20 text-[#2563eb] dark:bg-[#2563eb]/30 dark:text-[#60a5fa]'
                    : 'bg-gray-200 dark:bg-[#333333] text-gray-500 dark:text-[#737373]'
                )}
              >
                {s}
              </div>
              <span className={cn(
                'ml-2 text-sm hidden sm:inline',
                step === s ? 'text-gray-900 dark:text-[#f5f5f5] font-medium' : 'text-gray-500 dark:text-[#737373]'
              )}>
                {s === 1 ? 'Details' : s === 2 ? 'Configuration' : 'Options'}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 mx-3 text-gray-400 dark:text-[#525252]" />}
            </div>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: Basic Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Snapshot Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Corporate Strategy 2025"
                  className={cn(
                    "h-11 bg-white dark:bg-[#1a1a1a]",
                    "border-gray-300 dark:border-[#333333]",
                    "text-gray-900 dark:text-[#f5f5f5]",
                    "placeholder:text-gray-400 dark:placeholder:text-[#525252]",
                    "focus:border-[#2563eb] focus:ring-[#2563eb]/30"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose and scope of this snapshot..."
                  rows={4}
                  className={cn(
                    "bg-white dark:bg-[#1a1a1a]",
                    "border-gray-300 dark:border-[#333333]",
                    "text-gray-900 dark:text-[#f5f5f5]",
                    "placeholder:text-gray-400 dark:placeholder:text-[#525252]",
                    "focus:border-[#2563eb] focus:ring-[#2563eb]/30",
                    "resize-y"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <CatalystDatePicker
                    value={formData.start_date ? parseISO(formData.start_date) : undefined}
                    onChange={(date) => setFormData(prev => ({ 
                      ...prev, 
                      start_date: date ? format(date, 'yyyy-MM-dd') : '' 
                    }))}
                    placeholder="Select start date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <CatalystDatePicker
                    value={formData.end_date ? parseISO(formData.end_date) : undefined}
                    onChange={(date) => setFormData(prev => ({ 
                      ...prev, 
                      end_date: date ? format(date, 'yyyy-MM-dd') : '' 
                    }))}
                    placeholder="Select end date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_funding" className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                  Total Funding (Optional)
                </Label>
                <Input
                  id="total_funding"
                  type="number"
                  value={formData.total_funding}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_funding: e.target.value }))}
                  placeholder="Enter amount..."
                  className={cn(
                    "h-11 bg-white dark:bg-[#1a1a1a]",
                    "border-gray-300 dark:border-[#333333]",
                    "text-gray-900 dark:text-[#f5f5f5]",
                    "placeholder:text-gray-400 dark:placeholder:text-[#525252]",
                    "focus:border-[#2563eb] focus:ring-[#2563eb]/30"
                  )}
                />
              </div>
            </div>
          )}

          {/* Step 2: Configuration (Themes & Quarters) */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Themes Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                    Strategic Themes <span className="text-red-500">*</span>
                  </Label>
                  <Badge variant="outline" className="text-[10px] border-gray-300 dark:border-[#404040] text-gray-500 dark:text-[#737373]">
                    Required: min 1
                  </Badge>
                </div>
                {themes.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-md text-sm text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    No themes available. Please create themes first.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 border border-gray-200 dark:border-[#333333] rounded-lg bg-gray-50 dark:bg-[#1a1a1a]">
                    {themes.map((theme) => (
                      <Badge
                        key={theme.id}
                        variant={selectedThemes.includes(theme.id) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors text-xs',
                          selectedThemes.includes(theme.id) 
                            ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-transparent' 
                            : 'border-gray-300 dark:border-[#404040] text-gray-600 dark:text-[#a3a3a3] hover:border-[#2563eb] hover:text-[#2563eb]'
                        )}
                        onClick={() => toggleTheme(theme.id)}
                      >
                        {theme.name}
                        {selectedThemes.includes(theme.id) && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Quarters Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">
                    Quarters <span className="text-red-500">*</span>
                  </Label>
                  <Badge variant="outline" className="text-[10px] border-gray-300 dark:border-[#404040] text-gray-500 dark:text-[#737373]">
                    Required: min 1
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 border border-gray-200 dark:border-[#333333] rounded-lg bg-gray-50 dark:bg-[#1a1a1a]">
                  {quarterOptions.map((quarter) => (
                    <Badge
                      key={quarter}
                      variant={selectedQuarters.includes(quarter) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors text-xs',
                        selectedQuarters.includes(quarter) 
                          ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-transparent' 
                          : 'border-gray-300 dark:border-[#404040] text-gray-600 dark:text-[#a3a3a3] hover:border-[#2563eb] hover:text-[#2563eb]'
                      )}
                      onClick={() => toggleQuarter(quarter)}
                    >
                      {quarter}
                      {selectedQuarters.includes(quarter) && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>

              {!canProceedStep2 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-md text-sm text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  Select at least one theme and one quarter to continue.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Optional Settings */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Products Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">Products (Optional)</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 border border-gray-200 dark:border-[#333333] rounded-lg bg-gray-50 dark:bg-[#1a1a1a]">
                  {products.length === 0 ? (
                    <span className="text-sm text-gray-500 dark:text-[#737373]">No products available</span>
                  ) : (
                    products.map((product) => (
                      <Badge
                        key={product.id}
                        variant={selectedProducts.includes(product.id) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors text-xs',
                          selectedProducts.includes(product.id) 
                            ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-transparent' 
                            : 'border-gray-300 dark:border-[#404040] text-gray-600 dark:text-[#a3a3a3] hover:border-[#2563eb] hover:text-[#2563eb]'
                        )}
                        onClick={() => toggleProduct(product.id)}
                      >
                        {product.name}
                        {selectedProducts.includes(product.id) && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-[#e6e6e6]">Notifications</Label>
                <div className="space-y-3 p-4 border border-gray-200 dark:border-[#333333] rounded-lg bg-gray-50 dark:bg-[#1a1a1a]">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="notify_activation"
                      checked={notifyOnActivation}
                      onCheckedChange={(checked) => setNotifyOnActivation(!!checked)}
                      className="border-gray-300 dark:border-[#404040] data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb]"
                    />
                    <label htmlFor="notify_activation" className="text-sm text-gray-700 dark:text-[#a3a3a3]">
                      Notify members when snapshot is activated
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="notify_changes"
                      checked={notifyOnChanges}
                      onCheckedChange={(checked) => setNotifyOnChanges(!!checked)}
                      className="border-gray-300 dark:border-[#404040] data-[state=checked]:bg-[#2563eb] data-[state=checked]:border-[#2563eb]"
                    />
                    <label htmlFor="notify_changes" className="text-sm text-gray-700 dark:text-[#a3a3a3]">
                      Notify members when snapshot configuration changes
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333333] rounded-lg space-y-2">
                <h4 className="font-medium text-sm text-gray-900 dark:text-[#f5f5f5]">Summary</h4>
                <div className="text-sm text-gray-600 dark:text-[#a3a3a3] space-y-1">
                  <p><span className="font-medium text-gray-700 dark:text-[#e6e6e6]">Name:</span> {formData.name}</p>
                  <p><span className="font-medium text-gray-700 dark:text-[#e6e6e6]">Period:</span> {formData.start_date} to {formData.end_date}</p>
                  <p><span className="font-medium text-gray-700 dark:text-[#e6e6e6]">Themes:</span> {selectedThemes.length} selected</p>
                  <p><span className="font-medium text-gray-700 dark:text-[#e6e6e6]">Quarters:</span> {selectedQuarters.length} selected</p>
                  {selectedProducts.length > 0 && (
                    <p><span className="font-medium text-gray-700 dark:text-[#e6e6e6]">Products:</span> {selectedProducts.length} selected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={cn(
          "flex items-center justify-between",
          "px-6 py-4",
          "bg-gray-50 dark:bg-[#1a1a1a]",
          "border-t border-gray-200 dark:border-[#333333]",
          "flex-shrink-0"
        )}>
          <Button
            variant="ghost"
            onClick={() => step > 1 ? handleStepChange(step - 1) : handleClose()}
            className="text-gray-600 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-[#f5f5f5] hover:bg-gray-100 dark:hover:bg-[#333333]"
          >
            {step > 1 ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            ) : 'Cancel'}
          </Button>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <Button
                onClick={() => handleStepChange(step + 1)}
                disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleCreate(false)}
                  disabled={createSnapshot.isPending}
                  className="border-gray-300 dark:border-[#404040] text-gray-700 dark:text-[#a3a3a3] hover:bg-gray-100 dark:hover:bg-[#333333]"
                >
                  Create as Draft
                </Button>
                <Button
                  onClick={() => handleCreate(true)}
                  disabled={createSnapshot.isPending}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                >
                  Create & Activate
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

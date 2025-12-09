import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, ChevronLeft, X, AlertCircle } from 'lucide-react';
import { useCreateSnapshot, generateQuarterOptions } from '@/hooks/useStrategicSnapshots';
import { cn } from '@/lib/utils';

interface CreateSnapshotModalProps {
  open: boolean;
  onClose: () => void;
}

// Fetch themes from strategic_themes table
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-gold" />
            Create Strategic Snapshot
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-4 border-b">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s
                    ? 'bg-brand-gold text-white'
                    : step > s
                    ? 'bg-brand-gold/20 text-brand-gold'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {s}
              </div>
              <span className={cn(
                'ml-2 text-sm hidden sm:inline',
                step === s ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {s === 1 ? 'Details' : s === 2 ? 'Configuration' : 'Options'}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Snapshot Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Corporate Strategy 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose and scope of this snapshot..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_funding">Total Funding (Optional)</Label>
              <Input
                id="total_funding"
                type="number"
                value={formData.total_funding}
                onChange={(e) => setFormData(prev => ({ ...prev, total_funding: e.target.value }))}
                placeholder="Enter amount..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Configuration (Themes & Quarters) */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            {/* Themes Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Strategic Themes *</Label>
                <Badge variant="outline" className="text-xs">Required: min 1</Badge>
              </div>
              {themes.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  No themes available. Please create themes first.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {themes.map((theme) => (
                    <Badge
                      key={theme.id}
                      variant={selectedThemes.includes(theme.id) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selectedThemes.includes(theme.id) && 'bg-brand-gold hover:bg-brand-gold/90'
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
                <Label>Quarters *</Label>
                <Badge variant="outline" className="text-xs">Required: min 1</Badge>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                {quarterOptions.map((quarter) => (
                  <Badge
                    key={quarter}
                    variant={selectedQuarters.includes(quarter) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedQuarters.includes(quarter) && 'bg-brand-gold hover:bg-brand-gold/90'
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
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <AlertCircle className="h-4 w-4" />
                Select at least one theme and one quarter to continue.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Optional Settings */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            {/* Products Selection */}
            <div className="space-y-3">
              <Label>Products (Optional)</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                {products.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No products available</span>
                ) : (
                  products.map((product) => (
                    <Badge
                      key={product.id}
                      variant={selectedProducts.includes(product.id) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selectedProducts.includes(product.id) && 'bg-brand-gold hover:bg-brand-gold/90'
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
              <Label>Notifications</Label>
              <div className="space-y-3 p-3 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_activation"
                    checked={notifyOnActivation}
                    onCheckedChange={(checked) => setNotifyOnActivation(!!checked)}
                  />
                  <label htmlFor="notify_activation" className="text-sm">
                    Notify members when snapshot is activated
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify_changes"
                    checked={notifyOnChanges}
                    onCheckedChange={(checked) => setNotifyOnChanges(!!checked)}
                  />
                  <label htmlFor="notify_changes" className="text-sm">
                    Notify members when snapshot configuration changes
                  </label>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-md space-y-2">
              <h4 className="font-medium text-sm">Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Period:</strong> {formData.start_date} to {formData.end_date}</p>
                <p><strong>Themes:</strong> {selectedThemes.length} selected</p>
                <p><strong>Quarters:</strong> {selectedQuarters.length} selected</p>
                {selectedProducts.length > 0 && (
                  <p><strong>Products:</strong> {selectedProducts.length} selected</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
          >
            {step > 1 ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            ) : 'Cancel'}
          </Button>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
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
                >
                  Create as Draft
                </Button>
                <Button
                  onClick={() => handleCreate(true)}
                  disabled={createSnapshot.isPending}
                  className="bg-brand-gold hover:bg-brand-gold/90"
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

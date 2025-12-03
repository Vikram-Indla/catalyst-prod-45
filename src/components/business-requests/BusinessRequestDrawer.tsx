import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Edit, Save } from 'lucide-react';
import { useBusinessRequest, useUpdateBusinessRequest } from '@/hooks/useBusinessRequests';
import { BusinessRequest, PROCESS_STEPS, HEALTH_OPTIONS } from '@/types/business-request';
import { OverviewTab } from './drawer-tabs/OverviewTab';
import { PortfolioTab } from './drawer-tabs/PortfolioTab';
import { TechnicalTab } from './drawer-tabs/TechnicalTab';
import { EstimationTab } from './drawer-tabs/EstimationTab';
import { ApprovalTab } from './drawer-tabs/ApprovalTab';
import { ReadinessTab } from './drawer-tabs/ReadinessTab';
import { ImplementationTab } from './drawer-tabs/ImplementationTab';
import { SupportTab } from './drawer-tabs/SupportTab';
import { OnHoldTab } from './drawer-tabs/OnHoldTab';

interface BusinessRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
}

export function BusinessRequestDrawer({ isOpen, onClose, requestId }: BusinessRequestDrawerProps) {
  const { data: request, isLoading } = useBusinessRequest(requestId);
  const updateMutation = useUpdateBusinessRequest();
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessRequest>>({});

  useEffect(() => {
    if (request) {
      setFormData(request);
    }
  }, [request]);

  const handleFieldChange = (field: keyof BusinessRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!requestId) return;
    await updateMutation.mutateAsync({ id: requestId, data: formData });
    setIsEditMode(false);
  };

  const handleClose = () => {
    setIsEditMode(false);
    onClose();
  };

  const getProcessStepStyle = (step: string) => {
    const found = PROCESS_STEPS.find(s => s.value === step);
    return found?.color || 'bg-gray-100 text-gray-600';
  };

  const getHealthStyle = (health: string) => {
    const found = HEALTH_OPTIONS.find(h => h.value === health);
    return found?.color || 'bg-gray-100 text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[680px] p-0 flex flex-col bg-[#feffff] overflow-hidden"
      >
        {/* Gold Bar */}
        <div className="h-1 bg-brand-gold flex-shrink-0" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e5e5e5] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-xl font-semibold text-[#1a1a1a] truncate">
                {request?.title || 'Loading...'}
              </h2>
              <p className="text-sm text-[#6b7280] font-mono mt-1">
                {request?.request_key || ''}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="flex-shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-[#e5e5e5] px-6 flex-shrink-0 overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 gap-0 flex-wrap">
              {['Overview', 'Portfolio', 'Technical', 'Estimation', 'Approval', 'Readiness', 'Implementation', 'Support', 'On Hold'].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab.toLowerCase().replace(' ', '-')}
                  className="px-4 py-3 text-sm text-[#6b7280] border-b-2 border-transparent rounded-none data-[state=active]:text-[#1a1a1a] data-[state=active]:font-medium data-[state=active]:border-brand-gold data-[state=active]:bg-transparent hover:text-[#1a1a1a]"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Edit Button & Global Fields */}
              <div className="space-y-4">
                <Button
                  onClick={() => isEditMode ? handleSave() : setIsEditMode(true)}
                  className={isEditMode 
                    ? "w-full bg-brand-gold text-white hover:bg-brand-gold-hover" 
                    : "w-full bg-brand-gold text-white hover:bg-brand-gold-hover"
                  }
                  disabled={updateMutation.isPending}
                >
                  {isEditMode ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Request
                    </>
                  )}
                </Button>

                {/* Process Step */}
                <div>
                  <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Process Step</label>
                  {isEditMode ? (
                    <Select
                      value={formData.process_step || 'new_demand'}
                      onValueChange={(value) => handleFieldChange('process_step', value)}
                    >
                      <SelectTrigger className="border-[#e5e5e5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROCESS_STEPS.map((step) => (
                          <SelectItem key={step.value} value={step.value}>
                            {step.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getProcessStepStyle(formData.process_step || 'new_demand')}`}>
                      {PROCESS_STEPS.find(s => s.value === formData.process_step)?.label || 'New Demand'}
                    </span>
                  )}
                </div>

                {/* Health */}
                <div>
                  <label className="text-sm font-medium text-[#1a1a1a] block mb-2">Health</label>
                  {isEditMode ? (
                    <Select
                      value={formData.health || 'green'}
                      onValueChange={(value) => handleFieldChange('health', value)}
                    >
                      <SelectTrigger className="border-[#e5e5e5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getHealthStyle(formData.health || 'green')}`}>
                      {formData.health || 'green'}
                    </span>
                  )}
                </div>
              </div>

              {/* Tab Contents */}
              <TabsContent value="overview" className="m-0 mt-4">
                <OverviewTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="portfolio" className="m-0 mt-4">
                <PortfolioTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="technical" className="m-0 mt-4">
                <TechnicalTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="estimation" className="m-0 mt-4">
                <EstimationTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="approval" className="m-0 mt-4">
                <ApprovalTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="readiness" className="m-0 mt-4">
                <ReadinessTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="implementation" className="m-0 mt-4">
                <ImplementationTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="support" className="m-0 mt-4">
                <SupportTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
              <TabsContent value="on-hold" className="m-0 mt-4">
                <OnHoldTab data={formData} isEditMode={isEditMode} onChange={handleFieldChange} />
              </TabsContent>
            </div>
          </div>

          {/* Footer */}
          {isEditMode && (
            <div className="px-6 py-4 border-t border-[#e5e5e5] flex justify-end gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setIsEditMode(false)} className="border-[#e5e5e5]">
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-brand-gold text-white hover:bg-brand-gold-hover"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

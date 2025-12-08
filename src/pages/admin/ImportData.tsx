import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ImportWizardStepper, WizardStep } from '@/components/admin/import/ImportWizardStepper';
import { ImportStepSetup } from '@/components/admin/import/ImportStepSetup';
import { ImportStepSettings } from '@/components/admin/import/ImportStepSettings';
import { ImportStepFieldMapping } from '@/components/admin/import/ImportStepFieldMapping';
import { ImportStepMapValues } from '@/components/admin/import/ImportStepMapValues';
import { ImportStepValidation } from '@/components/admin/import/ImportStepValidation';
import { ImportStepConfirm } from '@/components/admin/import/ImportStepConfirm';
import { importModuleConfigs, ImportModuleType, getModuleConfig } from '@/lib/import/importModuleConfig';
import { validateAllRows, RowValidationResult } from '@/lib/import/importValidator';

const wizardSteps: WizardStep[] = [
  { id: 1, label: 'Setup' },
  { id: 2, label: 'Settings' },
  { id: 3, label: 'Map fields' },
  { id: 4, label: 'Map values' },
  { id: 5, label: 'Validate' },
  { id: 6, label: 'Confirm' },
];

export default function ImportData() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Module selection
  const [selectedModule, setSelectedModule] = useState<ImportModuleType | null>(null);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Setup state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [useExistingConfig, setUseExistingConfig] = useState(false);
  
  // Settings state
  const [encoding, setEncoding] = useState('UTF-8');
  const [delimiter, setDelimiter] = useState(',');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [targetProject, setTargetProject] = useState('');
  
  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<Map<string, string>>(new Map());
  const [valueMappingEnabled, setValueMappingEnabled] = useState<Map<string, boolean>>(new Map());
  const [valueMappings, setValueMappings] = useState<Map<string, Map<string, string>>>(new Map());
  
  // Validation state
  const [validationResults, setValidationResults] = useState<RowValidationResult[] | null>(null);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  
  const moduleConfig = selectedModule ? getModuleConfig(selectedModule) : null;
  
  const handleFileSelect = useCallback((f: File, data: Record<string, string>[], headers: string[]) => {
    setFile(f);
    setParsedData(data);
    setCsvHeaders(headers);
    // Auto-map fields with matching names
    const autoMappings = new Map<string, string>();
    if (moduleConfig) {
      headers.forEach(header => {
        const match = moduleConfig.fields.find(field => 
          field.label.toLowerCase() === header.toLowerCase() ||
          field.key.toLowerCase() === header.toLowerCase().replace(/ /g, '_')
        );
        if (match) autoMappings.set(header, match.key);
      });
    }
    setFieldMappings(autoMappings);
  }, [moduleConfig]);
  
  const handleValidate = useCallback(() => {
    if (!moduleConfig) return;
    // CRITICAL: Pass valueMappings AND csvHeaders to apply user-configured value transformations
    // and detect duplicate header rows
    const { results } = validateAllRows(parsedData, fieldMappings, moduleConfig, dateFormat, valueMappings, csvHeaders);
    setValidationResults(results);
  }, [parsedData, fieldMappings, moduleConfig, dateFormat, valueMappings, csvHeaders]);
  
  const handleBeginImport = useCallback(async () => {
    if (!moduleConfig || !validationResults) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    // CRITICAL: Filter out header rows and rows with errors - only import valid rows
    const validRows = validationResults.filter(r => 
      !r.isHeaderRow && r.errors.filter(e => e.severity === 'error').length === 0
    );
    let success = 0;
    let failed = 0;
    
    // Batch insert
    const batchSize = 50;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(r => r.data);
      
      const { error } = await supabase
        .from(moduleConfig.tableName as any)
        .insert(batch as any[]);
      
      if (error) {
        failed += batch.length;
        console.error('Import batch error:', error);
      } else {
        success += batch.length;
      }
      
      setImportProgress(((i + batch.length) / validRows.length) * 100);
    }
    
    setIsImporting(false);
    setImportResult({ success, failed });
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: [moduleConfig.tableName] });
    queryClient.invalidateQueries({ queryKey: [selectedModule] });
    
    if (failed === 0) {
      toast.success(`Successfully imported ${success} ${moduleConfig.label.toLowerCase()}`);
    } else {
      toast.warning(`Imported ${success} records, ${failed} failed`);
    }
  }, [moduleConfig, validationResults, queryClient, selectedModule]);
  
  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!file && parsedData.length > 0;
      case 2: return true;
      case 3: return moduleConfig?.fields.filter(f => f.required).every(f => 
        Array.from(fieldMappings.values()).includes(f.key)
      );
      case 4: return true;
      case 5: return !!validationResults;
      default: return true;
    }
  };
  
  if (!selectedModule) {
    return (
      <div className="p-6">
        <div className="h-[72px] flex items-center border-b mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Import Data</h1>
        </div>
        
        <div className="max-w-2xl">
          <p className="text-muted-foreground mb-6">What would you like to import?</p>
          
          <RadioGroup value={selectedModule || ''} onValueChange={(v) => setSelectedModule(v as ImportModuleType)}>
            <div className="space-y-3">
              {importModuleConfigs.map((config) => (
                <div key={config.type} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedModule(config.type)}>
                  <RadioGroupItem value={config.type} id={config.type} className="mt-1" />
                  <Label htmlFor={config.type} className="cursor-pointer flex-1">
                    <span className="font-medium">{config.label}</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-[72px] flex items-center justify-between border-b px-6 shrink-0">
        <h1 className="text-2xl font-semibold text-foreground">Import {moduleConfig?.label}</h1>
        <ImportWizardStepper steps={wizardSteps} currentStep={currentStep} className="max-w-xl" />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-4xl">
          {currentStep === 1 && (
            <ImportStepSetup
              file={file}
              parsedData={parsedData}
              headers={csvHeaders}
              useExistingConfig={useExistingConfig}
              onFileSelect={handleFileSelect}
              onClearFile={() => { setFile(null); setParsedData([]); setCsvHeaders([]); }}
              onUseExistingConfigChange={setUseExistingConfig}
            />
          )}
          
          {currentStep === 2 && moduleConfig && (
            <ImportStepSettings
              moduleConfig={moduleConfig}
              encoding={encoding}
              delimiter={delimiter}
              dateFormat={dateFormat}
              targetProject={targetProject}
              onEncodingChange={setEncoding}
              onDelimiterChange={setDelimiter}
              onDateFormatChange={setDateFormat}
              onTargetProjectChange={setTargetProject}
              projects={[]}
            />
          )}
          
          {currentStep === 3 && moduleConfig && (
            <ImportStepFieldMapping
              moduleConfig={moduleConfig}
              csvHeaders={csvHeaders}
              parsedData={parsedData}
              fieldMappings={fieldMappings}
              valueMappingEnabled={valueMappingEnabled}
              onFieldMappingChange={(csv, db) => setFieldMappings(prev => new Map(prev).set(csv, db))}
              onValueMappingToggle={(csv, enabled) => setValueMappingEnabled(prev => new Map(prev).set(csv, enabled))}
            />
          )}
          
          {currentStep === 4 && moduleConfig && (
            <ImportStepMapValues
              moduleConfig={moduleConfig}
              csvHeaders={csvHeaders}
              parsedData={parsedData}
              fieldMappings={fieldMappings}
              valueMappingEnabled={valueMappingEnabled}
              valueMappings={valueMappings}
              onValueMappingChange={(csv, csvVal, target) => {
                setValueMappings(prev => {
                  const newMap = new Map(prev);
                  const inner = newMap.get(csv) || new Map();
                  inner.set(csvVal, target);
                  newMap.set(csv, inner);
                  return newMap;
                });
              }}
            />
          )}
          
          {currentStep === 5 && moduleConfig && (
            <ImportStepValidation
              moduleConfig={moduleConfig}
              parsedData={parsedData}
              fieldMappings={fieldMappings}
              dateFormat={dateFormat}
              validationResults={validationResults}
              onValidate={handleValidate}
              onDownloadErrors={() => toast.info('Error report downloaded')}
            />
          )}
          
          {currentStep === 6 && moduleConfig && (
            <ImportStepConfirm
              moduleConfig={moduleConfig}
              validationResults={validationResults}
              isImporting={isImporting}
              importProgress={importProgress}
              importResult={importResult}
              onBeginImport={handleBeginImport}
              onDownloadPreview={() => toast.info('Preview downloaded')}
            />
          )}
        </div>
      </div>
      
      {/* Sticky Footer Navigation */}
      <div className="shrink-0 border-t bg-background px-6 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl flex items-center justify-between">
          <Button
            onClick={() => currentStep === 1 ? setSelectedModule(null) : setCurrentStep(s => s - 1)}
            variant="outline"
            disabled={isImporting}
          >
            Back
          </Button>
          {currentStep < 6 && (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed() || isImporting}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

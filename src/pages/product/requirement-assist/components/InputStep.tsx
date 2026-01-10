import React, { useState, useCallback } from 'react';
import { Upload, FileText, CloudUpload, X, Check, Pen, ExternalLink, Users, Zap, Shield, Languages, AlertTriangle, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveAnalysis } from '../hooks/useLiveAnalysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface InputStepProps {
  content: string;
  onContentChange: (content: string) => void;
  uploadedFile: File | null;
  onFileUpload: (file: File | null) => void;
  selectedOutputs: {
    epics: boolean;
    features: boolean;
    stories: boolean;
    tests: boolean;
  };
  onToggleOutput: (output: 'epics' | 'features' | 'stories' | 'tests') => void;
}

export function InputStep({
  content,
  onContentChange,
  uploadedFile,
  onFileUpload,
  selectedOutputs,
  onToggleOutput,
}: InputStepProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'upload'>('write');
  const [isDragOver, setIsDragOver] = useState(false);
  const analysis = useLiveAnalysis(content);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  }, [onFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
  }, [onFileUpload]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex gap-5 flex-1">
      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('write')}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium relative transition-colors",
                activeTab === 'write' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pen className="w-4 h-4" /> Write
              {activeTab === 'write' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                "flex items-center gap-2 px-5 py-3.5 text-sm font-medium relative transition-colors",
                activeTab === 'upload' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-4 h-4" /> Upload
              {activeTab === 'upload' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Write Tab */}
          {activeTab === 'write' && (
            <div className="flex-1 flex flex-col">
              <Textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Paste or type your requirements here...

Example: The system shall enable users to upload and manage documents. Users should be able to upload PDF, DOCX, and TXT files up to 50MB. The system must support OCR extraction for scanned documents..."
                className="flex-1 min-h-[300px] border-0 rounded-none resize-none focus-visible:ring-0"
              />
              <div className="flex justify-between items-center px-4 py-3 border-t bg-muted/30">
                <div className={cn(
                  "text-[13px]",
                  analysis.wordCountStatus === 'warning' && "text-amber-600",
                  analysis.wordCountStatus === 'danger' && "text-destructive"
                )}>
                  <strong>{analysis.wordCount}</strong> / 3,000 words
                </div>
                <Button variant="ghost" size="sm">
                  <span className="flex items-center gap-1.5">Expand</span>
                </Button>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="p-4">
              {!uploadedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all",
                    isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
                  )}
                >
                  <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <h4 className="text-[15px] font-semibold mb-1">Drop your document here</h4>
                  <p className="text-[13px] text-muted-foreground mb-3">or click to browse</p>
                  <div className="flex justify-center gap-2">
                    {['PDF', 'DOCX', 'TXT'].map(format => (
                      <span key={format} className="px-2.5 py-1 bg-background border rounded text-xs text-muted-foreground">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">{uploadedFile.name}</h4>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)} • Uploaded just now</p>
                  </div>
                  <button
                    onClick={() => onFileUpload(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                type="file"
                id="fileInput"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Output Selection */}
          <div className="p-4 border-t">
            <div className="text-[13px] font-semibold text-muted-foreground mb-3">Select Outputs to Generate</div>
            <div className="flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2.5 px-4 py-3 border border-emerald-500 bg-emerald-50 rounded-lg">
                <div className="w-[18px] h-[18px] bg-emerald-500 rounded flex items-center justify-center text-white">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span className="text-[13px] font-medium">PRD</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Always</span>
              </div>
              
              {(['epics', 'features', 'stories', 'tests'] as const).map(output => (
                <button
                  key={output}
                  onClick={() => onToggleOutput(output)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 border rounded-lg transition-all",
                    selectedOutputs[output] ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-[18px] h-[18px] rounded flex items-center justify-center transition-colors",
                    selectedOutputs[output] ? "bg-primary text-white" : "border-2 border-muted-foreground"
                  )}>
                    {selectedOutputs[output] && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-[13px] font-medium capitalize">
                    {output === 'tests' ? 'Test Cases' : output}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Context Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        <Card>
          <CardHeader className="py-3.5 px-4 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" /> Active Context
            </CardTitle>
            <span className="text-[13px] text-primary cursor-pointer hover:underline flex items-center gap-1">
              Edit <ExternalLink className="w-3 h-3" />
            </span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Templates */}
            <div className="pb-3 mb-3 border-b">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Templates In Use</div>
              {[
                { name: 'Ministry PRD Template', version: 'v3.2' },
                { name: 'SAFe Epic Template', version: 'v2.0' },
                { name: 'SAFe Feature Template', version: 'v2.0' },
                { name: 'Gherkin Story Template', version: 'v1.5' },
              ].map((template, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-muted/50 cursor-pointer group">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <Check className="w-2 h-2" />
                  </div>
                  <span className="flex-1 text-[13px] text-muted-foreground">{template.name}</span>
                  <span className="text-[11px] text-muted-foreground/60">{template.version}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>

            {/* Compliance */}
            <div className="pb-3 mb-3 border-b">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Compliance Rules</div>
              {[
                { name: 'DGA Standards 2025', count: '12' },
                { name: 'NCA ECC-2:2018', count: '8' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-muted/50 cursor-pointer group">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <Check className="w-2 h-2" />
                  </div>
                  <span className="flex-1 text-[13px] text-muted-foreground">{rule.name}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>

            {/* Translation */}
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Translation</div>
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-[13px] text-muted-foreground">Arabic Auto-detect</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-[13px] text-muted-foreground">Ministry Glossary v1.2</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Analysis */}
        <Card>
          <CardHeader className="py-3.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" /> Live Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="bg-muted/30 rounded-md">
              {/* Arabic Notice */}
              {analysis.hasArabic && (
                <div className="flex items-center gap-2.5 p-3 bg-violet-100 text-violet-700 text-[13px] rounded-t-md">
                  <Languages className="w-4 h-4" />
                  Arabic detected • Translation will be applied
                </div>
              )}

              {/* Detected Elements */}
              <div className="p-3 border-b">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Detected Elements</div>
                <div className="space-y-2">
                  {[
                    { icon: Users, label: 'Actors', value: analysis.actorCount },
                    { icon: Zap, label: 'Functions', value: analysis.funcCount },
                    { icon: Shield, label: 'NFRs', value: analysis.nfrCount },
                    { icon: ExternalLink, label: 'Integrations', value: analysis.intCount },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-2 text-[13px]">
                      <item.icon className="w-4 h-4 text-primary" />
                      <span className="flex-1 text-muted-foreground">{item.label}</span>
                      <span className="px-2.5 py-1 bg-primary/10 text-primary rounded text-xs font-semibold min-w-[28px] text-center">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div className="p-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Quality</div>
                <div className="flex items-center gap-2.5 py-2 text-[13px]">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="flex-1 text-muted-foreground">Complexity</span>
                  <span className="text-sm font-medium">{analysis.complexity}</span>
                </div>
                {analysis.ambiguityCount > 0 && (
                  <div className="flex items-center gap-2.5 py-2 text-[13px]">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="flex-1 text-muted-foreground">Ambiguities</span>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-600 rounded text-xs font-semibold">
                      {analysis.ambiguityCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CloudUpload, X, Check, Pen, ExternalLink, Users, Zap, Shield, Languages, AlertTriangle, Globe, Expand, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveAnalysis } from '../hooks/useLiveAnalysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RichTextEditor } from './RichTextEditor';

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
  onOpenSettings?: () => void;
}

export function InputStep({
  content,
  onContentChange,
  uploadedFile,
  onFileUpload,
  selectedOutputs,
  onToggleOutput,
  onOpenSettings,
}: InputStepProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'upload'>('write');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState('');
  const analysis = useLiveAnalysis(content);

  // Sync expanded content when opening
  useEffect(() => {
    if (isEditorExpanded) {
      setExpandedContent(content);
    }
  }, [isEditorExpanded]);

  const handleExpandEditor = () => {
    setExpandedContent(content);
    setIsEditorExpanded(true);
  };

  const handleCollapseEditor = () => {
    onContentChange(expandedContent);
    setIsEditorExpanded(false);
  };

  // Handle Escape key to close expanded editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorExpanded) {
        handleCollapseEditor();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditorExpanded, expandedContent]);

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
    <>
      <div className="flex gap-5 h-full max-h-[calc(100vh-280px)]">
        {/* Main Panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <Card className="flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b flex-shrink-0">
              <button
                onClick={() => setActiveTab('write')}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium relative transition-colors",
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
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium relative transition-colors",
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
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-[200px] max-h-[280px] overflow-hidden">
                  <RichTextEditor
                    content={content}
                    onChange={onContentChange}
                    placeholder="Paste or type your requirements here...

Example: The system shall enable users to upload and manage documents. Users should be able to upload PDF, DOCX, and TXT files up to 50MB. The system must support OCR extraction for scanned documents..."
                    className="border-0 rounded-none h-full"
                  />
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 border-t bg-muted/30 flex-shrink-0">
                  <div className={cn(
                    "text-[13px]",
                    analysis.wordCountStatus === 'warning' && "text-amber-600",
                    analysis.wordCountStatus === 'danger' && "text-destructive"
                  )}>
                    <strong>{analysis.wordCount}</strong> / 3,000 words
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleExpandEditor}>
                    <Expand className="w-4 h-4 mr-1.5" /> Expand
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
            <div className="p-3 border-t flex-shrink-0 bg-muted/20">
              <div className="text-[12px] font-semibold text-muted-foreground mb-2">Select Outputs to Generate</div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-2 border border-emerald-500 bg-emerald-50 rounded-lg">
                  <div className="w-4 h-4 bg-emerald-500 rounded flex items-center justify-center text-white">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[12px] font-medium">PRD</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Always</span>
                </div>
                
                {(['epics', 'features', 'stories', 'tests'] as const).map(output => (
                  <button
                    key={output}
                    onClick={() => onToggleOutput(output)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 border rounded-lg transition-all",
                      selectedOutputs[output] ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded flex items-center justify-center transition-colors",
                      selectedOutputs[output] ? "bg-primary text-white" : "border-2 border-muted-foreground"
                    )}>
                      {selectedOutputs[output] && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="text-[12px] font-medium capitalize">
                      {output === 'tests' ? 'Test Cases' : output}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Context Panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
          <Card className="flex-shrink-0">
            <CardHeader className="py-2.5 px-3 flex-row items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" /> Active Context
              </CardTitle>
              <button 
                onClick={onOpenSettings}
                className="text-[12px] text-primary cursor-pointer hover:underline flex items-center gap-1"
              >
                Edit <ExternalLink className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {/* Templates */}
              <div className="pb-2 mb-2 border-b">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Templates In Use</div>
                {[
                  { name: 'Ministry PRD Template', version: 'v3.2' },
                  { name: 'SAFe Epic Template', version: 'v2.0' },
                  { name: 'Gherkin Story Template', version: 'v1.5' },
                ].map((template, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer group">
                    <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <Check className="w-2 h-2" />
                    </div>
                    <span className="flex-1 text-[11px] text-muted-foreground truncate">{template.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">{template.version}</span>
                  </div>
                ))}
              </div>

              {/* Compliance */}
              <div className="pb-2 mb-2 border-b">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Compliance Rules</div>
                {[
                  { name: 'DGA Standards 2025' },
                  { name: 'NCA ECC-2:2018' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer group">
                    <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <Check className="w-2 h-2" />
                    </div>
                    <span className="flex-1 text-[11px] text-muted-foreground truncate">{rule.name}</span>
                  </div>
                ))}
              </div>

              {/* Translation */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Translation</div>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] text-muted-foreground">Arabic Auto-detect</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Analysis */}
          <Card className="flex-shrink-0">
            <CardHeader className="py-2.5 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" /> Live Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-muted/30 rounded-md">
                {/* Arabic Notice */}
                {analysis.hasArabic && (
                  <div className="flex items-center gap-2 p-2 bg-violet-100 text-violet-700 text-[11px] rounded-t-md">
                    <Languages className="w-3.5 h-3.5" />
                    Arabic detected
                  </div>
                )}

                {/* Detected Elements */}
                <div className="p-2.5 border-b">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Detected Elements</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: Users, label: 'Actors', value: analysis.actorCount },
                      { icon: Zap, label: 'Functions', value: analysis.funcCount },
                      { icon: Shield, label: 'NFRs', value: analysis.nfrCount },
                      { icon: ExternalLink, label: 'Integrations', value: analysis.intCount },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 py-1 text-[11px]">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                        <span className="flex-1 text-muted-foreground">{item.label}</span>
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold min-w-[20px] text-center">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="flex-1 text-muted-foreground">Complexity</span>
                    <span className="text-[11px] font-medium">{analysis.complexity}</span>
                  </div>
                  {analysis.ambiguityCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="flex-1 text-muted-foreground">Ambiguities</span>
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-semibold">
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

      {/* Expanded Editor Modal */}
      <Dialog open={isEditorExpanded} onOpenChange={(open) => !open && handleCollapseEditor()}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle>Fullscreen Editor</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleCollapseEditor}>
              <Minimize2 className="w-4 h-4 mr-1.5" /> Collapse
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <RichTextEditor
              content={expandedContent}
              onChange={setExpandedContent}
              placeholder="Paste or type your requirements here..."
              className="h-full min-h-[400px]"
            />
          </div>
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="text-[13px] text-muted-foreground">
              <strong>{expandedContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length}</strong> / 3,000 words
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCollapseEditor}>
                Cancel
              </Button>
              <Button onClick={handleCollapseEditor}>
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

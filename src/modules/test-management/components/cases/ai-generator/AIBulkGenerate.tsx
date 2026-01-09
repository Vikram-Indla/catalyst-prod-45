/**
 * AI Generator - Bulk Generate Tab
 * Paste or upload multiple requirements to generate test cases in bulk
 */

import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Download, X, ClipboardList, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkOptions {
  testType: string;
  testsPerRequirement: string;
  includeEdgeCases: boolean;
  includeNegativeTests: boolean;
}

interface AIBulkGenerateProps {
  requirements: string[];
  onRequirementsChange: (reqs: string[]) => void;
  options: BulkOptions;
  onOptionsChange: (opts: BulkOptions) => void;
}

export function AIBulkGenerate({
  requirements,
  onRequirementsChange,
  options,
  onOptionsChange,
}: AIBulkGenerateProps) {
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (text: string) => {
    setTextInput(text);
    const reqs = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
    onRequirementsChange(reqs);
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n').slice(1); // Skip header
        const reqs = lines.map(line => {
          const cols = line.split(',');
          return cols[0]?.trim().replace(/^["']|["']$/g, '');
        }).filter(Boolean) as string[];
        onRequirementsChange(reqs);
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        const reqs = text.split('\n').map(r => r.trim()).filter(Boolean);
        onRequirementsChange(reqs);
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const downloadTemplate = () => {
    const csv = 'Requirement,Priority,Type\n"User login with valid credentials",P1,Functional\n"Password reset via email",P2,Functional\n"Account lockout after 3 failed attempts",P1,Security\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setUploadedFile(null);
    onRequirementsChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Import Method Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
          <Upload className="w-4 h-4 text-primary" />
          IMPORT METHOD
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setInputMethod('paste')}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              inputMethod === 'paste'
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <ClipboardList className={cn(
              "w-6 h-6 mb-2",
              inputMethod === 'paste' ? "text-primary" : "text-gray-400"
            )} />
            <div className="font-medium text-sm">Paste Text</div>
            <div className="text-xs text-gray-500 mt-0.5">One requirement per line</div>
          </button>
          <button
            type="button"
            onClick={() => setInputMethod('upload')}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              inputMethod === 'upload'
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <FileText className={cn(
              "w-6 h-6 mb-2",
              inputMethod === 'upload' ? "text-primary" : "text-gray-400"
            )} />
            <div className="font-medium text-sm">Upload File</div>
            <div className="text-xs text-gray-500 mt-0.5">CSV, XLSX, or TXT</div>
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        {inputMethod === 'paste' ? (
          <>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
              <ClipboardList className="w-4 h-4 text-primary" />
              PASTE REQUIREMENTS (one per line)
            </div>
            <Textarea
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`User login with valid username and password
User login with invalid credentials shows error message
Account lockout after 3 failed login attempts
Password reset via email link
Session timeout after 30 minutes of inactivity
SSO login with National ID integration`}
              className="min-h-[200px] font-mono text-sm resize-none"
            />
            <div className="mt-2 text-xs text-gray-500">
              {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} detected
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
              <Upload className="w-4 h-4 text-primary" />
              UPLOAD REQUIREMENTS FILE
            </div>

            {uploadedFile ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{uploadedFile.name}</div>
                    <div className="text-xs text-gray-500">
                      {requirements.length} requirements found
                    </div>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="p-2 hover:bg-green-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-gray-300 hover:border-primary/50 hover:bg-gray-50"
                )}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600 font-medium">
                  Drop your file here or click to browse
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  Supported: .csv, .xlsx, .txt
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="mt-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </>
        )}
      </div>

      {/* Bulk Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">
          <Settings className="w-4 h-4 text-primary" />
          BULK OPTIONS
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              TEST TYPE (applies to all)
            </label>
            <Select
              value={options.testType}
              onValueChange={(v) => onOptionsChange({ ...options, testType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">🧪 Functional</SelectItem>
                <SelectItem value="regression">🔄 Regression</SelectItem>
                <SelectItem value="integration">🔗 Integration</SelectItem>
                <SelectItem value="smoke">💨 Smoke</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              TESTS PER REQUIREMENT
            </label>
            <Select
              value={options.testsPerRequirement}
              onValueChange={(v) => onOptionsChange({ ...options, testsPerRequirement: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-3">1-3 (Quick)</SelectItem>
                <SelectItem value="3-5">3-5 (Standard)</SelectItem>
                <SelectItem value="5-7">5-7 (Comprehensive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={options.includeEdgeCases}
              onCheckedChange={(c) => onOptionsChange({ ...options, includeEdgeCases: !!c })}
            />
            <span className="text-sm">Include edge cases</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={options.includeNegativeTests}
              onCheckedChange={(c) => onOptionsChange({ ...options, includeNegativeTests: !!c })}
            />
            <span className="text-sm">Include negative tests</span>
          </label>
        </div>
      </div>
    </div>
  );
}

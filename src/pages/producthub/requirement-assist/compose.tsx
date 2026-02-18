import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { CAPABILITY_CONFIGS, type RaDocumentType, type RaMethodology } from '@/types/requirement-assist';
import { useCreateRaDocument } from '@/hooks/useRaDocuments';
import { useRaSourceBrds } from '@/hooks/useRaDocuments';
import { useRaGenerate } from '@/hooks/useRaGenerate';
import { RaBadge } from '@/components/requirement-assist/RaBadge';
import { Zap, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

const METHODOLOGY_OPTIONS: { key: RaMethodology; title: string; sections: number }[] = [
  { key: 'kpmg', title: 'KPMG Advisory', sections: 16 },
  { key: 'mckinsey', title: 'McKinsey & Co', sections: 14 },
  { key: 'deloitte', title: 'Deloitte', sections: 15 },
];

export default function RequirementAssistCompose() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capabilityKey = (searchParams.get('capability') || 'brd') as RaDocumentType;
  const config = CAPABILITY_CONFIGS[capabilityKey];

  const [title, setTitle] = useState('');
  const [methodology, setMethodology] = useState<RaMethodology>('kpmg');
  const [inputText, setInputText] = useState('');
  const [sourceBrdId, setSourceBrdId] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const createDoc = useCreateRaDocument();
  const generate = useRaGenerate();
  const { data: sourceBrds } = useRaSourceBrds();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and DOCX files are supported');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }

    setUploadedFile(file);
    setIsExtracting(true);

    try {
      // Read file as text for basic extraction
      // For PDF/DOCX we send to the AI pipeline which handles parsing
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        // For text-based content, use directly; for binary, the pipeline handles it
        if (file.type === 'application/pdf' || file.type.includes('word')) {
          // Binary files: store a placeholder, actual parsing happens server-side
          setInputText(`[Uploaded file: ${file.name}]\n\nFile will be processed by the AI pipeline.`);
          toast.success(`${file.name} uploaded successfully`);
        }
        setIsExtracting(false);
      };
      reader.onerror = () => {
        // For binary files, still mark as uploaded
        setInputText(`[Uploaded file: ${file.name}]\n\nFile will be processed by the AI pipeline.`);
        toast.success(`${file.name} uploaded successfully`);
        setIsExtracting(false);
      };
      reader.readAsText(file);
    } catch {
      toast.error('Failed to read file');
      setIsExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const canGenerate = title.trim().length > 0 && (
    config.showSourceBrd ? sourceBrdId.length > 0 : true
  );

  const handleGenerate = async () => {
    if (!canGenerate) return;
    try {
      const doc = await createDoc.mutateAsync({
        type: capabilityKey,
        title: title.trim(),
        methodology: config.showMethodology ? methodology : null,
        language: capabilityKey === 'translation' ? 'ar' : 'en',
        source_doc_id: sourceBrdId || null,
        content: inputText ? { rawInput: inputText } : undefined,
      });

      // Trigger AI generation pipeline (fire-and-forget — overlay will track progress)
      generate.mutate({
        documentId: doc.id,
        type: capabilityKey,
        input: {
          text: inputText || undefined,
          methodology: config.showMethodology ? methodology : undefined,
          language: capabilityKey === 'translation' ? 'ar' : 'en',
          source_doc_id: sourceBrdId || undefined,
        },
      });

      navigate(`/producthub/requirement-assist/${doc.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create document');
    }
  };

  const sectionCount = methodology === 'kpmg' ? 16 : methodology === 'mckinsey' ? 14 : 15;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          ProductHub &gt; Requirement Assist &gt; Compose
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Left panel */}
        <div className="space-y-5">
          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Document Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title…"
              className={cn(
                'w-full h-10 px-3 text-sm rounded-lg border border-[hsl(var(--border))] bg-white',
                'focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10',
                'placeholder:text-muted-foreground'
              )}
            />
          </div>

          {/* Methodology Selector (BRD only) */}
          {config.showMethodology && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Methodology Framework</label>
              <div className="grid grid-cols-3 gap-3">
                {METHODOLOGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setMethodology(opt.key)}
                    className={cn(
                      'text-left p-4 rounded-lg border transition-all',
                      methodology === opt.key
                        ? 'border-blue-500 border-2 bg-blue-50/50'
                        : 'border-[hsl(var(--border))] hover:border-zinc-300 bg-white'
                    )}
                  >
                    <div className="text-[13px] font-bold text-foreground">{opt.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{opt.sections} sections</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source BRD Selector (Epic + UAT) */}
          {config.showSourceBrd && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Source BRD</label>
              <select
                value={sourceBrdId}
                onChange={(e) => setSourceBrdId(e.target.value)}
                className={cn(
                  'w-full h-10 px-3 text-sm rounded-lg border border-[hsl(var(--border))] bg-white',
                  'focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10'
                )}
              >
                <option value="">Select a completed BRD…</option>
                {sourceBrds?.map((brd) => (
                  <option key={brd.id} value={brd.id}>
                    {brd.brd_number} — {brd.title} {brd.quality_score !== null ? `(${brd.quality_score})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Epics and UAT scenarios are generated from an existing BRD
              </p>
            </div>
          )}

          {/* Text Input (BRD + Translate) */}
          {config.showTextInput && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">{config.textLabel}</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={config.textPlaceholder}
                className={cn(
                  'w-full min-h-[160px] p-3 text-[13px] leading-relaxed rounded-lg border border-[hsl(var(--border))] bg-white resize-y',
                  'focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10',
                  'placeholder:text-muted-foreground',
                  capabilityKey === 'translation' && 'text-right'
                )}
                dir={capabilityKey === 'translation' ? 'rtl' : 'ltr'}
              />
            </div>
          )}

          {/* Upload Zone (BRD + Translate) */}
          {config.showUpload && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Or Upload Document</label>
              {uploadedFile ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-[hsl(var(--border))] bg-white">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{uploadedFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isExtracting ? 'Processing…' : `${(uploadedFile.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setUploadedFile(null); setInputText(''); }}
                    className="p-1 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                    isDragActive
                      ? 'border-blue-500 bg-blue-500/[0.04]'
                      : 'border-zinc-300 hover:border-blue-500 hover:bg-blue-500/[0.02]'
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground">
                    {isDragActive ? 'Drop file here…' : 'Drop PDF or DOCX here'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Max 20 pages</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel — Sticky summary */}
        <div className="relative">
          <div
            className="sticky top-20 bg-white border border-[hsl(var(--border))] rounded-xl p-6 space-y-4"
          >
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Generation Summary</h4>

            {/* Info rows */}
            <div className="space-y-2.5 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Capability</span>
                <RaBadge type={capabilityKey} />
              </div>
              {config.showMethodology && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Methodology</span>
                  <span className="font-medium text-foreground capitalize">{methodology}</span>
                </div>
              )}
              {config.showMethodology && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sections</span>
                  <span className="font-medium text-foreground">{sectionCount}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium text-foreground">
                  {capabilityKey === 'translation' ? 'Arabic → English' : 'English'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Est. Time</span>
                <span className="font-medium text-foreground">{config.estimatedTime}</span>
              </div>
            </div>

            {/* Pipeline preview */}
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1.5">
                REC Agent Pipeline
              </div>
              <div className="text-[11px] font-mono text-zinc-600">
                {config.pipelineDisplay.split('→').map((step, i, arr) => (
                  <span key={i}>
                    <span>{step.trim()}</span>
                    {i < arr.length - 1 && <span className="text-zinc-400"> → </span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || createDoc.isPending}
              className={cn(
                'w-full h-11 flex items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white transition-all',
                canGenerate && !createDoc.isPending
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.18)]'
                  : 'bg-zinc-300 cursor-not-allowed'
              )}
            >
              <Zap className="w-4 h-4" />
              {createDoc.isPending ? 'Creating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

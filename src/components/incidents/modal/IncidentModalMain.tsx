import { useState, useRef } from 'react';
import { Plus, MoreHorizontal, Download, Trash2, ChevronDown, Filter, ArrowUpDown } from 'lucide-react';
import type { Incident, Attachment } from '@/types/release';
import { IncidentActivitySection } from './IncidentActivitySection';
import { toast } from 'sonner';

interface IncidentModalMainProps {
  incident: Incident;
  onFieldChange: (field: keyof Incident, value: any) => void;
}

export function IncidentModalMain({ incident, onFieldChange }: IncidentModalMainProps) {
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file, i) => ({
      id: `att-${Date.now()}-${i}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: 'Current User',
      uploadedAt: new Date().toLocaleString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      }),
    }));
    onFieldChange('attachments', [...(incident.attachments || []), ...newAttachments]);
    toast.success(`${files.length} file(s) uploaded`);
  };

  const deleteAttachment = (id: string) => {
    onFieldChange('attachments', (incident.attachments || []).filter(a => a.id !== id));
    toast.success('Attachment removed');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}>
      {/* Title Area */}
      <div className="mb-4">
        <h1 
          contentEditable
          suppressContentEditableWarning
          className={`text-2xl font-semibold text-[#172B4D] leading-7 p-1 rounded border-2 transition-all cursor-text ${
            isTitleFocused 
              ? 'border-[#C69C6D] shadow-[0_0_0_2px_#C69C6D] bg-white' 
              : 'border-transparent hover:bg-[#F4F5F7] hover:border-[#DFE1E6]'
          }`}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={(e) => {
            setIsTitleFocused(false);
            onFieldChange('summary', e.currentTarget.textContent || '');
          }}
        >
          {incident.summary}
        </h1>
        <div className="flex gap-1 mt-2">
          <button 
            className="w-8 h-8 flex items-center justify-center border border-[#DFE1E6] rounded bg-white text-[#42526E] hover:bg-[#F4F5F7] hover:border-[#A5ADBA] focus:outline-none focus:border-[#C69C6D] focus:shadow-[0_0_0_1px_#C69C6D]"
            title="Add"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Parent Field */}
      <div className="flex items-start py-2 gap-4">
        <div className="text-sm text-[#42526E] w-[100px] shrink-0">Parent</div>
        <div className="flex-1">
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm cursor-pointer"
            style={{ background: '#E9E0FF', color: '#5243AA' }}
          >
            <span>◇</span>
            INC-1246 Database Infrastructure
          </span>
        </div>
      </div>

      {/* Priority Field */}
      <div className="flex items-start py-2 gap-4">
        <div className="text-sm text-[#42526E] w-[100px] shrink-0">Priority</div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 p-1.5 rounded border-2 border-transparent hover:bg-[#F4F5F7] hover:border-[#DFE1E6] cursor-pointer">
            <div className="flex gap-0.5">
              <div className="w-[3px] h-3 bg-[#FF8800] rounded-sm"></div>
              <div className="w-[3px] h-3 bg-[#FF8800] rounded-sm"></div>
            </div>
            <span className="text-sm text-[#172B4D]">
              {incident.priority?.charAt(0).toUpperCase() + incident.priority?.slice(1) || 'Medium'}
            </span>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="mt-6 mb-6">
        <h2 className="text-base font-semibold text-[#172B4D] mb-3">Description</h2>
        <div 
          contentEditable
          suppressContentEditableWarning
          className={`text-sm text-[#172B4D] leading-5 p-4 border rounded-lg min-h-[120px] cursor-text transition-all ${
            isDescFocused 
              ? 'border-[#C69C6D] shadow-[0_0_0_1px_#C69C6D] bg-white' 
              : 'border-[#DFE1E6] hover:border-[#A5ADBA] bg-white'
          }`}
          onFocus={() => setIsDescFocused(true)}
          onBlur={(e) => {
            setIsDescFocused(false);
            onFieldChange('description', e.currentTarget.innerHTML);
          }}
          dangerouslySetInnerHTML={{ __html: incident.description }}
        />
      </div>

      {/* Attachments Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#172B4D] flex items-center gap-2">
            Attachments
            <span className="text-[11px] text-[#42526E] bg-[#FAFBFC] px-1.5 py-0.5 rounded">
              {incident.attachments?.length || 0}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-5 h-5" />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Attachments Table Header */}
        <div className="flex items-center py-1.5 border-b border-[#DFE1E6] text-[11px] text-[#42526E]">
          <div className="flex-1 min-w-0">Name</div>
          <div className="w-20 text-right pr-4">Size</div>
          <div className="w-36 flex items-center gap-1 cursor-pointer hover:text-[#172B4D]">
            Date added
            <ChevronDown className="w-3 h-3" />
          </div>
          <div className="w-20"></div>
        </div>

        {/* Attachment Rows */}
        {(incident.attachments || []).map((att) => (
          <div 
            key={att.id}
            className="flex items-center py-2 border-b border-[#DFE1E6] last:border-b-0 group hover:bg-[#F4F5F7]"
          >
            <div className="w-8 h-8 rounded bg-[#FAFBFC] border border-[#DFE1E6] flex items-center justify-center mr-2 shrink-0">
              <svg className="w-4 h-4 text-[#42526E]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-sm text-[#172B4D] truncate" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
              {att.name}
            </div>
            <div className="w-20 text-right pr-4 text-sm text-[#42526E]">{att.size}</div>
            <div className="w-36 text-sm text-[#42526E]">{att.uploadedAt}</div>
            <div className="w-20 flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[#42526E] hover:text-red-600"
                onClick={() => deleteAttachment(att.id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#F4F5F7] text-[#42526E] hover:text-[#172B4D]">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Linked Work Items Section */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-[#172B4D] mb-2">Linked work items</h2>
        <a className="text-sm text-[#42526E] hover:text-[#0052CC] hover:underline cursor-pointer">
          Add linked work item
        </a>
      </div>

      {/* Activity Section */}
      <IncidentActivitySection incident={incident} />
    </div>
  );
}

import { useState, useRef } from 'react';
import { Upload, Image, FileText, Trash2, Download, X, Paperclip, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface ExecutionAttachmentsProps {
  cycleTestCaseId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  disabled?: boolean;
}

export function ExecutionAttachments({ cycleTestCaseId, attachments, onAttachmentsChange, disabled = false }: ExecutionAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImage = (fileType: string | null) => fileType?.startsWith('image/');

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { catalystToast.error('File size must be less than 10MB'); return; }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${cycleTestCaseId}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('execution-attachments').upload(fileName, file);
      if (uploadError) { catalystToast.error('Failed to upload file'); return; }
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('th_execution_attachments').insert({
        cycle_test_case_id: cycleTestCaseId, file_name: file.name, file_path: uploadData.path, file_type: file.type, file_size: file.size, uploaded_by: user?.id,
      });
      if (dbError) { await supabase.storage.from('execution-attachments').remove([uploadData.path]); catalystToast.error('Failed to save attachment'); return; }
      catalystToast.success('File uploaded successfully');
      onAttachmentsChange();
    } catch (err: any) { catalystToast.error(err.message || 'Failed to upload file'); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await supabase.storage.from('execution-attachments').remove([attachment.file_path]);
      const { error } = await supabase.from('th_execution_attachments').delete().eq('id', attachment.id);
      if (error) { catalystToast.error('Failed to delete attachment'); return; }
      catalystToast.success('Attachment deleted');
      onAttachmentsChange();
    } catch (err: any) { catalystToast.error(err.message || 'Failed to delete attachment'); }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage.from('execution-attachments').download(attachment.file_path);
      if (error) { catalystToast.error('Failed to download file'); return; }
      const url = URL.createObjectURL(data);
      const a = document.createElement('a'); a.href = url; a.download = attachment.file_name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err: any) { catalystToast.error(err.message || 'Failed to download file'); }
  };

  const handlePreview = async (attachment: Attachment) => {
    if (!isImage(attachment.file_type)) { handleDownload(attachment); return; }
    try {
      const { data, error } = await supabase.storage.from('execution-attachments').download(attachment.file_path);
      if (error) return;
      setPreviewUrl(URL.createObjectURL(data));
      setPreviewName(attachment.file_name);
    } catch { /* ignore */ }
  };

  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewName(''); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Paperclip size={18} style={{ color: 'var(--fg-3)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>Attachments</h3>
          {attachments.length > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', backgroundColor: 'var(--cp-bd-zone)', padding: '2px 8px', borderRadius: 10 }}>{attachments.length}</span>}
        </div>
        {!disabled && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--cp-blue) 25%, transparent)', borderRadius: 8, color: 'var(--cp-blue)', fontSize: 13, fontWeight: 500, cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
            {isUploading ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>) : (<><Upload size={16} /> Upload File</>)}
            <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={isUploading || disabled} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx" />
          </label>
        )}
      </div>

      {attachments.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: 'var(--bg-1)', borderRadius: 12, textAlign: 'center', color: 'var(--fg-4)' }}>
          <Paperclip size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p style={{ fontSize: 13, margin: 0 }}>No attachments yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {attachments.map((att) => (
            <div key={att.id} style={{ backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden' }}>
              <div onClick={() => handlePreview(att)} style={{ height: 100, backgroundColor: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {isImage(att.file_type) ? <Image size={32} style={{ color: 'var(--fg-4)' }} /> : <FileText size={32} style={{ color: 'var(--fg-4)' }} />}
              </div>
              <div style={{ padding: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file_name}</p>
                <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: '4px 0 0' }}>{formatFileSize(att.file_size)}</p>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <button onClick={() => handleDownload(att)} title="Download" style={{ flex: 1, height: 28, padding: 0, border: '1px solid var(--divider)', borderRadius: 6, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Download size={14} />
                  </button>
                  {!disabled && (
                    <button onClick={() => handleDelete(att)} title="Delete" style={{ flex: 1, height: 28, padding: 0, border: '1px solid color-mix(in srgb, var(--sem-danger) 20%, transparent)', borderRadius: 6, backgroundColor: 'var(--tint-red, #FEF2F2)', color: 'var(--sem-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 40 }}>
          <button onClick={closePreview} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, border: 'none', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--cp-float)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <img src={previewUrl} alt={previewName} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
            <p style={{ color: '#FFFFFF', fontSize: 14, marginTop: 16 }}>{previewName}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export type EvidenceFileType = 'image' | 'video' | 'document' | 'log';

export interface TestEvidence {
  id: string;
  execution_step_id: string;
  file_name: string;
  file_type: EvidenceFileType;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface EvidenceUploadResponse {
  success: boolean;
  evidence?: TestEvidence;
  file_url?: string;
  error?: string;
}

export interface EvidenceFile extends File {
  preview?: string;
}

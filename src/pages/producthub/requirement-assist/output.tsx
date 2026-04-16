import { useParams, useNavigate } from 'react-router-dom';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useRaDocument } from '@/hooks/useRaDocuments';
import { GenerationOverlay } from '@/components/requirement-assist/GenerationOverlay';
import { BrdEditorView } from '@/components/requirement-assist/BrdEditorView';
import { TranslationView } from '@/components/requirement-assist/TranslationView';
import { EpicView } from '@/components/requirement-assist/EpicView';
import { UatView } from '@/components/requirement-assist/UatView';
import { useQueryClient } from '@tanstack/react-query';

export default function RequirementAssistOutput() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useRaDocument(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-zinc-100 rounded animate-pulse" />
        <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
        <div className="h-[400px] bg-zinc-50 rounded-xl animate-pulse mt-6" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Document not found.</div>
      </div>
    );
  }

  // Show generation overlay while generating or pending
  if (doc.status === 'generating' || doc.status === 'pending') {
    return (
      <div className="p-6">
        <GenerationOverlay
          document={doc}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['ra-document', id] });
          }}
        />
        <div className="max-w-[1400px] mx-auto">
          <CatalystPageHeader title={doc.title} />
        </div>
      </div>
    );
  }

  // Route to correct output view based on type
  switch (doc.type) {
    case 'brd':
      return <BrdEditorView document={doc} />;
    case 'translation':
      return <TranslationView document={doc} />;
    case 'epic':
      return <EpicView document={doc} />;
    case 'uat':
      return <UatView document={doc} />;
    default:
      return (
        <div className="p-6">
          <div className="text-sm text-muted-foreground">Unknown document type.</div>
        </div>
      );
  }
}

import { useParams } from 'react-router-dom';
import { useRaDocument } from '@/hooks/useRaDocuments';

export default function RequirementAssistOutput() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading } = useRaDocument(id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading document…</div>
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

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold text-foreground">{doc.title}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {doc.brd_number} · Status: {doc.status} — Full output view coming in Prompt 2.
      </p>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRaDocuments } from '@/hooks/useRaDocuments';
import { CategoryTree } from '@/components/requirement-assist/CategoryTree';
import { QualityScoreBar } from '@/components/requirement-assist/QualityScoreBar';
import { RaBadge } from '@/components/requirement-assist/RaBadge';
import { formatDistanceToNow } from 'date-fns';

export default function RequirementAssistCategories() {
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { data: documents, isLoading } = useRaDocuments(
    selectedCategoryId ? { categoryId: selectedCategoryId } : undefined
  );

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Breadcrumb */}
      <div className="px-6 py-2 border-b border-[hsl(var(--border))] bg-white">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          ProductHub &gt; Requirement Assist &gt; Categories
        </span>
      </div>

      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* Left — Category Tree */}
        <CategoryTree selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />

        {/* Right — Filtered Document Table */}
        <div className="bg-zinc-50 overflow-y-auto p-6">
          <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))]">
              <h3 className="text-sm font-bold text-foreground">
                {selectedCategoryId ? 'Category Documents' : 'All Documents'}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-zinc-50/60">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-5 py-2.5">BRD#</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Type</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Title</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Quality</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Status</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Linked</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">Loading documents…</td>
                    </tr>
                  ) : !documents?.length ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        {selectedCategoryId ? 'No documents in this category' : 'No documents yet'}
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => navigate(`/producthub/requirement-assist/${doc.id}`)}
                        className="border-b border-[hsl(var(--border))] last:border-b-0 cursor-pointer hover:bg-zinc-50 transition-colors"
                        style={{ height: '44px' }}
                      >
                        <td className="px-5 py-2">
                          <span className="text-[11px] font-semibold font-mono text-blue-600">{doc.brd_number || '—'}</span>
                        </td>
                        <td className="px-3 py-2"><RaBadge type={doc.type} /></td>
                        <td className="px-3 py-2">
                          <span className="text-[13px] font-medium text-foreground truncate max-w-[300px] block">{doc.title}</span>
                        </td>
                        <td className="px-3 py-2"><QualityScoreBar score={doc.quality_score} /></td>
                        <td className="px-3 py-2"><RaBadge status={doc.status} /></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {/* Linked work item pills — placeholder, real check would query cross-tables */}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

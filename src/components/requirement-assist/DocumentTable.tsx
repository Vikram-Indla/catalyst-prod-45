import { useNavigate } from 'react-router-dom';
import { useRaDocuments } from '@/hooks/useRaDocuments';
import { QualityScoreBar } from './QualityScoreBar';
import { RaBadge } from './RaBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function DocumentTable() {
  const navigate = useNavigate();
  const { data: documents, isLoading } = useRaDocuments();

  return (
    <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))]">
        <h3 className="text-sm font-bold text-foreground">Recent Documents</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-zinc-50/60">
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-5 py-2.5">BRD#</th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Type</th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Title</th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Quality</th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Status</th>
              <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2.5">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                  Loading documents…
                </td>
              </tr>
            ) : !documents?.length ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                  No documents yet. Choose a capability above to get started.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => navigate(`/producthub/requirement-assist/${doc.id}`)}
                  className="border-b border-[hsl(var(--border))] last:border-b-0 cursor-pointer hover:bg-zinc-25 transition-colors"
                  style={{ height: '44px' }}
                >
                  <td className="px-5 py-2">
                    <span className="text-[11px] font-semibold font-mono text-blue-600">
                      {doc.brd_number || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <RaBadge type={doc.type} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[13px] font-medium text-foreground truncate max-w-[300px] block">
                      {doc.title}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <QualityScoreBar score={doc.quality_score} />
                  </td>
                  <td className="px-3 py-2">
                    <RaBadge status={doc.status} />
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
  );
}

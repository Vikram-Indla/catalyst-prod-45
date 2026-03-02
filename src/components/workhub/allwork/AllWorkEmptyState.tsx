/**
 * AllWorkEmptyState — Designed empty states for every scenario
 */
import { FileStack, Search, AlertCircle, Filter } from 'lucide-react';

type EmptyType = 'no-items' | 'no-results' | 'error' | 'no-filters';

interface Props {
  type: EmptyType;
  message?: string;
  query?: string;
  onAction?: () => void;
  onClear?: () => void;
  onRetry?: () => void;
}

export function AllWorkEmptyState({ type, message, query, onAction, onClear, onRetry }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border py-16"
      style={{ borderColor: 'rgba(11,18,14,0.14)', backgroundColor: '#fff' }}
    >
      {type === 'no-items' && (
        <>
          <FileStack className="w-10 h-10 mb-3" style={{ color: '#8c8f96' }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: '#1A1D23' }}>No work items yet</p>
          <p className="text-[13px] mb-4" style={{ color: '#64748b' }}>Create your first work item to get started</p>
          {onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 text-[13px] font-medium rounded-md text-white"
              style={{ backgroundColor: '#1868db' }}
            >
              Create work item
            </button>
          )}
        </>
      )}

      {type === 'no-results' && (
        <>
          <Search className="w-10 h-10 mb-3" style={{ color: '#8c8f96' }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: '#1A1D23' }}>
            No results for "{query}"
          </p>
          <p className="text-[13px] mb-4" style={{ color: '#64748b' }}>Try different keywords or remove filters</p>
          {onClear && (
            <button
              onClick={onClear}
              className="text-[13px] font-medium"
              style={{ color: '#1868db' }}
            >
              Clear all filters
            </button>
          )}
        </>
      )}

      {type === 'error' && (
        <>
          <AlertCircle className="w-10 h-10 mb-3" style={{ color: '#dc2626' }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: '#1A1D23' }}>Failed to load work items</p>
          <p className="text-[13px] mb-4" style={{ color: '#64748b' }}>{message || 'Something went wrong'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-[13px] font-medium rounded-md text-white"
              style={{ backgroundColor: '#1868db' }}
            >
              Retry
            </button>
          )}
        </>
      )}

      {type === 'no-filters' && (
        <>
          <Filter className="w-10 h-10 mb-3" style={{ color: '#8c8f96' }} />
          <p className="text-[14px] font-medium mb-1" style={{ color: '#1A1D23' }}>No items match your filters</p>
          <p className="text-[13px] mb-4" style={{ color: '#64748b' }}>Try adjusting your filter criteria</p>
          {onClear && (
            <button
              onClick={onClear}
              className="text-[13px] font-medium"
              style={{ color: '#1868db' }}
            >
              Clear all filters
            </button>
          )}
        </>
      )}
    </div>
  );
}

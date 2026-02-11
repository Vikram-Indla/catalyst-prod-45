/**
 * Shared Defect Hooks — Re-exports from TestHub's G25 defect management
 * 
 * TestHub OWNS defect CRUD. ReleaseHub and other modules
 * consume these hooks for read access and linking.
 */

// Full CRUD hooks (TestHub ownership)
export {
  useDefectsG25 as useDefects,
  useDefectG25 as useDefect,
  useDefectStatsG25 as useDefectStats,
  useCreateDefectG25 as useCreateDefect,
  useUpdateDefectG25 as useUpdateDefect,
  useChangeDefectStatusG25 as useChangeDefectStatus,
  useDeleteDefectG25 as useDeleteDefect,
  // History & Comments
  useDefectHistoryG25 as useDefectHistory,
  useDefectCommentsG25 as useDefectComments,
  useCreateDefectCommentG25 as useCreateDefectComment,
  useDeleteDefectCommentG25 as useDeleteDefectComment,
  // Links
  useDefectLinksG25 as useDefectLinks,
  useCreateDefectLinkG25 as useCreateDefectLink,
  useDeleteDefectLinkG25 as useDeleteDefectLink,
} from '@/hooks/useDefectsG25';

// Types
export type {
  Defect,
  DefectStats,
  DefectFilters,
  DefectHistoryEntry,
  DefectComment,
  DefectLink,
} from '@/types/defects';

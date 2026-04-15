import { useParams } from 'react-router-dom';

export default function KanbanBoardPage() {
  const { key, boardId } = useParams<{ key: string; boardId: string }>();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#2E2E2E]">
        <h1 className="text-base font-semibold text-[#0F172A] dark:text-[#EDEDED]">
          Board: {boardId}
        </h1>
        <p className="text-xs text-[#475569] dark:text-[#A1A1A1] mt-0.5">
          Project: {key}
        </p>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center text-[#94A3B8] dark:text-[#878787] text-sm">
        Kanban board shell — UI coming in Part 2
      </div>
    </div>
  );
}

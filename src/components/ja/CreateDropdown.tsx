import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateStoryModal } from "@/components/workhub/create-story";

export function CreateDropdown() {
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setCreateStoryOpen(true)}
        className="h-8 px-2 lg:px-3 flex items-center gap-1 text-sm font-semibold text-white bg-[#2563eb] dark:bg-[#3b82f6] hover:bg-[#1d4ed8] dark:hover:bg-[#2563eb] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] dark:focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2"
        title="Create"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden xl:inline">Create</span>
      </button>

      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
      />
    </>
  );
}

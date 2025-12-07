import { PageHeader } from '@/components/release/PageHeader';

export default function ReleaseCalendar() {
  return (
    <div className="h-full flex flex-col bg-white">
      <PageHeader 
        title="Release Calendar"
        subtitle="View and plan upcoming releases"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-center h-full border-2 border-dashed border-[#E8E8E8] rounded-lg bg-[#FAFAFA]">
          <p className="text-[#8C8C8C] text-sm">
            Release calendar will be implemented in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}

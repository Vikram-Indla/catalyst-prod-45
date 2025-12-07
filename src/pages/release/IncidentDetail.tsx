import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/release/PageHeader';

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="h-full flex flex-col bg-white">
      <PageHeader 
        title={`Incident ${id}`}
        subtitle="View and manage incident details"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-center h-full border-2 border-dashed border-[#E8E8E8] rounded-lg bg-[#FAFAFA]">
          <p className="text-[#8C8C8C] text-sm">
            Incident detail page will be implemented in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}

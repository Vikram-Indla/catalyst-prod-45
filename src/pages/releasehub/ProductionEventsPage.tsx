import { PageHeader } from '@/components/release/PageHeader';

export default function ProductionEventsPage() {
  return (
    <div className="rh-page">
      <PageHeader title="Production Events" subtitle="Live production deployments and incidents" />
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 text-center text-[#94A3B8] text-[13px] mt-4">
        Production Events — Stage D implementation
      </div>
    </div>
  );
}

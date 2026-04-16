import { CAPABILITY_CONFIGS } from '@/types/requirement-assist';
import { CapabilityCard } from '@/components/requirement-assist/CapabilityCard';
import { DocumentTable } from '@/components/requirement-assist/DocumentTable';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import type { RaDocumentType } from '@/types/requirement-assist';

const CAPABILITY_ORDER: RaDocumentType[] = ['brd', 'translation', 'epic', 'uat'];

export default function RequirementAssistWorkspace() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <CatalystPageHeader title="Req Assist™" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Capability cards */}
        <div className="grid grid-cols-4 gap-4 mb-8 max-w-[1400px]">
          {CAPABILITY_ORDER.map((key) => (
            <CapabilityCard key={key} config={CAPABILITY_CONFIGS[key]} />
          ))}
        </div>

        {/* Document table */}
        <div className="max-w-[1400px]">
          <DocumentTable />
        </div>
      </div>
    </div>
  );
}

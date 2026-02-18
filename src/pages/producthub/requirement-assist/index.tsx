import { CAPABILITY_CONFIGS } from '@/types/requirement-assist';
import { CapabilityCard } from '@/components/requirement-assist/CapabilityCard';
import { DocumentTable } from '@/components/requirement-assist/DocumentTable';
import type { RaDocumentType } from '@/types/requirement-assist';

const CAPABILITY_ORDER: RaDocumentType[] = ['brd', 'translation', 'epic', 'uat'];

export default function RequirementAssistWorkspace() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          ProductHub &gt; Requirement Assist
        </span>
      </div>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Requirement Assist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered BRD generation, translation, epic decomposition, and UAT scenario creation
        </p>
      </div>

      {/* Capability cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {CAPABILITY_ORDER.map((key) => (
          <CapabilityCard key={key} config={CAPABILITY_CONFIGS[key]} />
        ))}
      </div>

      {/* Document table */}
      <DocumentTable />
    </div>
  );
}

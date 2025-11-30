export function IntegrationBadge() {
  return (
    <div className="flex items-center justify-center gap-2.5 mt-5 py-3 px-4 bg-brand-gold-pale rounded border border-brand-gold-border">
      <div className="w-[22px] h-[22px] bg-brand-gold rounded-sm flex items-center justify-center">
        <span className="font-heading font-bold text-xs text-white">J</span>
      </div>
      <span className="font-body text-xs font-semibold text-brand-gold-hover">
        Powered with JIRA Integration
      </span>
    </div>
  );
}

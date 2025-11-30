import { Logo } from "@/components/brand/Logo";

export function HeroPanel() {
  const stats = [
    { value: "500+", label: "Enterprise Teams" },
    { value: "98%", label: "Alignment Score" },
    { value: "40%", label: "Faster Delivery" },
  ];

  const trustLogos = [
    { icon: "🏛️", label: "Government" },
    { icon: "🏦", label: "Banking" },
    { icon: "⚡", label: "Energy" },
    { icon: "🏥", label: "Healthcare" },
  ];

  return (
    <div className="flex-1 bg-gradient-to-br from-brand-dark via-[#2D2D2D] to-brand-dark flex flex-col justify-between p-12 relative overflow-hidden">
      <div className="absolute -top-1/2 -right-1/5 w-4/5 h-[200%] bg-[radial-gradient(ellipse,rgba(198,156,109,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

      <div className="relative z-10">
        <Logo variant="light" size="lg" />
      </div>

      <div className="relative z-10 max-w-[520px]">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-gold/15 border border-brand-gold-border rounded mb-6">
          <span className="w-2 h-2 bg-brand-gold rounded-full animate-pulse" />
          <span className="font-body text-xs font-semibold text-brand-gold uppercase tracking-wide">
            Trusted by Saudi Vision 2030 Programs
          </span>
        </div>

        <h1 className="font-heading text-[44px] font-bold text-white leading-[1.15] tracking-tight mb-5">
          Transform Your{" "}
          <span className="text-brand-gold">Enterprise Delivery</span>
          {" "}at Scale
        </h1>

        <p className="font-body text-base text-white/75 leading-relaxed mb-10">
          The strategic alignment platform that connects strategy to execution. 
          Designed for enterprises pursuing operational excellence across the Kingdom.
        </p>

        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="font-heading text-[32px] font-bold text-brand-gold tracking-tight mb-1">
                {stat.value}
              </div>
              <div className="font-body text-[13px] font-medium text-white/50 uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-36 left-12 right-12 p-5 bg-white/[0.03] border border-white/[0.08] rounded-lg z-10">
        <p className="font-body text-sm text-white/60 leading-relaxed">
          <span className="font-heading font-semibold text-white">
            <span className="text-brand-gold">C</span>atalyst
          </span>{" "}
          brings enterprise demand and delivery management to organizations of all sizes. 
          Seamlessly integrate your strategic planning with day-to-day execution using our powerful platform.
        </p>
      </div>

      <div className="relative z-10">
        <div className="font-body text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-4">
          Trusted by leading organizations
        </div>
        <div className="flex gap-7 opacity-60">
          {trustLogos.map((logo) => (
            <div key={logo.label} className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs">
                {logo.icon}
              </div>
              <span className="font-body text-xs font-semibold text-white/70">
                {logo.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Construction } from 'lucide-react';

export default function IndustryComingSoon() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-background p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-brand-gold-pale flex items-center justify-center mx-auto mb-6">
          <Construction className="h-8 w-8 text-brand-gold" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Coming Soon</h1>
        <p className="text-muted-foreground">
          This feature is currently under development and will be available in a future release.
        </p>
      </div>
    </div>
  );
}

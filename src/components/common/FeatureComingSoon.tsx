import { Sparkles } from '@/lib/atlaskit-icons';

interface FeatureComingSoonProps {
  title?: string;
  message?: string;
}

export function FeatureComingSoon({ 
  title = 'Coming Soon', 
  message = 'This feature is currently disabled in production. It will be available in a future release.' 
}: FeatureComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
    </div>
  );
}

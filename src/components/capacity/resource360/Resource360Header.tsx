import { cn } from '@/lib/utils';
import type { Resource360Data } from '@/types/resource360';

interface Resource360HeaderProps {
  resource: Resource360Data;
}

export function Resource360Header({ resource }: Resource360HeaderProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="px-6 pt-6 pb-4 border-b border-border/40">
      <div className="flex items-center gap-4">
        {/* Avatar with dashed border matching screenshot */}
        <div className="relative">
          <div 
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-primary/10 text-primary text-xl font-semibold",
              "border-2 border-dashed border-primary/60"
            )}
          >
            {resource.avatar_url ? (
              <img 
                src={resource.avatar_url} 
                alt={resource.name} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(resource.name)
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            {resource.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {resource.role} · {resource.department}
          </p>
        </div>
      </div>
    </div>
  );
}

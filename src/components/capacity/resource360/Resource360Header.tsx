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
    <div className="px-6 pt-6 pb-4 border-b border-[#e5e5e5]">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <div 
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-[#2563eb]/10 text-[#2563eb] text-xl font-semibold",
              "border-2 border-dashed border-[#2563eb]/40"
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
          <h2 className="text-xl font-semibold text-[#0a0a0a]">
            {resource.name}
          </h2>
          <p className="text-sm text-[#737373]">
            {resource.role} · {resource.division}
          </p>
        </div>
      </div>
    </div>
  );
}

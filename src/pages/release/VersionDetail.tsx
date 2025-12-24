import { useParams, Link } from 'react-router-dom';
import { Calendar, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function VersionDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: release, isLoading, error } = useQuery({
    queryKey: ['release-version', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_versions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading release...</div>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-4">Release Not Found</h1>
        <Link to="/release/versions" className="text-[#C69C6D] hover:underline">
          ← Back to Releases
        </Link>
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    unreleased: 'bg-blue-50 text-blue-700',
    released: 'bg-green-50 text-green-700',
    overdue: 'bg-red-50 text-red-700',
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{release.name || release.version}</h1>
            <span className={cn(
              "px-2.5 py-1 rounded text-xs font-semibold uppercase",
              statusStyles[release.status] || 'bg-gray-50 text-gray-700'
            )}>
              {release.status}
            </span>
          </div>
          <p className="text-sm text-[#8C8C8C]">{release.version}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/release/versions">
            <Button variant="outline" className="border-[#E8E8E8] text-[#5C5C5C]">
              Back
            </Button>
          </Link>
          <Button variant="outline" className="border-[#E8E8E8] text-[#5C5C5C]">
            Edit
          </Button>
          {release.status !== 'released' && (
            <Button className="bg-[#C69C6D] hover:bg-[#B8894D] text-white">
              Release
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-3">
              <CardTitle className="text-[15px] font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-[#5C5C5C]">{release.description || 'No description provided'}</p>
            </CardContent>
          </Card>

          {/* Release Notes */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-3">
              <CardTitle className="text-[15px] font-semibold">Release Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-[#5C5C5C] whitespace-pre-wrap">
                {release.notes || 'No release notes available'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4">
              <CardTitle className="text-[15px] font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#8C8C8C] mt-0.5" />
                <div>
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Release Date</div>
                  <div className="text-sm">
                    {release.release_date 
                      ? new Date(release.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Not set'
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#8C8C8C] mt-0.5" />
                <div>
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Created</div>
                  <div className="text-sm">
                    {new Date(release.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-[#8C8C8C] mt-0.5" />
                <div>
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Version</div>
                  <div className="text-sm">{release.version}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

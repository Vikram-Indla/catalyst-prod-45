import { useParams, Link } from 'react-router-dom';
import { Calendar, Package, User, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/release/ProgressBar';
import { cn } from '@/lib/utils';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

const pipelineStages = ['dev', 'qa', 'staging', 'uat', 'prod'] as const;

export default function VersionDetail() {
  const { id } = useParams<{ id: string }>();
  const release = releases.find((r) => r.id === id);

  if (!release) {
    return (
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-4">Release Not Found</h1>
        <Link to="/release/versions" className="text-[#C69C6D] hover:underline">
          ← Back to Releases
        </Link>
      </div>
    );
  }

  const statusStyles = {
    unreleased: 'bg-blue-50 text-blue-700',
    released: 'bg-green-50 text-green-700',
    overdue: 'bg-red-50 text-red-700',
  };

  const getPipelineIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'current') return <AlertCircle className="w-4 h-4 text-[#C69C6D]" />;
    return <Circle className="w-4 h-4 text-[#8C8C8C]" />;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{release.name}</h1>
            <span className={cn(
              "px-2.5 py-1 rounded text-xs font-semibold uppercase",
              statusStyles[release.status]
            )}>
              {release.status}
            </span>
          </div>
          <p className="text-sm text-[#8C8C8C]">{release.project}</p>
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
              <p className="text-sm text-[#5C5C5C]">{release.description}</p>
            </CardContent>
          </Card>

          {/* Progress - Compact */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-2.5">
              <CardTitle className="text-[15px] font-semibold">Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <ProgressBar value={release.progress} className="h-2" />
                </div>
                <span className="font-semibold text-sm">{release.progress}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="py-2 px-3 rounded bg-green-50 text-center">
                  <span className="text-lg font-bold text-green-700">{release.stats.done}</span>
                  <span className="text-[10px] text-muted-foreground uppercase ml-1">Done</span>
                </div>
                <div className="py-2 px-3 rounded bg-blue-50 text-center">
                  <span className="text-lg font-bold text-blue-700">{release.stats.inProgress}</span>
                  <span className="text-[10px] text-muted-foreground uppercase ml-1">In Progress</span>
                </div>
                <div className="py-2 px-3 rounded bg-gray-50 text-center">
                  <span className="text-lg font-bold text-gray-700">{release.stats.todo}</span>
                  <span className="text-[10px] text-muted-foreground uppercase ml-1">To Do</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline - Compact */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-2.5">
              <CardTitle className="text-[15px] font-semibold">Release Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                {pipelineStages.map((stage, index) => (
                  <div key={stage} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        release.pipeline[stage] === 'complete' && "bg-green-100",
                        release.pipeline[stage] === 'current' && "bg-[rgba(198,156,109,0.2)]",
                        release.pipeline[stage] === 'pending' && "bg-gray-100"
                      )}>
                        {getPipelineIcon(release.pipeline[stage])}
                      </div>
                      <span className="mt-1 text-[10px] font-medium uppercase text-[#5C5C5C]">{stage}</span>
                    </div>
                    {index < pipelineStages.length - 1 && (
                      <div className={cn(
                        "w-8 h-0.5 mx-1",
                        release.pipeline[stage] === 'complete' ? "bg-green-400" : "bg-[#E8E8E8]"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Linked Items */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4">
              <CardTitle className="text-[15px] font-semibold">
                Linked Items ({release.linkedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#E8E8E8]">
                {release.linkedItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#FAFAFA]">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                      item.type === 'story' && "bg-green-50 text-green-700",
                      item.type === 'defect' && "bg-red-50 text-red-700",
                      item.type === 'task' && "bg-blue-50 text-blue-700",
                      item.type === 'epic' && "bg-purple-50 text-purple-700"
                    )}>
                      {item.type}
                    </span>
                    <span className="text-sm text-[#8C8C8C]">{item.id}</span>
                    <span className="text-sm flex-1 truncate">{item.summary}</span>
                    {item.status && (
                      <span className="text-xs text-[#8C8C8C]">{item.status}</span>
                    )}
                  </div>
                ))}
              </div>
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
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Start Date</div>
                  <div className="text-sm">{new Date(release.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#8C8C8C] mt-0.5" />
                <div>
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Release Date</div>
                  <div className="text-sm">{new Date(release.releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-[#8C8C8C] mt-0.5" />
                <div>
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Owner</div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#C69C6D] flex items-center justify-center text-white text-xs font-semibold">
                      {release.owner.initials}
                    </div>
                    <span className="text-sm">{release.owner.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-[#8C8C8C] mt-0.5" />
                <div>
                  <div className="text-xs text-[#8C8C8C] uppercase font-medium mb-1">Items</div>
                  <div className="text-sm">{release.stats.total} total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Release Notes */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4">
              <CardTitle className="text-[15px] font-semibold">Release Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <p className="text-sm text-[#5C5C5C] whitespace-pre-wrap">{release.releaseNotes}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

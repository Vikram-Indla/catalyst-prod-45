import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/release/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProgressBar } from '@/components/release/ProgressBar';
import { cn } from '@/lib/utils';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

export default function VersionsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const filteredReleases = releases.filter((release) => {
    const matchesSearch = release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || release.status === statusFilter;
    const matchesProject = projectFilter === 'all' || release.project === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const unreleasedReleases = filteredReleases.filter((r) => r.status !== 'released');
  const releasedReleases = filteredReleases.filter((r) => r.status === 'released');

  const projects = [...new Set(releases.map((r) => r.project))];

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Releases"
        subtitle="Manage versions and track release progress"
        actions={
          <div className="flex gap-3">
            <Link to="/release/calendar">
              <Button variant="outline" className="border-[#E8E8E8] text-[#5C5C5C] gap-2">
                <Calendar className="w-4 h-4" />
                Calendar
              </Button>
            </Link>
            <Button className="bg-[#C69C6D] hover:bg-[#B8894D] text-white">
              + Create Version
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8C8C]" />
          <Input
            placeholder="Search versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E8E8E8] focus-visible:ring-[#C69C6D]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] border-[#E8E8E8]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unreleased">Unreleased</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[160px] border-[#E8E8E8]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project} value={project}>{project}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unreleased Section */}
      {unreleasedReleases.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold">Unreleased</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(198,156,109,0.1)] text-[#C69C6D]">
              {unreleasedReleases.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {unreleasedReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      )}

      {/* Released Section */}
      {releasedReleases.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold">Released</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(198,156,109,0.1)] text-[#C69C6D]">
              {releasedReleases.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {releasedReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReleaseCard({ release }: { release: Release }) {
  const statusStyles = {
    unreleased: 'bg-blue-50 text-blue-700',
    released: 'bg-green-50 text-green-700',
    overdue: 'bg-red-50 text-red-700',
  };

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-5 hover:border-[#C69C6D] hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <Link
          to={`/release/versions/${release.id}`}
          className="text-[17px] font-semibold hover:text-[#C69C6D] transition-colors"
        >
          {release.name}
        </Link>
        <span className={cn(
          "px-2 py-0.5 rounded text-[11px] font-semibold uppercase",
          statusStyles[release.status]
        )}>
          {release.status}
        </span>
      </div>

      <p className="text-sm text-[#5C5C5C] mb-4 line-clamp-2">
        {release.description}
      </p>

      <div className="mb-4">
        <div className="flex justify-between mb-1.5 text-[13px]">
          <span className="text-[#8C8C8C]">Progress</span>
          <span className="font-semibold">{release.progress}%</span>
        </div>
        <ProgressBar value={release.progress} />
      </div>

      <div className="flex gap-4 mb-4 text-[13px] text-[#8C8C8C]">
        <span>📅 {new Date(release.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span>📦 {release.stats.total} items</span>
      </div>

      <div className="flex gap-2 pt-4 border-t border-[#F0F0F0]">
        <Link to={`/release/versions/${release.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="text-[13px] border-[#E8E8E8] text-[#5C5C5C] hover:bg-[rgba(198,156,109,0.1)]"
          >
            {release.status === 'released' ? 'View Details' : 'Edit'}
          </Button>
        </Link>
        {release.status !== 'released' && (
          <Button
            size="sm"
            className="text-[13px] bg-[#C69C6D] hover:bg-[#B8894D] text-white"
          >
            Release
          </Button>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProgressBar } from '@/components/release/ProgressBar';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import releasesData from '@/data/releases.json';
import type { Release } from '@/types/release';

const releases = (releasesData as { versions: Release[] }).versions;

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function VersionsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [unreleasedOpen, setUnreleasedOpen] = useState(true);
  const [releasedOpen, setReleasedOpen] = useState(true);

  const projects = [...new Set(releases.map((r) => r.project))];
  const releaseNames = [...new Set(releases.map((r) => r.name))];

  const filteredReleases = useMemo(() => {
    return releases.filter((release) => {
      const matchesSearch = release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        release.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || release.status === statusFilter;
      const matchesProject = projectFilter === 'all' || release.project === projectFilter;
      const releaseMonth = new Date(release.releaseDate).getMonth() + 1;
      const matchesMonth = monthFilter === 'all' || releaseMonth === parseInt(monthFilter);
      const matchesRelease = releaseFilter === 'all' || release.name === releaseFilter;
      return matchesSearch && matchesStatus && matchesProject && matchesMonth && matchesRelease;
    });
  }, [searchTerm, statusFilter, projectFilter, monthFilter, releaseFilter]);

  const unreleasedReleases = filteredReleases.filter((r) => r.status !== 'released');
  const releasedReleases = filteredReleases.filter((r) => r.status === 'released');

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - fixed height 72px to align with sidebar */}
      <div className="h-[72px] border-b border-border bg-card flex-shrink-0">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">Releases</h1>
            <p className="text-sm text-muted-foreground truncate">Manage versions and track release progress</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link to="/release/calendar">
              <Button variant="outline" className="border-border text-muted-foreground gap-2">
                <Calendar className="w-4 h-4" />
                Calendar
              </Button>
            </Link>
            <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              + Create Version
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 bg-card border-b border-border">
        <div className="relative w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 text-sm border-border focus-visible:ring-brand-gold"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm border-border">
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
          <SelectTrigger className="w-[140px] h-9 text-sm border-border">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project} value={project}>{project}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm border-border">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={releaseFilter} onValueChange={setReleaseFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm border-border">
            <SelectValue placeholder="All Releases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Releases</SelectItem>
            {releaseNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Unreleased Section */}
        <Collapsible open={unreleasedOpen} onOpenChange={setUnreleasedOpen}>
          <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-muted/50 border-b border-border hover:bg-muted/70 transition-colors">
            {unreleasedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-sm font-semibold text-foreground">Unreleased</span>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
              {unreleasedReleases.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y divide-border">
              {unreleasedReleases.map((release) => (
                <ReleaseRow key={release.id} release={release} />
              ))}
              {unreleasedReleases.length === 0 && (
                <div className="px-6 py-4 text-sm text-muted-foreground">No unreleased versions found</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Released Section */}
        <Collapsible open={releasedOpen} onOpenChange={setReleasedOpen}>
          <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-muted/50 border-b border-border hover:bg-muted/70 transition-colors">
            {releasedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-sm font-semibold text-foreground">Released</span>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
              {releasedReleases.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y divide-border">
              {releasedReleases.map((release) => (
                <ReleaseRow key={release.id} release={release} />
              ))}
              {releasedReleases.length === 0 && (
                <div className="px-6 py-4 text-sm text-muted-foreground">No released versions found</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function ReleaseRow({ release }: { release: Release }) {
  const statusStyles = {
    unreleased: 'bg-blue-100 text-blue-700',
    released: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center gap-4 px-4 sm:px-6 py-3 bg-card hover:bg-muted/30 transition-colors">
      {/* Name & Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/release/versions/${release.id}`}
            className="text-sm font-semibold text-foreground hover:text-brand-gold transition-colors truncate"
          >
            {release.name}
          </Link>
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0",
            statusStyles[release.status]
          )}>
            {release.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {release.description}
        </p>
      </div>

      {/* Progress */}
      <div className="w-[120px] shrink-0 hidden sm:block">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{release.progress}%</span>
        </div>
        <ProgressBar value={release.progress} />
      </div>

      {/* Date */}
      <div className="w-[90px] shrink-0 text-xs text-muted-foreground hidden md:block">
        {new Date(release.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      {/* Items */}
      <div className="w-[60px] shrink-0 text-xs text-muted-foreground hidden lg:block">
        {release.stats.total} items
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <Link to={`/release/versions/${release.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-border text-muted-foreground hover:bg-brand-gold/10"
          >
            {release.status === 'released' ? 'View' : 'Edit'}
          </Button>
        </Link>
        {release.status !== 'released' && (
          <Button
            size="sm"
            className="h-7 text-xs bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            Release
          </Button>
        )}
      </div>
    </div>
  );
}

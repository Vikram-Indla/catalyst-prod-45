import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Team } from '@/types/team.types';
import { useTeams } from '@/hooks/useTeams';
import { useTeamSprints, useSprintStories, useTeamDependencies } from '@/hooks/useTeamRoom';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useObjectives } from '@/hooks/useObjectives';
import { ObjectiveStatusBadge } from '@/modules/objectives/components/shared/ObjectiveStatusBadge';
import { ObjectiveScoreBadge } from '@/modules/objectives/components/shared/ObjectiveScoreBadge';
import { CreateDependencyDialog } from '@/components/dependencies/CreateDependencyDialog';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { DependencyDetailsDrawer } from '@/components/dependencies/DependencyDetailsDrawer';
import { AddTeamMemberDialog } from '@/components/teams/AddTeamMemberDialog';
import { CreateEditStoryPanel } from '@/components/stories/CreateEditStoryPanel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, BarChart3, Video, Search, ChevronDown, 
  MessageSquare, Target, AlertTriangle, Link2, 
  MessageCircle, Lock, ChevronRight, Plus, UserPlus
} from 'lucide-react';

interface JiraAlignTeamRoomProps {
  team: Team;
}

export function JiraAlignTeamRoom({ team }: JiraAlignTeamRoomProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: allTeams = [] } = useTeams();
  const { data: sprints = [] } = useTeamSprints(team?.id);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const { data: stories = [] } = useSprintStories(selectedSprintId || sprints[0]?.id);
  const { data: dependencies = [] } = useTeamDependencies(team?.id);
  const { data: teamMembers = [] } = useTeamMembers(team?.id);
  const { data: objectives = [] } = useObjectives({ 
    programIds: team?.program_id ? [team.program_id] : [],
    includeParentHierarchy: true
  });
  const [activeView, setActiveView] = useState<'team' | 'my'>('team');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sprint-board'>('dashboard');
  const [workItemFilter, setWorkItemFilter] = useState('stories');
  const [createDependencyOpen, setCreateDependencyOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedDependencyId, setSelectedDependencyId] = useState<string | null>(null);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Auto-select first sprint if available
  const currentSprint = selectedSprintId 
    ? sprints.find(s => s.id === selectedSprintId) 
    : sprints[0];

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    const totalStories = stories.length;
    const doneStories = stories.filter(s => s.status === 'done').length;
    const inProgressStories = stories.filter(s => s.status === 'in_progress').length;
    const todoStories = totalStories - doneStories - inProgressStories;
    
    const totalPoints = stories.reduce((sum, s) => sum + (Number(s.estimate_points) || 0), 0);
    const donePoints = stories.filter(s => s.status === 'done')
      .reduce((sum, s) => sum + (Number(s.estimate_points) || 0), 0);
    
    const acceptedPercentage = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
    
    // Calculate time left from sprint dates
    let timeLeft = 0;
    if (currentSprint?.start_date && currentSprint?.end_date) {
      const now = new Date();
      const start = new Date(currentSprint.start_date);
      const end = new Date(currentSprint.end_date);
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      timeLeft = Math.max(0, Math.min(100, Math.round((1 - elapsed / total) * 100)));
    }
    
    return {
      timeLeft,
      teamVelocity: acceptedPercentage > 70 ? 82 : acceptedPercentage,
      accepted: acceptedPercentage,
      storiesTotal: totalStories,
      storiesAccepted: doneStories,
      storiesInProgress: inProgressStories,
      storiesToDo: todoStories,
      dependenciesCount: dependencies.length,
    };
  }, [stories, dependencies, currentSprint]);

  const handleTeamChange = (teamId: string) => {
    navigate(`/teams/${teamId}/room`);
  };

  // Generate avatar colors dynamically
  const avatarColors = ['bg-warning', 'bg-info', 'bg-workitem-story', 'bg-destructive', 'bg-success'];
  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];
  
  // Get initials from full name or email
  const getInitials = (member: typeof teamMembers[0]) => {
    if (member.profiles?.full_name) {
      return member.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (member.profiles?.email) {
      return member.profiles.email.slice(0, 2).toUpperCase();
    }
    return 'UN';
  };

  // Map stories to display format
  const displayStories = stories.map((story, index) => ({
    id: story.id,
    title: story.name,
    progress: story.status === 'done' ? 100 : story.status === 'in_progress' ? 60 : 0,
    owner: story.assignee_id ? story.assignee_id.substring(0, 2).toUpperCase() : 'UN',
    estimate: Number(story.estimate_points) || 0,
    hours: `${Number(story.points_loe) || 0}/0`,
    lov: 0,
    lce: 0,
    ac: '0/0',
    state: story.status === 'done' ? 'ACCEPTED' : story.status === 'in_progress' ? 'BUILDING' : 'TODO',
    defects: 0,
  }));

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Header */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">Team Room</h1>
            <span className="text-sm text-muted-foreground">For</span>
            <Select value={team?.id} onValueChange={handleTeamChange}>
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue>{team?.name || 'Select Team'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-sm">
              <Settings className="w-4 h-4 mr-2" />
              View Configuration
            </Button>
            <Button variant="ghost" size="sm" className="text-sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Key Metrics
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Video className="w-4 h-4 mr-2" />
              Run a Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Header with Sprint and Tabs */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select 
              value={selectedSprintId || sprints[0]?.id} 
              onValueChange={setSelectedSprintId}
            >
              <SelectTrigger className="w-[400px] h-9">
                <SelectValue>
                  <span className="text-sm">
                    {currentSprint?.name || 'Select Sprint'}
                    {currentSprint?.goal && ` - ${currentSprint.goal}`}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name} - {sprint.goal || 'Active'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-9">
              <TabsList className="h-9">
                <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
                <TabsTrigger value="sprint-board" className="text-sm">Sprint Board</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            {/* Team Member Avatars */}
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 14).map((member, index) => (
                <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                  <AvatarFallback className={`${getAvatarColor(index)} text-white text-xs`}>
                    {getInitials(member)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={() => setAddMemberOpen(true)}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Add Member
            </Button>

            <div className="flex items-center gap-1 ml-4">
              <Button
                variant={activeView === 'team' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('team')}
                className="text-xs"
              >
                Team View
              </Button>
              <Button
                variant={activeView === 'my' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('my')}
                className="text-xs"
              >
                My View
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      {activeTab === 'dashboard' && (
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Progress & Metrics */}
        <div className="w-64 border-r border-border bg-background p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Progress Section */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-4">Progress:</h3>
              
              {/* Circular Progress Indicators */}
              <div className="flex gap-4 mb-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - metrics.timeLeft / 100)}`}
                        className="text-success"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-success">{metrics.timeLeft}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">Time Left</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - metrics.teamVelocity / 100)}`}
                        className="text-success"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-success">{metrics.teamVelocity}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">Team Velocity</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - metrics.accepted / 100)}`}
                        className="text-success"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-success">{metrics.accepted}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">Accepted</span>
                </div>
              </div>

              {/* Work Item Counts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Stories</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {metrics.storiesAccepted}/{metrics.storiesTotal}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Dependencies</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {dependencies.filter(d => d.status === 'done' || d.status === 'delivered').length}/{metrics.dependenciesCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Dependencies Section */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">Dependencies:</h3>
              {dependencies.length === 0 ? (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🎯</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">No Dependencies</p>
                      <p className="text-xs text-muted-foreground">
                        There are no Dependencies for the team in this sprint!
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => navigate('/dependencies')}
                    >
                      View All
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => navigate('/dependencies?view=matrix')}
                    >
                      Dependency Map
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => setCreateDependencyOpen(true)}
                    >
                      Add New
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dependencies.slice(0, 3).map((dep) => (
                    <Card 
                      key={dep.id} 
                      className="p-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDependencyId(dep.id)}
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        <span 
                          className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${
                            dep.status === 'pending_commit' || dep.status === 'open' 
                              ? 'bg-destructive text-destructive-foreground'
                              : dep.status === 'committed' 
                              ? 'bg-muted text-muted-foreground'
                              : dep.status === 'done' || dep.status === 'delivered'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {dep.status === 'pending_commit' ? 'PENDING COMMIT' : dep.status?.replace('_', ' ').toUpperCase()}
                        </span>
                        <span 
                          className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${
                            dep.risk_level === 'high' 
                              ? 'bg-destructive text-destructive-foreground'
                              : dep.risk_level === 'med'
                              ? 'bg-warning text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {dep.risk_level?.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dep.description || `${dep.type} dependency`}
                      </p>
                    </Card>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => navigate(`/dependencies?teamId=${team.id}`)}
                    >
                      View All ({dependencies.length})
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => navigate('/dependencies?view=matrix')}
                    >
                      Dependency Map
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => setCreateDependencyOpen(true)}
                    >
                      Add New
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Impediments Section */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">Impediments:</h3>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎯</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">No Impediments</p>
                    <p className="text-xs text-muted-foreground">
                      There are no Impediments blocking the team in this sprint!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="link" size="sm" className="text-xs h-auto p-0">
                    View More
                  </Button>
                  <Button variant="link" size="sm" className="text-xs h-auto p-0">
                    Add New
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Center Content - Work Items Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-border bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sprint:</span>
                  <Select value={workItemFilter} onValueChange={setWorkItemFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stories">Stories</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="defects">Defects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, Name, or Tag"
                    className="pl-9 h-8 text-sm"
                  />
                </div>

                <Button variant="outline" size="sm" className="text-xs">
                  Quick Filters
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setCreateStoryOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Quick Add Story
                </Button>
                <div className="flex items-center gap-1">
                  <div className="w-24 h-6 bg-gradient-to-r from-primary via-success to-success" />
                </div>
              </div>
            </div>
          </div>

          {/* Stories Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-12"></th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">ID</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground flex-1 min-w-[300px]">Progress</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-20">Owner</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">Esti...</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-20">Hours</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">LOV</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">LCE</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">ACI...</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">AC</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">Attac...</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">Links</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">Chat</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">Blocked</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-24">State</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-16">Defects</th>
                  <th className="text-left py-2 px-3 font-medium text-xs text-muted-foreground w-12">Chat</th>
                </tr>
              </thead>
              <tbody>
                {displayStories.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-8 text-center text-muted-foreground">
                      No stories found for this sprint
                    </td>
                  </tr>
                ) : displayStories.map((story) => (
                  <tr 
                    key={story.id} 
                    className="border-b border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedStoryId(story.id)}
                  >
                    <td className="py-2 px-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                    <td className="py-2 px-3 text-foreground font-medium">{story.id}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-sm text-foreground mb-1">{story.title}</div>
                          <Progress value={story.progress} className="h-1" />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-brand-gold text-primary-foreground text-xs">
                          {story.owner}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-2 px-3 text-foreground">{story.estimate}</td>
                    <td className="py-2 px-3 text-foreground">{story.hours}</td>
                    <td className="py-2 px-3 text-foreground">{story.lov}</td>
                    <td className="py-2 px-3 text-foreground">{story.lce}</td>
                    <td className="py-2 px-3 text-foreground">{story.ac}</td>
                    <td className="py-2 px-3 text-foreground">{story.ac}</td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="py-2 px-3">
                      {story.defects > 0 && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </td>
                    <td className="py-2 px-3">
                      <Badge 
                        variant="secondary" 
                        className={
                          story.state === 'ACCEPTED' 
                            ? 'bg-success/10 text-success border-success/20' 
                            : 'bg-info/10 text-info border-info/20'
                        }
                      >
                        {story.state}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      {story.defects > 0 && (
                        <Badge variant="destructive" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                          {story.defects}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar - Sprint Goal, Chat, Objectives */}
        <div className="w-80 border-l border-border bg-background p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Sprint Goal */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">Sprint Goal:</h3>
              <Card className="p-4">
                {currentSprint?.goal ? (
                  <p className="text-sm text-foreground">{currentSprint.goal}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not Populated</p>
                )}
              </Card>
            </div>

            {/* Chat */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">Chat:</h3>
              <Card className="p-4">
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">No one seems to be talking!</p>
                  <Input placeholder="Start a new message..." className="text-sm" />
                </div>
              </Card>
            </div>

            {/* Objectives */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">Objectives:</h3>
              {objectives.length === 0 ? (
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🎯</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">No Objectives</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        There are no Objectives for the team in this sprint, create one!
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs h-auto p-0"
                          onClick={() => navigate(`/teams/${team.id}/objectives`)}
                        >
                          View More
                        </Button>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs h-auto p-0"
                          onClick={() => navigate(`/teams/${team.id}/objectives?create=true`)}
                        >
                          Add New
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {objectives.slice(0, 3).map((objective) => (
                    <Card 
                      key={objective.id} 
                      className="p-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/teams/${team.id}/objectives/${objective.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ObjectiveStatusBadge status={objective.status} size="sm" />
                          {objective.score !== null && objective.score !== undefined && (
                            <ObjectiveScoreBadge score={objective.score} size="sm" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground font-medium mb-1 line-clamp-2">
                        {objective.summary}
                      </p>
                      {objective.keyResultsCount > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Target className="w-3 h-3" />
                          <span>{objective.keyResultsCount} Key Results</span>
                          <span className="ml-auto">
                            {Math.round((objective.key_result_progress || 0) * 100)}% Complete
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => navigate(`/teams/${team.id}/objectives`)}
                    >
                      View All ({objectives.length})
                    </Button>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-xs h-auto p-0"
                      onClick={() => navigate(`/teams/${team.id}/objectives?create=true`)}
                    >
                      Add New
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Board Tab Content */}
      {activeTab === 'sprint-board' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* To Do Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground">To Do</h3>
                  <Badge variant="secondary" className="rounded-full">
                    {stories.filter(s => s.status === 'todo').length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {stories
                    .filter(s => s.status === 'todo')
                    .map(story => (
                      <Card 
                        key={story.id} 
                        className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-muted"
                        onClick={() => setSelectedStoryId(story.id)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                            {story.name}
                          </h4>
                          {story.estimate_points && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {story.estimate_points} pts
                            </Badge>
                          )}
                        </div>
                        {story.assignee_id && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="bg-brand-gold text-primary-foreground text-[10px]">
                                {story.assignee_id.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">Assigned</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  {stories.filter(s => s.status === 'todo').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No stories to do
                    </div>
                  )}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-info/10 rounded-lg border border-info/20">
                  <h3 className="font-semibold text-info">In Progress</h3>
                  <Badge variant="secondary" className="rounded-full bg-info text-primary-foreground">
                    {stories.filter(s => s.status === 'in_progress').length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {stories
                    .filter(s => s.status === 'in_progress')
                    .map(story => (
                      <Card 
                        key={story.id} 
                        className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-info"
                        onClick={() => setSelectedStoryId(story.id)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                            {story.name}
                          </h4>
                          {story.estimate_points && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {story.estimate_points} pts
                            </Badge>
                          )}
                        </div>
                        {story.progress_pct !== null && story.progress_pct !== undefined && (
                          <div className="mt-2">
                            <Progress value={story.progress_pct} className="h-1.5" />
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {story.progress_pct}% complete
                            </span>
                          </div>
                        )}
                        {story.assignee_id && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="bg-brand-gold text-primary-foreground text-[10px]">
                                {story.assignee_id.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">Assigned</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  {stories.filter(s => s.status === 'in_progress').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No stories in progress
                    </div>
                  )}
                </div>
              </div>

              {/* Done Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-success/10 rounded-lg border border-success/20">
                  <h3 className="font-semibold text-success">Done</h3>
                  <Badge variant="secondary" className="rounded-full bg-success text-success-foreground">
                    {stories.filter(s => s.status === 'done').length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {stories
                    .filter(s => s.status === 'done')
                    .map(story => (
                      <Card 
                        key={story.id} 
                        className="p-4 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-success"
                        onClick={() => setSelectedStoryId(story.id)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                            {story.name}
                          </h4>
                          {story.estimate_points && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {story.estimate_points} pts
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-success mt-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Completed</span>
                        </div>
                        {story.assignee_id && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="bg-brand-gold text-primary-foreground text-[10px]">
                                {story.assignee_id.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">Assigned</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  {stories.filter(s => s.status === 'done').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No completed stories
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Board Summary */}
            <Card className="mt-6 p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Stories</div>
                    <div className="text-2xl font-bold text-foreground">{stories.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Points</div>
                    <div className="text-2xl font-bold text-foreground">
                      {stories.reduce((sum, s) => sum + (Number(s.estimate_points) || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Completion</div>
                    <div className="text-2xl font-bold text-success">
                      {metrics.accepted}%
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setCreateStoryOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Story
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

        {/* Story Detail Panel */}
        {selectedStoryId && stories.find(s => s.id === selectedStoryId) && (
          <StoryDetailPanel
            story={stories.find(s => s.id === selectedStoryId)!}
            open={!!selectedStoryId}
            onClose={() => setSelectedStoryId(null)}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['sprint-stories', selectedSprintId || sprints[0]?.id] });
            }}
          />
        )}

        {/* Dependency Details Drawer */}
        <DependencyDetailsDrawer
          open={!!selectedDependencyId}
          onClose={() => setSelectedDependencyId(null)}
          dependencyId={selectedDependencyId || undefined}
        />

        {/* Create Dependency Dialog */}
        <CreateDependencyDialog 
          open={createDependencyOpen}
          onOpenChange={setCreateDependencyOpen}
          teamId={team?.id}
        />

        {/* Create Story Panel */}
        <CreateEditStoryPanel
          open={createStoryOpen}
          onClose={() => setCreateStoryOpen(false)}
          onSuccess={() => {
            setCreateStoryOpen(false);
            queryClient.invalidateQueries({ queryKey: ['sprint-stories', selectedSprintId || sprints[0]?.id] });
          }}
          initialTeamId={team?.id}
          initialSprintId={selectedSprintId || sprints[0]?.id}
        />

        {/* Add Team Member Dialog */}
        <AddTeamMemberDialog
          teamId={team?.id || ''}
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
        />
      </div>
    );
  }

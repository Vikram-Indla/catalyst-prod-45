/**
 * Fill Gap Modal
 * Shows available resources with capacity < 100% to fill a vacancy
 * Also allows adding a completely new person to the roster
 */

import { useState } from 'react';
import { Resource, Vacancy, CapacityProject } from '@/types/capacity';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { User, UserPlus, Check, Briefcase } from 'lucide-react';

interface FillGapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy: Vacancy | null;
  resources: Resource[];
  projects: CapacityProject[];
  currentWeek: number;
  currentYear: number;
  onAssignResource: (vacancyId: string, resourceId: string, percentage: number) => void;
  onAddNewPerson: (data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'allocations'>, vacancyId: string) => void;
}

// Calculate resource utilization for current week
function calculateUtilization(allocations: Resource['allocations'], weekNumber: number, year: number): number {
  return allocations
    .filter(a => a.weekNumber === weekNumber && a.year === year)
    .reduce((sum, a) => sum + a.percentage, 0);
}

export function FillGapModal({
  open,
  onOpenChange,
  vacancy,
  resources,
  projects,
  currentWeek,
  currentYear,
  onAssignResource,
  onAddNewPerson
}: FillGapModalProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'new'>('available');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [assignPercentage, setAssignPercentage] = useState(100);
  
  // New person form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [primarySkill, setPrimarySkill] = useState<Resource['primarySkill']>('Full Stack');
  const [location, setLocation] = useState<Resource['location']>('Onsite');
  const [department, setDepartment] = useState<Resource['department']>('Engineering');

  // Get available resources (those with < 100% utilization)
  const availableResources = resources
    .map(r => ({
      ...r,
      utilization: calculateUtilization(r.allocations, currentWeek, currentYear),
      availableCapacity: 100 - calculateUtilization(r.allocations, currentWeek, currentYear)
    }))
    .filter(r => r.availableCapacity > 0)
    .sort((a, b) => b.availableCapacity - a.availableCapacity);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unassigned';
  };

  const handleAssignResource = () => {
    if (!vacancy || !selectedResourceId) return;
    onAssignResource(vacancy.id, selectedResourceId, assignPercentage);
    resetAndClose();
  };

  const handleAddNewPerson = () => {
    if (!firstName || !lastName || !role || !vacancy) return;
    
    const newPersonData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'allocations'> = {
      name: `${firstName} ${lastName}`,
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
      role,
      email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      primarySkill,
      location,
      department,
      capacity: 100,
      startDate: new Date().toISOString()
    };
    
    onAddNewPerson(newPersonData, vacancy.id);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedResourceId(null);
    setAssignPercentage(100);
    setFirstName('');
    setLastName('');
    setRole('');
    setEmail('');
    setPrimarySkill('Full Stack');
    setLocation('Onsite');
    setDepartment('Engineering');
    setActiveTab('available');
    onOpenChange(false);
  };

  if (!vacancy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-brand-gold" />
            Fill Vacancy: {vacancy.skill}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">{vacancy.proficiencyLevel}</Badge>
            <Badge variant="secondary" className="text-[10px]">W{vacancy.startWeek}–W{vacancy.endWeek}</Badge>
            <Badge variant="secondary" className="text-[10px]">{vacancy.percentageNeeded}% needed</Badge>
            <Badge variant="secondary" className="text-[10px]">{getProjectName(vacancy.projectId)}</Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'available' | 'new')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="available" className="gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" />
              Available Resources
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5 text-xs">
              <UserPlus className="h-3.5 w-3.5" />
              Add New Person
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4 space-y-3">
            {availableResources.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No resources available with spare capacity
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {availableResources.map((resource) => (
                  <div
                    key={resource.id}
                    onClick={() => setSelectedResourceId(resource.id)}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      selectedResourceId === resource.id
                        ? "border-brand-gold bg-brand-gold/5"
                        : "border-border hover:border-brand-gold/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-xs font-semibold">
                          {resource.initials}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{resource.name}</div>
                          <div className="text-xs text-muted-foreground">{resource.role}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-sm font-semibold",
                          resource.availableCapacity >= 50 ? "text-[#5c7c5c]" : "text-[#8b7355]"
                        )}>
                          {resource.availableCapacity}% free
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {resource.primarySkill}
                        </div>
                      </div>
                    </div>
                    {selectedResourceId === resource.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-3">
                          <Label className="text-xs whitespace-nowrap">Allocate:</Label>
                          <Input
                            type="number"
                            min={10}
                            max={resource.availableCapacity}
                            step={10}
                            value={assignPercentage}
                            onChange={(e) => setAssignPercentage(Math.min(parseInt(e.target.value) || 0, resource.availableCapacity))}
                            className="h-7 w-20 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Check className="h-4 w-4 text-brand-gold ml-auto" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Role / Job Title *</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={vacancy.skill}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@company.com"
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Skill</Label>
                <Select value={primarySkill} onValueChange={(v) => setPrimarySkill(v as Resource['primarySkill'])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Frontend', 'Backend', 'Full Stack', 'DevOps', 'QA', 'Product', 'Design', 'Data'].map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Select value={location} onValueChange={(v) => setLocation(v as Resource['location'])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Onsite" className="text-xs">Onsite</SelectItem>
                    <SelectItem value="Offshore" className="text-xs">Offshore</SelectItem>
                    <SelectItem value="Hybrid" className="text-xs">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as Resource['department'])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering" className="text-xs">Engineering</SelectItem>
                    <SelectItem value="Product" className="text-xs">Product</SelectItem>
                    <SelectItem value="Design" className="text-xs">Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'available' ? (
            <Button 
              size="sm"
              onClick={handleAssignResource}
              disabled={!selectedResourceId}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Assign Resource
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={handleAddNewPerson}
              disabled={!firstName || !lastName || !role}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Add & Assign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

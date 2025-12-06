import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, Building2, Briefcase, Layers, Users, Loader2 } from 'lucide-react';
import { 
  useModules, 
  useOrgModules, 
  useModulePackages, 
  useActivePackage,
  usePackageModules,
  useUpdateModuleSettings 
} from '@/hooks/useModules';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  PRODUCT: <Package className="h-5 w-5" />,
  ENTERPRISE: <Building2 className="h-5 w-5" />,
  PORTFOLIO: <Briefcase className="h-5 w-5" />,
  PROGRAM: <Layers className="h-5 w-5" />,
  TEAMS: <Users className="h-5 w-5" />,
};

export default function ModulesPackages() {
  const { data: modules, isLoading: modulesLoading } = useModules();
  const { data: orgModules, isLoading: orgModulesLoading } = useOrgModules();
  const { data: packages, isLoading: packagesLoading } = useModulePackages();
  const { data: activePackage, isLoading: activePackageLoading } = useActivePackage();
  
  const [selectedPackage, setSelectedPackage] = useState<string>('CUSTOM');
  const [moduleSettings, setModuleSettings] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: packageModules } = usePackageModules(selectedPackage);
  const updateSettings = useUpdateModuleSettings();
  
  // Initialize state from database
  useEffect(() => {
    if (activePackage) {
      setSelectedPackage(activePackage.package_code || 'CUSTOM');
    }
  }, [activePackage]);
  
  useEffect(() => {
    if (orgModules) {
      const settings: Record<string, boolean> = {};
      orgModules.forEach(m => {
        settings[m.module_code] = m.is_enabled;
      });
      setModuleSettings(settings);
    }
  }, [orgModules]);
  
  // Apply package preset when package changes
  const handlePackageChange = (packageCode: string) => {
    setSelectedPackage(packageCode);
    setHasChanges(true);
  };
  
  // Update settings when package modules are loaded
  useEffect(() => {
    if (packageModules && selectedPackage !== 'CUSTOM') {
      const newSettings: Record<string, boolean> = {};
      modules?.forEach(m => {
        newSettings[m.code] = packageModules.includes(m.code);
      });
      setModuleSettings(newSettings);
    }
  }, [packageModules, selectedPackage, modules]);
  
  const handleModuleToggle = (moduleCode: string, enabled: boolean) => {
    setModuleSettings(prev => ({ ...prev, [moduleCode]: enabled }));
    setHasChanges(true);
    
    // If manually changing, set to custom
    if (selectedPackage !== 'CUSTOM') {
      setSelectedPackage('CUSTOM');
    }
  };
  
  const handleSave = () => {
    updateSettings.mutate({
      moduleSettings,
      packageCode: selectedPackage,
      isCustom: selectedPackage === 'CUSTOM',
    }, {
      onSuccess: () => {
        setHasChanges(false);
      }
    });
  };
  
  const isLoading = modulesLoading || orgModulesLoading || packagesLoading || activePackageLoading;
  
  if (isLoading) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center h-full p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }
  
  const enabledCount = Object.values(moduleSettings).filter(Boolean).length;
  const totalCount = modules?.length || 0;
  const activePackageName = packages?.find(p => p.code === selectedPackage)?.name || 'None / Custom';
  
  // Find which package includes each module
  const getPackagesForModule = (moduleCode: string): string[] => {
    const packageMap: Record<string, string[]> = {
      PRODUCT: ['Product Starter', 'Product + Delivery', 'Strategy + Product', 'Full Catalyst'],
      ENTERPRISE: ['Strategy + Product', 'Full Catalyst'],
      PORTFOLIO: ['Full Catalyst'],
      PROGRAM: ['Product + Delivery', 'Full Catalyst'],
      TEAMS: ['Product + Delivery', 'Full Catalyst'],
    };
    return packageMap[moduleCode] || [];
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header - matching DetailsPanels pattern */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modules & Packages</h1>
            <p className="text-muted-foreground mt-2">
              Configure which Catalyst modules are available for this organization, and which solution package is applied.
            </p>
          </div>
          <Button 
            className="bg-brand-gold hover:bg-brand-gold-hover"
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enabled Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enabledCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Package</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePackageName}</div>
            </CardContent>
          </Card>
        </div>

        {/* Package Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Package</CardTitle>
            <CardDescription>
              Select a package to apply default module settings, or choose Custom to configure individually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select value={selectedPackage} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.code} value={pkg.code}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPackage !== 'CUSTOM' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selecting a package pre-populates module settings. You can override individual modules below.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modules List */}
        <Card>
          <CardHeader>
            <CardTitle>Module Configuration</CardTitle>
            <CardDescription>
              Toggle modules on or off for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modules?.map((module) => {
                const isEnabled = moduleSettings[module.code] ?? false;
                const includedInPackages = getPackagesForModule(module.code);
                
                return (
                  <div 
                    key={module.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-md bg-muted">
                        {MODULE_ICONS[module.code] || <Package className="h-5 w-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-base font-medium">{module.name}</Label>
                          <Badge variant={isEnabled ? "default" : "secondary"}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {module.description}
                        </p>
                        {includedInPackages.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Included in: {includedInPackages.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleModuleToggle(module.code, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
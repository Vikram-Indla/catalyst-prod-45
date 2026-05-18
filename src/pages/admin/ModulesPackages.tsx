import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Toggle from '@atlaskit/toggle';
import Select from '@atlaskit/select';
import { Lozenge } from '@/components/ads';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import OfficeBuildingIcon from '@atlaskit/icon/core/office-building';
import BriefcaseIcon from '@atlaskit/icon/core/briefcase';
import BoardsIcon from '@atlaskit/icon/core/boards';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import Spinner from '@atlaskit/spinner';
import {
  useModules,
  useOrgModules,
  useModulePackages,
  useActivePackage,
  usePackageModules,
  useUpdateModuleSettings
} from '@/hooks/useModules';

const MODULE_ICONS: Record<string, React.ReactNode> = {
  PRODUCT: <ArchiveBoxIcon label="" size="medium" />,
  ENTERPRISE: <OfficeBuildingIcon label="" size="medium" />,
  PORTFOLIO: <BriefcaseIcon label="" size="medium" />,
  PROGRAM: <BoardsIcon label="" size="medium" />,
  TEAMS: <PeopleGroupIcon label="" size="medium" />,
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
          <Spinner size="medium" />
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

  const packageOptions = packages?.map(pkg => ({ label: pkg.name, value: pkg.code })) ?? [];

  return (
    <AdminGuard>
      <div className="h-full flex flex-col" style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}>
        <div
          className="h-[72px] flex items-center justify-between px-6"
          style={{
            borderBottom: '1px solid var(--ds-border-layout, #EBECF0)',
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
          }}
        >
          <div className="min-w-0">
            <h1
              className="text-2xl font-semibold truncate"
              style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}
            >
              Modules &amp; Packages
            </h1>
            <p className="text-sm truncate" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
              Configure which Catalyst modules are available for this organization
            </p>
          </div>
          <Button
            appearance="primary"
            onClick={handleSave}
            isDisabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending && <span style={{ display: 'inline-flex', marginRight: 8 }}><Spinner size="small" /></span>}
            Save Changes
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Enabled Modules</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{enabledCount}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Available Modules</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{totalCount}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Active Package</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{activePackageName}</div>
          </div>
        </div>

        {/* Package Selector */}
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
            Assigned Package
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
            Select a package to apply default module settings, or choose Custom to configure individually
          </p>
          <div className="max-w-md">
            <Select
              options={packageOptions}
              value={packageOptions.find(o => o.value === selectedPackage) || null}
              onChange={(opt) => opt && handlePackageChange(opt.value)}
              placeholder="Select a package"
            />
            {selectedPackage !== 'CUSTOM' && (
              <p className="text-xs mt-2" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                Selecting a package pre-populates module settings. You can override individual modules below.
              </p>
            )}
          </div>
        </div>

        {/* Modules List */}
        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
            Module Configuration
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
            Toggle modules on or off for your organization
          </p>
          <div className="space-y-4">
            {modules?.map((module) => {
              const isEnabled = moduleSettings[module.code] ?? false;
              const includedInPackages = getPackagesForModule(module.code);

              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ border: '1px solid var(--ds-border, #DCDFE4)' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="p-2 rounded-md"
                      style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}
                    >
                      {MODULE_ICONS[module.code] || <ArchiveBoxIcon label="" size="medium" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>
                          {module.name}
                        </label>
                        <Lozenge appearance={isEnabled ? 'success' : 'default'}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Lozenge>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                        {module.description}
                      </p>
                      {includedInPackages.length > 0 && (
                        <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                          Included in: {includedInPackages.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Toggle
                    isChecked={isEnabled}
                    onChange={() => handleModuleToggle(module.code, !isEnabled)}
                    label={`Enable ${module.name}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </AdminGuard>
  );
}

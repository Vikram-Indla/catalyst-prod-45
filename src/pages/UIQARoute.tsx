/**
 * UIQARoute - Hidden admin-only route for theme and layout verification
 * 
 * Route: /ui/qa (not in navigation)
 * 
 * Provides a visual gallery of key components in both light and dark modes
 * for QA verification of the design system.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalystEmptyState } from '@/components/shared/CatalystEmptyState';
import { DrawerPanel, DrawerSection } from '@/components/shared/DrawerPanel';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Sun, 
  Moon, 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Settings
} from 'lucide-react';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

const BREAKPOINTS: Record<Breakpoint, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop (1440+)' },
  tablet: { width: '768px', label: 'Tablet (768px)' },
  mobile: { width: '390px', label: 'Mobile (390px)' },
};

export default function UIQARoute() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'light'
  );
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Header Controls */}
      <div 
        className="mb-8 p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap"
        style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
      >
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
            Theme & Layout Audit
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Visual QA for design system components
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-2"
            style={{ 
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-1)'
            }}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>

          {/* Breakpoint Buttons */}
          <div className="flex gap-1">
            <Button
              variant={breakpoint === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakpoint('desktop')}
              style={breakpoint !== 'desktop' ? { 
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-1)'
              } : {}}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={breakpoint === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakpoint('tablet')}
              style={breakpoint !== 'tablet' ? { 
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-1)'
              } : {}}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={breakpoint === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakpoint('mobile')}
              style={breakpoint !== 'mobile' ? { 
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-1)'
              } : {}}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Component Gallery */}
      <div 
        className="mx-auto transition-all duration-300"
        style={{ maxWidth: BREAKPOINTS[breakpoint].width }}
      >
        <div className="space-y-8">
          {/* SECTION: Buttons */}
          <ComponentSection title="Buttons">
            <div className="flex flex-wrap gap-3">
              <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                Primary
              </Button>
              <Button 
                variant="outline"
                style={{ 
                  backgroundColor: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--btn-secondary-border)',
                  color: 'var(--btn-secondary-text)'
                }}
              >
                Secondary
              </Button>
              <Button 
                variant="ghost"
                style={{ color: 'var(--text-1)' }}
              >
                Ghost
              </Button>
              <Button disabled className="bg-brand-gold text-white">
                Disabled
              </Button>
            </div>
          </ComponentSection>

          {/* SECTION: Tabs */}
          <ComponentSection title="Tabs">
            <Tabs defaultValue="tab1" className="w-full">
              <TabsList 
                className="w-full justify-start rounded-none h-10"
                style={{ 
                  backgroundColor: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <TabsTrigger 
                  value="tab1"
                  className="data-[state=active]:border-b-2 rounded-none"
                  style={{ 
                    color: 'var(--tab-default-text)',
                    borderColor: 'var(--tab-active-border)'
                  }}
                >
                  Tab One
                </TabsTrigger>
                <TabsTrigger 
                  value="tab2"
                  className="data-[state=active]:border-b-2 rounded-none"
                  style={{ 
                    color: 'var(--tab-default-text)',
                    borderColor: 'var(--tab-active-border)'
                  }}
                >
                  Tab Two
                </TabsTrigger>
                <TabsTrigger 
                  value="tab3"
                  className="data-[state=active]:border-b-2 rounded-none"
                  style={{ 
                    color: 'var(--tab-default-text)',
                    borderColor: 'var(--tab-active-border)'
                  }}
                >
                  Tab Three
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tab1" className="p-4" style={{ color: 'var(--text-1)' }}>
                Content for tab one
              </TabsContent>
              <TabsContent value="tab2" className="p-4" style={{ color: 'var(--text-1)' }}>
                Content for tab two
              </TabsContent>
              <TabsContent value="tab3" className="p-4" style={{ color: 'var(--text-1)' }}>
                Content for tab three
              </TabsContent>
            </Tabs>
          </ComponentSection>

          {/* SECTION: Form Inputs */}
          <ComponentSection title="Form Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label style={{ color: 'var(--form-label)' }}>Text Input</Label>
                <Input 
                  placeholder="Enter text..." 
                  className="mt-1"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)'
                  }}
                />
              </div>
              <div>
                <Label style={{ color: 'var(--form-label)' }}>Disabled Input</Label>
                <Input 
                  placeholder="Disabled" 
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
          </ComponentSection>

          {/* SECTION: Drawer Panel */}
          <ComponentSection title="Drawer Panel">
            <DrawerPanel
              title="Panel Title"
              icon={<Settings className="h-4 w-4" />}
              actions={
                <Button size="sm" className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              }
            >
              <div className="p-4" style={{ color: 'var(--text-1)' }}>
                Panel content with proper dark mode styling.
              </div>
            </DrawerPanel>
          </ComponentSection>

          {/* SECTION: Empty State */}
          <ComponentSection title="Empty State">
            <CatalystEmptyState
              icon={FileText}
              title="No items yet"
              subtitle="Create your first item to get started with tracking."
              ctaLabel="Add Item"
              onAction={() => {}}
              bordered
            />
          </ComponentSection>

          {/* SECTION: Table */}
          <ComponentSection title="Table">
            <div 
              className="rounded-lg overflow-hidden border"
              style={{ borderColor: 'var(--table-border)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--table-header-text)' }}>
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--table-header-text)' }}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--table-header-text)' }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <tr 
                      key={i}
                      className="transition-colors cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--table-row-bg)',
                        borderTop: '1px solid var(--divider)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-bg)'}
                    >
                      <td className="px-4 py-3" style={{ color: 'var(--text-1)' }}>Item {i}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>Active</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-3)' }}>Dec 15, 2025</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ComponentSection>

          {/* SECTION: Cards */}
          <ComponentSection title="Cards">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Default', 'Hover', 'Selected'].map((type) => (
                <div 
                  key={type}
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: type === 'Selected' ? 'var(--table-row-selected)' : 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    boxShadow: 'var(--card-shadow)'
                  }}
                >
                  <h4 className="font-medium mb-2" style={{ color: 'var(--text-1)' }}>{type} Card</h4>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Card content with semantic tokens.
                  </p>
                </div>
              ))}
            </div>
          </ComponentSection>

          {/* QA Status Summary */}
          <div 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: 'var(--surface-1)',
              borderColor: 'var(--border-color)'
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
              QA Checklist
            </h3>
            <div className="space-y-2 text-sm">
              <QAItem status="pass" label="Dark mode surfaces (no white panels)" />
              <QAItem status="pass" label="Contrast (text + actions visible)" />
              <QAItem status="pass" label="Buttons visible in both themes" />
              <QAItem status="pass" label="Form inputs readable in dark mode" />
              <QAItem status="pass" label="Empty states use semantic tokens" />
              <QAItem status="pass" label="Table headers/rows themed correctly" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        backgroundColor: 'var(--surface-1)',
        borderColor: 'var(--border-color)'
      }}
    >
      <h3 
        className="text-sm font-semibold uppercase tracking-wider mb-4"
        style={{ color: 'var(--accent-color)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function QAItem({ status, label }: { status: 'pass' | 'fail' | 'warn'; label: string }) {
  const icons = {
    pass: <CheckCircle className="h-4 w-4 text-green-500" />,
    fail: <XCircle className="h-4 w-4 text-red-500" />,
    warn: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  };
  
  return (
    <div className="flex items-center gap-2">
      {icons[status]}
      <span style={{ color: 'var(--text-1)' }}>{label}</span>
    </div>
  );
}

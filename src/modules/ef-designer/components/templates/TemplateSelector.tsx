import React, { useState } from 'react';
import { EFD_TEMPLATES, TEMPLATE_CATEGORIES, EFDTemplate } from '../../data/efd-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, CheckCircle, Layers, ListTree } from 'lucide-react';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: EFDTemplate) => void;
  isApplying?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onOpenChange,
  onSelectTemplate,
  isApplying = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EFDTemplate | null>(null);

  const filteredTemplates = EFD_TEMPLATES.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category: string) => {
    return TEMPLATE_CATEGORIES.find((c) => c.id === category);
  };

  const countItems = (template: EFDTemplate) => {
    const epicCount = template.epics.length;
    const featureCount = template.epics.reduce((sum, e) => sum + e.features.length, 0);
    return { epicCount, featureCount };
  };

  const handleApply = () => {
    if (previewTemplate) {
      onSelectTemplate(previewTemplate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>
            Start with a pre-built template and customize it to your needs
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: Template List */}
          <div className="w-1/2 flex flex-col min-h-0">
            {/* Search & Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Badge>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon} {cat.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Template Cards */}
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {filteredTemplates.map((template) => {
                  const { epicCount, featureCount } = countItems(template);
                  const category = getCategoryLabel(template.category);
                  const isSelected = previewTemplate?.id === template.id;

                  return (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        {isSelected && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {epicCount} Epics
                        </span>
                        <span className="flex items-center gap-1">
                          <ListTree className="h-3 w-3" />
                          {featureCount} Features
                        </span>
                        {category && (
                          <Badge variant="secondary" className="text-xs py-0">
                            {category.icon} {category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates match your search
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Preview */}
          <div className="w-1/2 border-l pl-4 flex flex-col min-h-0">
            {previewTemplate ? (
              <>
                <div className="mb-3">
                  <h3 className="font-semibold">{previewTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    {previewTemplate.epics.map((epic, eIdx) => (
                      <div key={eIdx} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">Epic {eIdx + 1}</Badge>
                          <span className="font-medium text-sm">{epic.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{epic.description}</p>
                        <div className="space-y-2">
                          {epic.features.map((feature, fIdx) => (
                            <div key={fIdx} className="pl-3 border-l-2 border-muted">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs py-0">F{fIdx + 1}</Badge>
                                <span className="text-sm">{feature.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a template to preview
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!previewTemplate || isApplying}>
            {isApplying ? 'Applying...' : 'Apply Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

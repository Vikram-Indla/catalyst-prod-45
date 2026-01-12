/**
 * Test Case Templates Dialog — Quick start with pre-built templates
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layout,
  LogIn,
  CreditCard,
  Search,
  ShoppingCart,
  FileUp,
  User,
  Settings,
  Shield,
  Smartphone,
  Globe,
  Database,
  CheckCircle2,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TestCaseTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: Template) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  stepCount: number;
  tags: string[];
  popular?: boolean;
}

const templates: Template[] = [
  {
    id: 'login-flow',
    name: 'User Login Flow',
    description: 'Complete login test with valid/invalid credentials, session handling',
    icon: LogIn,
    category: 'Authentication',
    stepCount: 8,
    tags: ['login', 'auth', 'security'],
    popular: true,
  },
  {
    id: 'registration',
    name: 'User Registration',
    description: 'Full registration flow with validation, email verification',
    icon: User,
    category: 'Authentication',
    stepCount: 12,
    tags: ['register', 'signup', 'onboarding'],
  },
  {
    id: 'payment-flow',
    name: 'Payment Processing',
    description: 'E-commerce payment with card validation, success/failure scenarios',
    icon: CreditCard,
    category: 'E-Commerce',
    stepCount: 15,
    tags: ['payment', 'checkout', 'transaction'],
    popular: true,
  },
  {
    id: 'search-filter',
    name: 'Search & Filter',
    description: 'Search functionality with filters, sorting, pagination',
    icon: Search,
    category: 'Core Features',
    stepCount: 10,
    tags: ['search', 'filter', 'pagination'],
  },
  {
    id: 'shopping-cart',
    name: 'Shopping Cart',
    description: 'Add/remove items, quantity updates, cart persistence',
    icon: ShoppingCart,
    category: 'E-Commerce',
    stepCount: 14,
    tags: ['cart', 'ecommerce', 'checkout'],
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    description: 'File upload with type validation, size limits, progress tracking',
    icon: FileUp,
    category: 'Core Features',
    stepCount: 8,
    tags: ['upload', 'file', 'media'],
  },
  {
    id: 'profile-settings',
    name: 'Profile Settings',
    description: 'User profile management, preferences, account settings',
    icon: Settings,
    category: 'User Management',
    stepCount: 10,
    tags: ['profile', 'settings', 'preferences'],
  },
  {
    id: 'access-control',
    name: 'Access Control',
    description: 'Role-based access, permission verification, restricted areas',
    icon: Shield,
    category: 'Security',
    stepCount: 12,
    tags: ['rbac', 'permissions', 'security'],
  },
  {
    id: 'responsive-layout',
    name: 'Responsive Layout',
    description: 'UI responsiveness across desktop, tablet, mobile viewports',
    icon: Smartphone,
    category: 'UI/UX',
    stepCount: 6,
    tags: ['responsive', 'mobile', 'layout'],
  },
  {
    id: 'api-integration',
    name: 'API Integration',
    description: 'API endpoint testing with request/response validation',
    icon: Globe,
    category: 'Integration',
    stepCount: 10,
    tags: ['api', 'integration', 'backend'],
  },
  {
    id: 'data-crud',
    name: 'Data CRUD Operations',
    description: 'Create, Read, Update, Delete operations with validation',
    icon: Database,
    category: 'Core Features',
    stepCount: 16,
    tags: ['crud', 'data', 'database'],
    popular: true,
  },
  {
    id: 'form-validation',
    name: 'Form Validation',
    description: 'Comprehensive form testing with all validation scenarios',
    icon: Layout,
    category: 'Core Features',
    stepCount: 12,
    tags: ['form', 'validation', 'input'],
  },
];

const categories = [...new Set(templates.map(t => t.category))];

export function TestCaseTemplatesDialog({ 
  open, 
  onOpenChange,
  onSelectTemplate,
}: TestCaseTemplatesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate?.(selectedTemplate);
      onOpenChange(false);
      toast.success(`Created test case from "${selectedTemplate.name}" template`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Test Case Templates
          </DialogTitle>
          <DialogDescription>
            Start quickly with pre-built test case templates
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search & Filter */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className="h-7"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="h-7"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {filteredTemplates.map((template, index) => {
                const Icon = template.icon;
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <motion.button
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedTemplate(template)}
                    className={cn(
                      "flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isSelected ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex items-center gap-1">
                        {template.popular && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 border-0">
                            Popular
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {template.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{template.stepCount} steps</span>
                      <span>·</span>
                      <span>{template.category}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No templates found matching your search
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUseTemplate} 
            disabled={!selectedTemplate}
          >
            <Plus className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

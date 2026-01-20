// ============================================================
// ComparisonView - Side-by-side expected vs actual comparison
// ============================================================

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ComparisonViewProps {
  expected: string;
  actual: string | null;
  expectedImage?: string;
  actualImage?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getMatchLevel(expected: string, actual: string | null): {
  level: string;
  color: string;
  percentage: number;
} {
  if (!actual) {
    return { level: 'Not Recorded', color: 'bg-muted text-muted-foreground', percentage: 0 };
  }

  // Simple word-based similarity
  const expectedWords = new Set(expected.toLowerCase().split(/\s+/));
  const actualWords = new Set(actual.toLowerCase().split(/\s+/));
  
  let matches = 0;
  expectedWords.forEach(word => {
    if (actualWords.has(word)) matches++;
  });

  const similarity = expectedWords.size > 0 ? matches / expectedWords.size : 0;

  if (similarity >= 0.8) {
    return { level: 'High Match', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', percentage: Math.round(similarity * 100) };
  }
  if (similarity >= 0.5) {
    return { level: 'Partial Match', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', percentage: Math.round(similarity * 100) };
  }
  return { level: 'Low Match', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', percentage: Math.round(similarity * 100) };
}

export function ComparisonView({
  expected,
  actual,
  expectedImage,
  actualImage,
  open,
  onOpenChange,
}: ComparisonViewProps) {
  const [sliderPosition, setSliderPosition] = useState([50]);
  const hasImages = expectedImage && actualImage;
  const match = getMatchLevel(expected, actual);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Compare Results
            <Badge className={cn('font-normal', match.color)}>
              {match.level} {match.percentage > 0 && `(${match.percentage}%)`}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="text" className="w-full">
          <TabsList>
            <TabsTrigger value="text">Text Comparison</TabsTrigger>
            {hasImages && <TabsTrigger value="visual">Visual Comparison</TabsTrigger>}
          </TabsList>

          {/* Text Comparison */}
          <TabsContent value="text" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Expected */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Expected</h4>
                <div className="p-4 rounded-lg border bg-muted/30 min-h-[150px]">
                  <p className="text-sm whitespace-pre-wrap">
                    {expected || <span className="text-muted-foreground italic">No expected result defined</span>}
                  </p>
                </div>
              </div>

              {/* Actual */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Actual</h4>
                <div className={cn(
                  'p-4 rounded-lg border min-h-[150px]',
                  actual ? 'bg-background' : 'bg-muted/30'
                )}>
                  <p className="text-sm whitespace-pre-wrap">
                    {actual || <span className="text-muted-foreground italic">No actual result recorded</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Word-level diff (simplified) */}
            {actual && expected && (
              <div className="mt-4 p-4 rounded-lg border bg-muted/20">
                <h4 className="text-sm font-medium mb-2">Difference Highlight</h4>
                <p className="text-sm text-muted-foreground">
                  {match.percentage >= 80 
                    ? 'The actual result closely matches the expected result.'
                    : match.percentage >= 50
                    ? 'Some differences found between expected and actual results.'
                    : 'Significant differences detected between expected and actual results.'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Visual Comparison */}
          {hasImages && (
            <TabsContent value="visual" className="mt-4">
              <div className="space-y-4">
                {/* Slider for image overlay */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {/* Expected Image (background) */}
                  <img
                    src={expectedImage}
                    alt="Expected"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  
                  {/* Actual Image (clipped) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition[0]}%` }}
                  >
                    <img
                      src={actualImage}
                      alt="Actual"
                      className="w-full h-full object-contain"
                      style={{ width: `${100 / (sliderPosition[0] / 100)}%` }}
                    />
                  </div>

                  {/* Slider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                    style={{ left: `${sliderPosition[0]}%` }}
                  />
                </div>

                {/* Slider Control */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Actual</span>
                  <Slider
                    value={sliderPosition}
                    onValueChange={setSliderPosition}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">Expected</span>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

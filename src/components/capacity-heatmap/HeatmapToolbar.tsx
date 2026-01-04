/**
 * Heatmap Toolbar - View toggles, zoom, export controls
 * Catalyst V5 compliant
 */

import { memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, Thermometer, Grid3x3, Play, Pause, Download, 
  FileImage, FileText, FileSpreadsheet, Keyboard,
  ZoomIn, ZoomOut, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useHeatmapStore } from '@/stores/capacity-heatmap-store';
import { exportToPNG, exportToPDF, exportToCSV } from '@/lib/capacity-heatmap/export';
import type { HeatmapResource } from '@/types/capacity-heatmap';
import { CATALYST_COLORS } from '@/types/capacity-heatmap';
import { toast } from 'sonner';

interface HeatmapToolbarProps {
  resources: HeatmapResource[];
  months: Date[];
  heatmapRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export const HeatmapToolbar = memo(function HeatmapToolbar({
  resources,
  months,
  heatmapRef,
  className
}: HeatmapToolbarProps) {
  const {
    viewMode,
    setViewMode,
    patternMode,
    togglePatternMode,
    scenarioMode,
    toggleScenarioMode,
    isTimeLapsePlaying,
    startTimeLapse,
    stopTimeLapse,
    zoomLevel,
    setZoomLevel,
    toggleKeyboardShortcuts,
  } = useHeatmapStore();
  
  const handleExportPNG = async () => {
    if (heatmapRef.current) {
      toast.loading('Exporting PNG...');
      await exportToPNG(heatmapRef.current, `capacity-heatmap-${new Date().toISOString().split('T')[0]}`);
      toast.dismiss();
      toast.success('PNG exported');
    }
  };
  
  const handleExportPDF = async () => {
    if (heatmapRef.current) {
      toast.loading('Exporting PDF...');
      await exportToPDF(heatmapRef.current, `capacity-heatmap-${new Date().toISOString().split('T')[0]}`);
      toast.dismiss();
      toast.success('PDF exported');
    }
  };
  
  const handleExportCSV = () => {
    exportToCSV(resources, months, `capacity-heatmap-${new Date().toISOString().split('T')[0]}`);
    toast.success('CSV exported');
  };
  
  const zoomLevels = [
    { value: 'organization', label: 'Organization', icon: Maximize2 },
    { value: 'department', label: 'Department', icon: Grid3x3 },
    { value: 'team', label: 'Team', icon: Grid3x3 },
    { value: 'individual', label: 'Individual', icon: Minimize2 },
  ] as const;
  
  return (
    <motion.div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg",
        "bg-card border border-border",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Left: View modes */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-2",
                  viewMode === 'standard' && "bg-primary/10 text-primary"
                )}
                onClick={() => setViewMode('standard')}
              >
                <Eye className="w-4 h-4" />
                Standard
              </Button>
            </TooltipTrigger>
            <TooltipContent>Standard view (Press T to toggle)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-2",
                  viewMode === 'thermal' && "bg-primary/10 text-primary"
                )}
                onClick={() => setViewMode('thermal')}
              >
                <Thermometer className="w-4 h-4" />
                Thermal
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thermal heat view (Press T to toggle)</TooltipContent>
          </Tooltip>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 gap-2",
                patternMode && "bg-primary/10 text-primary"
              )}
              onClick={togglePatternMode}
            >
              <Grid3x3 className="w-4 h-4" />
              Pattern
            </Button>
          </TooltipTrigger>
          <TooltipContent>Accessibility patterns (Press P)</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 gap-2",
                scenarioMode && "text-white"
              )}
              style={scenarioMode ? { backgroundColor: CATALYST_COLORS.warning } : undefined}
              onClick={toggleScenarioMode}
            >
              What-If
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scenario planning mode (Press W)</TooltipContent>
        </Tooltip>
        
        <div className="h-6 w-px bg-border" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 gap-2",
                isTimeLapsePlaying && "bg-primary/10 text-primary"
              )}
              onClick={isTimeLapsePlaying ? stopTimeLapse : startTimeLapse}
            >
              {isTimeLapsePlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Time-lapse
            </Button>
          </TooltipTrigger>
          <TooltipContent>Play through months (Press Space)</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Center: Zoom levels */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {zoomLevels.map(({ value, label, icon: Icon }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs",
                  zoomLevel === value && "bg-primary/10 text-primary"
                )}
                onClick={() => setZoomLevel(value)}
              >
                {label}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label} level view</TooltipContent>
          </Tooltip>
        ))}
      </div>
      
      {/* Right: Export and shortcuts */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPNG}>
              <FileImage className="w-4 h-4 mr-2" />
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleKeyboardShortcuts}
            >
              <Keyboard className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
});

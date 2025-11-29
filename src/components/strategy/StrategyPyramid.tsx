import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StrategyPyramidProps {
  onLayerClick: (label: string) => void;
}

export function StrategyPyramid({ onLayerClick }: StrategyPyramidProps) {
  // Pyramid geometry - 6 layers total: 3 full-width + 3 split
  const centerX = 500;
  const topY = 50;
  const bottomY = 700;
  const baseHalfWidth = 450;
  
  // Calculate left and right edge X coordinates at each Y level
  const getXAtY = (y: number) => {
    const progress = (y - topY) / (bottomY - topY);
    const halfWidthAtY = baseHalfWidth * progress;
    return {
      left: centerX - halfWidthAtY,
      right: centerX + halfWidthAtY
    };
  };

  // Define Y coordinates for 6 layers
  const y1 = 50;   // Missions tip
  const y2 = 150;  // Missions base / Visions top
  const y3 = 250;  // Visions base / Values top
  const y4 = 350;  // Values base / Strategic Goals+Themes top
  const y5 = 500;  // Strategic Goals+Themes base / Portfolio Objectives+Epics top
  const y6 = 650;  // Portfolio Objectives+Epics base / Program Objectives+Features top
  const y7 = 700;  // Bottom

  // Get coordinates for each level
  const level1 = getXAtY(y1);
  const level2 = getXAtY(y2);
  const level3 = getXAtY(y3);
  const level4 = getXAtY(y4);
  const level5 = getXAtY(y5);
  const level6 = getXAtY(y6);
  const level7 = getXAtY(y7);

  // Color shades (lighter at top, darker at bottom)
  const colors = {
    missions: 'hsl(210, 100%, 70%)',
    visions: 'hsl(210, 100%, 65%)',
    values: 'hsl(210, 100%, 60%)',
    strategicGoals: 'hsl(210, 100%, 55%)',
    themes: 'hsl(210, 100%, 55%)',
    portfolioObjectives: 'hsl(210, 100%, 50%)',
    epics: 'hsl(210, 100%, 50%)',
    programObjectives: 'hsl(210, 100%, 45%)',
    features: 'hsl(210, 100%, 45%)',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Strategy Pyramid</CardTitle>
            <CardDescription className="text-sm">
              Hierarchical visualization of strategy management. Click any layer to create and edit items at that level.
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-muted-foreground cursor-help mt-1" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-sm">
                <p className="text-xs">
                  Themes, epics, and features are included in the counts when the work item is 
                  parented to a higher level objective or goal and planned for a program increment associated 
                  with the selected strategic snapshot. Misaligned work items are those associated with 
                  objectives or goals in the pyramid, but not planned in an aligned PI.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[700px]">
          <svg viewBox="0 0 1000 750" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Layer 1: Missions (full width) */}
            <path
              d={`M ${centerX} ${y1} L ${level2.left} ${y2} L ${level2.right} ${y2} Z`}
              fill={colors.missions}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Missions")}
            />
            <text x={centerX} y={y1 + 60} textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Missions
            </text>
            <text x={centerX} y={y1 + 78} textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              Why do we exist?
            </text>
            {/* Count on right side */}
            <text x={level2.right + 30} y={(y1 + y2) / 2 + 5} fill="currentColor" fontSize="18" fontWeight="500">
              1
            </text>

            {/* Layer 2: Visions (full width) */}
            <path
              d={`M ${level2.left} ${y2} L ${level2.right} ${y2} L ${level3.right} ${y3} L ${level3.left} ${y3} Z`}
              fill={colors.visions}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Visions")}
            />
            <text x={centerX} y={y2 + 55} textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Visions
            </text>
            <text x={centerX} y={y2 + 73} textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              What value do we provide?
            </text>
            {/* Count on right side */}
            <text x={level3.right + 30} y={(y2 + y3) / 2 + 5} fill="currentColor" fontSize="18" fontWeight="500">
              1
            </text>

            {/* Layer 3: Values (full width) */}
            <path
              d={`M ${level3.left} ${y3} L ${level3.right} ${y3} L ${level4.right} ${y4} L ${level4.left} ${y4} Z`}
              fill={colors.values}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Values")}
            />
            <text x={centerX} y={y3 + 55} textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Values
            </text>
            <text x={centerX} y={y3 + 73} textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              How do we behave?
            </text>
            {/* Count on right side */}
            <text x={level4.right + 30} y={(y3 + y4) / 2 + 5} fill="currentColor" fontSize="18" fontWeight="500">
              4
            </text>

            {/* Layer 4: Strategic Goals (left) and Themes (right) - SPLIT */}
            <path
              d={`M ${level4.left} ${y4} L ${centerX} ${y4} L ${centerX} ${y5} L ${level5.left} ${y5} Z`}
              fill={colors.strategicGoals}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Strategic Goals")}
            />
            <text x={level4.left + 35} y={y4 + 40} fill="white" fontSize="20" fontWeight="700">
              4
            </text>
            <text x={(level4.left + centerX) / 2 + 20} y={y4 + 68} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Strategic Goals
            </text>
            <text x={(level4.left + centerX) / 2 + 20} y={y4 + 88} textAnchor="middle" fill="white" fontSize="10" opacity="0.9">
              How will we succeed this year?
            </text>

            <path
              d={`M ${centerX} ${y4} L ${level4.right} ${y4} L ${level5.right} ${y5} L ${centerX} ${y5} Z`}
              fill={colors.themes}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <text x={level4.right - 35} y={y4 + 40} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              2
            </text>
            <text x={(centerX + level4.right) / 2 - 20} y={y4 + 68} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Themes
            </text>
            <text x={(centerX + level4.right) / 2 - 20} y={y4 + 88} textAnchor="middle" fill="white" fontSize="10" opacity="0.85">
              Misaligned Themes = 2
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y4} x2={centerX} y2={y5} stroke="white" strokeWidth="3" />

            {/* Layer 5: Portfolio Objectives (left) and Epics (right) - SPLIT */}
            <path
              d={`M ${level5.left} ${y5} L ${centerX} ${y5} L ${centerX} ${y6} L ${level6.left} ${y6} Z`}
              fill={colors.portfolioObjectives}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Portfolio Objectives")}
            />
            <text x={level5.left + 40} y={y5 + 45} fill="white" fontSize="20" fontWeight="700">
              9
            </text>
            <text x={(level5.left + centerX) / 2 + 25} y={y5 + 70} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Portfolio Objectives
            </text>

            <path
              d={`M ${centerX} ${y5} L ${level5.right} ${y5} L ${level6.right} ${y6} L ${centerX} ${y6} Z`}
              fill={colors.epics}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <text x={level5.right - 45} y={y5 + 45} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              5
            </text>
            <text x={(centerX + level5.right) / 2 - 20} y={y5 + 70} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Epics
            </text>
            <text x={(centerX + level5.right) / 2 - 20} y={y5 + 88} textAnchor="middle" fill="white" fontSize="10" opacity="0.85">
              Misaligned Epics = 0
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y5} x2={centerX} y2={y6} stroke="white" strokeWidth="3" />

            {/* Layer 6: Program Objectives (left) and Features (right) - SPLIT */}
            <path
              d={`M ${level6.left} ${y6} L ${centerX} ${y6} L ${centerX} ${y7} L ${level7.left} ${y7} Z`}
              fill={colors.programObjectives}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Program Objectives")}
            />
            <text x={level6.left + 55} y={y6 + 30} fill="white" fontSize="20" fontWeight="700">
              113
            </text>
            <text x={(level6.left + centerX) / 2 + 35} y={(y6 + y7) / 2 + 5} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Program Objectives
            </text>

            <path
              d={`M ${centerX} ${y6} L ${level6.right} ${y6} L ${level7.right} ${y7} L ${centerX} ${y7} Z`}
              fill={colors.features}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <text x={level6.right - 60} y={y6 + 30} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              69
            </text>
            <text x={(centerX + level6.right) / 2 - 30} y={(y6 + y7) / 2 - 8} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Features
            </text>
            <text x={(centerX + level6.right) / 2 - 30} y={(y6 + y7) / 2 + 10} textAnchor="middle" fill="white" fontSize="10" opacity="0.85">
              Misaligned Features = 7
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y6} x2={centerX} y2={y7} stroke="white" strokeWidth="3" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

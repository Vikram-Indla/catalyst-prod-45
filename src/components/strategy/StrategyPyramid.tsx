import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { mockStrategyPyramid } from '@/data/strategyMockData';
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
  // Perfect triangle coordinates matching Jira Align official structure
  // 9 layers total: 6 full-width + 3 split layers
  const centerX = 600;
  const topY = 30;
  const bottomY = 870;
  const baseHalfWidth = 500;
  
  // Calculate left and right edge X coordinates at each Y level
  const getXAtY = (y: number) => {
    const progress = (y - topY) / (bottomY - topY);
    const halfWidthAtY = baseHalfWidth * progress;
    return {
      left: centerX - halfWidthAtY,
      right: centerX + halfWidthAtY
    };
  };

  // Define Y coordinates for each layer boundary (9 layers)
  const y1 = 30;   // Missions tip
  const y2 = 120;  // Missions base / Visions top
  const y3 = 210;  // Visions base / Values top
  const y4 = 300;  // Values base / North Stars top
  const y5 = 390;  // North Stars base / Long Term Goals top
  const y6 = 480;  // Long Term Goals base / Long Term Strategies top
  const y7 = 570;  // Long Term Strategies base / Yearly Goals+Themes top
  const y8 = 690;  // Yearly Goals+Themes base / Portfolio Objectives+Epics top
  const y9 = 810;  // Portfolio Objectives+Epics base / Program Objectives+Features top
  const y10 = 870; // Bottom

  // Get coordinates for each level
  const level1 = getXAtY(y1);
  const level2 = getXAtY(y2);
  const level3 = getXAtY(y3);
  const level4 = getXAtY(y4);
  const level5 = getXAtY(y5);
  const level6 = getXAtY(y6);
  const level7 = getXAtY(y7);
  const level8 = getXAtY(y8);
  const level9 = getXAtY(y9);
  const level10 = getXAtY(y10);

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
                  Themes, epics, capabilities, and features are included in the counts when the work item is 
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
        <div className="relative w-full" style={{ paddingBottom: '75%' }}>
          <svg viewBox="0 0 1200 900" className="absolute inset-0 w-full h-full">
            {/* Layer 1: Missions */}
            <path
              d={`M ${centerX} ${y1} L ${level2.left} ${y2} L ${level2.right} ${y2} Z`}
              fill="hsl(217, 91%, 68%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Missions")}
            />
            <text x={centerX} y={y1 + 55} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Missions
            </text>
            <text x={centerX} y={y1 + 70} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              Why do we exist?
            </text>
            <text x={level2.right - 50} y={y2 - 20} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              1
            </text>

            {/* Layer 2: Visions */}
            <path
              d={`M ${level2.left} ${y2} L ${level2.right} ${y2} L ${level3.right} ${y3} L ${level3.left} ${y3} Z`}
              fill="hsl(217, 91%, 63%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Visions")}
            />
            <text x={centerX} y={y2 + 48} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Visions
            </text>
            <text x={centerX} y={y2 + 63} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              What value do we provide?
            </text>
            <text x={level3.right - 50} y={y3 - 20} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              1
            </text>

            {/* Layer 3: Values */}
            <path
              d={`M ${level3.left} ${y3} L ${level3.right} ${y3} L ${level4.right} ${y4} L ${level4.left} ${y4} Z`}
              fill="hsl(217, 91%, 58%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Values")}
            />
            <text x={centerX} y={y3 + 48} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Values
            </text>
            <text x={centerX} y={y3 + 63} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              How do we behave?
            </text>
            <text x={level4.right - 50} y={y4 - 20} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              6
            </text>

            {/* Layer 4: North Stars */}
            <path
              d={`M ${level4.left} ${y4} L ${level4.right} ${y4} L ${level5.right} ${y5} L ${level5.left} ${y5} Z`}
              fill="hsl(217, 91%, 53%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("North Stars")}
            />
            <text x={centerX} y={y4 + 43} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              North Stars
            </text>
            <text x={centerX} y={y4 + 60} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              What is our organization&apos;s single measurable goal?
            </text>
            <text x={level5.right - 50} y={y5 - 20} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              1
            </text>

            {/* Layer 5: Long Term Goals */}
            <path
              d={`M ${level5.left} ${y5} L ${level5.right} ${y5} L ${level6.right} ${y6} L ${level6.left} ${y6} Z`}
              fill="hsl(217, 91%, 48%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Long Term Goals")}
            />
            <text x={centerX} y={y5 + 43} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Long Term Goals
            </text>
            <text x={centerX} y={y5 + 60} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              How will we succeed long-term?
            </text>
            <text x={level6.right - 50} y={y6 - 20} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              3
            </text>

            {/* Layer 6: Long Term Strategies */}
            <path
              d={`M ${level6.left} ${y6} L ${level6.right} ${y6} L ${level7.right} ${y7} L ${level7.left} ${y7} Z`}
              fill="hsl(217, 91%, 43%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Long Term Strategies")}
            />
            <text x={centerX} y={y6 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Long Term Strategies
            </text>
            <text x={centerX} y={y6 + 62} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              What is our approach to long-term success?
            </text>
            <text x={level7.right - 50} y={y7 - 20} textAnchor="end" fill="white" fontSize="20" fontWeight="700">
              8
            </text>

            {/* Layer 7: Yearly Goals (left) and Themes (right) */}
            <path
              d={`M ${level7.left} ${y7} L ${centerX} ${y7} L ${centerX} ${y8} L ${level8.left} ${y8} Z`}
              fill="hsl(217, 91%, 38%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Yearly Goals")}
            />
            <text x={level7.left + 35} y={y7 + 32} fill="white" fontSize="22" fontWeight="700">
              34
            </text>
            <text x={(level7.left + centerX) / 2 + 15} y={y7 + 48} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Yearly Goals
            </text>
            <text x={(level7.left + centerX) / 2 + 15} y={y7 + 65} textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
              How will we succeed this year?
            </text>

            <path
              d={`M ${centerX} ${y7} L ${level7.right} ${y7} L ${level8.right} ${y8} L ${centerX} ${y8} Z`}
              fill="hsl(217, 91%, 38%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <text x={level7.right - 35} y={y7 + 32} textAnchor="end" fill="white" fontSize="22" fontWeight="700">
              32
            </text>
            <text x={(centerX + level7.right) / 2 - 15} y={y7 + 48} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Themes
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y7} x2={centerX} y2={y8} stroke="white" strokeWidth="3" />

            {/* Layer 8: Portfolio Objectives (left) and Epics (right) */}
            <path
              d={`M ${level8.left} ${y8} L ${centerX} ${y8} L ${centerX} ${y9} L ${level9.left} ${y9} Z`}
              fill="hsl(217, 91%, 33%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Portfolio Objectives")}
            />
            <text x={level8.left + 40} y={y8 + 35} fill="white" fontSize="22" fontWeight="700">
              82
            </text>
            <text x={(level8.left + centerX) / 2 + 20} y={y8 + 58} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Portfolio Objectives
            </text>

            <path
              d={`M ${centerX} ${y8} L ${level8.right} ${y8} L ${level9.right} ${y9} L ${centerX} ${y9} Z`}
              fill="hsl(217, 91%, 33%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <text x={level8.right - 45} y={y8 + 35} textAnchor="end" fill="white" fontSize="22" fontWeight="700">
              147
            </text>
            <text x={(centerX + level8.right) / 2 - 20} y={y8 + 58} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Epics
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y8} x2={centerX} y2={y9} stroke="white" strokeWidth="3" />

            {/* Layer 9: Program Objectives (left) and Features (right) */}
            <path
              d={`M ${level9.left} ${y9} L ${centerX} ${y9} L ${centerX} ${y10} L ${level10.left} ${y10} Z`}
              fill="hsl(217, 91%, 28%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Program Objectives")}
            />
            <text x={level9.left + 50} y={(y9 + y10) / 2 - 5} fill="white" fontSize="22" fontWeight="700">
              160
            </text>
            <text x={(level9.left + centerX) / 2 + 30} y={(y9 + y10) / 2 + 8} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Program Objectives
            </text>

            <path
              d={`M ${centerX} ${y9} L ${level9.right} ${y9} L ${level10.right} ${y10} L ${centerX} ${y10} Z`}
              fill="hsl(217, 91%, 28%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <text x={level9.right - 60} y={(y9 + y10) / 2 - 5} textAnchor="end" fill="white" fontSize="22" fontWeight="700">
              513
            </text>
            <text x={(centerX + level9.right) / 2 - 25} y={(y9 + y10) / 2 + 8} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Features
            </text>

            {/* Vertical divider for split layer */}
            <line x1={centerX} y1={y9} x2={centerX} y2={y10} stroke="white" strokeWidth="3" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

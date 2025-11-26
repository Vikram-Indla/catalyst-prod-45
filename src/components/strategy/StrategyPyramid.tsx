import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockStrategyPyramid } from '@/data/strategyMockData';

interface StrategyPyramidProps {
  onLayerClick: (label: string) => void;
}

export function StrategyPyramid({ onLayerClick }: StrategyPyramidProps) {
  // Perfect triangle coordinates
  // Base width: 900, Height: 600
  // Center X: 600, Top Y: 50, Bottom Y: 650
  const centerX = 600;
  const topY = 50;
  const bottomY = 650;
  const baseHalfWidth = 450; // Half of 900
  
  // Calculate left and right edge X coordinates at each Y level
  const getXAtY = (y: number) => {
    const progress = (y - topY) / (bottomY - topY);
    const halfWidthAtY = baseHalfWidth * progress;
    return {
      left: centerX - halfWidthAtY,
      right: centerX + halfWidthAtY
    };
  };

  // Define Y coordinates for each layer boundary
  const y1 = 50;   // Top (Missions tip)
  const y2 = 170;  // Missions base / Visions top
  const y3 = 290;  // Visions base / Values top
  const y4 = 410;  // Values base / Strategic Goals+Themes top
  const y5 = 530;  // Strategic Goals+Themes base / Portfolio+Epics top
  const y6 = 650;  // Portfolio+Epics base / Program+Features top (bottom)

  // Get coordinates for each level
  const level1 = getXAtY(y1);
  const level2 = getXAtY(y2);
  const level3 = getXAtY(y3);
  const level4 = getXAtY(y4);
  const level5 = getXAtY(y5);
  const level6 = getXAtY(y6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Pyramid</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <svg viewBox="0 0 1200 700" className="absolute inset-0 w-full h-full">
            {/* Missions - Top triangle */}
            <path
              d={`M ${centerX} ${y1} L ${level2.left} ${y2} L ${level2.right} ${y2} Z`}
              fill="hsl(217, 71%, 68%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Missions")}
            />
            <text x={centerX} y={y1 + 50} textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Missions
            </text>
            <text x={centerX} y={y1 + 70} textAnchor="middle" fill="white" fontSize="12" opacity="0.95">
              Why do we exist?
            </text>
            <text x={level2.right + 100} y={(y1 + y2) / 2} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="600">
              1
            </text>

            {/* Visions */}
            <path
              d={`M ${level2.left} ${y2} L ${level2.right} ${y2} L ${level3.right} ${y3} L ${level3.left} ${y3} Z`}
              fill="hsl(217, 71%, 63%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Visions")}
            />
            <text x={centerX} y={y2 + 50} textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Visions
            </text>
            <text x={centerX} y={y2 + 70} textAnchor="middle" fill="white" fontSize="12" opacity="0.95">
              What value do we provide?
            </text>
            <text x={level3.right + 100} y={(y2 + y3) / 2} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="600">
              1
            </text>

            {/* Values */}
            <path
              d={`M ${level3.left} ${y3} L ${level3.right} ${y3} L ${level4.right} ${y4} L ${level4.left} ${y4} Z`}
              fill="hsl(217, 71%, 58%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Values")}
            />
            <text x={centerX} y={y3 + 50} textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Values
            </text>
            <text x={centerX} y={y3 + 70} textAnchor="middle" fill="white" fontSize="12" opacity="0.95">
              How do we behave?
            </text>
            <text x={level4.right + 100} y={(y3 + y4) / 2} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="600">
              4
            </text>

            {/* Strategic Goals (left half) */}
            <path
              d={`M ${level4.left} ${y4} L ${centerX} ${y4} L ${centerX} ${y5} L ${level5.left} ${y5} Z`}
              fill="hsl(217, 71%, 53%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Strategic Goals")}
            />
            <text x={level4.left + 40} y={y4 + 45} fill="white" fontSize="26" fontWeight="700">
              4
            </text>
            <text x={(level4.left + centerX) / 2 + 20} y={y4 + 50} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Strategic Goals
            </text>
            <text x={(level4.left + centerX) / 2 + 20} y={y4 + 70} textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              How will we succeed this year?
            </text>

            {/* Themes (right half) */}
            <path
              d={`M ${centerX} ${y4} L ${level4.right} ${y4} L ${level5.right} ${y5} L ${centerX} ${y5} Z`}
              fill="hsl(217, 71%, 53%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <text x={(centerX + level4.right) / 2} y={y4 + 50} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Themes
            </text>
            <text x={(centerX + level4.right) / 2} y={y4 + 70} textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              Misaligned Themes = 2
            </text>
            <text x={level4.right - 40} y={y4 + 45} fill="white" fontSize="26" fontWeight="700">
              2
            </text>

            {/* Portfolio Objectives (left half) */}
            <path
              d={`M ${level5.left} ${y5} L ${centerX} ${y5} L ${centerX} ${y6} L ${level6.left} ${y6} Z`}
              fill="hsl(217, 71%, 48%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Portfolio Objectives")}
            />
            <text x={level5.left + 40} y={y5 + 45} fill="white" fontSize="26" fontWeight="700">
              9
            </text>
            <text x={(level5.left + centerX) / 2 + 20} y={y5 + 50} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Portfolio Objectives
            </text>

            {/* Epics (right half) */}
            <path
              d={`M ${centerX} ${y5} L ${level5.right} ${y5} L ${level6.right} ${y6} L ${centerX} ${y6} Z`}
              fill="hsl(217, 71%, 48%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <text x={(centerX + level5.right) / 2} y={y5 + 45} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Epics
            </text>
            <text x={(centerX + level5.right) / 2} y={y5 + 65} textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              Misaligned Epics = 0
            </text>
            <text x={level5.right - 40} y={y5 + 45} fill="white" fontSize="26" fontWeight="700">
              5
            </text>

            {/* Program Objectives (left half of base) - This completes the bottom left */}
            <path
              d={`M ${level6.left} ${y6} L ${centerX} ${y6} L ${centerX} ${y6 + 50} L ${level6.left + 30} ${y6 + 50} Z`}
              fill="hsl(217, 71%, 43%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Program Objectives")}
            />
            <text x={level6.left + 60} y={y6 + 30} fill="white" fontSize="24" fontWeight="700">
              113
            </text>
            <text x={(level6.left + centerX) / 2 + 40} y={y6 + 35} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Program Objectives
            </text>

            {/* Features (right half of base) - This completes the bottom right */}
            <path
              d={`M ${centerX} ${y6} L ${level6.right} ${y6} L ${level6.right - 30} ${y6 + 50} L ${centerX} ${y6 + 50} Z`}
              fill="hsl(217, 71%, 43%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <text x={(centerX + level6.right) / 2 - 30} y={y6 + 30} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Features
            </text>
            <text x={(centerX + level6.right) / 2 - 30} y={y6 + 45} textAnchor="middle" fill="white" fontSize="10" opacity="0.95">
              Misaligned Features = 7
            </text>
            <text x={level6.right - 60} y={y6 + 30} fill="white" fontSize="24" fontWeight="700">
              69
            </text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

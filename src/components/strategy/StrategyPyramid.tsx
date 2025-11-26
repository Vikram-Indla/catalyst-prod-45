import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockStrategyPyramid } from '@/data/strategyMockData';

interface StrategyPyramidProps {
  onLayerClick: (label: string) => void;
}

export function StrategyPyramid({ onLayerClick }: StrategyPyramidProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Strategy Pyramid</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-[4/3] flex items-center justify-center">
          {/* SVG Pyramid */}
          <svg viewBox="0 0 1000 800" className="w-full h-full">
            {/* Missions - Top */}
            <path
              d="M 500 50 L 350 200 L 650 200 Z"
              fill="hsl(var(--primary) / 0.7)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Missions")}
            />
            <text x="500" y="130" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Missions
            </text>
            <text x="500" y="155" textAnchor="middle" fill="white" fontSize="12">
              Why do we exist?
            </text>
            <text x="920" y="140" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="600">
              1
            </text>

            {/* Visions */}
            <path
              d="M 350 200 L 650 200 L 800 350 L 200 350 Z"
              fill="hsl(var(--primary) / 0.8)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Visions")}
            />
            <text x="500" y="260" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Visions
            </text>
            <text x="500" y="285" textAnchor="middle" fill="white" fontSize="12">
              What value do we provide?
            </text>
            <text x="920" y="285" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="600">
              1
            </text>

            {/* Values */}
            <path
              d="M 200 350 L 800 350 L 900 500 L 100 500 Z"
              fill="hsl(var(--primary) / 0.85)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Values")}
            />
            <text x="500" y="410" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Values
            </text>
            <text x="500" y="435" textAnchor="middle" fill="white" fontSize="12">
              How do we behave?
            </text>
            <text x="920" y="435" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="600">
              4
            </text>

            {/* Strategic Goals & Themes Row */}
            <path
              d="M 100 500 L 500 500 L 550 650 L 50 650 Z"
              fill="hsl(var(--primary))"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Strategic Goals")}
            />
            <text x="150" y="570" fill="white" fontSize="22" fontWeight="700">
              4
            </text>
            <text x="290" y="565" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Strategic Goals
            </text>
            <text x="290" y="585" textAnchor="middle" fill="white" fontSize="11">
              How will we succeed this year?
            </text>

            <path
              d="M 500 500 L 900 500 L 950 650 L 550 650 Z"
              fill="hsl(var(--primary))"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <text x="850" y="570" fill="white" fontSize="22" fontWeight="700">
              2
            </text>
            <text x="700" y="565" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Themes
            </text>
            <text x="700" y="585" textAnchor="middle" fill="white" fontSize="11">
              Misaligned Themes = 2
            </text>

            {/* Portfolio Objectives & Epics Row */}
            <path
              d="M 50 650 L 500 650 L 550 750 L 25 750 Z"
              fill="hsl(var(--primary) / 0.95)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Portfolio Objectives")}
            />
            <text x="120" y="695" fill="white" fontSize="22" fontWeight="700">
              9
            </text>
            <text x="280" y="705" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Portfolio Objectives
            </text>

            <path
              d="M 500 650 L 950 650 L 975 750 L 550 750 Z"
              fill="hsl(var(--primary) / 0.95)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <text x="880" y="695" fill="white" fontSize="22" fontWeight="700">
              5
            </text>
            <text x="710" y="695" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Epics
            </text>
            <text x="710" y="715" textAnchor="middle" fill="white" fontSize="11">
              Misaligned Epics = 0
            </text>

            {/* Program Objectives & Features Row */}
            <path
              d="M 25 750 L 500 750 L 525 800 L 12.5 800 Z"
              fill="hsl(var(--primary) / 1)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Program Objectives")}
            />
            <text x="100" y="775" fill="white" fontSize="20" fontWeight="700">
              113
            </text>
            <text x="280" y="780" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
              Program Objectives
            </text>

            <path
              d="M 500 750 L 975 750 L 987.5 800 L 525 800 Z"
              fill="hsl(var(--primary) / 1)"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <text x="900" y="775" fill="white" fontSize="20" fontWeight="700">
              69
            </text>
            <text x="720" y="770" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
              Features
            </text>
            <text x="720" y="788" textAnchor="middle" fill="white" fontSize="10">
              Misaligned Features = 7
            </text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

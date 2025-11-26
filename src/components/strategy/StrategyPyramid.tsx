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
        <div className="relative w-full aspect-[16/9] flex items-center justify-center">
          {/* SVG Pyramid */}
          <svg viewBox="0 0 1200 700" className="w-full h-full">
            {/* Missions - Top */}
            <path
              d="M 600 50 L 400 180 L 800 180 Z"
              fill="hsl(217, 71%, 65%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Missions")}
            />
            <text x="600" y="110" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Missions
            </text>
            <text x="600" y="135" textAnchor="middle" fill="white" fontSize="13" opacity="0.95">
              Why do we exist?
            </text>
            <text x="1050" y="115" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="600">
              1
            </text>

            {/* Visions */}
            <path
              d="M 400 180 L 800 180 L 950 310 L 250 310 Z"
              fill="hsl(217, 71%, 61%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Visions")}
            />
            <text x="600" y="230" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Visions
            </text>
            <text x="600" y="255" textAnchor="middle" fill="white" fontSize="13" opacity="0.95">
              What value do we provide?
            </text>
            <text x="1050" y="245" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="600">
              1
            </text>

            {/* Values */}
            <path
              d="M 250 310 L 950 310 L 1080 440 L 120 440 Z"
              fill="hsl(217, 71%, 57%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Values")}
            />
            <text x="600" y="360" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Values
            </text>
            <text x="600" y="385" textAnchor="middle" fill="white" fontSize="13" opacity="0.95">
              How do we behave?
            </text>
            <text x="1050" y="375" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="600">
              4
            </text>

            {/* Strategic Goals & Themes Row */}
            <path
              d="M 120 440 L 600 440 L 690 570 L 60 570 Z"
              fill="hsl(217, 71%, 53%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Strategic Goals")}
            />
            <text x="160" y="495" fill="white" fontSize="28" fontWeight="700">
              4
            </text>
            <text x="360" y="495" textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Strategic Goals
            </text>
            <text x="360" y="520" textAnchor="middle" fill="white" fontSize="12" opacity="0.95">
              How will we succeed this year?
            </text>

            {/* Vertical divider */}
            <line x1="600" y1="440" x2="690" y2="570" stroke="white" strokeWidth="3" />

            <path
              d="M 600 440 L 1080 440 L 1140 570 L 690 570 Z"
              fill="hsl(217, 71%, 53%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Themes")}
            />
            <text x="840" y="495" textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Themes
            </text>
            <text x="840" y="520" textAnchor="middle" fill="white" fontSize="12" opacity="0.95">
              Misaligned Themes = 2
            </text>
            <text x="1040" y="495" fill="white" fontSize="28" fontWeight="700">
              2
            </text>

            {/* Portfolio Objectives & Epics Row */}
            <path
              d="M 60 570 L 600 570 L 680 650 L 20 650 Z"
              fill="hsl(217, 71%, 49%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Portfolio Objectives")}
            />
            <text x="100" y="605" fill="white" fontSize="28" fontWeight="700">
              9
            </text>
            <text x="340" y="610" textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Portfolio Objectives
            </text>

            {/* Vertical divider */}
            <line x1="600" y1="570" x2="680" y2="650" stroke="white" strokeWidth="3" />

            <path
              d="M 600 570 L 1140 570 L 1180 650 L 680 650 Z"
              fill="hsl(217, 71%, 49%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Epics")}
            />
            <text x="890" y="605" textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
              Epics
            </text>
            <text x="890" y="630" textAnchor="middle" fill="white" fontSize="12" opacity="0.95">
              Misaligned Epics = 0
            </text>
            <text x="1080" y="605" fill="white" fontSize="28" fontWeight="700">
              5
            </text>

            {/* Program Objectives & Features Row */}
            <path
              d="M 20 650 L 600 650 L 670 700 L 0 700 Z"
              fill="hsl(217, 71%, 45%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Program Objectives")}
            />
            <text x="70" y="675" fill="white" fontSize="26" fontWeight="700">
              113
            </text>
            <text x="330" y="680" textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Program Objectives
            </text>

            {/* Vertical divider */}
            <line x1="600" y1="650" x2="670" y2="700" stroke="white" strokeWidth="3" />

            <path
              d="M 600 650 L 1180 650 L 1200 700 L 670 700 Z"
              fill="hsl(217, 71%, 45%)"
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onLayerClick("Features")}
            />
            <text x="930" y="675" textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
              Features
            </text>
            <text x="930" y="695" textAnchor="middle" fill="white" fontSize="11" opacity="0.95">
              Misaligned Features = 7
            </text>
            <text x="1110" y="675" fill="white" fontSize="26" fontWeight="700">
              69
            </text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

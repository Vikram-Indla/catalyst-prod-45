import { StrategyRoomHeader } from '@/components/strategy/StrategyRoomHeader';
import { StrategyRoomGrid } from '@/components/strategy/StrategyRoomGrid';
import { useStrategyPreferences } from '@/hooks/useStrategyPreferences';

export default function StrategyRoom() {
  const { theme, density, toggleTheme, setDensity } = useStrategyPreferences();

  return (
    <div
      className="strategy-room px-6"
      data-theme={theme}
      data-density={density}
    >
      <StrategyRoomHeader
        theme={theme}
        density={density}
        onToggleTheme={toggleTheme}
        onDensityChange={setDensity}
      />
      <StrategyRoomGrid />
    </div>
  );
}

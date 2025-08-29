export interface ColorSelectorProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  colors?: string[];
  isMobile?: boolean;
  compact?: boolean;
}

export const DEFAULT_COLORS = [
  "#ef444480", // 红色 (50% 透明度)
  "#f9731680", // 橙色 (50% 透明度)
  "#eab30880", // 黄色 (50% 透明度)
  "#22c55e80", // 绿色 (50% 透明度)
  "#06b6d480", // 青色 (50% 透明度)
  "#3b82f680", // 蓝色 (50% 透明度)
  "#a855f780", // 紫色 (50% 透明度)
  "#ec489980", // 粉色 (50% 透明度)
  "#84cc1680", // 青柠 (50% 透明度)
  "#f59e0b80", // 琥珀 (50% 透明度)
  "#10b98180", // 翠绿 (50% 透明度)
  "#8b5cf680", // 靛青 (50% 透明度)
];
export const DEFAULT_COLOR = DEFAULT_COLORS[5];

export function ColorSelector({
  selectedColor,
  onColorChange,
  colors = DEFAULT_COLORS,
  isMobile = false,
  compact = false,
}: ColorSelectorProps) {
  const gridCols = compact ? "grid-cols-4" : "grid-cols-6";
  const size =
    compact && !isMobile ? "h-6 w-6" : isMobile ? "h-8 w-8" : "h-10 w-10";
  const dotSize = compact && !isMobile ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <div className={`grid gap-2 ${gridCols}`}>
      {colors.map(color => (
        <label
          key={color}
          className={`relative flex cursor-pointer items-center justify-center rounded-full ${size}`}
          style={{ backgroundColor: color }}
        >
          <input
            type="radio"
            name="colorSelection"
            value={color}
            checked={color === selectedColor}
            onChange={e => onColorChange(e.target.value)}
            className="sr-only"
          />
          {color === selectedColor && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full">
              <div className={`rounded-full bg-gray-700 ${dotSize}`} />
            </div>
          )}
        </label>
      ))}
    </div>
  );
}

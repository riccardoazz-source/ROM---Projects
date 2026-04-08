interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'gray';
}

const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
const fills = {
  blue:   'bg-gradient-to-r from-rom-700 to-rom-500',
  green:  'bg-gradient-to-r from-emerald-600 to-emerald-400',
  orange: 'bg-gradient-to-r from-orange-600 to-orange-400',
  gray:   'bg-slate-300',
};

export default function ProgressBar({ value, max = 100, showLabel = true, size = 'md', color = 'blue' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex-1 bg-slate-200 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`rounded-full transition-all duration-500 ${heights[size]} ${fills[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-slate-600 w-9 text-right tabular-nums">{pct}%</span>
      )}
    </div>
  );
}

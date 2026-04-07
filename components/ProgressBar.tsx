import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'orange' | 'gray';
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  size = 'md',
  color = 'blue',
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const colors = {
    blue: 'bg-rom-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    gray: 'bg-gray-300',
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('flex-1 bg-gray-200 rounded-full overflow-hidden', heights[size])}>
        <div
          className={clsx('rounded-full transition-all duration-300', heights[size], colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-gray-700 w-9 text-right">{pct}%</span>
      )}
    </div>
  );
}

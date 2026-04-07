import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'gray';
  trend?: number;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-rom-600 text-white',
    label: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-600 text-white',
    label: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-500 text-white',
    label: 'text-orange-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-600 text-white',
    label: 'text-purple-600',
  },
  gray: {
    bg: 'bg-gray-50',
    icon: 'bg-gray-600 text-white',
    label: 'text-gray-600',
  },
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
  trend,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className={clsx('rom-card p-5 flex items-start gap-4', colors.bg)}>
      {Icon && (
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-xs font-semibold uppercase tracking-wider truncate', colors.label)}>
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 mt-1 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={clsx('text-xs font-medium mt-1', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend >= 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
    </div>
  );
}

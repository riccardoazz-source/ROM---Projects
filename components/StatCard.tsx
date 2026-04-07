import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';
import React from 'react';

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
    bg: 'bg-blue-50 border-blue-100',
    iconCls: 'text-white',
    iconStyle: { background: 'linear-gradient(135deg, #1C3D54, #2589A8)' } as React.CSSProperties,
    label: 'text-rom-800',
  },
  green: {
    bg: 'bg-emerald-50 border-emerald-100',
    iconCls: 'bg-emerald-600 text-white',
    iconStyle: undefined as React.CSSProperties | undefined,
    label: 'text-emerald-700',
  },
  orange: {
    bg: 'bg-orange-50 border-orange-100',
    iconCls: 'bg-orange-500 text-white',
    iconStyle: undefined as React.CSSProperties | undefined,
    label: 'text-orange-600',
  },
  purple: {
    bg: 'bg-violet-50 border-violet-100',
    iconCls: 'bg-violet-600 text-white',
    iconStyle: undefined as React.CSSProperties | undefined,
    label: 'text-violet-700',
  },
  gray: {
    bg: 'bg-slate-50 border-slate-200',
    iconCls: 'bg-slate-500 text-white',
    iconStyle: undefined as React.CSSProperties | undefined,
    label: 'text-slate-600',
  },
};

export default function StatCard({ label, value, sub, icon: Icon, color = 'blue', trend }: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className={clsx('rom-card p-5 flex items-start gap-4 border', c.bg)}>
      {Icon && (
        <div
          className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', c.iconCls)}
          style={c.iconStyle}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-[10px] font-bold uppercase tracking-widest truncate', c.label)}>
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 mt-1 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={clsx('text-xs font-medium mt-1', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend >= 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
    </div>
  );
}

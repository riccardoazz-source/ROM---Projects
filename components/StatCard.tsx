import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  accent?: string; // tailwind bg color for icon e.g. 'bg-blue-500'
}

export default function StatCard({ label, value, sub, icon: Icon, accent = '' }: StatCardProps) {
  return (
    <div className="kpi-card">
      {Icon && (
        <div className={`kpi-icon ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 truncate">{label}</p>
        <p className="text-base sm:text-[22px] font-bold text-slate-900 mt-0.5 leading-tight tracking-tight break-all">{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

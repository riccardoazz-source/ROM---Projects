'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Commande } from '@/types';

interface AvancementBarChartProps {
  commandes: Commande[];
  type: 'honoraires' | 'travaux' | 'divers';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        <p className="text-gray-600">{payload[0].payload.lot}</p>
        <p className="font-semibold text-rom-600 mt-1">Avancement : {payload[0].value}%</p>
        <p className="text-gray-500">
          Montant : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(payload[0].payload.montantHT)}
        </p>
      </div>
    );
  }
  return null;
};

export default function AvancementBarChart({ commandes, type }: AvancementBarChartProps) {
  const filtered = commandes.filter((c) => c.type === type);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Aucune commande de ce type
      </div>
    );
  }

  const data = filtered.map((c) => ({
    societe: c.societe,
    avancement: c.pourcentageAvancement,
    lot: c.lot,
    montantHT: c.montantHT,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EDF2F7" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#718096' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="societe"
          tick={{ fontSize: 10, fill: '#4A5568' }}
          axisLine={false}
          tickLine={false}
          width={150}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="avancement" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.avancement === 100 ? '#48BB78' : entry.avancement === 0 ? '#CBD5E0' : '#3182CE'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

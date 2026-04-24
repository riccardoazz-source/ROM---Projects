'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TypesCommandesChartProps {
  honoraires: number;
  travaux: number;
  divers: number;
}

const COLOR_MAP: Record<string, string> = {
  'Honoraires': '#1B3A5C',
  'Travaux': '#ED8936',
  'Divers': '#48BB78',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold text-gray-700">{payload[0].name}</p>
        <p className="text-gray-600 mt-1">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(payload[0].value)}
        </p>
        <p className="text-gray-500">{payload[0].payload.pct}%</p>
      </div>
    );
  }
  return null;
};

export default function TypesCommandesChart({
  honoraires,
  travaux,
  divers,
}: TypesCommandesChartProps) {
  const total = honoraires + travaux + divers;
  const data = [
    { name: 'Honoraires', value: honoraires, pct: total > 0 ? Math.round((honoraires / total) * 100) : 0 },
    { name: 'Travaux', value: travaux, pct: total > 0 ? Math.round((travaux / total) * 100) : 0 },
    { name: 'Divers', value: divers, pct: total > 0 ? Math.round((divers / total) * 100) : 0 },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLOR_MAP[entry.name] ?? '#999'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value) => <span style={{ color: '#4A5568' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

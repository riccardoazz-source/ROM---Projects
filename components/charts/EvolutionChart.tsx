'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { HistoriquePoint } from '@/types';

interface EvolutionChartProps {
  data: HistoriquePoint[];
}

const formatYAxis = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
  return `${value}€`;
};

const FR_MONTH_IDX: Record<string, number> = {
  JAN: 1, FEV: 2, FÉV: 2, MAR: 3, AVR: 4, MAI: 5,
  JUN: 6, JUI: 6, JUL: 7, AOÛ: 8, AOU: 8,
  SEP: 9, OCT: 10, NOV: 11, DEC: 12, DÉC: 12,
};

function labelSortKey(label: string): number {
  if (/^\d{4}\/\d{2}$/.test(label)) {
    const [yyyy, mm] = label.split('/');
    return parseInt(yyyy, 10) * 100 + parseInt(mm, 10);
  }
  if (/^\d{6}$/.test(label)) return parseInt(label, 10);
  const m = label.match(/^([A-ZÀ-Ü]{3})\/(\d{2})$/i);
  if (m) {
    const mm = FR_MONTH_IDX[m[1].toUpperCase()] ?? 0;
    const yy = parseInt(m[2], 10);
    const yyyy = yy < 70 ? 2000 + yy : 1900 + yy;
    return yyyy * 100 + mm;
  }
  return 0;
}

const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function formatLabel(label: string): string {
  if (/^\d{4}\/\d{2}$/.test(label)) {
    const [yyyy, mm] = label.split('/');
    const idx = parseInt(mm, 10) - 1;
    return `${MONTHS_FR[idx] ?? '?'}.${yyyy.slice(2, 4)}`;
  }
  if (/^\d{6}$/.test(label)) {
    const idx = parseInt(label.slice(4, 6), 10) - 1;
    return `${MONTHS_FR[idx] ?? '?'}.${label.slice(2, 4)}`;
  }
  return label;
}

const fmtEur = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-gray-700 mb-2">{formatLabel(label)}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold">{fmtEur(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function EvolutionChart({ data }: EvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
        Aucune donnée historique disponible
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => labelSortKey(a.date) - labelSortKey(b.date));
  const isSinglePoint = sorted.length === 1;

  // Use the most recent commandes total as the budget reference line
  const commandesRef = sorted[sorted.length - 1].montantCommandesHT;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={sorted} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
        <XAxis
          dataKey="date"
          tickFormatter={formatLabel}
          tick={{ fontSize: 11, fill: '#718096' }}
          axisLine={{ stroke: '#E2E8F0' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: '#718096' }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

        {/* Budget ceiling as a dashed reference line — not a data series */}
        <ReferenceLine
          y={commandesRef}
          stroke="#1B3A5C"
          strokeDasharray="6 3"
          strokeWidth={1.5}
          label={{
            value: `Budget ${formatYAxis(commandesRef)}`,
            position: 'insideTopRight',
            fontSize: 10,
            fill: '#1B3A5C',
            dy: -6,
          }}
        />

        {/* Factures cumulées — the only trend line */}
        <Line
          type="monotone"
          dataKey="montantFacturesHT"
          name="Factures HT cumulées"
          stroke="#ED8936"
          strokeWidth={2.5}
          dot={{ r: isSinglePoint ? 6 : 3, fill: '#ED8936' }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

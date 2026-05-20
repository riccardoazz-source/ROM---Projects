'use client';

/**
 * Reusable sortable + Excel-style filterable table headers.
 *
 *   const t = useDataTable(rows, GETTERS);
 *   <Th label="Société" colKey="societe" table={t} />
 *   {t.view.map(...)}
 *
 * Each getter returns the display value used for sorting AND for the
 * checkbox filter list. The filter dropdown is rendered with fixed
 * positioning so it is never clipped by a scrolling table container.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Filter, Search, Check } from 'lucide-react';

type Dir = 'asc' | 'desc';
export type Getter<T> = (r: T) => string | number;

export interface DataTable {
  sort: { key: string; dir: Dir } | null;
  toggleSort: (k: string) => void;
  filters: Record<string, string[]>;
  setFilter: (k: string, sel: string[] | null) => void;
  clearFilters: () => void;
  distinct: Record<string, string[]>;
  activeFilters: number;
}

export function useDataTable<T>(
  rows: T[],
  getters: Record<string, Getter<T>>,
): DataTable & { view: T[] } {
  const [sort, setSort] = useState<{ key: string; dir: Dir } | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const toggleSort = (key: string) =>
    setSort((s) =>
      s && s.key === key
        ? s.dir === 'asc'
          ? { key, dir: 'desc' as Dir }
          : null
        : { key, dir: 'asc' as Dir },
    );

  const setFilter = (key: string, sel: string[] | null) =>
    setFilters((f) => {
      const n = { ...f };
      if (!sel) delete n[key];
      else n[key] = sel;
      return n;
    });

  const clearFilters = () => setFilters({});

  const distinct = useMemo(() => {
    const d: Record<string, string[]> = {};
    for (const key of Object.keys(getters)) {
      const g = getters[key];
      d[key] = Array.from(new Set(rows.map((r) => String(g(r)))))
        .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const view = useMemo(() => {
    let out = rows;
    for (const [k, sel] of Object.entries(filters)) {
      const g = getters[k];
      if (!g) continue;
      const set = new Set(sel);
      out = out.filter((r) => set.has(String(g(r))));
    }
    if (sort && getters[sort.key]) {
      const g = getters[sort.key];
      out = [...out].sort((a, b) => {
        const va = g(a);
        const vb = g(b);
        const c =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb), 'fr', { numeric: true, sensitivity: 'base' });
        return sort.dir === 'asc' ? c : -c;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, sort]);

  return {
    sort, toggleSort, filters, setFilter, clearFilters, distinct,
    activeFilters: Object.keys(filters).length, view,
  };
}

// "DD/MM/YYYY" → "YYYYMMDD" so dates sort chronologically as plain strings.
export function dateKey(d: string): string {
  if (!d || d.length < 10) return '0';
  return d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);
}

function FilterMenu({
  anchor, values, selected, onApply, onClose,
}: {
  anchor: DOMRect;
  values: string[];
  selected: string[] | null;
  onApply: (sel: string[] | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selected ?? values),
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const shown = useMemo(
    () => values.filter((v) => v.toLowerCase().includes(query.toLowerCase())),
    [values, query],
  );
  const allShownChecked = shown.length > 0 && shown.every((v) => checked.has(v));

  const toggle = (v: string) => {
    setChecked((c) => {
      const n = new Set(c);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  };
  const toggleAll = () => {
    setChecked((c) => {
      const n = new Set(c);
      if (allShownChecked) shown.forEach((v) => n.delete(v));
      else shown.forEach((v) => n.add(v));
      return n;
    });
  };

  const apply = () => {
    if (checked.size === 0) { onApply([]); onClose(); return; }
    if (values.every((v) => checked.has(v))) onApply(null);
    else onApply(values.filter((v) => checked.has(v)));
    onClose();
  };

  const top = Math.min(anchor.bottom + 4, window.innerHeight - 340);
  const left = Math.min(anchor.left, window.innerWidth - 256);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, width: 244 }}
      className="z-50 bg-white rounded-lg shadow-xl border border-gray-200 text-gray-700 normal-case tracking-normal font-normal"
    >
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-rom-500"
          />
        </div>
      </div>
      <button
        onClick={toggleAll}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 border-b border-gray-100"
      >
        <span className={`w-4 h-4 rounded border flex items-center justify-center ${allShownChecked ? 'bg-rom-600 border-rom-600' : 'border-gray-300'}`}>
          {allShownChecked && <Check className="w-3 h-3 text-white" />}
        </span>
        (Tout sélectionner)
      </button>
      <div className="max-h-48 overflow-y-auto py-1">
        {shown.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-400">Aucune valeur</p>
        )}
        {shown.map((v) => (
          <button
            key={v}
            onClick={() => toggle(v)}
            className="w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-50 text-left"
          >
            <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${checked.has(v) ? 'bg-rom-600 border-rom-600' : 'border-gray-300'}`}>
              {checked.has(v) && <Check className="w-3 h-3 text-white" />}
            </span>
            <span className="truncate">{v === '' ? '(vide)' : v}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 p-2 border-t border-gray-100">
        <button
          onClick={apply}
          className="flex-1 px-2 py-1.5 text-xs font-semibold bg-rom-600 text-white rounded hover:bg-rom-700"
        >
          Appliquer
        </button>
        <button
          onClick={() => { onApply(null); onClose(); }}
          className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}

export function Th({
  label, colKey, table, align = 'left', className = '',
  sortable = true, filterable = true, style,
}: {
  label: string;
  colKey: string;
  table: DataTable;
  align?: 'left' | 'right';
  className?: string;
  sortable?: boolean;
  filterable?: boolean;
  style?: React.CSSProperties;
}) {
  const [menu, setMenu] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const sorted = table.sort?.key === colKey;
  const filtered = !!table.filters[colKey];

  return (
    <th className={`whitespace-nowrap ${className}`} style={style}>
      <span className={`flex w-full items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <button
          type="button"
          onClick={() => sortable && table.toggleSort(colKey)}
          className={`inline-flex items-center gap-1 ${sortable ? 'cursor-pointer hover:text-white/80' : 'cursor-default'}`}
        >
          {label}
          {sortable && (sorted ? (
            table.sort!.dir === 'asc'
              ? <ChevronUp className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
          ))}
        </button>
        {filterable && (
          <button
            ref={btnRef}
            type="button"
            onClick={() => setMenu(menu ? null : btnRef.current!.getBoundingClientRect())}
            className={`shrink-0 rounded p-0.5 hover:bg-white/15 ${filtered ? 'text-amber-300' : 'text-white/40'}`}
            title="Filtrer"
          >
            <Filter className="w-3.5 h-3.5" fill={filtered ? 'currentColor' : 'none'} />
          </button>
        )}
      </span>
      {menu && filterable && (
        <FilterMenu
          anchor={menu}
          values={table.distinct[colKey] ?? []}
          selected={table.filters[colKey] ?? null}
          onApply={(sel) => table.setFilter(colKey, sel)}
          onClose={() => setMenu(null)}
        />
      )}
    </th>
  );
}

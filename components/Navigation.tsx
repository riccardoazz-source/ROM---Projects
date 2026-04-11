'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, ShoppingBag, Upload, Settings, Menu, X,
} from 'lucide-react';
import clsx from 'clsx';

const navGroups = [
  {
    label: "Vue d'ensemble",
    items: [
      { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Données',
    items: [
      { href: '/factures',  label: 'Factures',  icon: FileText    },
      { href: '/commandes', label: 'Commandes', icon: ShoppingBag },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/upload',     label: 'Importer',   icon: Upload   },
      { href: '/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-40 flex items-center px-4 gap-3 shadow-sm">
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link href="/" onClick={close}>
          <img
            src="/logo-ROM-grand-nouveau-acro.png"
            alt="ROM"
            style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>
      </div>

      {/* ── Backdrop (mobile) ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={close}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={clsx(
        'fixed left-0 top-0 h-full w-60 flex flex-col z-50',
        'bg-white border-r border-slate-200 shadow-sm',
        'transition-transform duration-200 ease-in-out',
        'md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>

        {/* Logo */}
        <Link href="/" onClick={close}
          className="flex items-center justify-center px-5 py-6 border-b border-slate-100">
          <img
            src="/logo-ROM-grand-nouveau-acro.png"
            alt="ROM – Roux Oeuvre Maîtrise"
            style={{ height: '54px', width: 'auto', maxWidth: '180px', objectFit: 'contain' }}
          />
        </Link>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto bg-white">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={close}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                        active
                          ? 'bg-rom-50 text-rom-700 border border-rom-200'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                      )}
                    >
                      <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-rom-600' : 'text-slate-400')} />
                      {label}
                      {active && <span className="ml-auto w-2 h-2 rounded-full bg-rom-500 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white">
          <p className="text-[10px] text-slate-400">Roux Oeuvre Maîtrise — v1.0</p>
        </div>
      </aside>
    </>
  );
}

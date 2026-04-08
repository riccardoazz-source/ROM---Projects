'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ShoppingBag,
  Upload,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

function RomLogo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Building icon — inline SVG */}
      <svg width="26" height="34" viewBox="0 0 26 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Front face */}
        <rect x="0" y="8" width="18" height="26" fill="#7EC8DD" />
        {/* Right face */}
        <polygon points="18,8 26,2 26,28 18,34" fill="#2589A8" />
        {/* Top face */}
        <polygon points="0,8 8,2 26,2 18,8" fill="#4FA8C5" />
        {/* Floor lines on front */}
        <line x1="0" y1="15" x2="18" y2="15" stroke="#1C3D54" strokeWidth="0.8" opacity="0.4" />
        <line x1="0" y1="22" x2="18" y2="22" stroke="#1C3D54" strokeWidth="0.8" opacity="0.4" />
        <line x1="0" y1="29" x2="18" y2="29" stroke="#1C3D54" strokeWidth="0.8" opacity="0.4" />
        {/* Windows on front */}
        <rect x="3" y="11" width="4" height="3" fill="#1C3D54" opacity="0.35" />
        <rect x="11" y="11" width="4" height="3" fill="#1C3D54" opacity="0.35" />
        <rect x="3" y="18" width="4" height="3" fill="#1C3D54" opacity="0.35" />
        <rect x="11" y="18" width="4" height="3" fill="#1C3D54" opacity="0.35" />
      </svg>
      {/* ROM text */}
      <div className="flex flex-col leading-none">
        <span style={{
          fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
          fontWeight: 900,
          fontSize: '18px',
          color: 'white',
          letterSpacing: '4px',
          lineHeight: 1,
        }}>ROM</span>
        <span style={{
          fontFamily: 'Arial, sans-serif',
          fontWeight: 400,
          fontSize: '7.5px',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '1.5px',
          lineHeight: 1,
          marginTop: '3px',
          textTransform: 'uppercase',
        }}>Roux Oeuvre Maîtrise</span>
      </div>
    </div>
  );
}

const navGroups = [
  {
    label: "Vue d'ensemble",
    items: [
      { href: '/',        label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/projets', label: 'Projets',          icon: FolderKanban },
    ],
  },
  {
    label: 'Données',
    items: [
      { href: '/factures',  label: 'Factures',   icon: FileText },
      { href: '/commandes', label: 'Commandes',  icon: ShoppingBag },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/upload',     label: 'Importer',   icon: Upload },
      { href: '/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-50"
      style={{
        background: 'linear-gradient(180deg, #0F2535 0%, #1C3D54 40%, #1C4F6C 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center px-5 py-5 border-b border-white/10">
        <RomLogo />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-white/15 text-white shadow-sm border border-white/10'
                        : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-rom-300' : 'text-white/40')} />
                    {label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rom-400 flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-white/25">Roux Oeuvre Maitrise — v1.0</p>
      </div>
    </aside>
  );
}

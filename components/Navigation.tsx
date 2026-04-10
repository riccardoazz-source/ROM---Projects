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
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Text via HTML — browser renders it natively, always crisp */}
      <span style={{
        color: 'white',
        fontSize: '21px',
        fontWeight: 900,
        letterSpacing: '5px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1,
      }}>ROM</span>

      {/* Vertical separator */}
      <div style={{ width: '2px', height: '30px', background: '#7EC8DD', borderRadius: '1px', flexShrink: 0 }} />

      {/* Building — inline SVG sized for display, not scaled down from a large viewBox */}
      <svg width="22" height="34" viewBox="0 0 22 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="4,0 18,0 22,3 8,3"   fill="#4FA8C5"/>
        <rect x="4"  y="3"  width="18" height="4" fill="#7EC8DD"/>
        <polygon points="3,9 19,9 22,12 6,12"  fill="#4FA8C5"/>
        <rect x="3"  y="12" width="19" height="4" fill="#7EC8DD"/>
        <polygon points="2,18 20,18 22,21 4,21" fill="#4FA8C5"/>
        <rect x="2"  y="21" width="20" height="4" fill="#7EC8DD"/>
        <polygon points="1,27 21,27 22,30 2,30" fill="#4FA8C5"/>
        <rect x="1"  y="30" width="21" height="4" fill="#7EC8DD"/>
        {/* Right shadow face */}
        <polygon points="18,3 22,0 22,34 18,34" fill="rgba(0,0,0,0.28)"/>
      </svg>
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

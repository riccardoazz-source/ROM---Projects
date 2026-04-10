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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* "ROM" — plain HTML text, always crisp on any platform */}
      <span style={{
        color: 'white',
        fontSize: '22px',
        fontWeight: 900,
        letterSpacing: '5px',
        fontFamily: '"Arial Black", "Arial Bold", Gadget, sans-serif',
        lineHeight: 1,
      }}>ROM</span>

      {/* Vertical bar + building: exact paths from logo-white.svg,
          viewBox cropped to just the right-hand graphic portion */}
      <svg
        width="36" height="44"
        viewBox="152 6 60 66"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* separator bar */}
        <rect x="154" y="8"  width="3"  height="64" fill="#7EC8DD" rx="1.5"/>
        {/* floor 5 — top */}
        <polygon points="165,10 196,10 200,14 169,14" fill="#4FA8C5"/>
        <rect    x="165" y="14" width="35" height="6"  fill="#7EC8DD"/>
        {/* floor 4 */}
        <polygon points="163,22 198,22 202,26 167,26" fill="#4FA8C5"/>
        <rect    x="163" y="26" width="39" height="6"  fill="#7EC8DD"/>
        {/* floor 3 */}
        <polygon points="161,34 200,34 204,38 165,38" fill="#4FA8C5"/>
        <rect    x="161" y="38" width="43" height="6"  fill="#7EC8DD"/>
        {/* floor 2 */}
        <polygon points="159,46 202,46 206,50 163,50" fill="#4FA8C5"/>
        <rect    x="159" y="50" width="47" height="6"  fill="#7EC8DD"/>
        {/* floor 1 — base */}
        <polygon points="157,58 204,58 208,62 161,62" fill="#4FA8C5"/>
        <rect    x="157" y="62" width="51" height="6"  fill="#7EC8DD"/>
        {/* right side shadow */}
        <polygon points="196,14 200,10 208,62 204,66" fill="rgba(0,0,0,0.25)"/>
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

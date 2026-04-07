'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Upload,
  Settings,
  ShoppingCart,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/projets', label: 'Projets', icon: FolderOpen },
  { href: '/factures', label: 'Factures', icon: FileText },
  { href: '/commandes', label: 'Commandes', icon: ShoppingCart },
  { href: '/upload', label: 'Importer un rapport', icon: Upload },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-50 shadow-xl"
      style={{ background: 'linear-gradient(180deg, #1C3D54 0%, #1C4F6C 60%, #1C3D54 100%)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 group">
          {/* ROM SVG Logo */}
          <RomLogo />
          <div>
            <p className="text-[10px] text-rom-300 font-light tracking-widest uppercase mt-0.5">
              Roux Oeuvre Maitrise
            </p>
          </div>
        </Link>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-[10px] font-bold text-rom-400 uppercase tracking-widest">Menu principal</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-rom-500/30 text-white border border-rom-500/40 shadow-sm'
                  : 'text-rom-200 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-rom-300' : 'text-rom-400')} />
              {label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rom-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Paramètres */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <Link
          href="/parametres"
          className={clsx(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            pathname === '/parametres'
              ? 'bg-rom-500/30 text-white border border-rom-500/40'
              : 'text-rom-300 hover:bg-white/8 hover:text-white'
          )}
        >
          <Settings className="w-4 h-4 text-rom-400 flex-shrink-0" />
          Paramètres
        </Link>
        <p className="text-[10px] text-rom-500 px-4 mt-3">
          © 2026 ROM — v1.0
        </p>
      </div>
    </aside>
  );
}

function RomLogo() {
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ROM text */}
      <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="22"
        letterSpacing="3" fill="white">ROM</text>
      {/* vertical separator */}
      <rect x="58" y="4" width="2" height="20" fill="#2589A8" rx="1" />
      {/* building floors - isometric stack */}
      <g transform="translate(64, 2)">
        {[0,3,6,9,12,15,18].map((y, i) => (
          <rect key={i} x={i % 2 === 0 ? 0 : 1} y={y} width={14 - i * 0.5} height="2.2"
            fill={i % 2 === 0 ? '#2589A8' : '#1C6A87'} rx="0.5" />
        ))}
      </g>
    </svg>
  );
}

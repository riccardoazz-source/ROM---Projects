'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, FileText, Upload, Building2 } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/projets', label: 'Projets', icon: FolderOpen },
  { href: '/factures', label: 'Recherche Factures', icon: FileText },
  { href: '/upload', label: 'Importer un rapport', icon: Upload },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-rom-600 text-white flex flex-col z-50 shadow-2xl">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-rom-500/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6 text-rom-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">ROM</h1>
            <p className="text-xs text-blue-200 font-light">Roux Oeuvre Maitrise</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-6 space-y-1">
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
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-rom-500/40">
        <p className="text-xs text-blue-300">Suivi Projets v1.0</p>
        <p className="text-xs text-blue-400 mt-0.5">© 2026 ROM</p>
      </div>
    </aside>
  );
}

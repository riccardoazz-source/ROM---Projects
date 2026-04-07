import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'ROM - Suivi Projets',
  description: 'Tableau de bord de suivi des projets ROM - Roux Oeuvre Maitrise',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen bg-slate-50">
        <div className="p-8 max-w-screen-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}

// Inline to avoid separate import cycle
import Sidebar from '@/components/Navigation';

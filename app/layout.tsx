import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'ROM - Suivi Projets',
  description: 'Tableau de bord de suivi des projets ROM - Roux Oeuvre Maitrise',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 ml-64 min-h-screen">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

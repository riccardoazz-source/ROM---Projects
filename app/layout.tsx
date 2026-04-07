import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ROM - Suivi Projets',
  description: 'Tableau de bord de suivi des projets ROM - Roux Oeuvre Maitrise',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}

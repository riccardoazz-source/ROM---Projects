import Navigation from '@/components/Navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-screen-xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

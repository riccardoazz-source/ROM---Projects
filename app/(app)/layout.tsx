import Navigation from '@/components/Navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Navigation />
      <main className="flex-1 md:ml-60 min-h-dvh pt-16 md:pt-0 min-w-0 w-full">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          {children}
        </div>
      </main>

    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';

interface NavSection {
  id: string;
  label: string;
}

export default function ProjetNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const ratios: Record<string, number> = {};

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;

      const obs = new IntersectionObserver(
        ([entry]) => {
          ratios[s.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
          let bestId = '';
          let bestRatio = -1;
          for (const id of Object.keys(ratios)) {
            if (ratios[id] > bestRatio) { bestRatio = ratios[id]; bestId = id; }
          }
          if (bestId) setActive(bestId);
        },
        { threshold: [0, 0.05, 0.2], rootMargin: '-100px 0px -50% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach(o => o.disconnect());
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);

    // Defer measurement by one tick so layout is stable
    setTimeout(() => {
      const barH = barRef.current?.getBoundingClientRect().height ?? 44;
      const isMobile = window.innerWidth < 768;
      const topbarH = isMobile ? 64 : 0;
      const offset = topbarH + barH + 16;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }, 0);

    setTimeout(() => {
      const btn = barRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
      btn?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }, 100);
  };

  return (
    <div
      ref={barRef}
      className="sticky top-16 md:top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm
                 -mx-3 sm:-mx-6 md:-mx-8 mb-8 overflow-x-auto scrollbar-none"
    >
      <div className="flex min-w-max px-1 sm:px-2">
        {sections.map(s => (
          <button
            key={s.id}
            data-id={s.id}
            onClick={() => scrollTo(s.id)}
            className={`px-3 sm:px-4 py-3 text-[11px] sm:text-xs font-semibold whitespace-nowrap
                        border-b-2 transition-all duration-150
                        ${active === s.id
                          ? 'border-rom-600 text-rom-700'
                          : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                        }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

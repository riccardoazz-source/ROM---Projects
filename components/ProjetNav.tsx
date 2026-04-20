'use client';

import { useState, useEffect, useRef } from 'react';

interface NavSection {
  id: string;
  label: string;
}

export default function ProjetNav({ sections, stickyTop = 'top-16 md:top-0' }: { sections: NavSection[]; stickyTop?: string }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const barRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef(false);

  // Scroll listener: whichever section's top is highest but still <= nav bottom = active
  useEffect(() => {
    const onScroll = () => {
      if (manualRef.current) return;
      const navBottom = (barRef.current?.getBoundingClientRect().bottom ?? 100) + 8;
      let current = sections[0]?.id ?? '';
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= navBottom) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    manualRef.current = true;
    const navRect = barRef.current?.getBoundingClientRect();
    const navTopPx = navRect?.top ?? 0;   // actual sticky position from viewport top
    const navH     = navRect?.height ?? 44;
    const y = el.getBoundingClientRect().top + window.pageYOffset - navTopPx - navH - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    const btn = barRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    if (btn) btn.scrollIntoView({ inline: 'center', block: 'nearest' });
    setTimeout(() => { manualRef.current = false; }, 800);
  };

  return (
    <div
      ref={barRef}
      className={`sticky ${stickyTop} z-20 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm
                 -mx-3 sm:-mx-6 md:-mx-8 mb-8 overflow-x-auto scrollbar-none`}
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

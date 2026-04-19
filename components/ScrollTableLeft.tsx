'use client';

import { useRef, useEffect } from 'react';

export default function ScrollTableLeft({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = 0;
  }, []);
  return (
    <div ref={ref} className="overflow-x-auto">
      {children}
    </div>
  );
}

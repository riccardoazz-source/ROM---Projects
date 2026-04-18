'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface CopyShareButtonProps {
  projetId: string;
  projetNom: string;
}

export default function CopyShareButton({ projetId, projetNom }: CopyShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const url = `${window.location.origin}/projet/${projetId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <button
      onClick={copy}
      title={`Copier le lien — ${projetNom}`}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 ${
        copied
          ? 'bg-green-50 border-green-300 text-green-700'
          : 'bg-white border-slate-300 text-slate-600 hover:border-rom-500 hover:text-rom-700'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      <span className="hidden sm:inline">{copied ? 'Lien copié !' : 'Partager'}</span>
    </button>
  );
}

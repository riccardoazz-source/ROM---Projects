'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function BudgetRefreshButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleRefresh = async () => {
    setState('loading');
    setMsg('');
    try {
      const res = await fetch('/api/import-drive');
      const json = await res.json();
      if (json.success) {
        setState('done');
        setMsg('Importation réussie — rechargement…');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setState('error');
        setMsg(json.message || 'Erreur inconnue');
      }
    } catch (e) {
      setState('error');
      setMsg(String(e));
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-orange-700 font-medium">
        Les données budget stockées sont issues d&apos;un ancien import.<br />
        Cliquez pour réimporter depuis Google Drive et récupérer le budget correct.
      </p>
      <button
        onClick={handleRefresh}
        disabled={state === 'loading' || state === 'done'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
                   bg-rom-600 text-white hover:bg-rom-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-150"
      >
        <RefreshCw className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
        {state === 'loading' ? 'Importation en cours…' :
         state === 'done'    ? 'Fait !' :
         'Actualiser depuis Drive'}
      </button>
      {msg && (
        <p className={`text-xs ${state === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}
    </div>
  );
}

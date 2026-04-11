'use client';

import { useState, useEffect } from 'react';
import { Save, ExternalLink, RefreshCw, CheckCircle, AlertCircle, Key, FolderSync, Info, Copy, Link2 } from 'lucide-react';

interface Config {
  googleDriveFolderId: string;
  googleDriveFolderUrl: string;
  googleApiKey: string;
  appName: string;
  lastSync: string | null;
}

export default function ParametresPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; files?: string[]; results?: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      setSyncResult(data);
    } catch {
      setSyncResult({ success: false, message: 'Erreur lors de la synchronisation Google Drive' });
    } finally {
      setSyncing(false);
    }
  };

  const extractFolderId = (url: string) => {
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url;
  };

  if (!config) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-rom-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1 text-sm">Configuration de l'application et de la source des données</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Google Drive */}
        <div className="rom-card overflow-hidden">
          <div className="section-header flex items-center gap-2">
            <FolderSync className="w-4 h-4" />
            Connexion Google Drive
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Comment synchroniser depuis Google Drive ?</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
                  <li>Collez l'URL du dossier Google Drive ci-dessous</li>
                  <li>Obtenez une clé API Google Drive (console.cloud.google.com)</li>
                  <li>Cliquez sur "Lister les fichiers" pour voir les rapports disponibles</li>
                  <li>Importez les rapports PDF depuis la page <a href="/upload" className="underline">Importer</a></li>
                </ol>
              </div>
            </div>

            {/* Drive URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                URL du dossier Google Drive
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.googleDriveFolderUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    const id = extractFolderId(url);
                    setConfig({ ...config, googleDriveFolderUrl: url, googleDriveFolderId: id });
                  }}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rom-500"
                />
                {config.googleDriveFolderUrl && (
                  <a href={config.googleDriveFolderUrl} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                )}
              </div>
              {config.googleDriveFolderId && (
                <p className="text-xs text-gray-400 mt-1">
                  ID détecté : <span className="font-mono text-gray-600">{config.googleDriveFolderId}</span>
                </p>
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                <Key className="w-3.5 h-3.5" /> Clé API Google Drive
              </label>
              <input
                type="password"
                value={config.googleApiKey}
                onChange={(e) => setConfig({ ...config, googleApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rom-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Nécessaire pour lister automatiquement les fichiers. Laissez vide si non disponible.
              </p>
            </div>

            {/* Sync button */}
            <button
              onClick={handleSync}
              disabled={syncing || !config.googleDriveFolderId}
              className="flex items-center gap-2 px-4 py-2.5 bg-rom-700 hover:bg-rom-800 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation en cours...' : 'Synchroniser depuis Google Drive'}
            </button>

            {syncResult && (
              <div className={`rounded-xl p-4 ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex gap-2 mb-2">
                  {syncResult.success
                    ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  <p className={`text-sm font-semibold ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.message}
                  </p>
                </div>
                {syncResult.results && syncResult.results.length > 0 && (
                  <ul className="text-xs space-y-1 ml-6 mt-2">
                    {syncResult.results.map((r, i) => (
                      <li key={i} className={`flex items-center gap-1 ${r.includes('] OK') ? 'text-green-700' : 'text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${r.includes('] OK') ? 'bg-green-500' : 'bg-red-400'}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {config.lastSync && (
              <p className="text-xs text-gray-400">
                Dernière synchronisation : {new Date(config.lastSync).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>

        {/* Liens de partage */}
        <div className="rom-card overflow-hidden">
          <div className="section-header flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Liens de partage des projets
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Chaque projet possède un lien unique et sécurisé pour partager les données avec des tiers.
              Ce lien donne accès uniquement aux données de ce projet (lecture seule, sans navigation).
            </p>
            <ShareLinksTable />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #1C3D54, #1C4F6C)' }}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Sauvegarde...' : 'Enregistrer les paramètres'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Paramètres sauvegardés
            </span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function ShareLinksTable() {
  const [projets, setProjets] = useState<{ id: string; nom: string; client: string; shareToken: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projets').then(r => r.json()).then((data) => {
      setProjets(data.map((p: any) => ({ id: p.id, nom: p.nom, client: p.client, shareToken: p.shareToken })));
    });
  }, []);

  const getShareUrl = (token: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/partage/${token}`;
    }
    return `/partage/${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getShareUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-2">
      {projets.map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{p.nom}</p>
            <p className="text-xs text-gray-400 font-mono truncate">/partage/{p.shareToken}</p>
          </div>
          <a href={`/partage/${p.shareToken}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-rom-600 hover:underline flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => copyLink(p.shareToken)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${copied === p.shareToken ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-600 hover:border-rom-400 hover:text-rom-700'}`}
          >
            {copied === p.shareToken ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === p.shareToken ? 'Copié !' : 'Copier'}
          </button>
        </div>
      ))}
    </div>
  );
}

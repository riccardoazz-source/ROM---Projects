'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Info } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  projetId?: string;
  projetNom?: string;
  mois?: string;
}

const PROJETS = [
  { id: '11-havre-sight-capital', nom: '11 HAVRE - SIGHT CAPITAL' },
  { id: '30frank-namsong', nom: '30FRANK - NAMSONG' },
  { id: '35abond-left-bank', nom: '35ABOND - LEFT BANK' },
  { id: 'plai-sight-capital', nom: 'PLAI - SIGHT CAPITAL' },
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [projetId, setProjetId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [history, setHistory] = useState<Array<{ date: string; file: string; projet: string; status: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      setResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !projetId) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projetId', projetId);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        const projet = PROJETS.find((p) => p.id === projetId);
        setHistory((h) => [
          {
            date: new Date().toLocaleDateString('fr-FR'),
            file: file.name,
            projet: projet?.nom ?? projetId,
            status: 'Importé',
          },
          ...h,
        ]);
        setFile(null);
        setProjetId('');
      }
    } catch {
      setResult({ success: false, message: "Erreur lors de l'envoi du fichier." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Importer un rapport</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Importez un nouveau Bordereau de transmission pour mettre à jour les données d'un projet
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Comment importer un rapport ?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Sélectionnez le projet correspondant au rapport</li>
              <li>Déposez ou sélectionnez le fichier PDF du rapport</li>
              <li>Cliquez sur "Importer le rapport"</li>
            </ol>
            <p className="mt-2 text-blue-600 text-xs">
              Le rapport le plus récent est automatiquement utilisé comme référence. L'historique des rapports précédents est conservé.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rom-card p-6 space-y-6">
          {/* Projet selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Projet <span className="text-red-500">*</span>
            </label>
            <select
              value={projetId}
              onChange={(e) => setProjetId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rom-500"
            >
              <option value="">— Sélectionnez un projet —</option>
              {PROJETS.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fichier PDF <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? 'border-rom-500 bg-blue-50'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-rom-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600">
                    Glissez-déposez votre PDF ici
                  </p>
                  <p className="text-xs text-gray-400 mt-1">ou cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-gray-400 mt-2">Format accepté : PDF uniquement</p>
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 flex gap-3 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success
                ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'Import réussi' : 'Erreur'}
                </p>
                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
                {result.success && result.projetId && (
                  <a href={`/projet/${result.projetId}`} className="text-sm text-green-700 underline mt-1 block">
                    Voir le projet →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleUpload}
            disabled={!file || !projetId || uploading}
            className="w-full bg-rom-600 hover:bg-rom-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importer le rapport
              </>
            )}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="rom-card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Imports récents</h2>
            </div>
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fichier</th>
                  <th>Projet</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="text-gray-500 text-xs">{h.date}</td>
                    <td className="font-medium text-sm">{h.file}</td>
                    <td>{h.projet}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

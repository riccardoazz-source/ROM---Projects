'use client';

import { useState, useRef, useCallback } from 'react';
import { FolderOpen, FileText, Upload, CheckCircle, AlertCircle, X, RefreshCw, Info, FolderSync } from 'lucide-react';

interface DetectedFile {
  file: File;
  relativePath: string;
  detectedProjet: string;
  assignedProjetId: string;
  date: string; mois: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  message?: string;
}
interface KnownProjet { id: string; nom: string; client: string; }

const MONTHS: Record<string,string> = {
  janvier:'Janvier',février:'Février',fevrier:'Février',mars:'Mars',avril:'Avril',
  mai:'Mai',juin:'Juin',juillet:'Juillet',août:'Août',aout:'Août',
  septembre:'Septembre',octobre:'Octobre',novembre:'Novembre',décembre:'Décembre',decembre:'Décembre',
};

function extractDate(filename: string) {
  const m = filename.match(/^(\d{8})/);
  const date = m ? m[1] : new Date().toISOString().slice(0,10).replace(/-/g,'');
  const yr = date.slice(0,4);
  const mo = parseInt(date.slice(4,6),10);
  const mths = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const nl = filename.toLowerCase();
  for (const [k,v] of Object.entries(MONTHS)) { if (nl.includes(k)) return { date, mois: `${v} ${yr}` }; }
  return { date, mois: mo>=1&&mo<=12 ? `${mths[mo-1]} ${yr}` : `Rapport ${date}` };
}

function guessId(folder: string, ps: KnownProjet[]): string {
  const l = folder.toLowerCase();
  for (const p of ps) { if (l.includes(p.nom.toLowerCase())) return p.id; }
  for (const p of ps) { if (l.includes(p.client.toLowerCase())) return p.id; }
  const w = folder.split(/[\s\-_]/)[0];
  for (const p of ps) { if (p.nom.startsWith(w)) return p.id; }
  // No match → use folder name as ID (will auto-create on import)
  return folder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function UploadPage() {
  const [files, setFiles] = useState<DetectedFile[]>([]);
  const [projets, setProjets] = useState<KnownProjet[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const multiRef  = useRef<HTMLInputElement>(null);

  const getProjets = useCallback(async () => {
    if (projets.length > 0) return projets;
    const ps: KnownProjet[] = await fetch('/api/projets').then(r => r.json());
    setProjets(ps); return ps;
  }, [projets]);

  const processFiles = useCallback(async (list: FileList | File[]) => {
    const ps = await getProjets();
    const pdfs = Array.from(list).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) return;

    // Extract project name from filename: "YYYYMMDD - ProjectName - Bordereau ..."
    function fromFilename(name: string): string {
      const afterDate = name.replace(/^\d{8}\s*-\s*/, '');
      return afterDate.split(/\s*-\s*(bordereau|rapport|suivi)/i)[0].trim()
        || afterDate.split(' - ')[0].trim();
    }

    const detected: DetectedFile[] = pdfs.map(f => {
      const rel = (f as any).webkitRelativePath as string || f.name;
      const parts = rel.split('/');
      const folder = parts.length > 1 ? parts[0] : fromFilename(f.name);
      const { date, mois } = extractDate(f.name);
      return { file: f, relativePath: rel, detectedProjet: folder, assignedProjetId: guessId(folder, ps), date, mois, status: 'pending' };
    });

    // If all files map to the same project ID (flat folder, no per-project subfolders),
    // switch to filename-based detection so each PDF gets its own project
    const uniqueIds = new Set(detected.map(d => d.assignedProjetId));
    if (detected.length > 1 && uniqueIds.size === 1) {
      for (const df of detected) {
        const proj = fromFilename(df.file.name);
        if (proj) { df.detectedProjet = proj; df.assignedProjetId = guessId(proj, ps); }
      }
    }

    detected.sort((a,b) => a.date.localeCompare(b.date));
    // Keep only the latest report per project (highest YYYYMMDD date)
    const latestByProject = new Map<string, DetectedFile>();
    for (const df of detected) {
      const existing = latestByProject.get(df.assignedProjetId);
      if (!existing || df.date > existing.date) {
        latestByProject.set(df.assignedProjetId, df);
      }
    }
    const onlyLatest = Array.from(latestByProject.values());
    setFiles(prev => [...prev, ...onlyLatest]);
  }, [getProjets]);

  function readDir(dir: FileSystemDirectoryEntry, out: File[], done: () => void) {
    dir.createReader().readEntries(entries => {
      let n = entries.length;
      if (!n) { done(); return; }
      for (const e of entries) {
        if (e.isDirectory) readDir(e as FileSystemDirectoryEntry, out, () => { if (!--n) done(); });
        else if (e.name.toLowerCase().endsWith('.pdf')) (e as FileSystemFileEntry).file(f => { out.push(f); if (!--n) done(); });
        else if (!--n) done();
      }
    });
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const items = Array.from(e.dataTransfer.items);
    const out: File[] = []; let n = items.length;
    if (!n) return;
    for (const item of items) {
      if (item.kind !== 'file') { if (!--n) processFiles(out); continue; }
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) readDir(entry as FileSystemDirectoryEntry, out, () => { if (!--n) processFiles(out); });
      else { const f = item.getAsFile(); if (f) out.push(f); if (!--n) processFiles(out); }
    }
  };

  const importAll = async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (!pending.length) return;
    setImporting(true);
    for (const df of pending) {
      setFiles(p => p.map(f => f===df ? {...f, status:'uploading'} : f));
      try {
        const form = new FormData(); form.append('file', df.file); form.append('projetId', df.assignedProjetId); form.append('folderName', df.detectedProjet);
        const data = await fetch('/api/upload', { method:'POST', body:form }).then(r => r.json());
        setFiles(p => p.map(f => f===df ? {...f, status: data.success?'done':'error', message: data.message} : f));
      } catch {
        setFiles(p => p.map(f => f===df ? {...f, status:'error', message:'Erreur réseau'} : f));
      }
    }
    setImporting(false);
  };

  const pendingCount = files.filter(f => f.status==='pending').length;
  const doneCount    = files.filter(f => f.status==='done').length;
  const errorCount   = files.filter(f => f.status==='error').length;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Importer des rapports</h1>
        <p className="text-slate-500 mt-1 text-sm">Importez un dossier entier ou plusieurs PDFs — les projets sont détectés automatiquement depuis les noms de fichiers</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-bold mb-2">Comment importer depuis Google Drive ?</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700 text-[13px]">
            <li>Installez <strong>Google Drive pour le bureau</strong> — le dossier apparaît comme un lecteur local</li>
            <li>Cliquez <strong>"Sélectionner un dossier"</strong> → naviguez vers <code className="bg-blue-100 px-1 rounded font-mono">Google Drive (G:) → Suivi - ROM</code></li>
            <li>L'app détecte chaque sous-dossier comme un projet (ex: <em>11 HAVRE - SIGHT CAPITAL</em>)</li>
            <li>Vérifiez les assignations automatiques, ajustez si besoin, puis cliquez <strong>"Importer tout"</strong></li>
          </ol>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
        onDragLeave={()=>setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${isDragging ? 'border-rom-500 bg-blue-50' : 'border-slate-300 hover:border-rom-400 hover:bg-slate-50/60'}`}
      >
        <FolderSync className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-rom-500' : 'text-slate-300'}`} />
        <p className="text-base font-semibold text-slate-700 mb-1">Glissez-déposez votre dossier ici</p>
        <p className="text-sm text-slate-400 mb-6">ou choisissez une option ci-dessous</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <input ref={folderRef} type="file" {...{'webkitdirectory':''}} multiple onChange={e=>e.target.files&&processFiles(e.target.files)} className="hidden" />
          <button onClick={()=>folderRef.current?.click()} className="btn-primary">
            <FolderOpen className="w-4 h-4" /> Sélectionner un dossier
          </button>
          <input ref={multiRef} type="file" multiple accept=".pdf" onChange={e=>e.target.files&&processFiles(e.target.files)} className="hidden" />
          <button onClick={()=>multiRef.current?.click()} className="btn-secondary">
            <FileText className="w-4 h-4" /> Sélectionner des PDFs
          </button>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="card overflow-hidden">
          <div className="section-header flex items-center justify-between">
            <span>
              {files.length} fichier{files.length>1?'s':''} détecté{files.length>1?'s':''}
              {doneCount>0&&<span className="ml-3 text-emerald-300">✓ {doneCount} importé{doneCount>1?'s':''}</span>}
              {errorCount>0&&<span className="ml-3 text-red-300">✗ {errorCount} erreur{errorCount>1?'s':''}</span>}
            </span>
            {doneCount>0&&<button onClick={()=>setFiles(p=>p.filter(f=>f.status!=='done'))} className="text-xs text-white/60 hover:text-white underline">Masquer importés</button>}
          </div>
          <div className="divide-y divide-slate-100">
            {files.map((df, idx) => (
              <div key={idx} className={`px-5 py-3 flex items-center gap-4 text-sm ${df.status==='done'?'bg-emerald-50/50':df.status==='error'?'bg-red-50/50':df.status==='uploading'?'bg-blue-50/50':''}`}>
                <div className="w-5 flex-shrink-0">
                  {df.status==='done'      && <CheckCircle className="w-4 h-4 text-emerald-500"/>}
                  {df.status==='error'     && <AlertCircle className="w-4 h-4 text-red-500"/>}
                  {df.status==='uploading' && <RefreshCw   className="w-4 h-4 text-blue-500 animate-spin"/>}
                  {df.status==='pending'   && <FileText    className="w-4 h-4 text-slate-300"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate text-[13px]">{df.file.name}</p>
                  {df.message && <p className={`text-xs mt-0.5 ${df.status==='error'?'text-red-600':'text-emerald-600'}`}>{df.message}</p>}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap font-medium">{df.mois}</span>
                {df.status==='pending'
                  ? <select value={df.assignedProjetId} onChange={e=>setFiles(p=>p.map((f,i)=>i===idx?{...f,assignedProjetId:e.target.value}:f))} className="select text-xs py-1.5 px-2.5 min-w-[180px]">
                      {projets.map(p=><option key={p.id} value={p.id}>{p.nom} — {p.client}</option>)}
                    </select>
                  : <span className="text-xs text-slate-400 min-w-[180px] truncate">{projets.find(p=>p.id===df.assignedProjetId)?.nom??df.assignedProjetId}</span>
                }
                {df.status==='pending'&&<button onClick={()=>setFiles(p=>p.filter((_,i)=>i!==idx))} className="text-slate-300 hover:text-red-400"><X className="w-4 h-4"/></button>}
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {pendingCount>0 ? <>{pendingCount} fichier{pendingCount>1?'s':''} en attente</> : <span className="text-emerald-600 font-semibold">Tous les fichiers ont été traités ✓</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={()=>setFiles([])} className="btn-secondary text-xs py-2">Tout effacer</button>
              <button onClick={importAll} disabled={importing||pendingCount===0} className="btn-primary text-xs py-2 disabled:opacity-40">
                {importing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Import en cours…</> : <><Upload className="w-3.5 h-3.5"/>Importer tout ({pendingCount})</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {files.length===0&&(
        <div className="card p-10 text-center">
          <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm font-medium">Aucun fichier sélectionné</p>
          <p className="text-slate-300 text-xs mt-1">Glissez un dossier ou cliquez sur "Sélectionner un dossier"</p>
        </div>
      )}
    </div>
  );
}

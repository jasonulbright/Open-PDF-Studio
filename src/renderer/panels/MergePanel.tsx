import React, { useState, useCallback } from 'react';
import { useActiveFile } from '../hooks/useActiveFile';
import { useEngine } from '../hooks/useEngine';
import { NoFileOpen } from '../components/NoFileOpen';
import { MergeWorkspace } from '../components/MergeWorkspace';
import { StatusBar } from '../components/StatusBar';

export function MergePanel(): React.ReactElement {
  const { allFiles, openNewFiles } = useActiveFile();
  const { call, saveFile } = useEngine();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleMerge = useCallback(async (_pages: { filePath: string; page: number }[]) => {
    const output = await saveFile('merged.pdf');
    if (!output) return;
    setBusy(true); setStatus('Merging...');
    try {
      // Merge the open files in their current order.
      const r = await call('merge', {
        files: allFiles.map((f) => f.workingPath),
        output,
      });
      setStatus(`Merged ${r.pages} pages (${(r.size_bytes / 1024).toFixed(1)} KB)`);
    } catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }, [allFiles, call, saveFile]);

  if (allFiles.length === 0) {
    return <NoFileOpen onOpen={openNewFiles} message="Open two or more PDFs to merge" />;
  }

  if (allFiles.length === 1) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm text-neutral-400">
          One file open: <span className="text-neutral-200">{allFiles[0].name}</span> ({allFiles[0].pageCount} pages)
        </div>
        <p className="text-sm text-neutral-500">Open at least one more PDF to merge.</p>
        <button onClick={openNewFiles} className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium">Add More PDFs</button>
        <StatusBar message={status} busy={busy} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={openNewFiles} disabled={busy} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium">Add More PDFs</button>
      </div>
      <div className="flex-1 min-h-0">
        <MergeWorkspace files={allFiles} onMerge={handleMerge} />
      </div>
      <StatusBar message={status} busy={busy} />
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { useActiveFile } from '../hooks/useActiveFile';
import { useEngine } from '../hooks/useEngine';
import { NoFileOpen } from '../components/NoFileOpen';
import { StatusBar } from '../components/StatusBar';

export function SplitPanel(): React.ReactElement {
  const { activeFile, openNewFiles } = useActiveFile();
  const { call, saveFile } = useEngine();
  const [ranges, setRanges] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSplit = useCallback(async () => {
    if (!activeFile || !ranges.trim()) { setStatus('Enter page ranges.'); return; }
    const output = await saveFile(`split_${ranges.replace(/,/g, '_')}.pdf`);
    if (!output) return;
    setBusy(true); setStatus('Splitting...');
    try {
      const r = await call('split', { file: activeFile.workingPath, ranges, output_dir: output.replace(/[^\\/]+$/, '') });
      setStatus(`Extracted ${r.pages_extracted} pages`);
    } catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }, [activeFile, ranges, call, saveFile]);

  if (!activeFile) return <NoFileOpen onOpen={openNewFiles} message="Open a PDF to split" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-neutral-400">Working on: <span className="text-neutral-200">{activeFile.name}</span> ({activeFile.pageCount} pages)</div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Page ranges (e.g. 1-5,10-15)</label>
        <input type="text" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-5,10-15"
          className="w-64 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <button onClick={handleSplit} disabled={busy || !ranges.trim()} className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium">
        {busy ? 'Splitting...' : 'Split'}
      </button>
      <StatusBar message={status} busy={busy} />
    </div>
  );
}

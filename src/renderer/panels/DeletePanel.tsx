import React, { useState, useCallback } from 'react';
import { useActiveFile } from '../hooks/useActiveFile';
import { useEngine } from '../hooks/useEngine';
import { file } from '../lib/tauri-bridge';
import { NoFileOpen } from '../components/NoFileOpen';
import { StatusBar } from '../components/StatusBar';

export function DeletePanel(): React.ReactElement {
  const { activeFile, openNewFiles, dispatch } = useActiveFile();
  const { call } = useEngine();
  const [pageInput, setPageInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!activeFile || !pageInput.trim()) { setStatus('Enter page numbers.'); return; }
    const pages = pageInput.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    setBusy(true); setStatus('Deleting pages...');
    try {
      const snapshotPath = await file.snapshot(activeFile.workingPath);
      await call('delete', { file: activeFile.workingPath, pages, output: activeFile.workingPath });
      const buffer = await file.readBuffer(activeFile.workingPath);
      const info = await call('get_page_count', { file: activeFile.workingPath });
      dispatch({ type: 'UPDATE_FILE', path: activeFile.path, pageCount: info.pages, buffer, snapshotPath });
      setStatus(`Deleted ${pages.length} pages, ${info.pages} remaining`);
    } catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }, [activeFile, pageInput, call, dispatch]);

  if (!activeFile) return <NoFileOpen onOpen={openNewFiles} message="Open a PDF to delete pages" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-neutral-400">Working on: <span className="text-neutral-200">{activeFile.name}</span> ({activeFile.pageCount} pages)</div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Pages to delete (e.g. 2,4,6)</label>
        <input type="text" value={pageInput} onChange={(e) => setPageInput(e.target.value)} placeholder="2,4,6"
          className="w-64 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <button onClick={handleDelete} disabled={busy || !pageInput.trim()} className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium">
        {busy ? 'Deleting...' : 'Delete Pages'}
      </button>
      <StatusBar message={status} busy={busy} />
    </div>
  );
}

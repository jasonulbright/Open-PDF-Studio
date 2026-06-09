import React, { useState, useCallback, useEffect } from 'react';
import { useActiveFile } from '../hooks/useActiveFile';
import { useEngine } from '../hooks/useEngine';
import { NoFileOpen } from '../components/NoFileOpen';
import { StatusBar } from '../components/StatusBar';

export function ExtractTextPanel({ initialPage, onConsumeInitialPage }: { initialPage?: number | null; onConsumeInitialPage?: () => void } = {}): React.ReactElement {
  const { activeFile, openNewFiles } = useActiveFile();
  const { call } = useEngine();
  const [pageInput, setPageInput] = useState('all');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExtract = useCallback(async () => {
    if (!activeFile) return;
    const pages = pageInput.trim().toLowerCase() === 'all' ? 'all' : pageInput.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    setBusy(true); setStatus('Extracting text...');
    try {
      const r = await call('extract_text', { file: activeFile.workingPath, pages });
      setText(r.text);
      setStatus(`Extracted ${r.length} characters from ${r.pages_extracted} pages`);
    } catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }, [activeFile, pageInput, call]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setStatus('Copied to clipboard');
  }, [text]);

  // Auto-extract when triggered from Pages right-click
  useEffect(() => {
    if (initialPage && activeFile && !busy) {
      setPageInput(String(initialPage));
      onConsumeInitialPage?.();
      // Auto-run extraction
      const pages = [initialPage];
      setBusy(true); setStatus('Extracting text...');
      call('extract_text', { file: activeFile.workingPath, pages }).then((r) => {
        setText(r.text);
        setStatus(`Extracted ${r.length} characters from page ${initialPage}`);
      }).catch((e: unknown) => setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)).finally(() => setBusy(false));
    }
  }, [initialPage]);

  if (!activeFile) return <NoFileOpen onOpen={openNewFiles} message="Open a PDF to extract text" />;

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="text-sm text-neutral-400">Working on: <span className="text-neutral-200">{activeFile.name}</span></div>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Pages (e.g. 1,3 or all)</label>
          <input type="text" value={pageInput} onChange={(e) => setPageInput(e.target.value)}
            className="w-48 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <button onClick={handleExtract} disabled={busy} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium">
          {busy ? 'Extracting...' : 'Extract'}
        </button>
        {text && <button onClick={handleCopy} className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm font-medium">Copy</button>}
      </div>
      {text && (
        <textarea readOnly value={text} className="flex-1 min-h-[200px] px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm font-mono text-neutral-300 resize-none focus:outline-none" />
      )}
      <StatusBar message={status} busy={busy} />
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { useActiveFile } from '../hooks/useActiveFile';
import { useEngine } from '../hooks/useEngine';
import { NoFileOpen } from '../components/NoFileOpen';
import { StatusBar } from '../components/StatusBar';

export function OptimizePanel(): React.ReactElement {
  const { activeFile, openNewFiles } = useActiveFile();
  const { call, saveFile } = useEngine();
  const [linearize, setLinearize] = useState(true);
  const [stripMeta, setStripMeta] = useState(false);
  const [compressStreams, setCompressStreams] = useState(true);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleOptimize = useCallback(async () => {
    if (!activeFile) return;
    const output = await saveFile('optimized.pdf');
    if (!output) return;
    setBusy(true); setStatus('Optimizing...');
    try {
      const r = await call('optimize', {
        file: activeFile.workingPath, output,
        linearize, strip_metadata: stripMeta, compress_streams: compressStreams,
      });
      const orig = (r.original_size / 1024).toFixed(0);
      const out = (r.output_size / 1024).toFixed(0);
      const ratio = ((1 - r.output_size / r.original_size) * 100).toFixed(1);
      setStatus(`${orig} KB \u2192 ${out} KB (${ratio}% reduction)`);
    } catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }, [activeFile, linearize, stripMeta, compressStreams, call, saveFile]);

  if (!activeFile) return <NoFileOpen onOpen={openNewFiles} message="Open a PDF to optimize" />;

  const checks = [
    { label: 'Linearize (web-optimize)', checked: linearize, set: setLinearize, hint: 'Enables progressive loading in web browsers' },
    { label: 'Strip metadata', checked: stripMeta, set: setStripMeta, hint: 'Removes author, title, timestamps, and other document info' },
    { label: 'Compress object streams', checked: compressStreams, set: setCompressStreams, hint: 'Reduces file size by compressing internal structures' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-neutral-400">Working on: <span className="text-neutral-200">{activeFile.name}</span> ({activeFile.pageCount} pages)</div>
      <div className="flex flex-col gap-2">
        {checks.map((c) => (
          <label key={c.label} className="flex items-start gap-2 cursor-pointer group">
            <input type="checkbox" checked={c.checked} onChange={(e) => c.set(e.target.checked)}
              className="mt-0.5 accent-blue-600" />
            <div>
              <span className="text-sm text-neutral-300 group-hover:text-neutral-200">{c.label}</span>
              <p className="text-xs text-neutral-500">{c.hint}</p>
            </div>
          </label>
        ))}
      </div>
      <button onClick={handleOptimize} disabled={busy || (!linearize && !stripMeta && !compressStreams)}
        className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium">
        {busy ? 'Optimizing...' : 'Optimize'}
      </button>
      <StatusBar message={status} busy={busy} />
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { useActiveFile } from '../hooks/useActiveFile';
import { useEngine } from '../hooks/useEngine';
import { NoFileOpen } from '../components/NoFileOpen';
import { StatusBar } from '../components/StatusBar';

export function DecryptPanel(): React.ReactElement {
  const { activeFile, openNewFiles } = useActiveFile();
  const { call, saveFile } = useEngine();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDecrypt = useCallback(async () => {
    if (!activeFile) return;
    const output = await saveFile('decrypted.pdf');
    if (!output) return;
    setBusy(true); setStatus('Decrypting...');
    try {
      await call('decrypt', { file: activeFile.workingPath, output, password });
      setStatus('Decrypted successfully');
    } catch (e: unknown) { setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(false); }
  }, [activeFile, password, call, saveFile]);

  if (!activeFile) return <NoFileOpen onOpen={openNewFiles} message="Open an encrypted PDF to decrypt" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-neutral-400">Working on: <span className="text-neutral-200">{activeFile.name}</span></div>
      <div>
        <label className="block text-sm text-neutral-400 mb-1">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Document password"
          className="w-64 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500" />
      </div>
      <button onClick={handleDecrypt} disabled={busy} className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-medium">
        {busy ? 'Decrypting...' : 'Decrypt'}
      </button>
      <StatusBar message={status} busy={busy} />
    </div>
  );
}

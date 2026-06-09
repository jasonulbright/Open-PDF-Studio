import { useCallback } from 'react';
import { useAppState, useAppDispatch } from '../state/AppStateProvider';
import { useEngine } from './useEngine';
import { file } from '../lib/tauri-bridge';
import type { OpenFile } from '../state/types';

export function useActiveFile() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { call, openFiles } = useEngine();

  const activeFile: OpenFile | null = state.activeFileId
    ? state.files.get(state.activeFileId) ?? null
    : null;

  const allFiles = Array.from(state.files.values());

  const openNewFiles = useCallback(async () => {
    const paths = await openFiles();
    for (const filePath of paths) {
      if (state.files.has(filePath)) {
        dispatch({ type: 'SET_ACTIVE_FILE', path: filePath });
        continue;
      }
      const workingPath = await file.createWorkingCopy(filePath);
      const buffer = await file.readBuffer(workingPath);
      const info = await call('get_page_count', { file: workingPath });
      dispatch({
        type: 'OPEN_FILE',
        path: filePath,
        workingPath,
        name: filePath.split(/[\\/]/).pop() || filePath,
        pageCount: info.pages,
        buffer,
      });
      // Track recent
      try {
        const recent = JSON.parse(localStorage.getItem('spectra-recent') || '[]');
        const next = [filePath, ...recent.filter((f: string) => f !== filePath)].slice(0, 10);
        localStorage.setItem('spectra-recent', JSON.stringify(next));
      } catch { /* recent-files list is best-effort */ }
    }
  }, [state.files, call, openFiles, dispatch]);

  return { activeFile, allFiles, openNewFiles, state, dispatch };
}

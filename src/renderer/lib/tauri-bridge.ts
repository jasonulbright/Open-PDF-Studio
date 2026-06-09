/**
 * Tauri IPC bridge — typed wrappers around invoke() and listen().
 * All renderer code imports from here for backend communication.
 */
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ── Engine (Python sidecar) ───────────────────────────────────────────────

export const engine = {
  /** Start the Python engine sidecar process. */
  start: () => invoke('start_engine'),

  /** Send a JSON-RPC request to the engine. */
  request: (req: object) => invoke('send_to_engine', { request: req }),

  /** Listen for JSON-RPC responses from the engine. */
  onResponse: (callback: (response: unknown) => void) => {
    return listen<unknown>('engine:response', (event) => callback(event.payload));
  },
};

// ── File dialogs ──────────────────────────────────────────────────────────

export const dialog = {
  openFiles: () => invoke<string[]>('open_files_dialog'),
  saveFile: (options?: { defaultPath?: string }) =>
    invoke<string | null>('save_file_dialog', { defaultPath: options?.defaultPath }),
};

// ── File operations ───────────────────────────────────────────────────────

export const file = {
  readBuffer: (filePath: string) => invoke<number[]>('read_file_buffer', { filePath }),
  createWorkingCopy: (filePath: string) =>
    invoke<string>('create_working_copy', { filePath }),
  snapshot: (workingPath: string) => invoke<string>('snapshot', { workingPath }),
  restoreSnapshot: (workingPath: string, snapshotPath: string) =>
    invoke('restore_snapshot', { workingPath, snapshotPath }),
  saveAs: (workingPath: string, destPath: string) =>
    invoke('save_as', { workingPath, destPath }),
};

// ── App ───────────────────────────────────────────────────────────────────

export interface GsInfo {
  path: string;
  version: string;
  product: string;
  vendor: string;
}

export const app = {
  getGsPath: () => invoke<string>('get_gs_path'),
  getBundledGsInfo: () => invoke<GsInfo>('get_bundled_gs_info'),
  detectExternalGs: () => invoke<GsInfo | null>('detect_external_gs'),
  getVersion: () => invoke<string>('get_app_version'),
  getSystemAccentColor: () => invoke<string | null>('get_system_accent_color'),
  appendOperationLog: (line: string) => invoke('append_operation_log', { line }),
  checkAutoUpdateDisabled: () => invoke<boolean>('check_auto_update_disabled'),

  /** Read the "Start with Windows" state. Returns [enabled, minimized]. */
  getStartupEnabled: () => invoke<[boolean, boolean]>('get_startup_enabled'),

  /** Set or remove the "Start with Windows" registry entry. */
  setStartupEnabled: (enabled: boolean, startMinimized: boolean) =>
    invoke('set_startup_enabled', { enabled, startMinimized }),

  /** Write start-minimized preference to Rust-readable config file. */
  setStartMinimized: (enabled: boolean) =>
    invoke('set_start_minimized', { enabled }),

  /** Actually close the window and quit the app. */
  confirmClose: () => invoke('confirm_close'),

  /** Hide the window to system tray instead of closing. */
  hideToTray: () => invoke('hide_to_tray'),

  /** Listen for close-requested event (Rust intercepted the window close). */
  onBeforeClose: (callback: () => void) => {
    return listen('app:beforeClose', () => callback());
  },

  /** Listen for file open requests (CLI args, second instance, context menu). */
  onOpenFile: (callback: (data: { files: string[]; merge: boolean }) => void) => {
    return listen<{ files: string[]; merge: boolean }>('app:openFile', (event) =>
      callback(event.payload)
    );
  },

  /** Listen for tray actions (Quick Merge). */
  onTrayAction: (callback: (action: string) => void) => {
    return listen<string>('app:trayAction', (event) => callback(event.payload));
  },
};

// ── Auto-updater ──────────────────────────────────────────────────────────
// Tauri's updater plugin is invoked from JS directly, not through custom commands.

export { check as checkForUpdate } from '@tauri-apps/plugin-updater';

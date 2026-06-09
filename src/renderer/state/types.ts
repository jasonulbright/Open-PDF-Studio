// Bytes read over Tauri IPC arrive as a JSON number[] (read_file_buffer),
// but may also be an ArrayBuffer/Uint8Array depending on the source. pdf.js
// accepts any of these; this union avoids unsafe ArrayBuffer casts.
export type PdfBuffer = ArrayBuffer | Uint8Array | number[];

export interface OpenFile {
  path: string;           // original file path
  workingPath: string;    // temp working copy path
  name: string;
  pageCount: number;
  buffer: PdfBuffer | null;
  dirty: boolean;
  undoStack: string[];    // snapshot paths (most recent last)
  redoStack: string[];    // snapshot paths for redo
}

export interface AppState {
  files: Map<string, OpenFile>;
  activeFileId: string | null;
  selectedPages: number[];
  activePage: number | null;
}

export type AppAction =
  | { type: 'OPEN_FILE'; path: string; workingPath: string; name: string; pageCount: number; buffer: PdfBuffer }
  | { type: 'CLOSE_FILE'; path: string }
  | { type: 'SET_ACTIVE_FILE'; path: string }
  | { type: 'SELECT_PAGE'; page: number }
  | { type: 'SELECT_PAGES'; pages: number[] }
  | { type: 'TOGGLE_PAGE'; page: number }
  | { type: 'SET_ACTIVE_PAGE'; page: number | null }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'UPDATE_FILE'; path: string; pageCount: number; buffer: PdfBuffer; snapshotPath: string }
  | { type: 'UNDO'; path: string }
  | { type: 'REDO'; path: string }
  | { type: 'MARK_SAVED'; path: string };

import { AppState, AppAction } from './types';

export const initialState: AppState = {
  files: new Map(),
  activeFileId: null,
  selectedPages: [],
  activePage: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'OPEN_FILE': {
      const files = new Map(state.files);
      files.set(action.path, {
        path: action.path,
        workingPath: action.workingPath,
        name: action.name,
        pageCount: action.pageCount,
        buffer: action.buffer,
        dirty: false,
        undoStack: [],
        redoStack: [],
      });
      return {
        ...state,
        files,
        activeFileId: action.path,
        selectedPages: [],
        activePage: null,
      };
    }
    case 'CLOSE_FILE': {
      const files = new Map(state.files);
      files.delete(action.path);
      const activeFileId = state.activeFileId === action.path
        ? (files.size > 0 ? files.keys().next().value ?? null : null)
        : state.activeFileId;
      return { ...state, files, activeFileId, selectedPages: [], activePage: null };
    }
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFileId: action.path, selectedPages: [], activePage: null };
    case 'SELECT_PAGE':
      return { ...state, selectedPages: [action.page] };
    case 'SELECT_PAGES':
      return { ...state, selectedPages: action.pages, activePage: action.pages[0] ?? null };
    case 'TOGGLE_PAGE': {
      const pages = state.selectedPages.includes(action.page)
        ? state.selectedPages.filter((p) => p !== action.page)
        : [...state.selectedPages, action.page];
      return { ...state, selectedPages: pages };
    }
    case 'SET_ACTIVE_PAGE':
      return { ...state, activePage: action.page };
    case 'CLEAR_SELECTION':
      return { ...state, selectedPages: [], activePage: null };
    case 'UPDATE_FILE': {
      const files = new Map(state.files);
      const existing = files.get(action.path);
      if (!existing) return state;
      files.set(action.path, {
        ...existing,
        pageCount: action.pageCount,
        buffer: action.buffer,
        dirty: true,
        undoStack: [...existing.undoStack, action.snapshotPath],
        redoStack: [],  // new action clears redo
      });
      return { ...state, files };
    }
    case 'UNDO': {
      const files = new Map(state.files);
      const existing = files.get(action.path);
      if (!existing || existing.undoStack.length === 0) return state;
      // Pop last snapshot — it will be restored by the caller
      // Push current state to redo (caller handles the snapshot)
      const undoStack = [...existing.undoStack];
      undoStack.pop(); // remove the snapshot we're restoring to
      files.set(action.path, { ...existing, undoStack, dirty: undoStack.length > 0 });
      return { ...state, files };
    }
    case 'REDO': {
      const files = new Map(state.files);
      const existing = files.get(action.path);
      if (!existing || existing.redoStack.length === 0) return state;
      const redoStack = [...existing.redoStack];
      redoStack.pop();
      files.set(action.path, { ...existing, redoStack, dirty: true });
      return { ...state, files };
    }
    case 'MARK_SAVED': {
      const files = new Map(state.files);
      const existing = files.get(action.path);
      if (!existing) return state;
      files.set(action.path, { ...existing, dirty: false, undoStack: [], redoStack: [] });
      return { ...state, files };
    }
    default:
      return state;
  }
}

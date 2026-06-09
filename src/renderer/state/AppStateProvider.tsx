import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import { AppState, AppAction } from './types';
import { appReducer, initialState } from './reducer';

const StateContext = createContext<AppState>(initialState);
const DispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function AppStateProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  return useContext(StateContext);
}

export function useAppDispatch(): Dispatch<AppAction> {
  return useContext(DispatchContext);
}

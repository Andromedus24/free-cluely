// Settings Provider Implementation
// ===============================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { SettingsManager, SettingsData } from '../SettingsManager';
import { SettingsEvent, SettingsEventType } from '../types';

interface SettingsState {
  data: SettingsData | null;
  loading: boolean;
  error: Error | null;
  dirty: boolean;
  initialized: boolean;
  lastSaved: number | null;
}

type SettingsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'SET_DATA'; payload: SettingsData }
  | { type: 'UPDATE_DATA'; payload: { path: string; value: any } }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: number | null };

const initialState: SettingsState = {
  data: null,
  loading: false,
  error: null,
  dirty: false,
  initialized: false,
  lastSaved: null
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_DATA':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
        initialized: true
      };
    case 'UPDATE_DATA':
      if (!state.data) return state;

      const newData = { ...state.data };
      const keys = action.payload.path.split('.');
      const lastKey = keys.pop()!;
      const target = keys.reduce((obj: any, key) => obj[key], newData);
      target[lastKey] = action.payload.value;

      return {
        ...state,
        data: newData,
        dirty: true
      };
    case 'SET_DIRTY':
      return { ...state, dirty: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };
    case 'SET_LAST_SAVED':
      return { ...state, lastSaved: action.payload };
    default:
      return state;
  }
}

interface SettingsContextType {
  state: SettingsState;
  manager: SettingsManager | null;
  get: (path: string) => Promise<any>;
  set: (path: string, value: any) => Promise<void>;
  delete: (path: string) => Promise<void>;
  reset: (path?: string) => Promise<void>;
  save: () => Promise<void>;
  export: (format?: 'json' | 'yaml' | 'env') => Promise<string>;
  import: (data: string, format?: 'json' | 'yaml' | 'env') => Promise<void>;
  backup: () => Promise<string>;
  restore: (backup: string) => Promise<void>;
  sync: () => Promise<void>;
  validate: () => Promise<any>;
  refresh: () => Promise<void>;
  registerListener: (event: SettingsEventType, handler: (event: SettingsEvent) => void) => () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  manager: SettingsManager;
  children: React.ReactNode;
  autoInitialize?: boolean;
}

export function SettingsProvider({
  manager,
  children,
  autoInitialize = true
}: SettingsProviderProps) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  // Event handlers
  const handleSettingsEvent = useCallback((event: SettingsEvent) => {
    switch (event.type) {
      case 'settings-loaded':
        dispatch({ type: 'SET_DATA', payload: event.data });
        break;
      case 'settings-saved':
        dispatch({ type: 'SET_DIRTY', payload: false });
        dispatch({ type: 'SET_LAST_SAVED', payload: Date.now() });
        break;
      case 'settings-changed':
        dispatch({ type: 'SET_DIRTY', payload: true });
        break;
      case 'settings-error':
        dispatch({ type: 'SET_ERROR', payload: new Error(event.data.message || 'Settings error') });
        break;
      case 'settings-initialized':
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        break;
      case 'settings-validating':
        dispatch({ type: 'SET_LOADING', payload: true });
        break;
      case 'settings-validated':
        dispatch({ type: 'SET_LOADING', payload: false });
        break;
    }
  }, []);

  // Initialize settings manager
  useEffect(() => {
    if (!autoInitialize) return;

    const initializeSettings = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Register event listeners
        manager.on('settings-loaded', handleSettingsEvent);
        manager.on('settings-saved', handleSettingsEvent);
        manager.on('settings-changed', handleSettingsEvent);
        manager.on('settings-error', handleSettingsEvent);
        manager.on('settings-initialized', handleSettingsEvent);
        manager.on('settings-validating', handleSettingsEvent);
        manager.on('settings-validated', handleSettingsEvent);

        await manager.initialize();

        // Load initial data
        const data = await manager.get('');
        dispatch({ type: 'SET_DATA', payload: data });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error as Error });
      }
    };

    initializeSettings();

    return () => {
      // Cleanup event listeners
      manager.removeAllListeners();
    };
  }, [manager, autoInitialize, handleSettingsEvent]);

  // Settings API methods
  const get = useCallback(async (path: string) => {
    try {
      return await manager.get(path);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const set = useCallback(async (path: string, value: any) => {
    try {
      await manager.set(path, value);
      dispatch({ type: 'UPDATE_DATA', payload: { path, value } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const delete_ = useCallback(async (path: string) => {
    try {
      await manager.delete(path);
      if (state.data) {
        dispatch({ type: 'SET_DIRTY', payload: true });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager, state.data]);

  const reset = useCallback(async (path?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await manager.reset(path);
      const data = await manager.get('');
      dispatch({ type: 'SET_DATA', payload: data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const save = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await manager.save();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const export_ = useCallback(async (format: 'json' | 'yaml' | 'env' = 'json') => {
    try {
      return await manager.export(format);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const import_ = useCallback(async (data: string, format: 'json' | 'yaml' | 'env' = 'json') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await manager.import(data, format);
      const newData = await manager.get('');
      dispatch({ type: 'SET_DATA', payload: newData });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const backup = useCallback(async () => {
    try {
      return await manager.backup();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const restore = useCallback(async (backup: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await manager.restore(backup);
      const data = await manager.get('');
      dispatch({ type: 'SET_DATA', payload: data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const sync = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await manager.sync();
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const validate = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await manager.validate();
      dispatch({ type: 'SET_LOADING', payload: false });
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const refresh = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await manager.get('');
      dispatch({ type: 'SET_DATA', payload: data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as Error });
      throw error;
    }
  }, [manager]);

  const registerListener = useCallback((event: SettingsEventType, handler: (event: SettingsEvent) => void) => {
    manager.on(event, handler);
    return () => {
      manager.off(event, handler);
    };
  }, [manager]);

  const contextValue = useMemo(() => ({
    state,
    manager,
    get,
    set,
    delete: delete_,
    reset,
    save,
    export: export_,
    import: import_,
    backup,
    restore,
    sync,
    validate,
    refresh,
    registerListener
  }), [
    state,
    manager,
    get,
    set,
    delete_,
    reset,
    save,
    export_,
    import_,
    backup,
    restore,
    sync,
    validate,
    refresh,
    registerListener
  ]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function useSettingsValue<T>(path: string, defaultValue?: T): {
  value: T | undefined;
  set: (value: T) => Promise<void>;
  loading: boolean;
  error: Error | null;
} {
  const { state, get, set: setSetting } = useSettings();

  const value = useMemo(() => {
    if (!state.data) return defaultValue;
    return getNestedValue(state.data, path) as T;
  }, [state.data, path, defaultValue]);

  const setValue = useCallback(async (newValue: T) => {
    await setSetting(path, newValue);
  }, [setSetting, path]);

  return {
    value,
    set: setValue,
    loading: state.loading,
    error: state.error
  };
}

// Helper function to get nested value
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Type-safe hooks for specific settings sections
export function useProfile() {
  return useSettingsValue('profile');
}

export function usePreferences() {
  return useSettingsValue('preferences');
}

export function useAppearance() {
  return useSettingsValue('appearance');
}

export function useNotifications() {
  return useSettingsValue('notifications');
}

export function usePrivacy() {
  return useSettingsValue('privacy');
}

export function useFeatures() {
  return useSettingsValue('features');
}

export function useProviders() {
  return useSettingsValue('providers');
}

export function useAdvanced() {
  return useSettingsValue('advanced');
}
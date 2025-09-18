'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ThreeDModelingService } from '@/services/3d-modeling-service';
import type {
  Scene,
  Mesh,
  LayoutPreset,
  ModelingSession,
  GestureEvent,
  ModelingConfig,
  Vector3,
  Rotation,
  Scale
} from '@/services/3d-modeling-service';

interface ModelingState {
  scenes: Map<string, Scene>;
  presets: Map<string, LayoutPreset>;
  sessions: Map<string, ModelingSession>;
  currentScene: Scene | null;
  currentSession: ModelingSession | null;
  isModeling: boolean;
  selectedMesh: Mesh | null;
  activeGesture: GestureEvent | null;
  config: ModelingConfig;
  isLoading: boolean;
  error: string | null;
}

type ModelingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SCENES'; payload: Map<string, Scene> }
  | { type: 'SET_PRESETS'; payload: Map<string, LayoutPreset> }
  | { type: 'SET_SESSIONS'; payload: Map<string, ModelingSession> }
  | { type: 'SET_CURRENT_SCENE'; payload: Scene | null }
  | { type: 'SET_CURRENT_SESSION'; payload: ModelingSession | null }
  | { type: 'SET_MODELING'; payload: boolean }
  | { type: 'SET_SELECTED_MESH'; payload: Mesh | null }
  | { type: 'SET_ACTIVE_GESTURE'; payload: GestureEvent | null }
  | { type: 'ADD_SCENE'; payload: { id: string; scene: Scene } }
  | { type: 'UPDATE_SCENE'; payload: { id: string; scene: Scene } }
  | { type: 'DELETE_SCENE'; payload: string }
  | { type: 'ADD_PRESET'; payload: { id: string; preset: LayoutPreset } }
  | { type: 'UPDATE_PRESET'; payload: { id: string; preset: LayoutPreset } }
  | { type: 'DELETE_PRESET'; payload: string }
  | { type: 'ADD_SESSION'; payload: { id: string; session: ModelingSession } }
  | { type: 'UPDATE_SESSION'; payload: { id: string; session: ModelingSession } }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'ADD_MESH_TO_SCENE'; payload: { sceneId: string; mesh: Mesh } }
  | { type: 'UPDATE_MESH_IN_SCENE'; payload: { sceneId: string; meshId: string; mesh: Mesh } }
  | { type: 'DELETE_MESH_FROM_SCENE'; payload: { sceneId: string; meshId: string } }
  | { type: 'SELECT_MESH_IN_SCENE'; payload: { sceneId: string; meshId: string } };

const initialState: ModelingState = {
  scenes: new Map(),
  presets: new Map(),
  sessions: new Map(),
  currentScene: null,
  currentSession: null,
  isModeling: false,
  selectedMesh: null,
  activeGesture: null,
  config: {
    maxScenes: 10,
    maxMeshesPerScene: 100,
    maxHistoryStates: 50,
    autoSaveInterval: 30000,
    gestureThreshold: 0.5,
    enableAI: true,
    enableGestures: true,
    enablePresets: true,
    enableCollaboration: false,
    exportFormats: ['obj', 'stl', 'gltf', 'ply']
  },
  isLoading: false,
  error: null,
};

function modelingReducer(state: ModelingState, action: ModelingAction): ModelingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_SCENES':
      return { ...state, scenes: action.payload };

    case 'SET_PRESETS':
      return { ...state, presets: action.payload };

    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };

    case 'SET_CURRENT_SCENE':
      return { ...state, currentScene: action.payload };

    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };

    case 'SET_MODELING':
      return { ...state, isModeling: action.payload };

    case 'SET_SELECTED_MESH':
      return { ...state, selectedMesh: action.payload };

    case 'SET_ACTIVE_GESTURE':
      return { ...state, activeGesture: action.payload };

    case 'ADD_SCENE':
      const newScenes = new Map(state.scenes);
      newScenes.set(action.payload.id, action.payload.scene);
      return { ...state, scenes: newScenes };

    case 'UPDATE_SCENE':
      const updatedScenes = new Map(state.scenes);
      updatedScenes.set(action.payload.id, action.payload.scene);
      return { ...state, scenes: updatedScenes };

    case 'DELETE_SCENE':
      const remainingScenes = new Map(state.scenes);
      remainingScenes.delete(action.payload);
      return {
        ...state,
        scenes: remainingScenes,
        currentScene: state.currentScene?.id === action.payload ? null : state.currentScene
      };

    case 'ADD_PRESET':
      const newPresets = new Map(state.presets);
      newPresets.set(action.payload.id, action.payload.preset);
      return { ...state, presets: newPresets };

    case 'UPDATE_PRESET':
      const updatedPresets = new Map(state.presets);
      updatedPresets.set(action.payload.id, action.payload.preset);
      return { ...state, presets: updatedPresets };

    case 'DELETE_PRESET':
      const remainingPresets = new Map(state.presets);
      remainingPresets.delete(action.payload);
      return { ...state, presets: remainingPresets };

    case 'ADD_SESSION':
      const newSessions = new Map(state.sessions);
      newSessions.set(action.payload.id, action.payload.session);
      return { ...state, sessions: newSessions };

    case 'UPDATE_SESSION':
      const updatedSessions = new Map(state.sessions);
      updatedSessions.set(action.payload.id, action.payload.session);
      return { ...state, sessions: updatedSessions };

    case 'DELETE_SESSION':
      const remainingSessions = new Map(state.sessions);
      remainingSessions.delete(action.payload);
      return {
        ...state,
        sessions: remainingSessions,
        currentSession: state.currentSession?.id === action.payload ? null : state.currentSession
      };

    case 'ADD_MESH_TO_SCENE':
      const sceneWithNewMesh = state.scenes.get(action.payload.sceneId);
      if (sceneWithNewMesh) {
        const updatedScene = {
          ...sceneWithNewMesh,
          meshes: [...sceneWithNewMesh.meshes, action.payload.mesh]
        };
        const scenesWithNewMesh = new Map(state.scenes);
        scenesWithNewMesh.set(action.payload.sceneId, updatedScene);
        return {
          ...state,
          scenes: scenesWithNewMesh,
          currentScene: state.currentScene?.id === action.payload.sceneId ? updatedScene : state.currentScene
        };
      }
      return state;

    case 'UPDATE_MESH_IN_SCENE':
      const sceneWithUpdatedMesh = state.scenes.get(action.payload.sceneId);
      if (sceneWithUpdatedMesh) {
        const updatedMeshes = sceneWithUpdatedMesh.meshes.map(mesh =>
          mesh.id === action.payload.meshId ? action.payload.mesh : mesh
        );
        const updatedSceneWithMesh = {
          ...sceneWithUpdatedMesh,
          meshes: updatedMeshes
        };
        const scenesWithUpdatedMesh = new Map(state.scenes);
        scenesWithUpdatedMesh.set(action.payload.sceneId, updatedSceneWithMesh);
        return {
          ...state,
          scenes: scenesWithUpdatedMesh,
          currentScene: state.currentScene?.id === action.payload.sceneId ? updatedSceneWithMesh : state.currentScene,
          selectedMesh: state.selectedMesh?.id === action.payload.meshId ? action.payload.mesh : state.selectedMesh
        };
      }
      return state;

    case 'DELETE_MESH_FROM_SCENE':
      const sceneWithoutMesh = state.scenes.get(action.payload.sceneId);
      if (sceneWithoutMesh) {
        const filteredMeshes = sceneWithoutMesh.meshes.filter(mesh => mesh.id !== action.payload.meshId);
        const updatedSceneWithoutMesh = {
          ...sceneWithoutMesh,
          meshes: filteredMeshes
        };
        const scenesWithoutMesh = new Map(state.scenes);
        scenesWithoutMesh.set(action.payload.sceneId, updatedSceneWithoutMesh);
        return {
          ...state,
          scenes: scenesWithoutMesh,
          currentScene: state.currentScene?.id === action.payload.sceneId ? updatedSceneWithoutMesh : state.currentScene,
          selectedMesh: state.selectedMesh?.id === action.payload.meshId ? null : state.selectedMesh
        };
      }
      return state;

    case 'SELECT_MESH_IN_SCENE':
      const sceneForSelection = state.scenes.get(action.payload.sceneId);
      if (sceneForSelection) {
        const meshToSelect = sceneForSelection.meshes.find(mesh => mesh.id === action.payload.meshId);
        return { ...state, selectedMesh: meshToSelect || null };
      }
      return { ...state, selectedMesh: null };

    default:
      return state;
  }
}

interface ModelingContextType {
  state: ModelingState;
  actions: {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    createScene: (name: string, description?: string) => Promise<Scene>;
    updateScene: (id: string, updates: Partial<Scene>) => Promise<void>;
    deleteScene: (id: string) => Promise<void>;
    setCurrentScene: (scene: Scene | null) => void;
    createPreset: (name: string, sceneId: string, tags?: string[]) => Promise<LayoutPreset>;
    updatePreset: (id: string, updates: Partial<LayoutPreset>) => Promise<void>;
    deletePreset: (id: string) => Promise<void>;
    applyPreset: (presetId: string, targetSceneId: string) => Promise<void>;
    startModelingSession: (sceneId: string) => Promise<ModelingSession>;
    endModelingSession: (sessionId: string) => Promise<void>;
    addMesh: (sceneId: string, mesh: Omit<Mesh, 'id'>) => Promise<Mesh>;
    updateMesh: (sceneId: string, meshId: string, updates: Partial<Mesh>) => Promise<void>;
    deleteMesh: (sceneId: string, meshId: string) => Promise<void>;
    selectMesh: (sceneId: string, meshId: string) => void;
    transformMesh: (sceneId: string, meshId: string, transform: { position?: Vector3; rotation?: Rotation; scale?: Scale }) => Promise<void>;
    duplicateMesh: (sceneId: string, meshId: string) => Promise<Mesh>;
    handleGesture: (gesture: GestureEvent) => Promise<void>;
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    exportScene: (sceneId: string, format: string) => Promise<Blob>;
    resetState: () => void;
  };
}

const ModelingContext = createContext<ModelingContextType | undefined>(undefined);

export function ModelingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(modelingReducer, initialState);
  const [service] = React.useState(() => new ThreeDModelingService());

  useEffect(() => {
    initializeModeling();
  }, []);

  const initializeModeling = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const [scenes, presets, sessions] = await Promise.all([
        service.getScenes(),
        service.getPresets(),
        service.getSessions()
      ]);

      dispatch({ type: 'SET_SCENES', payload: new Map(scenes.map(s => [s.id, s])) });
      dispatch({ type: 'SET_PRESETS', payload: new Map(presets.map(p => [p.id, p])) });
      dispatch({ type: 'SET_SESSIONS', payload: new Map(sessions.map(s => [s.id, s])) });

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to initialize modeling' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const actions = {
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),

    createScene: async (name: string, description?: string): Promise<Scene> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const scene = await service.createScene(name, description);
        dispatch({ type: 'ADD_SCENE', payload: { id: scene.id, scene } });
        dispatch({ type: 'SET_CURRENT_SCENE', payload: scene });
        dispatch({ type: 'SET_LOADING', payload: false });
        return scene;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create scene' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    updateScene: async (id: string, updates: Partial<Scene>): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const scene = await service.updateScene(id, updates);
        dispatch({ type: 'UPDATE_SCENE', payload: { id, scene } });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update scene' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    deleteScene: async (id: string): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.deleteScene(id);
        dispatch({ type: 'DELETE_SCENE', payload: id });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete scene' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    setCurrentScene: (scene: Scene | null) => dispatch({ type: 'SET_CURRENT_SCENE', payload: scene }),

    createPreset: async (name: string, sceneId: string, tags: string[] = []): Promise<LayoutPreset> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const preset = await service.createPreset(name, sceneId, tags);
        dispatch({ type: 'ADD_PRESET', payload: { id: preset.id, preset } });
        dispatch({ type: 'SET_LOADING', payload: false });
        return preset;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create preset' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    updatePreset: async (id: string, updates: Partial<LayoutPreset>): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const preset = await service.updatePreset(id, updates);
        dispatch({ type: 'UPDATE_PRESET', payload: { id, preset } });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update preset' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    deletePreset: async (id: string): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.deletePreset(id);
        dispatch({ type: 'DELETE_PRESET', payload: id });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete preset' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    applyPreset: async (presetId: string, targetSceneId: string): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.applyPreset(presetId, targetSceneId);
        const updatedScene = await service.getScene(targetSceneId);
        dispatch({ type: 'UPDATE_SCENE', payload: { id: targetSceneId, scene: updatedScene } });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to apply preset' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    startModelingSession: async (sceneId: string): Promise<ModelingSession> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const session = await service.startModelingSession(sceneId);
        dispatch({ type: 'ADD_SESSION', payload: { id: session.id, session } });
        dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
        dispatch({ type: 'SET_MODELING', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
        return session;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to start session' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    endModelingSession: async (sessionId: string): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.endModelingSession(sessionId);
        dispatch({ type: 'DELETE_SESSION', payload: sessionId });
        dispatch({ type: 'SET_CURRENT_SESSION', payload: null });
        dispatch({ type: 'SET_MODELING', payload: false });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to end session' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    addMesh: async (sceneId: string, mesh: Omit<Mesh, 'id'>): Promise<Mesh> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const newMesh = await service.addMesh(sceneId, mesh);
        dispatch({ type: 'ADD_MESH_TO_SCENE', payload: { sceneId, mesh: newMesh } });
        dispatch({ type: 'SET_LOADING', payload: false });
        return newMesh;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to add mesh' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    updateMesh: async (sceneId: string, meshId: string, updates: Partial<Mesh>): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const updatedMesh = await service.updateMesh(sceneId, meshId, updates);
        dispatch({ type: 'UPDATE_MESH_IN_SCENE', payload: { sceneId, meshId, mesh: updatedMesh } });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update mesh' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    deleteMesh: async (sceneId: string, meshId: string): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.deleteMesh(sceneId, meshId);
        dispatch({ type: 'DELETE_MESH_FROM_SCENE', payload: { sceneId, meshId } });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete mesh' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    selectMesh: (sceneId: string, meshId: string) => {
      dispatch({ type: 'SELECT_MESH_IN_SCENE', payload: { sceneId, meshId } });
    },

    transformMesh: async (sceneId: string, meshId: string, transform: { position?: Vector3; rotation?: Rotation; scale?: Scale }): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const updatedMesh = await service.transformMesh(sceneId, meshId, transform);
        dispatch({ type: 'UPDATE_MESH_IN_SCENE', payload: { sceneId, meshId, mesh: updatedMesh } });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to transform mesh' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    duplicateMesh: async (sceneId: string, meshId: string): Promise<Mesh> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const duplicatedMesh = await service.duplicateMesh(sceneId, meshId);
        dispatch({ type: 'ADD_MESH_TO_SCENE', payload: { sceneId, mesh: duplicatedMesh } });
        dispatch({ type: 'SET_LOADING', payload: false });
        return duplicatedMesh;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to duplicate mesh' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    handleGesture: async (gesture: GestureEvent): Promise<void> => {
      try {
        dispatch({ type: 'SET_ACTIVE_GESTURE', payload: gesture });
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.handleGesture(gesture);
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to handle gesture' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    undo: async (): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.undo();
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to undo' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    redo: async (): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await service.redo();
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to redo' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    exportScene: async (sceneId: string, format: string): Promise<Blob> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const blob = await service.exportScene(sceneId, format);
        dispatch({ type: 'SET_LOADING', payload: false });
        return blob;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to export scene' });
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },

    resetState: () => {
      dispatch({ type: 'SET_SCENES', payload: new Map() });
      dispatch({ type: 'SET_PRESETS', payload: new Map() });
      dispatch({ type: 'SET_SESSIONS', payload: new Map() });
      dispatch({ type: 'SET_CURRENT_SCENE', payload: null });
      dispatch({ type: 'SET_CURRENT_SESSION', payload: null });
      dispatch({ type: 'SET_MODELING', payload: false });
      dispatch({ type: 'SET_SELECTED_MESH', payload: null });
      dispatch({ type: 'SET_ACTIVE_GESTURE', payload: null });
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  };

  return (
    <ModelingContext.Provider value={{ state, actions }}>
      {children}
    </ModelingContext.Provider>
  );
}

export function useModeling() {
  const context = useContext(ModelingContext);
  if (context === undefined) {
    throw new Error('useModeling must be used within a ModelingProvider');
  }
  return context;
}
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { knowledgeManager, KnowledgeConfig, Dataset, KnowledgeItem, Quiz, LearningSession } from '@/services/knowledge-management';

interface KnowledgeContextType {
  datasets: Dataset[];
  knowledgeItems: KnowledgeItem[];
  quizzes: Quiz[];
  sessions: LearningSession[];
  config: KnowledgeConfig;
  isLoading: boolean;
  error: string | null;
  createDataset: (name: string, description: string, type?: Dataset['type']) => Promise<Dataset>;
  addKnowledgeItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>, datasetId?: string) => Promise<KnowledgeItem>;
  generateQuiz: (content: string, difficulty?: Quiz['difficulty'], questionCount?: number) => Promise<Quiz>;
  startLearningSession: (itemId: string, userId?: string) => Promise<LearningSession>;
  updateLearningProgress: (sessionId: string, progress: number, interaction?: { type: string; data: Record<string, unknown> }) => Promise<void>;
  searchKnowledge: (query: string) => KnowledgeItem[];
  getRecommendations: (userId?: string) => KnowledgeItem[];
  refreshData: () => Promise<void>;
  updateConfig: (config: Partial<KnowledgeConfig>) => void;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

interface KnowledgeProviderProps {
  children: ReactNode;
}

export function KnowledgeProvider({ children }: KnowledgeProviderProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load data from knowledge manager
      setDatasets(knowledgeManager.getDatasets());
      setKnowledgeItems(knowledgeManager.getKnowledgeItems());
      setQuizzes(knowledgeManager.getQuizzes());
      setSessions(Array.from(knowledgeManager['sessions'].values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createDataset = async (name: string, description: string, type: Dataset['type'] = 'collection'): Promise<Dataset> => {
    try {
      const dataset = await knowledgeManager.createDataset(name, description, type);
      setDatasets(knowledgeManager.getDatasets());
      return dataset;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset');
      throw err;
    }
  };

  const addKnowledgeItem = async (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>, datasetId?: string): Promise<KnowledgeItem> => {
    try {
      const knowledgeItem = await knowledgeManager.addKnowledgeItem(item, datasetId);
      setKnowledgeItems(knowledgeManager.getKnowledgeItems());
      setDatasets(knowledgeManager.getDatasets());
      return knowledgeItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add knowledge item');
      throw err;
    }
  };

  const generateQuiz = async (content: string, difficulty: Quiz['difficulty'] = 'intermediate', questionCount: number = 5): Promise<Quiz> => {
    try {
      const quiz = await knowledgeManager.generateQuiz(content, difficulty, questionCount);
      setQuizzes(knowledgeManager.getQuizzes());
      return quiz;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
      throw err;
    }
  };

  const startLearningSession = async (itemId: string, userId: string = 'default'): Promise<LearningSession> => {
    try {
      const session = await knowledgeManager.startLearningSession(itemId, userId);
      setSessions(Array.from(knowledgeManager['sessions'].values()));
      setKnowledgeItems(knowledgeManager.getKnowledgeItems());
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start learning session');
      throw err;
    }
  };

  const updateLearningProgress = async (sessionId: string, progress: number, interaction?: { type: string; data: Record<string, unknown> }): Promise<void> => {
    try {
      await knowledgeManager.updateLearningProgress(sessionId, progress, interaction);
      setSessions(Array.from(knowledgeManager['sessions'].values()));
      setKnowledgeItems(knowledgeManager.getKnowledgeItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update learning progress');
      throw err;
    }
  };

  const searchKnowledge = (query: string): KnowledgeItem[] => {
    return knowledgeManager.searchKnowledge(query);
  };

  const getRecommendations = (userId: string = 'default'): KnowledgeItem[] => {
    return knowledgeManager.getRecommendations(userId);
  };

  const refreshData = async (): Promise<void> => {
    await loadData();
  };

  const updateConfig = (config: Partial<KnowledgeConfig>): void => {
    knowledgeManager.updateConfig(config);
  };

  const value: KnowledgeContextType = {
    datasets,
    knowledgeItems,
    quizzes,
    sessions,
    config: knowledgeManager.getConfig(),
    isLoading,
    error,
    createDataset,
    addKnowledgeItem,
    generateQuiz,
    startLearningSession,
    updateLearningProgress,
    searchKnowledge,
    getRecommendations,
    refreshData,
    updateConfig,
  };

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
}
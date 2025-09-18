/**
 * Knowledge Management Service for Atlas AI
 * Integrates educational content processing, quiz generation, and micro-learning
 * Based on SigmaScholar Chrome extension architecture
 */

import { logger } from '@/lib/logger';
import { validate, sanitize } from '@/lib/validation';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'article' | 'video' | 'quiz' | 'flashcard' | 'document';
  source: string;
  tags: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    url?: string;
    author?: string;
    language?: string;
    wordCount?: number;
    videoDuration?: number;
  };
  learningData?: {
    views: number;
    completions: number;
    averageScore?: number;
    lastStudied?: Date;
    masteryLevel: number; // 0-100
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank';
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimit?: number; // in minutes
  passingScore: number;
  createdAt: Date;
  tags: string[];
}

export interface LearningSession {
  id: string;
  userId: string;
  itemId: string;
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-100
  interactions: LearningInteraction[];
  metrics: {
    timeSpent: number;
    comprehensionScore?: number;
    engagementLevel: number;
    notesCount: number;
  };
}

export interface LearningInteraction {
  id: string;
  type: 'view' | 'note' | 'highlight' | 'quiz_attempt' | 'bookmark';
  timestamp: Date;
  data:
    | { content: string; noteId?: string }
    | { text: string; color?: string }
    | { questionId: string; answer: string; isCorrect?: boolean }
    | { position: number; duration?: number }
    | Record<string, unknown>;
  metadata?: {
    position?: number;
    duration?: number;
  };
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  items: KnowledgeItem[];
  type: 'collection' | 'course' | 'research' | 'personal';
  privacy: 'private' | 'public' | 'shared';
  tags: string[];
  createdAt: Date;
  lastAccessed: Date;
  metadata?: {
    totalItems: number;
    estimatedCompletionTime: number;
    difficultyDistribution: Record<string, number>;
  };
}

export interface KnowledgeConfig {
  ai: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    quizGeneration: boolean;
    summarization: boolean;
    difficultyAssessment: boolean;
  };
  storage: {
    localDatabase: boolean;
    cloudSync: boolean;
    encryption: boolean;
    maxFileSize: number; // in MB
  };
  learning: {
    spacedRepetition: boolean;
    adaptiveDifficulty: boolean;
    progressTracking: boolean;
    achievementSystem: boolean;
  };
  privacy: {
    dataCollection: boolean;
    analytics: boolean;
    sharing: boolean;
  };
}

class KnowledgeManagementService {
  private config: KnowledgeConfig;
  private datasets: Map<string, Dataset> = new Map();
  private knowledgeItems: Map<string, KnowledgeItem> = new Map();
  private quizzes: Map<string, Quiz> = new Map();
  private sessions: Map<string, LearningSession> = new Map();
  private isInitialized = false;

  constructor(config: KnowledgeConfig) {
    this.config = config;
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Load configuration from localStorage
      const savedConfig = localStorage.getItem('atlas-knowledge-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load datasets from localStorage
      const savedDatasets = localStorage.getItem('atlas-datasets');
      if (savedDatasets) {
        const datasets = JSON.parse(savedDatasets);
        datasets.forEach((dataset: Dataset) => {
          this.datasets.set(dataset.id, dataset);
          // Load items for each dataset
          dataset.items.forEach((item: KnowledgeItem) => {
            this.knowledgeItems.set(item.id, item);
          });
        });
      }

      // Load quizzes
      const savedQuizzes = localStorage.getItem('atlas-quizzes');
      if (savedQuizzes) {
        const quizzes = JSON.parse(savedQuizzes);
        quizzes.forEach((quiz: Quiz) => {
          this.quizzes.set(quiz.id, quiz);
        });
      }

      this.isInitialized = true;
      logger.info('knowledge-management', 'Knowledge management service initialized');
    } catch (error) {
      logger.error('knowledge-management', 'Failed to initialize knowledge management service', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public async createDataset(name: string, description: string, type: Dataset['type'] = 'collection'): Promise<Dataset> {
    // Validate and sanitize inputs
    const sanitizedName = sanitize.input(name, { maxLength: 100 });
    const sanitizedDescription = sanitize.input(description, { maxLength: 500 });

    if (!sanitizedName.trim()) {
      throw new Error('Dataset name is required');
    }

    const dataset: Dataset = {
      id: this.generateId(),
      name: sanitizedName.trim(),
      description: sanitizedDescription.trim(),
      type,
      items: [],
      privacy: 'private',
      tags: [],
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {
        totalItems: 0,
        estimatedCompletionTime: 0,
        difficultyDistribution: {}
      }
    };

    this.datasets.set(dataset.id, dataset);
    await this.saveDatasets();

    return dataset;
  }

  public async addKnowledgeItem(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>, datasetId?: string): Promise<KnowledgeItem> {
    // Validate and sanitize inputs
    const validatedItem = {
      title: sanitize.input(item.title, { maxLength: 200 }),
      content: sanitize.input(item.content, { maxLength: 50000, allowHtml: false }),
      type: item.type,
      source: sanitize.input(item.source, { maxLength: 200 }),
      tags: item.tags.map(tag => sanitize.input(tag, { maxLength: 20 })),
      category: sanitize.input(item.category, { maxLength: 50 }),
      difficulty: item.difficulty,
      estimatedTime: Math.max(1, Math.min(480, item.estimatedTime)), // 1 minute to 8 hours
      metadata: item.metadata ? {
        url: item.metadata.url ? sanitize.input(item.metadata.url, { maxLength: 500 }) : undefined,
        author: item.metadata.author ? sanitize.input(item.metadata.author, { maxLength: 100 }) : undefined,
        language: item.metadata.language ? sanitize.input(item.metadata.language, { maxLength: 10 }) : undefined,
        wordCount: item.metadata.wordCount,
        videoDuration: item.metadata.videoDuration,
      } : undefined,
    };

    // Validate required fields
    if (!validatedItem.title.trim()) {
      throw new Error('Knowledge item title is required');
    }

    if (!validatedItem.content.trim()) {
      throw new Error('Knowledge item content is required');
    }

    const knowledgeItem: KnowledgeItem = {
      ...validatedItem,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      learningData: {
        views: 0,
        completions: 0,
        masteryLevel: 0
      }
    };

    this.knowledgeItems.set(knowledgeItem.id, knowledgeItem);

    // Add to dataset if specified
    if (datasetId && this.datasets.has(datasetId)) {
      const dataset = this.datasets.get(datasetId)!;
      dataset.items.push(knowledgeItem);
      dataset.metadata!.totalItems++;
      dataset.metadata!.estimatedCompletionTime += knowledgeItem.estimatedTime;
      dataset.metadata!.difficultyDistribution[knowledgeItem.difficulty] =
        (dataset.metadata!.difficultyDistribution[knowledgeItem.difficulty] || 0) + 1;
      dataset.lastAccessed = new Date();
    }

    await this.saveDatasets();

    return knowledgeItem;
  }

  public async generateQuiz(content: string, difficulty: Quiz['difficulty'] = 'intermediate', questionCount: number = 5): Promise<Quiz> {
    if (!this.config.ai.quizGeneration) {
      throw new Error('AI quiz generation is disabled');
    }

    // Simulate AI quiz generation (in real implementation, use OpenAI/Anthropic API)
    const questions = await this.generateQuizQuestions(content, difficulty, questionCount);

    const quiz: Quiz = {
      id: this.generateId(),
      title: `Generated Quiz - ${new Date().toLocaleDateString()}`,
      description: `Auto-generated quiz with ${questionCount} questions`,
      questions,
      category: 'generated',
      difficulty,
      passingScore: 70,
      createdAt: new Date(),
      tags: ['ai-generated', 'auto-generated']
    };

    this.quizzes.set(quiz.id, quiz);
    await this.saveQuizzes();

    return quiz;
  }

  private async generateQuizQuestions(content: string, difficulty: Quiz['difficulty'], count: number): Promise<QuizQuestion[]> {
    // Simulate AI question generation
    const questionTemplates = [
      {
        type: 'multiple-choice',
        template: "What is the main concept discussed in the text?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        explanation: "Based on the content analysis, the main concept is..."
      },
      {
        type: 'true-false',
        template: "The text discusses the importance of [topic].",
        options: ["True", "False"],
        explanation: "The text clearly mentions this concept..."
      },
      {
        type: 'short-answer',
        template: "Explain the key point about [topic] mentioned in the text.",
        explanation: "The correct explanation focuses on..."
      }
    ];

    const questions: QuizQuestion[] = [];
    for (let i = 0; i < count; i++) {
      const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
      const question: QuizQuestion = {
        id: this.generateId(),
        question: template.template.replace('[topic]', 'the main subject'),
        type: template.type as QuizQuestion['type'],
        options: template.options,
        correctAnswer: template.options?.[0] || "Correct answer",
        explanation: template.explanation,
        difficulty: difficulty === 'beginner' ? 'easy' : difficulty === 'advanced' ? 'hard' : 'medium',
        category: 'generated',
        tags: ['ai-generated'],
        points: difficulty === 'beginner' ? 5 : difficulty === 'advanced' ? 15 : 10
      };
      questions.push(question);
    }

    return questions;
  }

  public async startLearningSession(itemId: string, userId: string = 'default'): Promise<LearningSession> {
    const session: LearningSession = {
      id: this.generateId(),
      userId,
      itemId,
      startTime: new Date(),
      progress: 0,
      interactions: [],
      metrics: {
        timeSpent: 0,
        engagementLevel: 0,
        notesCount: 0
      }
    };

    this.sessions.set(session.id, session);

    // Update item view count
    const item = this.knowledgeItems.get(itemId);
    if (item) {
      item.learningData!.views++;
      item.learningData!.lastStudied = new Date();
      await this.saveDatasets();
    }

    return session;
  }

  public async updateLearningProgress(sessionId: string, progress: number, interaction?: LearningInteraction): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.progress = Math.max(0, Math.min(100, progress));

    if (interaction) {
      session.interactions.push(interaction);
    }

    // Update metrics
    if (session.endTime) {
      session.metrics.timeSpent = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
    } else {
      session.metrics.timeSpent = (Date.now() - session.startTime.getTime()) / 1000;
    }

    // Calculate engagement level based on interactions
    session.metrics.engagementLevel = Math.min(100, session.interactions.length * 10);

    // Mark completion if progress is 100%
    if (progress >= 100) {
      session.endTime = new Date();
      const item = this.knowledgeItems.get(session.itemId);
      if (item) {
        item.learningData!.completions++;
        item.learningData!.masteryLevel = Math.min(100, item.learningData!.masteryLevel + 10);
        await this.saveDatasets();
      }
    }

    await this.saveSessions();
  }

  public getDatasets(): Dataset[] {
    return Array.from(this.datasets.values());
  }

  public getDataset(id: string): Dataset | undefined {
    return this.datasets.get(id);
  }

  public getKnowledgeItems(datasetId?: string): KnowledgeItem[] {
    if (datasetId) {
      const dataset = this.datasets.get(datasetId);
      return dataset ? dataset.items : [];
    }
    return Array.from(this.knowledgeItems.values());
  }

  public getKnowledgeItem(id: string): KnowledgeItem | undefined {
    return this.knowledgeItems.get(id);
  }

  public getQuizzes(): Quiz[] {
    return Array.from(this.quizzes.values());
  }

  public getQuiz(id: string): Quiz | undefined {
    return this.quizzes.get(id);
  }

  public searchKnowledge(query: string): KnowledgeItem[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.knowledgeItems.values()).filter(item =>
      item.title.toLowerCase().includes(lowercaseQuery) ||
      item.content.toLowerCase().includes(lowercaseQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  public getRecommendations(userId: string = 'default'): KnowledgeItem[] {
    // Simple recommendation algorithm based on learning history
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId);
    const studiedCategories = new Set(
      userSessions
        .map(s => this.knowledgeItems.get(s.itemId))
        .filter(Boolean)
        .map(item => item!.category)
    );

    // Recommend items from studied categories with higher difficulty
    return Array.from(this.knowledgeItems.values())
      .filter(item => {
        if (studiedCategories.has(item.category)) {
          // Recommend more advanced content in studied categories
          return item.difficulty === 'advanced' || item.difficulty === 'intermediate';
        }
        // Also recommend beginner content in new categories
        return item.difficulty === 'beginner';
      })
      .sort((a, b) => b.learningData!.masteryLevel - a.learningData!.masteryLevel)
      .slice(0, 10);
  }

  private async saveDatasets(): Promise<void> {
    try {
      const datasetsArray = Array.from(this.datasets.values());
      localStorage.setItem('atlas-datasets', JSON.stringify(datasetsArray));
    } catch (error) {
      logger.error('knowledge-management', 'Failed to save datasets', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveQuizzes(): Promise<void> {
    try {
      const quizzesArray = Array.from(this.quizzes.values());
      localStorage.setItem('atlas-quizzes', JSON.stringify(quizzesArray));
    } catch (error) {
      logger.error('knowledge-management', 'Failed to save quizzes', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      localStorage.setItem('atlas-learning-sessions', JSON.stringify(sessionsArray));
    } catch (error) {
      logger.error('knowledge-management', 'Failed to save learning sessions', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public updateConfig(config: Partial<KnowledgeConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('atlas-knowledge-config', JSON.stringify(this.config));
  }

  public getConfig(): KnowledgeConfig {
    return this.config;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public destroy(): void {
    // Clean up resources
    this.datasets.clear();
    this.knowledgeItems.clear();
    this.quizzes.clear();
    this.sessions.clear();
  }
}

// Export singleton instance
export const knowledgeManager = new KnowledgeManagementService({
  ai: {
    provider: 'openai',
    model: 'gpt-4',
    quizGeneration: true,
    summarization: true,
    difficultyAssessment: true
  },
  storage: {
    localDatabase: true,
    cloudSync: false,
    encryption: true,
    maxFileSize: 10
  },
  learning: {
    spacedRepetition: true,
    adaptiveDifficulty: true,
    progressTracking: true,
    achievementSystem: true
  },
  privacy: {
    dataCollection: false,
    analytics: true,
    sharing: true
  }
});

export default KnowledgeManagementService;
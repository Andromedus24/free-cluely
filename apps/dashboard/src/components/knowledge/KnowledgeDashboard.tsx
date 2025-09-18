'use client';

import React, { useState, useEffect } from 'react';
import { knowledgeManager, KnowledgeItem, Dataset, Quiz, LearningSession } from '@/services/knowledge-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  BookOpen,
  FileText,
  Video,
  QuizIcon,
  Search,
  Plus,
  TrendingUp,
  Clock,
  Target,
  Award,
  Download,
  Share,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeDashboardProps {
  className?: string;
}

export function KnowledgeDashboard({ className }: KnowledgeDashboardProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [recentSessions, setRecentSessions] = useState<LearningSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  useEffect(() => {
    // Load data from knowledge manager
    setDatasets(knowledgeManager.getDatasets());
    setKnowledgeItems(knowledgeManager.getKnowledgeItems());
    setQuizzes(knowledgeManager.getQuizzes());

    // Simulate loading recent sessions
    setRecentSessions(Array.from(knowledgeManager['sessions'].values()).slice(-5));
  }, []);

  const filteredItems = knowledgeItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const datasetItems = selectedDataset
    ? knowledgeManager.getKnowledgeItems(selectedDataset)
    : filteredItems;

  const stats = {
    totalItems: knowledgeItems.length,
    totalQuizzes: quizzes.length,
    totalDatasets: datasets.length,
    completedSessions: recentSessions.filter(s => s.progress >= 100).length,
    averageMastery: knowledgeItems.length > 0
      ? knowledgeItems.reduce((sum, item) => sum + (item.learningData?.masteryLevel || 0), 0) / knowledgeItems.length
      : 0
  };

  const getItemIcon = (type: KnowledgeItem['type']) => {
    const icons = {
      note: FileText,
      article: BookOpen,
      video: Video,
      quiz: QuizIcon,
      flashcard: Brain,
      document: FileText
    };
    return icons[type] || FileText;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Knowledge Management</h2>
            <p className="text-muted-foreground">Organize, learn, and track your educational content</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Items</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <QuizIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Quizzes</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Datasets</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalDatasets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Mastery</span>
            </div>
            <div className="text-2xl font-bold">{stats.averageMastery.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Dataset:</span>
          <select
            value={selectedDataset || ''}
            onChange={(e) => setSelectedDataset(e.target.value || null)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">All Datasets</option>
            {datasets.map(dataset => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items">Knowledge Items</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasetItems.map((item) => {
              const ItemIcon = getItemIcon(item.type);
              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center space-x-2">
                        <ItemIcon className="h-4 w-4 text-blue-500" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.content.substring(0, 100)}...
                    </p>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(item.estimatedTime)}</span>
                      </div>
                      <Badge className={getDifficultyColor(item.difficulty)}>
                        {item.difficulty}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground">Mastery:</span>
                        <span className="text-xs font-medium">
                          {item.learningData?.masteryLevel || 0}%
                        </span>
                      </div>
                      <Progress value={item.learningData?.masteryLevel || 0} className="h-1 w-16" />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <Button size="sm" className="w-full">
                      Start Learning
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {datasetItems.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No items found matching your search.' : 'No knowledge items yet.'}
                </p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <Card key={dataset.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{dataset.name}</span>
                    <Badge variant="outline">{dataset.type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {dataset.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Items:</span>
                      <span className="ml-1 font-medium">{dataset.items.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Est. Time:</span>
                      <span className="ml-1 font-medium">
                        {formatDuration(dataset.metadata?.estimatedCompletionTime || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Privacy:</span>
                      <Badge variant={dataset.privacy === 'private' ? 'secondary' : 'default'}>
                        {dataset.privacy}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Last accessed:</span>
                      <span>{new Date(dataset.lastAccessed).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <BookOpen className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Share className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {datasets.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No datasets created yet.</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dataset
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{quiz.title}</span>
                    <Badge className={getDifficultyColor(quiz.difficulty)}>
                      {quiz.difficulty}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {quiz.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Questions:</span>
                      <span className="ml-1 font-medium">{quiz.questions.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Passing:</span>
                      <span className="ml-1 font-medium">{quiz.passingScore}%</span>
                    </div>
                    {quiz.timeLimit && (
                      <div>
                        <span className="text-muted-foreground">Time Limit:</span>
                        <span className="ml-1 font-medium">{quiz.timeLimit}m</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {quiz.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <Button size="sm" className="w-full">
                    <QuizIcon className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {quizzes.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <QuizIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No quizzes available.</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Learning Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Mastery</span>
                      <span className="font-medium">{stats.averageMastery.toFixed(0)}%</span>
                    </div>
                    <Progress value={stats.averageMastery} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-500">
                        {stats.completedSessions}
                      </div>
                      <div className="text-xs text-muted-foreground">Sessions Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">
                        {knowledgeItems.filter(item => (item.learningData?.masteryLevel || 0) >= 80).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Mastered Items</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Content Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['note', 'article', 'video', 'quiz'].map(type => {
                    const count = knowledgeItems.filter(item => item.type === type).length;
                    const percentage = knowledgeItems.length > 0 ? (count / knowledgeItems.length) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{type}s</span>
                          <span>{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
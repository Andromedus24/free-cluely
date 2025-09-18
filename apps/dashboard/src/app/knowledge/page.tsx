'use client';

import { useState } from 'react';
import { KnowledgeDashboard } from '@/components/knowledge';
import { useKnowledge } from '@/contexts/knowledge-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  BookOpen,
  Plus,
  Settings,
  Download,
  Upload,
  Search,
  TrendingUp,
  Award,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KnowledgePage() {
  const {
    datasets,
    knowledgeItems,
    quizzes,
    sessions,
    isLoading,
    error,
    createDataset,
    addKnowledgeItem,
    generateQuiz,
    refreshData
  } = useKnowledge();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  const stats = {
    totalItems: knowledgeItems.length,
    totalQuizzes: quizzes.length,
    totalDatasets: datasets.length,
    masteredItems: knowledgeItems.filter(item => (item.learningData?.masteryLevel || 0) >= 80).length,
    averageMastery: knowledgeItems.length > 0
      ? knowledgeItems.reduce((sum, item) => sum + (item.learningData?.masteryLevel || 0), 0) / knowledgeItems.length
      : 0
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">Loading knowledge base...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <Button onClick={refreshData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Knowledge Management</h1>
            <p className="text-muted-foreground">Organize, learn, and track your educational content</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Dataset
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
              <Brain className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Quizzes</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-purple-500" />
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
            <div className={cn('text-2xl font-bold',
              stats.averageMastery >= 80 ? 'text-green-500' :
              stats.averageMastery >= 50 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {stats.averageMastery.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <KnowledgeDashboard />
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { knowledgeManager, KnowledgeItem, Quiz } from '@/services/knowledge-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  BookOpen,
  QuizIcon,
  TrendingUp,
  Target,
  Clock,
  Award,
  Plus,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeWidgetProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function KnowledgeWidget({ className, variant = 'compact' }: KnowledgeWidgetProps) {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [recommendations, setRecommendations] = useState<KnowledgeItem[]>([]);

  useEffect(() => {
    // Load data from knowledge manager
    setKnowledgeItems(knowledgeManager.getKnowledgeItems());
    setQuizzes(knowledgeManager.getQuizzes());
    setRecommendations(knowledgeManager.getRecommendations());
  }, []);

  const stats = {
    totalItems: knowledgeItems.length,
    masteredItems: knowledgeItems.filter(item => (item.learningData?.masteryLevel || 0) >= 80).length,
    totalQuizzes: quizzes.length,
    averageMastery: knowledgeItems.length > 0
      ? knowledgeItems.reduce((sum, item) => sum + (item.learningData?.masteryLevel || 0), 0) / knowledgeItems.length
      : 0
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return 'text-green-500';
    if (mastery >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Knowledge</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {stats.totalItems} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-blue-500">
                {stats.masteredItems}
              </div>
              <div className="text-xs text-muted-foreground">Mastered</div>
            </div>
            <div>
              <div className={cn('text-lg font-bold', getMasteryColor(stats.averageMastery))}>
                {stats.averageMastery.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Mastery</div>
            </div>
          </div>

          <Button size="sm" className="w-full">
            <Plus className="h-3 w-3 mr-1" />
            Add Content
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Knowledge Base</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {stats.totalItems} items
            </Badge>
            <Button size="sm" variant="ghost">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {stats.masteredItems}
            </div>
            <div className="text-xs text-muted-foreground">Mastered</div>
          </div>
          <div className="text-center">
            <div className={cn('text-2xl font-bold', getMasteryColor(stats.averageMastery))}>
              {stats.averageMastery.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Mastery</div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Learning Progress</span>
            <span className="text-xs text-muted-foreground">
              {stats.masteredItems}/{stats.totalItems} items
            </span>
          </div>
          <Progress value={(stats.masteredItems / stats.totalItems) * 100} className="h-2" />
        </div>

        {/* Recommended Items */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <Target className="h-3 w-3" />
              <span>Recommended</span>
            </div>
            <div className="space-y-1">
              {recommendations.slice(0, 2).map((item) => {
                const Icon = item.type === 'video' ? BookOpen : item.type === 'quiz' ? QuizIcon : Brain;
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-3 w-3 text-blue-500" />
                      <span className="truncate flex-1">{item.title}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDuration(item.estimatedTime)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Quizzes */}
        {quizzes.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center space-x-1">
              <QuizIcon className="h-3 w-3" />
              <span>Available Quizzes</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {quizzes.slice(0, 2).map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                  <span className="truncate flex-1">{quiz.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {quiz.questions.length}q
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalItems === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start building your knowledge base</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Search className="h-3 w-3 mr-1" />
            Browse
          </Button>
          <Button size="sm" className="flex-1">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick knowledge indicator for header or sidebar
export function KnowledgeIndicator() {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);

  useEffect(() => {
    setKnowledgeItems(knowledgeManager.getKnowledgeItems());
  }, []);

  const masteredCount = knowledgeItems.filter(item => (item.learningData?.masteryLevel || 0) >= 80).length;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${masteredCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-sm text-muted-foreground">
        {masteredCount > 0 ? `Knowledge: ${masteredCount} mastered` : 'Knowledge Base'}
      </span>
      {masteredCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {masteredCount}
        </Badge>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useKnowledge } from '@/contexts/knowledge-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  BookOpen,
  Clock,
  Target,
  Award,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Lightbulb,
  MessageSquare,
  Star,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningSessionProps {
  itemId: string;
  onComplete?: (sessionId: string) => void;
  className?: string;
}

export function LearningSession({ itemId, onComplete, className }: LearningSessionProps) {
  const {
    getKnowledgeItem,
    startLearningSession,
    updateLearningProgress,
    knowledgeItems,
    quizzes
  } = useKnowledge();

  const [session, setSession] = useState<any>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [notes, setNotes] = useState('');
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);

  const item = getKnowledgeItem(itemId);

  useEffect(() => {
    if (item) {
      const newSession = startLearningSession(itemId);
      setSession(newSession);
      setCurrentProgress(0);
      setTimeSpent(0);
      setIsActive(true);
    }
  }, [itemId, item, startLearningSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleProgressUpdate = (newProgress: number) => {
    setCurrentProgress(newProgress);
    if (session) {
      updateLearningProgress(session.id, newProgress, {
        type: 'progress_update',
        timestamp: new Date(),
        data: { progress: newProgress, notes }
      });
    }
  };

  const handleComplete = () => {
    handleProgressUpdate(100);
    setIsActive(false);
    if (session && onComplete) {
      onComplete(session.id);
    }
  };

  const handlePause = () => {
    setIsActive(!isActive);
  };

  const handleRestart = () => {
    setCurrentProgress(0);
    setTimeSpent(0);
    setNotes('');
    setQuizResults([]);
    setShowQuiz(false);
    setIsActive(true);
  };

  const handleNoteSave = () => {
    if (session && notes.trim()) {
      updateLearningProgress(session.id, currentProgress, {
        type: 'note',
        timestamp: new Date(),
        data: { content: notes }
      });
      setNotes('');
    }
  };

  const generateRelevantQuiz = () => {
    if (item) {
      const quiz = quizzes.find(q => q.category === item.category);
      if (quiz) {
        setShowQuiz(true);
      }
    }
  };

  const handleQuizAnswer = (questionId: string, answer: string, isCorrect: boolean) => {
    const result = {
      questionId,
      answer,
      isCorrect,
      timestamp: new Date()
    };
    setQuizResults(prev => [...prev, result]);

    if (session) {
      updateLearningProgress(session.id, currentProgress, {
        type: 'quiz_attempt',
        timestamp: new Date(),
        data: result
      });
    }
  };

  if (!item) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <div className="text-red-500">Knowledge item not found</div>
        </CardContent>
      </Card>
    );
  }

  const masteryLevel = item.learningData?.masteryLevel || 0;
  const estimatedTime = item.estimatedTime * 60; // Convert to seconds

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span>Learning Session</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{item.type}</Badge>
              <Badge className={cn(
                masteryLevel >= 80 ? 'bg-green-500' :
                masteryLevel >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}>
                {masteryLevel}% Mastered
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
          <p className="text-muted-foreground mb-4">{item.content}</p>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>{formatTime(estimatedTime)} estimated</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>{item.difficulty}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>{item.category}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Progress</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {formatTime(timeSpent)} spent
              </span>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Completion</span>
              <span>{Math.round(currentProgress)}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handlePause}
              variant="outline"
              size="sm"
              disabled={currentProgress >= 100}
            >
              {isActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isActive ? 'Pause' : 'Resume'}
            </Button>
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
            <Button
              onClick={handleComplete}
              size="sm"
              disabled={currentProgress >= 100}
              className="ml-auto"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
          </div>

          {/* Manual Progress Input */}
          <div className="flex items-center space-x-2">
            <Input
              type="range"
              min="0"
              max="100"
              value={currentProgress}
              onChange={(e) => handleProgressUpdate(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm w-12 text-center">{Math.round(currentProgress)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Learning Content */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Study Material</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>{item.content}</p>
                {item.metadata?.url && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.metadata.url} target="_blank" rel="noopener noreferrer">
                        Open Source
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Study Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Take notes while studying..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-32"
              />
              <Button onClick={handleNoteSave} disabled={!notes.trim()}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiz" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Knowledge Check</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showQuiz ? (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Test your understanding with a quick quiz
                  </p>
                  <Button onClick={generateRelevantQuiz}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <Badge variant="outline">
                      {quizResults.filter(r => r.isCorrect).length} / {quizResults.length} Correct
                    </Badge>
                  </div>

                  {quizzes
                    .filter(q => q.category === item.category)
                    .slice(0, 3)
                    .map((quiz, quizIndex) => (
                      <div key={quizIndex} className="space-y-3">
                        {quiz.questions.slice(0, 2).map((question, qIndex) => {
                          const existingResult = quizResults.find(r => r.questionId === question.id);
                          return (
                            <div key={question.id} className="border rounded p-3">
                              <p className="font-medium mb-2">{question.question}</p>
                              {question.type === 'multiple-choice' && question.options && (
                                <div className="space-y-2">
                                  {question.options.map((option, optIndex) => (
                                    <Button
                                      key={optIndex}
                                      variant={existingResult?.answer === option ?
                                        (existingResult.isCorrect ? 'default' : 'destructive') : 'outline'
                                      }
                                      size="sm"
                                      className="w-full justify-start"
                                      onClick={() => handleQuizAnswer(question.id, option, option === question.correctAnswer)}
                                      disabled={!!existingResult}
                                    >
                                      {option}
                                    </Button>
                                  ))}
                                </div>
                              )}
                              {existingResult && (
                                <div className="mt-2 text-sm">
                                  {existingResult.isCorrect ? (
                                    <span className="text-green-600 flex items-center">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Correct
                                    </span>
                                  ) : (
                                    <span className="text-red-600 flex items-center">
                                      <XCircle className="h-3 w-3 mr-1" /> Incorrect
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Session Summary */}
      {currentProgress >= 100 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span>Session Complete!</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Time Spent</div>
                <div className="text-lg font-semibold">{formatTime(timeSpent)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Notes Taken</div>
                <div className="text-lg font-semibold">{notes ? 'Yes' : 'None'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Quiz Score</div>
                <div className="text-lg font-semibold">
                  {quizResults.length > 0 ?
                    `${Math.round((quizResults.filter(r => r.isCorrect).length / quizResults.length) * 100)}%` :
                    'N/A'
                  }
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">New Mastery</div>
                <div className="text-lg font-semibold text-green-600">
                  {Math.min(100, masteryLevel + 10)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
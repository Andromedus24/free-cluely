'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Keyboard,
  Contrast,
  Zap,
  FileText,
  Download
} from 'lucide-react';

interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'contrast' | 'keyboard' | 'focus' | 'semantics' | 'motion' | 'images';
  element: string;
  description: string;
  suggestion: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagLevel: 'A' | 'AA' | 'AAA';
}

interface AccessibilityScore {
  overall: number;
  contrast: number;
  keyboard: number;
  focus: number;
  semantics: number;
  motion: number;
  images: number;
}

export function AccessibilityAudit() {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [score, setScore] = useState<AccessibilityScore | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runAudit = async () => {
    setIsAuditing(true);
    setIssues([]);
    setScore(null);

    // Simulate audit process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock audit results
    const mockIssues: AccessibilityIssue[] = [
      {
        id: '1',
        type: 'error',
        category: 'contrast',
        element: 'button.primary',
        description: 'Text color has insufficient contrast with background',
        suggestion: 'Increase text contrast or use a darker color',
        impact: 'serious',
        wcagLevel: 'AA'
      },
      {
        id: '2',
        type: 'warning',
        category: 'keyboard',
        element: 'interactive elements',
        description: 'Some interactive elements may not be keyboard accessible',
        suggestion: 'Ensure all interactive elements can be reached via keyboard',
        impact: 'moderate',
        wcagLevel: 'A'
      },
      {
        id: '3',
        type: 'info',
        category: 'semantics',
        element: 'landmark regions',
        description: 'Consider adding landmark regions for better navigation',
        suggestion: 'Add nav, main, and complementary landmarks',
        impact: 'minor',
        wcagLevel: 'AA'
      }
    ];

    const mockScore: AccessibilityScore = {
      overall: 85,
      contrast: 92,
      keyboard: 78,
      focus: 88,
      semantics: 82,
      motion: 95,
      images: 90
    };

    setIssues(mockIssues);
    setScore(mockScore);
    setIsAuditing(false);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contrast': return <Contrast className="h-4 w-4" />;
      case 'keyboard': return <Keyboard className="h-4 w-4" />;
      case 'focus': return <Eye className="h-4 w-4" />;
      case 'motion': return <Zap className="h-4 w-4" />;
      case 'images': return <EyeOff className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const exportReport = () => {
    if (!score || issues.length === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      score,
      issues,
      summary: {
        totalIssues: issues.length,
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        info: issues.filter(i => i.type === 'info').length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Accessibility Audit
          </CardTitle>
          <CardDescription>
            Run automated accessibility checks to identify potential issues and improve usability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={runAudit} disabled={isAuditing}>
              {isAuditing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Run Accessibility Audit
                </>
              )}
            </Button>

            {score && (
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}

            {issues.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {score && (
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Score</CardTitle>
            <CardDescription>
              Overall accessibility compliance score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(score.overall)}`}>
                  {score.overall}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {getScoreLabel(score.overall)}
                </div>
                <Progress value={score.overall} className="mt-2 max-w-xs mx-auto" />
              </div>

              {/* Category Scores */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Contrast className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Contrast</span>
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(score.contrast)}`}>
                    {score.contrast}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Keyboard className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Keyboard</span>
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(score.keyboard)}`}>
                    {score.keyboard}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Focus</span>
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(score.focus)}`}>
                    {score.focus}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Semantics</span>
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(score.semantics)}`}>
                    {score.semantics}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Motion</span>
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(score.motion)}`}>
                    {score.motion}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <EyeOff className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Images</span>
                  </div>
                  <div className={`text-lg font-semibold ${getScoreColor(score.images)}`}>
                    {score.images}%
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>{issues.filter(i => i.type === 'error').length} Errors</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>{issues.filter(i => i.type === 'warning').length} Warnings</span>
                </div>
                <div className="flex items-center gap-1">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>{issues.filter(i => i.type === 'info').length} Suggestions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showDetails && issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Issues</CardTitle>
            <CardDescription>
              Detailed list of accessibility issues found during the audit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issues.map((issue) => (
                <Alert key={issue.id} className={`${issue.type === 'error' ? 'border-red-200 bg-red-50' : issue.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex items-start gap-3">
                    {getIconForType(issue.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={issue.type === 'error' ? 'destructive' : issue.type === 'warning' ? 'default' : 'secondary'}>
                          {issue.type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {getCategoryIcon(issue.category)}
                          <span className="ml-1">{issue.category}</span>
                        </Badge>
                        <Badge variant="outline">
                          WCAG {issue.wcagLevel}
                        </Badge>
                        <Badge variant={issue.impact === 'critical' ? 'destructive' : issue.impact === 'serious' ? 'default' : 'secondary'}>
                          {issue.impact}
                        </Badge>
                      </div>
                      <AlertDescription className="mb-2">
                        <strong>{issue.element}:</strong> {issue.description}
                      </AlertDescription>
                      <AlertDescription className="text-sm">
                        <strong>Suggestion:</strong> {issue.suggestion}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Accessibility Checklist</CardTitle>
          <CardDescription>
            Manual checks you can perform to improve accessibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Keyboard Navigation</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Can I navigate to all interactive elements using Tab?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Can I operate all controls without a mouse?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Is the keyboard focus order logical?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are focus indicators clearly visible?
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Visual Design</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Is text contrast sufficient (at least 4.5:1)?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Can I resize text up to 200% without breaking layout?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Is content readable when colors are removed?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are animations respectful of reduced motion preferences?
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Content & Structure</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are headings used correctly and in order?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Do images have meaningful alt text?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are form inputs properly labeled?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Is content available to screen readers?
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Forms & Input</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are all form controls properly labeled?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are error messages clear and accessible?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Can forms be submitted with keyboard?
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
                  Are required fields clearly indicated?
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
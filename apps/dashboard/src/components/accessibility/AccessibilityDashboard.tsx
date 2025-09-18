'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccessibilityAudit } from './AccessibilityAudit'
import { KeyboardNavigation } from './KeyboardNavigation'
import { ThemeSwitcher } from '@/components/ui/theme-switcher'
import { useTheme } from '@/contexts/ThemeContext'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import {
  Eye,
  Keyboard,
  Monitor,
  Contrast,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Accessibility,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react'

interface AccessibilityScore {
  overall: number
  theme: number
  keyboard: number
  motion: number
  contrast: number
  screenReader: number
}

export function AccessibilityDashboard() {
  const { resolvedTheme, isHighContrast, prefersReducedMotion } = useTheme()
  const [score, setScore] = useState<AccessibilityScore>({
    overall: 78,
    theme: 92,
    keyboard: 85,
    motion: 95,
    contrast: 88,
    screenReader: 72
  })
  const [lastAudit, setLastAudit] = useState<string>(new Date().toISOString())
  const [isAuditing, setIsAuditing] = useState(false)

  const runFullAudit = async () => {
    setIsAuditing(true)

    // Simulate comprehensive audit
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Calculate new scores based on current settings
    const newScore: AccessibilityScore = {
      overall: 0,
      theme: resolvedTheme ? 95 : 60,
      keyboard: 85, // Would come from keyboard navigation tests
      motion: prefersReducedMotion ? 100 : 90,
      contrast: isHighContrast ? 100 : 88,
      screenReader: 72
    }

    newScore.overall = Math.round(
      (newScore.theme + newScore.keyboard + newScore.motion + newScore.contrast + newScore.screenReader) / 5
    )

    setScore(newScore)
    setLastAudit(new Date().toISOString())
    setIsAuditing(false)
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const exportAccessibilityReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      accessibilityScore: score,
      currentSettings: {
        theme: resolvedTheme,
        isHighContrast,
        prefersReducedMotion
      },
      lastAudit,
      recommendations: [
        "Consider adding ARIA labels to custom interactive elements",
        "Test keyboard navigation with actual keyboard users",
        "Add screen reader testing to your QA process",
        "Ensure all color combinations meet WCAG contrast requirements"
      ]
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility Dashboard
          </CardTitle>
          <CardDescription>
            Monitor and manage accessibility features across the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(score.overall)}`}>
                  {score.overall}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Last audit: {new Date(lastAudit).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={runFullAudit} disabled={isAuditing}>
                {isAuditing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Full Audit
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={exportAccessibilityReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Accessibility Settings
          </CardTitle>
          <CardDescription>
            Active accessibility features and user preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Theme</span>
                <Badge variant="outline" className="capitalize">
                  {resolvedTheme}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">High Contrast</span>
                <Badge variant={isHighContrast ? 'default' : 'secondary'}>
                  {isHighContrast ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <ThemeSwitcher variant="compact" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reduced Motion</span>
                <Badge variant={prefersReducedMotion ? 'default' : 'secondary'}>
                  {prefersReducedMotion ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Focus Visible</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Screen Reader</span>
                <Badge variant="outline">Detected</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Quick Actions</h4>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <Keyboard className="h-3 w-3 mr-2" />
                  Test Keyboard Navigation
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <Contrast className="h-3 w-3 mr-2" />
                  Check Color Contrast
                </Button>
                <Button size="sm" variant="outline" className="w-full justify-start">
                  <Monitor className="h-3 w-3 mr-2" />
                  Test Screen Reader
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Score Breakdown</CardTitle>
          <CardDescription>
            Detailed scores for different accessibility categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(score).filter(([key]) => key !== 'overall').map(([category, categoryScore]) => {
              const categoryLabels: Record<string, string> = {
                theme: 'Theme & Visual',
                keyboard: 'Keyboard Navigation',
                motion: 'Motion & Animation',
                contrast: 'Color Contrast',
                screenReader: 'Screen Reader'
              }

              return (
                <div key={category} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {categoryLabels[category]}
                    </span>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(categoryScore)}
                      <span className={`text-sm font-semibold ${getScoreColor(categoryScore)}`}>
                        {categoryScore}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        categoryScore >= 90 ? 'bg-green-500' :
                        categoryScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${categoryScore}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="keyboard" className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">Keyboard</span>
          </TabsTrigger>
          <TabsTrigger value="motion" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Motion</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <AccessibilityAudit />
        </TabsContent>

        <TabsContent value="keyboard" className="space-y-4">
          <KeyboardNavigation />
        </TabsContent>

        <TabsContent value="motion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Motion & Animation Settings</CardTitle>
              <CardDescription>
                Configure animation preferences and reduced motion support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Current Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Reduced Motion</div>
                          <div className="text-sm text-muted-foreground">
                            System preference detected
                          </div>
                        </div>
                        <Badge variant={prefersReducedMotion ? 'default' : 'secondary'}>
                          {prefersReducedMotion ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Animation Duration</div>
                          <div className="text-sm text-muted-foreground">
                            {prefersReducedMotion ? 'Reduced (100ms max)' : 'Normal (300ms)'}
                          </div>
                        </div>
                        <Badge variant="outline">Optimized</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Animation Features</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Smooth transitions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Reduced motion alternatives</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Hover effects with keyboard support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Focus-visible animations</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Reduced Motion Best Practices
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        The application automatically respects user&apos;s reduced motion preferences
                        and provides alternative interactions when animations are disabled.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Documentation</CardTitle>
              <CardDescription>
                Resources and guidelines for accessible development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Development Guidelines</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Semantic HTML:</strong> Use proper HTML elements for their intended purpose
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>ARIA Labels:</strong> Provide meaningful labels for custom components
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Keyboard Navigation:</strong> Ensure all interactions work without a mouse
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Color Contrast:</strong> Maintain sufficient contrast for readability
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Motion Sensitivity:</strong> Respect reduced motion preferences
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Testing Resources</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Screen Reader Testing:</strong> Test with NVDA, JAWS, and VoiceOver
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Keyboard className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Keyboard Only:</strong> Navigate using only Tab, Enter, and arrow keys
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Color Blindness:</strong> Test with color blindness simulators
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Motion Testing:</strong> Test with reduced motion enabled
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      WCAG 2.1 Compliance
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      This application aims to meet WCAG 2.1 Level AA standards.
                      Use this dashboard to monitor compliance and identify areas for improvement.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
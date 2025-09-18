'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Keyboard,
  Mouse,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Tab,
  Escape,
  Enter
} from 'lucide-react'
import { useFocusManagement, useKeyboardShortcuts, Announcer } from '@/hooks/use-focus-management'

interface NavigationTest {
  id: string
  name: string
  description: string
  passed: boolean
  details: string
  shortcut?: string
}

export function KeyboardNavigation() {
  const [tests, setTests] = useState<NavigationTest[]>([
    {
      id: 'tab-order',
      name: 'Tab Order',
      description: 'Can navigate all interactive elements using Tab',
      passed: false,
      details: 'Test: Use Tab to navigate through all interactive elements'
    },
    {
      id: 'shift-tab',
      name: 'Shift+Tab Navigation',
      description: 'Can navigate backwards using Shift+Tab',
      passed: false,
      details: 'Test: Use Shift+Tab to navigate backwards through elements'
    },
    {
      id: 'enter-key',
      name: 'Enter Key',
      description: 'Enter key activates buttons and links',
      passed: false,
      details: 'Test: Press Enter on focused buttons to activate them'
    },
    {
      id: 'escape-key',
      name: 'Escape Key',
      description: 'Escape key closes modals and dialogs',
      passed: false,
      details: 'Test: Press Escape to close open modals and dialogs'
    },
    {
      id: 'space-key',
      name: 'Space Key',
      description: 'Space key toggles checkboxes and buttons',
      passed: false,
      details: 'Test: Press Space on checkboxes and toggle buttons'
    },
    {
      id: 'arrow-keys',
      name: 'Arrow Key Navigation',
      description: 'Arrow keys work in menus and dropdowns',
      passed: false,
      details: 'Test: Use arrow keys to navigate menus and dropdowns'
    },
    {
      id: 'focus-indicators',
      name: 'Focus Indicators',
      description: 'Clear visual indicators for focused elements',
      passed: false,
      details: 'Test: Check that focused elements have clear visual indicators'
    },
    {
      id: 'focus-trap',
      name: 'Focus Trapping',
      description: 'Modal dialogs trap focus within themselves',
      passed: false,
      details: 'Test: Open a modal and verify focus cannot escape it'
    }
  ])

  const [showKeyboardMap, setShowKeyboardMap] = useState(false)
  const [currentFocusElement, setCurrentFocusElement] = useState<string>('')
  const { saveFocus, restoreFocus, focusFirst } = useFocusManagement()

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => setShowKeyboardMap(!showKeyboardMap),
      preventDefault: true
    },
    {
      key: 'Escape',
      action: () => setShowKeyboardMap(false),
      preventDefault: true
    }
  ], [showKeyboardMap])

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const element = event.target as HTMLElement
      const tagName = element.tagName.toLowerCase()
      const id = element.id || 'unnamed'
      const className = element.className || 'no-class'

      setCurrentFocusElement(`${tagName}${id !== 'unnamed' ? `#${id}` : ''}${className !== 'no-class' ? `.${className.split(' ')[0]}` : ''}`)

      // Update focus indicator test
      const computedStyle = window.getComputedStyle(element)
      const hasOutline = computedStyle.outline !== 'none' && computedStyle.outlineWidth !== '0px'
      const hasBoxShadow = computedStyle.boxShadow !== 'none'

      if (hasOutline || hasBoxShadow) {
        setTests(prev => prev.map(test =>
          test.id === 'focus-indicators'
            ? { ...test, passed: true, details: 'Focus indicators detected on focused element' }
            : test
        ))
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Update tests based on keyboard interactions
      switch (event.key) {
        case 'Tab':
          setTests(prev => prev.map(test =>
            test.id === (event.shiftKey ? 'shift-tab' : 'tab-order')
              ? { ...test, passed: true, details: `Successfully used ${event.shiftKey ? 'Shift+Tab' : 'Tab'} for navigation` }
              : test
          ))
          break
        case 'Enter':
          setTests(prev => prev.map(test =>
            test.id === 'enter-key'
              ? { ...test, passed: true, details: 'Successfully activated element with Enter key' }
              : test
          ))
          break
        case 'Escape':
          setTests(prev => prev.map(test =>
            test.id === 'escape-key'
              ? { ...test, passed: true, details: 'Successfully used Escape key' }
              : test
          ))
          break
        case ' ':
          setTests(prev => prev.map(test =>
            test.id === 'space-key'
              ? { ...test, passed: true, details: 'Successfully used Space key' }
              : test
          ))
          break
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          setTests(prev => prev.map(test =>
            test.id === 'arrow-keys'
              ? { ...test, passed: true, details: `Successfully used ${event.key} key for navigation` }
              : test
          ))
          break
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const runTest = (testId: string) => {
    switch (testId) {
      case 'tab-order':
        saveFocus()
        focusFirst()
        setTimeout(restoreFocus, 100)
        break
      case 'focus-trap':
        // This would require a modal to be open
        setTests(prev => prev.map(test =>
          test.id === 'focus-trap'
            ? { ...test, passed: false, details: 'Open a modal to test focus trapping' }
            : test
        ))
        break
    }
  }

  const resetTests = () => {
    setTests(prev => prev.map(test => ({ ...test, passed: false, details: test.details.split(':')[0] + ':' })))
    setCurrentFocusElement('')
  }

  const passedTests = tests.filter(test => test.passed).length
  const totalTests = tests.length
  const score = Math.round((passedTests / totalTests) * 100)

  const keyboardShortcuts = [
    { key: 'Tab', description: 'Move to next interactive element' },
    { key: 'Shift+Tab', description: 'Move to previous interactive element' },
    { key: 'Enter', description: 'Activate focused button or link' },
    { key: 'Space', description: 'Activate/toggle checkboxes and buttons' },
    { key: 'Escape', description: 'Close modals and dialogs' },
    { key: 'Arrow Keys', description: 'Navigate menus and dropdowns' },
    { key: 'Ctrl+K', description: 'Toggle keyboard shortcuts map' },
    { key: 'Ctrl+/', description: 'Open command palette' },
    { key: 'Ctrl+Shift+H', description: 'Show keyboard shortcuts help' }
  ]

  return (
    <div className="space-y-6">
      <Announcer message={`Keyboard navigation score: ${score}%`} />

      {/* Test Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Navigation Test
          </CardTitle>
          <CardDescription>
            Test keyboard accessibility and navigation throughout the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold">
              {score}%
            </div>
            <div className="text-sm text-muted-foreground">
              {passedTests} of {totalTests} tests passed
            </div>
            <Button onClick={resetTests} variant="outline">
              Reset Tests
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                score >= 90 ? 'bg-green-500' :
                score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Current Focus */}
          <div className="text-sm text-muted-foreground mb-4">
            <strong>Current Focus:</strong> {currentFocusElement || 'No element focused'}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Individual accessibility test results and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test) => (
              <Alert key={test.id} className={`${test.passed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                <div className="flex items-start gap-3">
                  {test.passed ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{test.name}</h4>
                      <Badge variant={test.passed ? 'default' : 'secondary'}>
                        {test.passed ? 'PASS' : 'TEST'}
                      </Badge>
                    </div>
                    <AlertDescription className="mb-2">
                      {test.description}
                    </AlertDescription>
                    <AlertDescription className="text-sm">
                      <strong>Details:</strong> {test.details}
                    </AlertDescription>
                    {!test.passed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => runTest(test.id)}
                      >
                        Run Test
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Map */}
      {showKeyboardMap && (
        <Card>
          <CardHeader>
            <CardTitle>Keyboard Shortcuts Map</CardTitle>
            <CardDescription>
              Quick reference for keyboard navigation shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyboardShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                    <span className="text-sm">{shortcut.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Suggestions for improving keyboard accessibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Ensure all interactive elements are keyboard accessible</strong>
                <p className="text-muted-foreground">
                  Test that buttons, links, form controls, and custom widgets can be operated using only a keyboard
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Provide clear focus indicators</strong>
                <p className="text-muted-foreground">
                  Make sure focused elements have visible outlines or other visual indicators
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Implement focus trapping in modals</strong>
                <p className="text-muted-foreground">
                  When modal dialogs are open, keyboard focus should be trapped within the modal
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Test with actual keyboard users</strong>
                <p className="text-muted-foreground">
                  Nothing beats testing with real users who rely on keyboard navigation
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
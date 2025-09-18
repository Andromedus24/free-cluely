import { useEffect, useRef, ReactNode } from 'react'

export interface FocusTrapProps {
  children: ReactNode
  active?: boolean
  onEscape?: () => void
  onEnter?: () => void
}

export function FocusTrap({ children, active = true, onEscape, onEnter }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previousActiveElement.current = document.activeElement as HTMLElement
    const container = containerRef.current

    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    firstElement.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.()
        previousActiveElement.current?.focus()
        return
      }

      if (event.key === 'Enter') {
        onEnter?.()
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
          } else {
            const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement)
            if (currentIndex > 0) {
              focusableElements[currentIndex - 1].focus()
            }
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
          } else {
            const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement)
            if (currentIndex < focusableElements.length - 1) {
              focusableElements[currentIndex + 1].focus()
            }
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      previousActiveElement.current?.focus()
    }
  }, [active, onEscape, onEnter])

  return <div ref={containerRef}>{children}</div>
}

export function useFocusManagement() {
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const saveFocus = () => {
    lastFocusedRef.current = document.activeElement as HTMLElement
  }

  const restoreFocus = () => {
    if (lastFocusedRef.current) {
      lastFocusedRef.current.focus()
    }
  }

  const focusFirst = (selector?: string) => {
    const target = selector
      ? document.querySelector(selector) as HTMLElement
      : document.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement

    if (target) {
      target.focus()
    }
  }

  const focusLast = (selector?: string) => {
    const elements = selector
      ? document.querySelectorAll(selector) as NodeListOf<HTMLElement>
      : document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as NodeListOf<HTMLElement>

    if (elements.length > 0) {
      elements[elements.length - 1].focus()
    }
  }

  const moveFocus = (direction: 'next' | 'previous', selector?: string) => {
    const elements = selector
      ? document.querySelectorAll(selector) as NodeListOf<HTMLElement>
      : document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as NodeListOf<HTMLElement>

    const currentFocus = document.activeElement as HTMLElement
    const currentIndex = Array.from(elements).indexOf(currentFocus)

    if (currentIndex === -1) return

    let nextIndex: number
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % elements.length
    } else {
      nextIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1
    }

    elements[nextIndex].focus()
  }

  return {
    saveFocus,
    restoreFocus,
    focusFirst,
    focusLast,
    moveFocus
  }
}

export function useKeyboardShortcuts(shortcuts: Array<{
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  action: () => void
  preventDefault?: boolean
}>, dependencies: any[] = []) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrl
        const altMatches = !!event.altKey === !!shortcut.alt
        const shiftMatches = !!event.shiftKey === !!shortcut.shift
        const metaMatches = !!event.metaKey === !!shortcut.meta

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.action()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, dependencies)
}

export interface AnnouncerProps {
  message: string
  politeness?: 'polite' | 'assertive'
  timeout?: number
}

export function Announcer({ message, politeness = 'polite', timeout = 1000 }: AnnouncerProps) {
  const announcementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message

      const timer = setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = ''
        }
      }, timeout)

      return () => clearTimeout(timer)
    }
  }, [message, timeout])

  return (
    <div
      ref={announcementRef}
      aria-live={politeness}
      aria-atomic
      className="sr-only"
    />
  )
}
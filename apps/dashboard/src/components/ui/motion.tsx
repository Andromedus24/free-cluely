'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion, useAnimate } from '@/hooks/use-reduced-motion'

export interface MotionProps {
  children: React.ReactNode
  className?: string
  animation?: 'fade' | 'slide' | 'scale' | 'bounce' | 'spin' | 'pulse' | 'none'
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: number
  delay?: number
  easing?: string
  repeat?: boolean
  repeatDelay?: number
  hover?: boolean
  disabled?: boolean
  onAnimationComplete?: () => void
  reducedMotionAlternative?: 'instant' | 'simple' | 'none'
}

export function Motion({
  children,
  className,
  animation = 'fade',
  direction = 'up',
  duration = 300,
  delay = 0,
  easing = 'ease',
  repeat = false,
  repeatDelay = 0,
  hover = false,
  disabled = false,
  onAnimationComplete,
  reducedMotionAlternative = 'simple'
}: MotionProps) {
  const { prefersReducedMotion } = useReducedMotion()
  const elementRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const shouldAnimate = !disabled && isVisible && (hover ? isHovered : true)
  const { animate, isAnimating } = useAnimate(elementRef, getKeyframes(), {
    duration: prefersReducedMotion ? getReducedMotionDuration() : duration,
    delay,
    easing,
    iterations: repeat ? Infinity : 1,
    iterationStart: 0
  })

  function getReducedMotionDuration(): number {
    switch (reducedMotionAlternative) {
      case 'instant':
        return 0
      case 'simple':
        return Math.min(duration, 100)
      case 'none':
        return 0
      default:
        return Math.min(duration, 100)
    }
  }

  function getKeyframes(): Keyframe[] | null {
    if (prefersReducedMotion && reducedMotionAlternative === 'none') {
      return null
    }

    switch (animation) {
      case 'fade':
        return [
          { opacity: 0 },
          { opacity: 1 }
        ]
      case 'slide':
        const slideDistance = 20
        const slideKeyframes: Record<string, Keyframe[]> = {
          up: [{ transform: 'translateY(20px)' }, { transform: 'translateY(0)' }],
          down: [{ transform: 'translateY(-20px)' }, { transform: 'translateY(0)' }],
          left: [{ transform: 'translateX(20px)' }, { transform: 'translateX(0)' }],
          right: [{ transform: 'translateX(-20px)' }, { transform: 'translateX(0)' }]
        }
        return slideKeyframes[direction]
      case 'scale':
        return [
          { transform: 'scale(0.8)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ]
      case 'bounce':
        return prefersReducedMotion ? [
          { transform: 'translateY(0)' },
          { transform: 'translateY(0)' }
        ] : [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-10px)' },
          { transform: 'translateY(0)' }
        ]
      case 'spin':
        return prefersReducedMotion ? [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(0deg)' }
        ] : [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ]
      case 'pulse':
        return prefersReducedMotion ? [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1)', opacity: 1 }
        ] : [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.05)', opacity: 0.8 },
          { transform: 'scale(1)', opacity: 1 }
        ]
      case 'none':
        return null
      default:
        return null
    }
  }

  const handleMouseEnter = useCallback(() => {
    if (hover) setIsHovered(true)
  }, [hover])

  const handleMouseLeave = useCallback(() => {
    if (hover) setIsHovered(false)
  }, [hover])

  useEffect(() => {
    if (!elementRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (shouldAnimate && !isAnimating) {
      animate()
    }
  }, [shouldAnimate, animate, isAnimating])

  useEffect(() => {
    if (isAnimating === false && shouldAnimate) {
      onAnimationComplete?.()
    }
  }, [isAnimating, shouldAnimate, onAnimationComplete])

  return (
    <div
      ref={elementRef}
      className={cn(
        'motion-component',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        // For reduced motion, we can apply instant changes
        opacity: prefersReducedMotion && reducedMotionAlternative === 'instant' && animation === 'fade' ? 1 : undefined,
        transform: prefersReducedMotion && reducedMotionAlternative === 'instant' && animation === 'slide' ? 'translateY(0)' : undefined
      }}
    >
      {children}
    </div>
  )
}

export interface TransitionProps {
  children: React.ReactNode
  show: boolean
  type?: 'fade' | 'slide' | 'scale'
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: number
  delay?: number
  easing?: string
  className?: string
  unmount?: boolean
}

export function Transition({
  children,
  show,
  type = 'fade',
  direction = 'up',
  duration = 300,
  delay = 0,
  easing = 'ease',
  className,
  unmount = true
}: TransitionProps) {
  const { prefersReducedMotion } = useReducedMotion()
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(show)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const actualDuration = prefersReducedMotion ? Math.min(duration, 100) : duration

  const getTransitionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      transition: `all ${actualDuration}ms ${easing}`,
      transitionDelay: `${delay}ms`
    }

    if (!show && !isVisible) {
      switch (type) {
        case 'fade':
          return { ...baseStyles, opacity: 0 }
        case 'slide':
          const slideDistance = 20
          const slideStyles: Record<string, React.CSSProperties> = {
            up: { ...baseStyles, opacity: 0, transform: 'translateY(-20px)' },
            down: { ...baseStyles, opacity: 0, transform: 'translateY(20px)' },
            left: { ...baseStyles, opacity: 0, transform: 'translateX(-20px)' },
            right: { ...baseStyles, opacity: 0, transform: 'translateX(20px)' }
          }
          return slideStyles[direction]
        case 'scale':
          return { ...baseStyles, opacity: 0, transform: 'scale(0.8)' }
      }
    }

    return baseStyles
  }

  const getVisibleStyles = (): React.CSSProperties => {
    switch (type) {
      case 'fade':
        return { opacity: 1 }
      case 'slide':
        return { opacity: 1, transform: 'translateY(0)' }
      case 'scale':
        return { opacity: 1, transform: 'scale(1)' }
      default:
        return {}
    }
  }

  useEffect(() => {
    if (show !== isVisible) {
      setIsTransitioning(true)

      const timer = setTimeout(() => {
        setIsVisible(show)
        setIsTransitioning(false)
      }, actualDuration + delay)

      return () => clearTimeout(timer)
    }
  }, [show, isVisible, actualDuration, delay])

  if (unmount && !show && !isTransitioning) {
    return null
  }

  return (
    <div
      ref={elementRef}
      className={cn('transition-component', className)}
      style={{
        ...getTransitionStyles(),
        ...(isVisible ? getVisibleStyles() : {})
      }}
    >
      {children}
    </div>
  )
}

// Specialized components for common animations
export function FadeIn({ children, ...props }: Omit<MotionProps, 'animation'>) {
  return <Motion {...props} animation="fade">{children}</Motion>
}

export function SlideIn({ children, direction = 'up', ...props }: Omit<MotionProps, 'animation' | 'direction'>) {
  return <Motion {...props} animation="slide" direction={direction}>{children}</Motion>
}

export function ScaleIn({ children, ...props }: Omit<MotionProps, 'animation'>) {
  return <Motion {...props} animation="scale">{children}</Motion>
}

export function Spinner({ className, size = 'md', reducedMotionAlternative = 'simple' }: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  reducedMotionAlternative?: 'instant' | 'simple' | 'none'
}) {
  const { prefersReducedMotion } = useReducedMotion()

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  if (prefersReducedMotion && reducedMotionAlternative === 'none') {
    return (
      <div className={cn('inline-block', sizeClasses[size], className)}>
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  if (prefersReducedMotion && reducedMotionAlternative === 'simple') {
    return (
      <div className={cn('inline-block animate-pulse', sizeClasses[size], className)}>
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  return (
    <div className={cn('inline-block animate-spin', sizeClasses[size], className)}>
      <svg
        className="h-full w-full text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  )
}
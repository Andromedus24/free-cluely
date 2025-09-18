import { useEffect, useState, useCallback } from 'react'

export type MotionPreference = 'reduce' | 'no-preference'

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [motionPreference, setMotionPreference] = useState<MotionPreference>('no-preference')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      const prefersReduce = event.matches
      setPrefersReducedMotion(prefersReduce)
      setMotionPreference(prefersReduce ? 'reduce' : 'no-preference')
    }

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)
    setMotionPreference(mediaQuery.matches ? 'reduce' : 'no-preference')

    // Add listener for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return { prefersReducedMotion, motionPreference }
}

export function useMotionAnimation(
  shouldAnimate: boolean = true,
  reducedMotionAlternative?: () => void
) {
  const { prefersReducedMotion } = useReducedMotion()

  const shouldRunAnimation = shouldAnimate && !prefersReducedMotion

  useEffect(() => {
    if (!shouldRunAnimation && reducedMotionAlternative) {
      reducedMotionAlternative()
    }
  }, [shouldRunAnimation, reducedMotionAlternative])

  return { shouldRunAnimation, prefersReducedMotion }
}

export interface MotionProps {
  duration?: number
  delay?: number
  easing?: string
  fill?: 'forwards' | 'backwards' | 'both' | 'none'
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  iterations?: number | 'infinite'
}

export function useAnimate(
  elementRef: React.RefObject<HTMLElement>,
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  options: MotionProps & KeyframeAnimationOptions = {}
) {
  const { prefersReducedMotion } = useReducedMotion()
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<Animation | null>(null)

  const animate = useCallback(() => {
    if (!elementRef.current || !keyframes || prefersReducedMotion) {
      return
    }

    if (animationRef.current) {
      animationRef.current.cancel()
    }

    const animation = elementRef.current.animate(keyframes, {
      duration: options.duration || 300,
      delay: options.delay || 0,
      easing: options.easing || 'ease',
      fill: options.fill || 'forwards',
      direction: options.direction || 'normal',
      iterations: options.iterations || 1,
      ...options
    })

    animationRef.current = animation
    setIsAnimating(true)

    animation.onfinish = () => {
      setIsAnimating(false)
    }

    animation.oncancel = () => {
      setIsAnimating(false)
    }

    return animation
  }, [elementRef, keyframes, options, prefersReducedMotion])

  const cancel = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel()
      animationRef.current = null
      setIsAnimating(false)
    }
  }, [])

  const finish = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.finish()
      animationRef.current = null
      setIsAnimating(false)
    }
  }, [])

  const pause = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.pause()
    }
  }, [])

  const play = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.play()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel()
      }
    }
  }, [])

  return {
    animate,
    cancel,
    finish,
    pause,
    play,
    isAnimating,
    prefersReducedMotion
  }
}

export interface TransitionOptions {
  property: string
  duration?: number
  delay?: number
  easing?: string
  reducedMotionDuration?: number
}

export function useTransition(
  elementRef: React.RefObject<HTMLElement>,
  options: TransitionOptions
) {
  const { prefersReducedMotion } = useReducedMotion()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const applyTransition = useCallback((value: string) => {
    if (!elementRef.current) return

    const duration = prefersReducedMotion
      ? options.reducedMotionDuration || 0
      : options.duration || 300

    const element = elementRef.current
    element.style.transition = `${options.property} ${duration}ms ${options.easing || 'ease'} ${options.delay || 0}ms`
    element.style[options.property as any] = value

    setIsTransitioning(true)

    const handleTransitionEnd = () => {
      setIsTransitioning(false)
      element.removeEventListener('transitionend', handleTransitionEnd)
    }

    element.addEventListener('transitionend', handleTransitionEnd)
  }, [elementRef, options, prefersReducedMotion])

  return {
    applyTransition,
    isTransitioning,
    prefersReducedMotion
  }
}

export function createReducedMotionStyles<T extends Record<string, any>>(
  normalStyles: T,
  reducedMotionStyles: Partial<T>
) {
  const { prefersReducedMotion } = useReducedMotion()

  return prefersReducedMotion ? { ...normalStyles, ...reducedMotionStyles } : normalStyles
}

export function useReducedMotionValue<T>(
  normalValue: T,
  reducedMotionValue: T
): T {
  const { prefersReducedMotion } = useReducedMotion()
  return prefersReducedMotion ? reducedMotionValue : normalValue
}

// Hook for handling parallax effects with reduced motion support
export function useParallax(
  elementRef: React.RefObject<HTMLElement>,
  options: {
    speed?: number
    direction?: 'vertical' | 'horizontal'
    disabled?: boolean
  } = {}
) {
  const { prefersReducedMotion } = useReducedMotion()
  const { speed = 0.5, direction = 'vertical', disabled = false } = options
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion || disabled) return

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [prefersReducedMotion, disabled])

  useEffect(() => {
    if (!elementRef.current || prefersReducedMotion || disabled) return

    const element = elementRef.current
    const offset = scrollY * speed

    if (direction === 'vertical') {
      element.style.transform = `translateY(${offset}px)`
    } else {
      element.style.transform = `translateX(${offset}px)`
    }
  }, [scrollY, elementRef, speed, direction, prefersReducedMotion, disabled])

  return { scrollY, prefersReducedMotion, disabled }
}

// Hook for handling hover effects with reduced motion support
export function useHoverEffect(
  elementRef: React.RefObject<HTMLElement>,
  hoverStyles: CSSStyleDeclaration,
  normalStyles: CSSStyleDeclaration,
  options: {
    duration?: number
    reducedMotionDuration?: number
  } = {}
) {
  const { prefersReducedMotion } = useReducedMotion()
  const { duration = 200, reducedMotionDuration = 0 } = options

  useEffect(() => {
    if (!elementRef.current) return

    const element = elementRef.current
    const transitionDuration = prefersReducedMotion ? reducedMotionDuration : duration

    element.style.transition = `all ${transitionDuration}ms ease`

    const handleMouseEnter = () => {
      Object.assign(element.style, hoverStyles)
    }

    const handleMouseLeave = () => {
      Object.assign(element.style, normalStyles)
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [elementRef, hoverStyles, normalStyles, duration, reducedMotionDuration, prefersReducedMotion])

  return { prefersReducedMotion }
}
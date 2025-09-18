import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  clearable?: boolean
  maxLength?: number
  showCount?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    error = false,
    helperText,
    leftIcon,
    rightIcon,
    clearable = false,
    maxLength,
    showCount = false,
    value,
    onChange,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || '')
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value)
      onChange?.(e)
    }

    const handleClear = () => {
      setInternalValue('')
      const event = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(event)
      inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && clearable && internalValue) {
        handleClear()
      }
      props.onKeyDown?.(e)
    }

    const inputValue = value !== undefined ? value : internalValue
    const showClearButton = clearable && inputValue && !props.disabled
    const showCharacterCount = showCount && maxLength

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref) {
              ref.current = node
            }
            inputRef.current = node
          }}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            error && "border-destructive focus-visible:ring-destructive",
            leftIcon && "pl-10",
            (rightIcon || showClearButton) && "pr-10",
            (showCharacterCount || helperText) && "pb-8",
            className
          )}
          aria-invalid={error}
          aria-describedby={helperText || showCharacterCount ? `${props.id}-helper` : undefined}
          {...props}
        />

        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded p-1"
            aria-label="Clear input"
            tabIndex={0}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {rightIcon && !showClearButton && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
            {rightIcon}
          </div>
        )}

        {(helperText || showCharacterCount) && (
          <div className="absolute bottom-1 left-3 right-3 flex justify-between items-center">
            {helperText && (
              <span
                id={`${props.id}-helper`}
                className={cn(
                  "text-xs",
                  error ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {helperText}
              </span>
            )}
            {showCharacterCount && (
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  inputValue.length > maxLength * 0.9 && "text-warning",
                  inputValue.length >= maxLength && "text-destructive"
                )}
              >
                {inputValue.length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
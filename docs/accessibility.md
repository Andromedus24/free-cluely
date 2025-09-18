# Accessibility Guide for Atlas AI Assistant

## Overview

This guide outlines the accessibility features and best practices implemented in the Atlas AI Assistant application. The application is designed to be inclusive and usable by people with diverse abilities, following WCAG 2.1 Level AA guidelines.

## Features Implemented

### 1. Theme System & Visual Accessibility

#### Multi-Theme Support
- **Light Theme**: High contrast, clear typography
- **Dark Theme**: Reduced eye strain in low-light environments
- **High Contrast Theme**: Maximum contrast for visual impairments
- **System Theme**: Respects user's operating system preference

#### Focus Management
- Clear focus indicators with customizable colors
- Keyboard navigation support throughout the application
- Focus trapping for modal dialogs
- Skip to content links for screen readers

#### Color Contrast
- WCAG-compliant color combinations
- Real-time contrast ratio validation
- High contrast mode support
- Color-independent navigation cues

### 2. Keyboard Navigation

#### Global Shortcuts
- `Ctrl/Cmd + K`: Open search/command palette
- `Ctrl/Cmd + /`: Quick help
- `Ctrl/Cmd + Shift + H`: Keyboard shortcuts help
- `Ctrl/Cmd + Shift + T`: Cycle themes
- `Escape`: Close modals and dialogs

#### Navigation Patterns
- Logical tab order for all interactive elements
- Arrow key navigation for menus and dropdowns
- Enter/Space key activation for buttons and controls
- Keyboard-accessible tooltips and hover states

### 3. Motion & Animation

#### Reduced Motion Support
- Automatically detects user's `prefers-reduced-motion` setting
- Provides alternative interactions for animations
- Configurable animation durations and easing
- Instant alternatives for motion-sensitive users

#### Animation Components
- `Motion` component with reduced motion alternatives
- `Transition` component for smooth state changes
- `Spinner` with reduced motion options
- Hover effects with keyboard support

### 4. Screen Reader Support

#### Semantic HTML
- Proper heading structure (H1-H6)
- Landmark regions (navigation, main, complementary)
- ARIA labels and descriptions
- Live regions for dynamic content

#### Form Accessibility
- Properly associated labels with inputs
- Error messages with ARIA attributes
- Instructions and helper text
- Form validation feedback

## Components and Usage

### Theme Switcher

```tsx
import { ThemeSwitcher } from '@/components/ui/theme-switcher'

// Basic usage
<ThemeSwitcher />

// With label
<ThemeSwitcher showLabel />

// Compact version
<ThemeSwitcher variant="compact" />

// With custom class
<ThemeSwitcher className="custom-theme-switcher" />
```

### Focus Management

```tsx
import { useFocusManagement, FocusTrap } from '@/hooks/use-focus-management'

// Focus trap for modals
<FocusTrap active={isOpen} onEscape={onClose}>
  <div>
    {/* Modal content */}
  </div>
</FocusTrap>

// Programmatic focus control
const { saveFocus, restoreFocus, focusFirst } = useFocusManagement()

// Save focus before opening modal
saveFocus()
// Later restore focus
restoreFocus()
```

### Motion with Reduced Motion

```tsx
import { Motion, useReducedMotion } from '@/components/ui/motion'

// Basic motion with reduced motion support
<Motion animation="fade" duration={300}>
  <div>Content</div>
</Motion>

// Conditional animations
const { prefersReducedMotion } = useReducedMotion()

<Motion
  animation={prefersReducedMotion ? 'none' : 'slide'}
  reducedMotionAlternative="instant"
>
  <div>Animated Content</div>
</Motion>
```

### Enhanced Input Component

```tsx
import { Input } from '@/components/ui/input'

// Input with error handling
<Input
  error={hasError}
  helperText="Enter your email address"
  type="email"
  placeholder="user@example.com"
/>

// Input with icons and clear button
<Input
  leftIcon={<Mail className="h-4 w-4" />}
  clearable
  maxLength={100}
  showCount
/>
```

### Keyboard Navigation Testing

```tsx
import { KeyboardNavigation } from '@/components/accessibility/KeyboardNavigation'

// Add to settings page for testing
<KeyboardNavigation />
```

## Testing Guidelines

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Can navigate to all interactive elements using Tab
- [ ] Can navigate backwards using Shift+Tab
- [ ] Enter key activates buttons and links
- [ ] Space key toggles checkboxes and buttons
- [ ] Arrow keys work in menus and dropdowns
- [ ] Escape key closes modals and dialogs
- [ ] Focus indicators are clearly visible

#### Screen Reader Testing
- [ ] Content is read in logical order
- [ ] Form fields have proper labels
- [ ] Dynamic content announcements work
- [ ] Error messages are announced
- [ ] Landmark regions are properly identified

#### Visual Accessibility
- [ ] Text contrast meets WCAG standards (4.5:1 minimum)
- [ ] Color is not the only indicator of information
- [ ] Text can be resized to 200% without breaking layout
- [ ] Hover states are accessible via keyboard
- [ ] Focus states are clearly visible

#### Motion Sensitivity
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No essential content is lost without motion
- [ ] Timeouts can be extended or disabled
- [ ] Auto-playing content can be paused

### Automated Testing

```bash
# Run accessibility tests
npm test -- --accessibility

# Check contrast ratios
npm run check-contrast

# Validate ARIA attributes
npm run validate-aria
```

## Best Practices

### Development Guidelines

1. **Semantic HTML First**
   - Use appropriate HTML elements for their intended purpose
   - Maintain proper heading hierarchy
   - Use landmarks for major page sections

2. **Keyboard Accessibility**
   - Ensure all interactive elements are keyboard accessible
   - Provide visible focus indicators
   - Implement logical tab order

3. **ARIA Usage**
   - Use ARIA roles when semantic HTML isn't sufficient
   - Provide meaningful labels and descriptions
   - Use live regions for dynamic content

4. **Color and Contrast**
   - Don't rely on color alone to convey information
   - Maintain sufficient contrast ratios
   - Test with different color vision deficiencies

5. **Motion and Animation**
   - Respect reduced motion preferences
   - Provide alternatives for animated content
   - Allow users to control auto-playing media

### Code Examples

#### Accessible Button

```tsx
// Good: Proper ARIA and keyboard support
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  aria-label="Add new item"
  aria-pressed={isActive}
>
  <Plus className="h-4 w-4" />
  <span>Add Item</span>
</button>

// Bad: No keyboard support or ARIA
<div onClick={handleClick}>
  <Plus className="h-4 w-4" />
  Add Item
</div>
```

#### Accessible Form

```tsx
// Good: Proper labels and error handling
<div className="space-y-2">
  <label htmlFor="email" className="block text-sm font-medium">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    aria-invalid={!!error}
    aria-describedby={error ? 'email-error' : undefined}
    className="w-full px-3 py-2 border rounded-md"
  />
  {error && (
    <div id="email-error" className="text-sm text-red-600" role="alert">
      {error}
    </div>
  )}
</div>

// Bad: Missing labels and error handling
<div>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full px-3 py-2 border rounded-md"
  />
  {error && <div>{error}</div>}
</div>
```

## Configuration

### Theme Configuration

```tsx
// Custom theme colors
:root {
  --focus-ring-color: var(--color-primary-500);
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
}

// High contrast overrides
@media (prefers-contrast: high) {
  :root {
    --focus-ring-width: 3px;
    --focus-ring-offset: 0;
  }
}
```

### Motion Configuration

```tsx
// Default animation settings
const motionSettings = {
  duration: 300,
  reducedMotionDuration: 100,
  easing: 'ease',
  reducedMotionAlternative: 'simple'
}

// Custom animation with reduced motion support
<Motion
  animation="slide"
  duration={motionSettings.duration}
  reducedMotionAlternative={motionSettings.reducedMotionAlternative}
>
  <div>Content</div>
</Motion>
```

## Troubleshooting

### Common Issues

#### Focus Not Visible
**Problem**: Focus indicators are not clearly visible
**Solution**:
```css
/* Ensure focus styles are visible */
:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}

/* Remove default focus if custom styles are used */
:focus {
  outline: none;
}
```

#### Motion Not Respecting Preferences
**Problem**: Animations play even when reduced motion is preferred
**Solution**:
```tsx
// Use the useReducedMotion hook
const { prefersReducedMotion } = useReducedMotion()

// Conditionally apply animations
const animation = prefersReducedMotion ? 'none' : 'slide'
```

#### Keyboard Navigation Issues
**Problem**: Cannot navigate to certain elements
**Solution**:
```tsx
// Ensure elements are focusable
<button tabIndex={0}>Click me</button>

// Use proper ARIA roles
<div role="button" tabIndex={0} onKeyDown={handleKeyDown}>
  Custom Button
</div>
```

## Resources

### Standards and Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)
- [Screen Reader Emulators](https://www.nvda.org/)

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to the Atlas AI Assistant, please:

1. Test all new features with keyboard navigation
2. Verify color contrast meets WCAG standards
3. Test with reduced motion preferences enabled
4. Add appropriate ARIA labels and descriptions
5. Update accessibility documentation as needed

For specific questions about accessibility implementation, please contact the development team or create an issue in the project repository.

---

*This documentation is part of Atlas AI Assistant's commitment to digital accessibility and inclusive design.*
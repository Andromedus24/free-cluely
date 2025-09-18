# Comprehensive Error Handling and Loading States Guide

This guide documents the enhanced error handling and loading state system implemented in the Atlas dashboard application.

## Overview

The Atlas dashboard now includes a comprehensive error handling and loading state system that provides:

- **Global Error Boundaries** - Catch and handle React component errors gracefully
- **Centralized Error Logging** - Track and categorize errors across the application
- **User-Friendly Notifications** - Toast-based error messages with actionable feedback
- **Loading State Management** - Consistent loading indicators across all async operations
- **Retry Logic** - Automatic retry for failed API calls with exponential backoff
- **Error Reporting** - User feedback system for error reporting

## Core Components

### 1. Error Boundary System

**Location**: `/src/components/ui/error-boundary.tsx`

The error boundary system provides:
- Class-based error boundary components for React
- Hook-based error handling for functional components
- Higher-order components for easy error boundary wrapping
- Developer-friendly error information in development mode

#### Usage Examples:

```tsx
// Wrap individual components
<ErrorBoundary context="UserProfile">
  <UserProfile />
</ErrorBoundary>

// Use hook in functional components
const { error, errorInfo, captureError } = useErrorBoundary();

// Use higher-order component
export default withErrorHandling(UserProfile, {
  context: 'UserProfile'
});
```

### 2. Loading States System

**Location**: `/src/components/ui/loading-states.tsx`

Comprehensive loading state components:
- `LoadingSpinner` - Animated loading spinner with various sizes
- `LoadingButton` - Button with built-in loading states
- `LoadingCard` - Skeleton loading card component
- `LoadingSkeleton` - Content placeholder skeletons
- `LoadingOverlay` - Overlay loading indicator
- `PageLoading` - Full-page loading component
- `ContentLoading` - Smart content loading with error/empty states

#### Usage Examples:

```tsx
// Loading button
<LoadingButton
  isLoading={loading}
  loadingText="Saving..."
  onClick={handleSave}
>
  Save Changes
</LoadingButton>

// Content loading with error handling
<ContentLoading
  isLoading={loading}
  error={error}
  isEmpty={!data.length}
  onRetry={fetchData}
>
  {data.map(item => <ItemCard key={item.id} item={item} />)}
</ContentLoading>

// Loading overlay
<LoadingOverlay isLoading={isLoading} message="Processing...">
  <YourComponent />
</LoadingOverlay>
```

### 3. Toast Notification System

**Location**: `/src/components/ui/toast-system.tsx`

Enhanced toast system with:
- Multiple toast types (success, error, warning, info)
- Persistent and auto-dismissing toasts
- Actionable toasts with buttons
- Custom styling and animations
- Event-driven toast dispatching

#### Usage Examples:

```tsx
// Use hook in components
const { showError, showSuccess, showWarning } = useToast();

// Show error toast
showError('Operation Failed', 'Unable to save changes. Please try again.');

// Show success toast
showSuccess('Success', 'Changes saved successfully!');

// Show actionable error
showError('Network Error', 'Unable to connect to server', {
  actions: [
    {
      label: 'Retry',
      onClick: retryOperation,
      variant: 'outline'
    }
  ]
});
```

### 4. Error Handling Service

**Location**: `/src/services/error-handling.ts`

Centralized error management system:
- Error categorization (client, server, network, auth, validation)
- Severity levels (low, medium, high, critical)
- Error logging and reporting
- User notification integration
- Global error handlers

#### Usage Examples:

```tsx
// Use hook in components
const { handleError, handleAuthError, handleNetworkError } = useGlobalErrorHandling();

// Handle specific error types
try {
  await apiCall();
} catch (error) {
  handleError(error, {
    type: 'error',
    title: 'API Error',
    message: 'Failed to load data',
    component: 'UserProfile'
  });
}

// Specialized error handlers
handleAuthError(authError);
handleNetworkError(networkError);
```

### 5. API Utilities

**Location**: `/src/lib/api-utils.ts`

Enhanced API utilities with:
- Automatic retry logic with exponential backoff
- Request timeout handling
- Authentication token management
- Error categorization and user feedback
- React hooks for API operations

#### Usage Examples:

```tsx
// Use API hook
const { data, loading, error, get, post } = useApi();

// Make API calls with built-in error handling
const response = await get('/api/users', {
  showLoading: true,
  showError: true,
  retries: 3
});

// Use query hook
const { data, loading, error, refetch } = useApiQuery('/api/users', {
  enabled: true,
  refetchInterval: 30000
});

// Use mutation hook
const { mutate, loading } = useApiMutation('/api/users', {
  method: 'POST',
  onSuccess: () => showSuccess('User created'),
  onError: (error) => showError('Failed to create user')
});
```

## Integration Patterns

### 1. Component Integration

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingButton } from '@/components/ui/loading-states';
import { useGlobalErrorHandling } from '@/providers/ErrorHandlingProvider';

function MyComponent() {
  const [loading, setLoading] = useState(false);
  const { handleError } = useGlobalErrorHandling();

  const handleAction = async () => {
    setLoading(true);
    try {
      await performAction();
    } catch (error) {
      handleError(error, {
        type: 'error',
        title: 'Action Failed',
        message: 'Unable to complete action',
        component: 'MyComponent'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary context="MyComponent">
      <LoadingButton
        isLoading={loading}
        onClick={handleAction}
      >
        Perform Action
      </LoadingButton>
    </ErrorBoundary>
  );
}
```

### 2. Service Integration

```tsx
import { errorHandlingService } from '@/services/error-handling';

class MyService {
  async performOperation() {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      errorHandlingService.handleError(error, {
        type: 'server',
        severity: 'high',
        component: 'MyService',
        context: { operation: 'performOperation' }
      });
      throw error;
    }
  }
}
```

### 3. Page Integration

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageLoading } from '@/components/ui/loading-states';
import { ContentLoading } from '@/components/ui/loading-states';

function MyPage() {
  const { data, loading, error } = useApiQuery('/api/data');

  if (loading && !data) {
    return <PageLoading message="Loading page data..." />;
  }

  return (
    <ErrorBoundary context="MyPage">
      <ContentLoading
        isLoading={loading}
        error={error}
        isEmpty={!data?.length}
        onRetry={() => window.location.reload()}
      >
        {/* Page content */}
      </ContentLoading>
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Error Handling

- **Always wrap components** that might fail with ErrorBoundaries
- **Use specific error types** for different error scenarios
- **Provide user-friendly messages** that explain what went wrong
- **Include actionable feedback** when possible (retry buttons, etc.)
- **Log errors with context** for debugging and analysis

### 2. Loading States

- **Show loading indicators** for all async operations
- **Use skeleton loaders** for content that takes time to load
- **Disable buttons** during operations to prevent duplicate actions
- **Provide clear feedback** about what's happening
- **Handle loading states** consistently across the application

### 3. User Experience

- **Don't show technical errors** to end users
- **Provide retry mechanisms** for failed operations
- **Show progress indicators** for long-running operations
- **Use appropriate severity levels** for different types of errors
- **Allow error reporting** from users for better debugging

### 4. Performance

- **Use debounce/throttle** for rapid-firing operations
- **Implement caching** for frequently accessed data
- **Use loading states** sparingly to avoid UI flicker
- **Optimize retry logic** to avoid excessive API calls
- **Monitor error rates** and performance metrics

## Configuration

### Error Handling Configuration

```typescript
const config = {
  enabled: true,
  logToConsole: true,
  logToService: false,
  showUserNotifications: true,
  enableErrorReporting: false,
  maxErrors: 1000,
  environment: 'development' as const,
  ignoredErrors: ['NetworkError', 'AbortError']
};
```

### API Configuration

```typescript
const apiConfig = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  showLoading: true,
  showError: true
};
```

## Testing

### Error Boundary Testing

```tsx
// Test error boundary
const { getByText } = render(
  <ErrorBoundary>
    <ComponentThatThrows />
  </ErrorBoundary>
);

expect(getByText('Something went wrong')).toBeInTheDocument();
```

### Loading State Testing

```tsx
// Test loading states
const { getByText, queryByText } = render(
  <LoadingButton isLoading={true}>
    Click Me
  </LoadingButton>
);

expect(getByText('Loading...')).toBeInTheDocument();
expect(queryByText('Click Me')).not.toBeInTheDocument();
```

## Migration Guide

### Existing Components

1. **Add ErrorBoundary wrapper** to components that might fail
2. **Replace button loading states** with LoadingButton
3. **Add try-catch blocks** to async operations
4. **Integrate error handling** hooks for better error management
5. **Add loading indicators** for async operations

### New Components

1. **Always include ErrorBoundary** in new components
2. **Use LoadingButton** for async operations
3. **Implement proper error handling** with the global system
4. **Add loading states** for all async operations
5. **Follow the integration patterns** outlined above

## Troubleshooting

### Common Issues

1. **Error boundaries not catching errors**: Ensure error boundaries are properly placed and that errors are thrown (not just logged)
2. **Loading states not showing**: Check that loading state is properly managed and updated
3. **Toast notifications not appearing**: Verify the ToastSystem is properly integrated in the layout
4. **API errors not handled**: Ensure API utilities are used instead of direct fetch calls

### Debug Mode

In development mode, additional error information is available:
- Full error stacks in error boundaries
- Detailed console logging
- Developer information in error UI
- Performance metrics for loading operations

## Future Enhancements

### Planned Features

1. **Error Analytics Dashboard** - Visualize error trends and patterns
2. **Performance Monitoring** - Track loading times and user experience metrics
3. **Offline Error Handling** - Store errors when offline and sync when online
4. **Custom Error Themes** - Allow customization of error UI
5. **Error Prevention** - Proactive error detection and prevention

### API Endpoints

1. **Error Reporting Service** - Centralized error collection and analysis
2. **Performance Monitoring** - Track application performance metrics
3. **User Feedback System** - Collect and analyze user feedback
4. **Error Analytics** - Provide insights into error patterns and trends

---

This comprehensive error handling system provides a robust foundation for managing errors and loading states throughout the Atlas dashboard application. Following these patterns ensures a consistent and user-friendly experience across all components and features.
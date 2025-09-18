/**
 * Enhanced Form Components with Validation
 * Provides reusable form components with built-in validation and sanitization
 */

'use client';

import React, { useState, useCallback } from 'react';
import { validate, sanitize, ValidationHelper } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'number' | 'select';
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
  validation?: (value: any) => { valid: boolean; error?: string };
  sanitize?: boolean;
}

export interface FormConfig {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitText?: string;
  className?: string;
}

interface ValidationState {
  [key: string]: {
    valid: boolean;
    error?: string;
    touched: boolean;
  };
}

export function ValidatedForm({ fields, onSubmit, submitText = 'Submit', className }: FormConfig) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [validation, setValidation] = useState<ValidationState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize validation state
  React.useEffect(() => {
    const initialValidation: ValidationState = {};
    fields.forEach(field => {
      initialValidation[field.name] = {
        valid: !field.required,
        touched: false,
      };
    });
    setValidation(initialValidation);
  }, [fields]);

  const validateField = useCallback((field: FormField, value: any): { valid: boolean; error?: string } => {
    // Check required fields
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return { valid: false, error: `${field.label} is required` };
    }

    // Check max length
    if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
      return { valid: false, error: `${field.label} must be no more than ${field.maxLength} characters` };
    }

    // Custom validation
    if (field.validation) {
      return field.validation(value);
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        return ValidationHelper.validateEmail(value);
      case 'number':
        const num = Number(value);
        return { valid: !isNaN(num), error: `${field.label} must be a valid number` };
      default:
        return { valid: true };
    }
  }, []);

  const sanitizeValue = useCallback((field: FormField, value: any): any => {
    if (!field.sanitize && field.type === 'password') {
      return value; // Don't sanitize passwords
    }

    switch (field.type) {
      case 'text':
      case 'email':
        return sanitize.input(value, {
          maxLength: field.maxLength,
          trim: true
        });
      case 'textarea':
        return sanitize.input(value, {
          maxLength: field.maxLength,
          allowHtml: false,
          trim: true
        });
      case 'number':
        return Number(value);
      default:
        return value;
    }
  }, []);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return;

    // Sanitize value
    const sanitizedValue = sanitizeValue(field, value);

    // Validate
    const validationResult = validateField(field, sanitizedValue);

    // Update state
    setValues(prev => ({ ...prev, [fieldName]: sanitizedValue }));
    setValidation(prev => ({
      ...prev,
      [fieldName]: {
        valid: validationResult.valid,
        error: validationResult.error,
        touched: true,
      },
    }));
  }, [fields, validateField, sanitizeValue]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate all fields
      const validationResults: ValidationState = {};
      let isValid = true;

      fields.forEach(field => {
        const result = validateField(field, values[field.name]);
        validationResults[field.name] = {
          valid: result.valid,
          error: result.error,
          touched: true,
        };
        if (!result.valid) isValid = false;
      });

      setValidation(validationResults);

      if (!isValid) {
        throw new Error('Please fix the validation errors before submitting');
      }

      // Submit form
      await onSubmit(values);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [fields, values, validateField, onSubmit]);

  const isFormValid = Object.values(validation).every(v => v.valid);

  const renderField = (field: FormField) => {
    const value = values[field.name] || '';
    const fieldValidation = validation[field.name] || { valid: true, touched: false };

    const commonProps = {
      id: field.name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleFieldChange(field.name, e.target.value),
      className: fieldValidation.touched && !fieldValidation.valid ? 'border-red-500' : '',
      placeholder: field.placeholder,
    };

    let input: React.ReactNode;

    switch (field.type) {
      case 'textarea':
        input = <Textarea {...commonProps} maxLength={field.maxLength} />;
        break;
      case 'select':
        input = (
          <select {...commonProps} className={`w-full p-2 border rounded ${commonProps.className}`}>
            <option value="">Select an option</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        break;
      default:
        input = (
          <Input
            {...commonProps}
            type={field.type}
            maxLength={field.maxLength}
          />
        );
    }

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {input}
        {fieldValidation.touched && fieldValidation.error && (
          <p className="text-sm text-red-500">{fieldValidation.error}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {fields.map(renderField)}

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Submitting...' : submitText}
      </Button>
    </form>
  );
}

// Pre-configured form types
export function LoginForm({ onSubmit, className }: { onSubmit: (data: any) => Promise<void>; className?: string }) {
  const fields: FormField[] = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Enter your email',
      sanitize: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Enter your password',
    },
  ];

  return (
    <ValidatedForm
      fields={fields}
      onSubmit={onSubmit}
      submitText="Login"
      className={className}
    />
  );
}

export function RegisterForm({ onSubmit, className }: { onSubmit: (data: any) => Promise<void>; className?: string }) {
  const fields: FormField[] = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Enter your email',
      sanitize: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      placeholder: 'Create a password',
      validation: (value) => {
        if (value.length < 8) {
          return { valid: false, error: 'Password must be at least 8 characters' };
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return { valid: false, error: 'Password must contain uppercase, lowercase, and number' };
        }
        return { valid: true };
      },
    },
    {
      name: 'full_name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your full name',
      maxLength: 50,
      sanitize: true,
    },
    {
      name: 'avatar_url',
      label: 'Avatar URL',
      type: 'text',
      placeholder: 'Avatar URL (optional)',
      maxLength: 500,
      sanitize: true,
    },
  ];

  return (
    <ValidatedForm
      fields={fields}
      onSubmit={onSubmit}
      submitText="Register"
      className={className}
    />
  );
}

export function ProfileForm({ onSubmit, className }: { onSubmit: (data: any) => Promise<void>; className?: string }) {
  const fields: FormField[] = [
    {
      name: 'full_name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your full name',
      maxLength: 50,
      sanitize: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'Enter your email',
      sanitize: true,
    },
    {
      name: 'avatar_url',
      label: 'Avatar URL',
      type: 'text',
      placeholder: 'Avatar URL (optional)',
      maxLength: 500,
      sanitize: true,
    },
  ];

  return (
    <ValidatedForm
      fields={fields}
      onSubmit={onSubmit}
      submitText="Update Profile"
      className={className}
    />
  );
}
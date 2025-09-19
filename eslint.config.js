import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import electronSecurity from 'eslint-plugin-electron-security';

export default [
  {
    // Base JavaScript configuration
    ...js.configs.recommended,
  },
  {
    // Global settings for all files
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      }
    },
    plugins: {
      security,
    },
    rules: {
      // Security rules for all files
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    }
  },
  {
    // TypeScript files
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...typescript.configs['recommended-requiring-type-checking'].rules,
      
      // Strict TypeScript rules
      '@typescript-eslint/no-any': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    }
  },
  {
    // React files
    files: ['**/*.jsx', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Next.js doesn't require React import
      'react/prop-types': 'off', // We use TypeScript
      'react/no-unescaped-entities': 'error',
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-danger': 'warn',
      'react/no-danger-with-children': 'error',
    }
  },
  {
    // Electron main process files
    files: ['**/main.ts', '**/preload.ts', '**/ipc*.ts', '**/apps/electron-host/**/*.ts'],
    plugins: {
      'electron-security': electronSecurity,
    },
    rules: {
      'electron-security/no-node-integration': 'error',
      'electron-security/no-insecure-content': 'error',
      'electron-security/no-unsafe-protocols': 'error',
    }
  },
  {
    // API routes - extra security rules
    files: ['**/api/**/*.ts'],
    rules: {
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-child-process': 'error',
      '@typescript-eslint/no-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    }
  },
  {
    // Configuration files
    files: ['*.config.js', '*.config.ts', 'turbo.json', 'package.json'],
    rules: {
      'no-console': 'off',
    }
  },
  {
    // Test files
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/__tests__/**/*'],
    rules: {
      '@typescript-eslint/no-any': 'off',
      'no-console': 'off',
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '.next/',
      'out/',
      'coverage/',
      'release/',
      '*.d.ts',
      'pnpm-lock.yaml',
      '.turbo/',
      'playwright-report/',
    ]
  }
];

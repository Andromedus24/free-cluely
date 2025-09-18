// Content Filtering Package Exports
// ==================================

// Core Filter Interfaces
export * from './ContentFilter';

// Specific Filter Implementations
export * from './ImageFilter';

// Filter Management
export * from './FilterManager';

// Automated Filtering
export * from './AutoFilter';

// Factory Functions
// ===================

import { FilterManager } from './FilterManager';
import { AutoFilter } from './AutoFilter';
import { TextContentFilter } from './ContentFilter';
import { ImageContentFilter } from './ImageFilter';

/**
 * Create a complete content filtering system
 */
export function createContentFilterSystem(config?: {
  filterManager?: any;
  autoFilter?: any;
}): {
  filterManager: FilterManager;
  autoFilter: AutoFilter;
} {
  // Create filter manager with default filters
  const filterManager = new FilterManager(config?.filterManager);

  // Create auto-filter system
  const autoFilter = new AutoFilter(filterManager, config?.autoFilter);

  return {
    filterManager,
    autoFilter
  };
}

/**
 * Create a minimal content filtering system for testing
 */
export function createMinimalFilterSystem(): {
  filterManager: FilterManager;
  autoFilter: AutoFilter;
} {
  return createContentFilterSystem({
    filterManager: {
      maxConcurrentFilters: 2,
      timeout: 10000,
      failOpen: true,
      aggregateResults: false
    },
    autoFilter: {
      enabled: true,
      cacheEnabled: false,
      autoBlockEnabled: false,
      autoFlagEnabled: true,
      autoQuarantineEnabled: false,
      learningEnabled: false,
      sensitivity: 'medium'
    }
  });
}

/**
 * Create a high-security content filtering system
 */
export function createHighSecurityFilterSystem(): {
  filterManager: FilterManager;
  autoFilter: AutoFilter;
} {
  return createContentFilterSystem({
    filterManager: {
      maxConcurrentFilters: 10,
      timeout: 15000,
      failOpen: false,
      aggregateResults: true
    },
    autoFilter: {
      enabled: true,
      cacheEnabled: true,
      cacheSize: 2000,
      cacheTTL: 300000,
      autoBlockEnabled: true,
      autoFlagEnabled: true,
      autoQuarantineEnabled: true,
      learningEnabled: true,
      sensitivity: 'high'
    }
  });
}

// Utility Functions
// ================

/**
 * Quick content filtering for common use cases
 */
export async function quickFilter(
  content: string,
  type: 'text' | 'image' | 'video' | 'audio' = 'text'
): Promise<{
  safe: boolean;
  confidence: number;
  reason?: string;
  flags: string[];
}> {
  const { filterManager } = createMinimalFilterSystem();
  const result = await filterManager.filterContent(content, type as any);

  return {
    safe: result.analysis.action === 'allow',
    confidence: result.analysis.confidence.score,
    reason: result.analysis.suggestions[0],
    flags: result.analysis.flags.map(flag => `${flag.category}: ${flag.message}`)
  };
}

/**
 * Validate filter configuration
 */
export function validateFilterConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.filterManager) {
    if (typeof config.filterManager.maxConcurrentFilters !== 'number' || config.filterManager.maxConcurrentFilters < 1) {
      errors.push('filterManager.maxConcurrentFilters must be a positive number');
    }
    if (typeof config.filterManager.timeout !== 'number' || config.filterManager.timeout < 1000) {
      errors.push('filterManager.timeout must be at least 1000ms');
    }
    if (typeof config.filterManager.failOpen !== 'boolean') {
      errors.push('filterManager.failOpen must be a boolean');
    }
  }

  if (config.autoFilter) {
    if (typeof config.autoFilter.enabled !== 'boolean') {
      errors.push('autoFilter.enabled must be a boolean');
    }
    if (typeof config.autoFilter.cacheEnabled !== 'boolean') {
      errors.push('autoFilter.cacheEnabled must be a boolean');
    }
    if (config.autoFilter.cacheSize && (typeof config.autoFilter.cacheSize !== 'number' || config.autoFilter.cacheSize < 1)) {
      errors.push('autoFilter.cacheSize must be a positive number');
    }
    if (config.autoFilter.sensitivity && !['low', 'medium', 'high'].includes(config.autoFilter.sensitivity)) {
      errors.push('autoFilter.sensitivity must be one of: low, medium, high');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get filter recommendations based on use case
 */
export function getFilterRecommendations(useCase: string): {
  recommendedFilters: string[];
  config: any;
  description: string;
} {
  const recommendations = {
    'social_media': {
      recommendedFilters: ['text_filter', 'image_filter'],
      config: {
        sensitivity: 'medium',
        autoBlockEnabled: false,
        autoFlagEnabled: true
      },
      description: 'Balanced filtering for social media content'
    },
    'children_platform': {
      recommendedFilters: ['text_filter', 'image_filter'],
      config: {
        sensitivity: 'high',
        autoBlockEnabled: true,
        autoFlagEnabled: true,
        autoQuarantineEnabled: true
      },
      description: 'Strict filtering for children\'s platforms'
    },
    'enterprise_chat': {
      recommendedFilters: ['text_filter'],
      config: {
        sensitivity: 'medium',
        autoBlockEnabled: false,
        autoFlagEnabled: true,
        cacheEnabled: true
      },
      description: 'Professional filtering for enterprise communications'
    },
    'content_platform': {
      recommendedFilters: ['text_filter', 'image_filter'],
      config: {
        sensitivity: 'medium',
        autoBlockEnabled: true,
        autoFlagEnabled: true,
        learningEnabled: true
      },
      description: 'Comprehensive filtering for content platforms'
    },
    'gaming_platform': {
      recommendedFilters: ['text_filter'],
      config: {
        sensitivity: 'low',
        autoBlockEnabled: false,
        autoFlagEnabled: true,
        cacheEnabled: true
      },
      description: 'Lenient filtering for gaming platforms'
    }
  };

  return recommendations[useCase as keyof typeof recommendations] || {
    recommendedFilters: ['text_filter'],
    config: {
      sensitivity: 'medium',
      autoBlockEnabled: false,
      autoFlagEnabled: true
    },
    description: 'Default balanced filtering configuration'
  };
}

// Constants and Defaults
// ======================

export const DEFAULT_FILTER_CONFIG = {
  textFilter: {
    enabled: true,
    keywordStrictness: 'medium',
    patternDetection: true,
    contextualAnalysis: true
  },
  imageFilter: {
    enabled: true,
    nsfwDetection: true,
    metadataAnalysis: true,
    objectDetection: false
  },
  videoFilter: {
    enabled: false,
    frameAnalysis: false,
    audioAnalysis: false
  },
  audioFilter: {
    enabled: false,
    transcription: false,
    profanityDetection: false
  }
};

export const FILTER_SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const FILTER_ACTION_TYPES = {
  ALLOW: 'allow',
  FLAG: 'flag',
  REVIEW: 'review',
  BLOCK: 'block',
  REMOVE: 'remove',
  QUARANTINE: 'quarantine'
} as const;

export const SUPPORTED_CONTENT_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'user_profile',
  'comment',
  'message',
  'post',
  'attachment'
] as const;

// Version and Package Info
// =========================

export const FILTER_VERSION = '1.0.0';

export const packageInfo = {
  name: '@atlas/content-filters',
  version: FILTER_VERSION,
  description: 'Advanced automated content filtering system for Atlas AI assistant',
  author: 'Atlas Team',
  license: 'MIT',
  repository: 'https://github.com/atlas-ai/atlas',
  dependencies: [
    '@atlas/moderation',
    '@atlas/types'
  ]
};

// Export for backward compatibility
export {
  TextContentFilter,
  ImageContentFilter,
  FilterManager,
  AutoFilter
};
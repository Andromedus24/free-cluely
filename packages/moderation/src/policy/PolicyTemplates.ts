// Policy Templates for Moderation System
// ======================================

import { Policy, PolicyTemplate, PolicyCategory, PolicySeverity, PolicyAction } from './types';

/**
 * Pre-built policy templates for common moderation scenarios
 */
export const BUILTIN_POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'content_safety_basic',
    name: 'Basic Content Safety',
    description: 'Essential content moderation rules for general communities',
    category: PolicyCategory.SAFETY,
    severity: PolicySeverity.MEDIUM,
    rules: [
      {
        id: 'no_hate_speech',
        name: 'No Hate Speech',
        description: 'Detect and block hate speech and discriminatory content',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'contains_keywords',
          value: ['hate', 'discrimination', 'racist', 'sexist', 'homophobic'],
          caseSensitive: false,
          threshold: 0.7
        },
        action: PolicyAction.BLOCK,
        weight: 1.0,
        enabled: true
      },
      {
        id: 'no_explicit_content',
        name: 'No Explicit Content',
        description: 'Block sexually explicit or adult content',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'explicit_content_detector',
          threshold: 0.8
        },
        action: PolicyAction.BLOCK,
        weight: 1.0,
        enabled: true
      },
      {
        id: 'no_threats',
        name: 'No Threats',
        description: 'Detect and block threats of violence',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'threat_detector',
          threshold: 0.75
        },
        action: PolicyAction.BLOCK,
        weight: 1.0,
        enabled: true
      }
    ],
    mlModels: ['explicit_content_detector', 'threat_detector'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.7,
      enableHumanReview: true,
      reviewThreshold: 0.6
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['safety', 'basic', 'general']
    }
  },
  {
    id: 'content_safety_strict',
    name: 'Strict Content Safety',
    description: 'Comprehensive moderation for family-friendly environments',
    category: PolicyCategory.SAFETY,
    severity: PolicySeverity.HIGH,
    rules: [
      {
        id: 'no_profanity',
        name: 'No Profanity',
        description: 'Block all profanity and offensive language',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'contains_keywords',
          value: ['swear_word_list'], // Would be replaced with actual word list
          caseSensitive: false,
          threshold: 0.9
        },
        action: PolicyAction.BLOCK,
        weight: 0.8,
        enabled: true
      },
      {
        id: 'no_harassment',
        name: 'No Harassment',
        description: 'Detect and block harassment and bullying',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'harassment_detector',
          threshold: 0.85
        },
        action: PolicyAction.BLOCK,
        weight: 1.0,
        enabled: true
      },
      {
        id: 'no_personal_attacks',
        name: 'No Personal Attacks',
        description: 'Block personal attacks and insults',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'personal_attack_detector',
          threshold: 0.8
        },
        action: PolicyAction.FLAG,
        weight: 0.9,
        enabled: true
      }
    ],
    mlModels: ['harassment_detector', 'personal_attack_detector'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.8,
      enableHumanReview: true,
      reviewThreshold: 0.7,
      autoEscalate: true,
      escalationThreshold: 0.9
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['safety', 'strict', 'family-friendly']
    }
  },
  {
    id: 'spam_detection',
    name: 'Spam Detection',
    description: 'Detect and prevent spam and unwanted content',
    category: PolicyCategory.SPAM,
    severity: PolicySeverity.MEDIUM,
    rules: [
      {
        id: 'no_repeated_content',
        name: 'No Repeated Content',
        description: 'Detect and block repetitive submissions',
        condition: {
          type: 'behavioral',
          field: 'content_similarity',
          operator: 'similarity_threshold',
          value: 0.9,
          timeWindow: 3600 // 1 hour
        },
        action: PolicyAction.FLAG,
        weight: 0.7,
        enabled: true
      },
      {
        id: 'no_link_spam',
        name: 'No Link Spam',
        description: 'Detect and block spam links',
        condition: {
          type: 'content',
          field: 'links',
          operator: 'link_analysis',
          value: {
            maxLinks: 3,
            suspiciousDomains: ['spam-domain-list'],
            newDomainPenalty: 0.5
          },
          threshold: 0.8
        },
        action: PolicyAction.FLAG,
        weight: 0.8,
        enabled: true
      },
      {
        id: 'no_keyword_spam',
        name: 'No Keyword Spam',
        description: 'Detect keyword stuffing and spam patterns',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'pattern_analysis',
          value: {
            maxRepetition: 3,
            keywordDensity: 0.3,
            suspiciousPatterns: ['all_caps', 'excessive_punctuation']
          },
          threshold: 0.7
        },
        action: PolicyAction.FLAG,
        weight: 0.6,
        enabled: true
      }
    ],
    mlModels: ['spam_detector', 'link_analyzer'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.7,
      enableHumanReview: false,
      enableAutoRemoval: true,
      removalThreshold: 0.9
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['spam', 'automation', 'quality']
    }
  },
  {
    id: 'copyright_protection',
    name: 'Copyright Protection',
    description: 'Detect and manage copyright infringement',
    category: PolicyCategory.COPYRIGHT,
    severity: PolicySeverity.HIGH,
    rules: [
      {
        id: 'no_copyrighted_images',
        name: 'No Copyrighted Images',
        description: 'Detect potentially copyrighted images',
        condition: {
          type: 'media',
          field: 'image',
          operator: 'copyright_detection',
          value: {
            checkWatermarks: true,
            reverseImageSearch: true,
            fingerprintMatching: true
          },
          threshold: 0.8
        },
        action: PolicyAction.FLAG,
        weight: 1.0,
        enabled: true
      },
      {
        id: 'no_plagiarism',
        name: 'No Plagiarism',
        description: 'Detect text plagiarism',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'plagiarism_detection',
          value: {
            checkWeb: true,
            checkInternal: true,
            similarityThreshold: 0.85
          },
          threshold: 0.8
        },
        action: PolicyAction.FLAG,
        weight: 0.9,
        enabled: true
      }
    ],
    mlModels: ['copyright_detector', 'plagiarism_detector'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.8,
      enableHumanReview: true,
      reviewThreshold: 0.7,
      requireEvidence: true
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['copyright', 'legal', 'intellectual_property']
    }
  },
  {
    id: 'brand_safety',
    name: 'Brand Safety',
    description: 'Ensure content aligns with brand guidelines',
    category: PolicyCategory.BRAND_SAFETY,
    severity: PolicySeverity.MEDIUM,
    rules: [
      {
        id: 'brand_safety_keywords',
        name: 'Brand Safety Keywords',
        description: 'Block content with brand-unsafe keywords',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'contains_keywords',
          value: ['brand_unsafe_keywords'],
          caseSensitive: false,
          threshold: 0.8
        },
        action: PolicyAction.FLAG,
        weight: 0.8,
        enabled: true
      },
      {
        id: 'competitor_mentions',
        name: 'Competitor Mentions',
        description: 'Flag mentions of competitors',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'entity_recognition',
          value: {
            entityTypes: ['ORGANIZATION'],
            blacklist: ['competitor_list']
          },
          threshold: 0.9
        },
        action: PolicyAction.FLAG,
        weight: 0.6,
        enabled: true
      },
      {
        id: 'sentiment_analysis',
        name: 'Sentiment Analysis',
        description: 'Ensure content maintains positive sentiment',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'sentiment_analysis',
          value: {
            minSentiment: 0.3,
            subjectivityThreshold: 0.7
          },
          threshold: 0.7
        },
        action: PolicyAction.FLAG,
        weight: 0.5,
        enabled: true
      }
    ],
    mlModels: ['sentiment_analyzer', 'entity_recognizer'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.7,
      enableHumanReview: true,
      reviewThreshold: 0.6,
      brandSafetyScore: true
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['brand', 'safety', 'advertising']
    }
  },
  {
    id: 'community_guidelines',
    name: 'Community Guidelines',
    description: 'Enforce community-specific rules and standards',
    category: PolicyCategory.COMMUNITY,
    severity: PolicySeverity.MEDIUM,
    rules: [
      {
        id: 'respectful_discourse',
        name: 'Respectful Discourse',
        description: 'Ensure discussions remain respectful',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'toxicity_detector',
          threshold: 0.7
        },
        action: PolicyAction.FLAG,
        weight: 0.8,
        enabled: true
      },
      {
        id: 'topic_relevance',
        name: 'Topic Relevance',
        description: 'Ensure content stays on topic',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'topic_classification',
          value: {
            allowedTopics: ['relevant_topics'],
            confidenceThreshold: 0.6
          },
          threshold: 0.7
        },
        action: PolicyAction.FLAG,
        weight: 0.5,
        enabled: true
      },
      {
        id: 'quality_standards',
        name: 'Quality Standards',
        description: 'Enforce minimum content quality',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'quality_analysis',
          value: {
            minLength: 10,
            maxLength: 5000,
            grammarThreshold: 0.7,
            readabilityThreshold: 0.6
          },
          threshold: 0.6
        },
        action: PolicyAction.FLAG,
        weight: 0.4,
        enabled: true
      }
    ],
    mlModels: ['toxicity_detector', 'topic_classifier', 'quality_analyzer'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.6,
      enableHumanReview: true,
      reviewThreshold: 0.5,
      communityScoring: true
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['community', 'guidelines', 'moderation']
    }
  },
  {
    id: 'legal_compliance',
    name: 'Legal Compliance',
    description: 'Ensure compliance with legal requirements',
    category: PolicyCategory.LEGAL,
    severity: PolicySeverity.CRITICAL,
    rules: [
      {
        id: 'gdpr_compliance',
        name: 'GDPR Compliance',
        description: 'Detect and block PII sharing',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'pii_detection',
          value: {
            detectEmail: true,
            detectPhone: true,
            detectAddress: true,
            detectSSN: true,
            detectFinancial: true
          },
          threshold: 0.9
        },
        action: PolicyAction.BLOCK,
        weight: 1.0,
        enabled: true
      },
      {
        id: 'financial_disclosure',
        name: 'Financial Disclosure',
        description: 'Detect unauthorized financial advice',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'financial_advice_detector',
          threshold: 0.85
        },
        action: PolicyAction.FLAG,
        weight: 0.9,
        enabled: true
      },
      {
        id: 'medical_advice',
        name: 'Medical Advice',
        description: 'Detect unauthorized medical advice',
        condition: {
          type: 'content',
          field: 'text',
          operator: 'ml_model',
          model: 'medical_advice_detector',
          threshold: 0.9
        },
        action: PolicyAction.FLAG,
        weight: 0.9,
        enabled: true
      }
    ],
    mlModels: ['pii_detector', 'financial_advice_detector', 'medical_advice_detector'],
    configuration: {
      enableML: true,
      confidenceThreshold: 0.9,
      enableHumanReview: true,
      reviewThreshold: 0.8,
      legalEscalation: true,
      requireDocumentation: true
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Atlas Moderation System',
      tags: ['legal', 'compliance', 'gdpr', 'privacy']
    }
  }
];

/**
 * Industry-specific policy templates
 */
export const INDUSTRY_TEMPLATES: Record<string, PolicyTemplate[]> = {
  education: [
    {
      id: 'education_safety',
      name: 'Educational Content Safety',
      description: 'Safety policies for educational platforms',
      category: PolicyCategory.SAFETY,
      severity: PolicySeverity.HIGH,
      rules: [
        {
          id: 'age_appropriate',
          name: 'Age-Appropriate Content',
          description: 'Ensure content is suitable for students',
          condition: {
            type: 'content',
            field: 'text',
            operator: 'ml_model',
            model: 'age_appropriate_detector',
            threshold: 0.85
          },
          action: PolicyAction.BLOCK,
          weight: 1.0,
          enabled: true
        },
        {
          id: 'educational_value',
          name: 'Educational Value',
          description: 'Assess educational content value',
          condition: {
            type: 'content',
            field: 'text',
            operator: 'ml_model',
            model: 'educational_value_detector',
            threshold: 0.6
          },
          action: PolicyAction.FLAG,
          weight: 0.7,
          enabled: true
        }
      ],
      mlModels: ['age_appropriate_detector', 'educational_value_detector'],
      configuration: {
        enableML: true,
        confidenceThreshold: 0.7,
        enableHumanReview: true,
        reviewThreshold: 0.6
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Atlas Moderation System',
        tags: ['education', 'safety', 'learning']
      }
    }
  ],

  healthcare: [
    {
      id: 'healthcare_compliance',
      name: 'Healthcare Compliance',
      description: 'HIPAA and healthcare compliance policies',
      category: PolicyCategory.LEGAL,
      severity: PolicySeverity.CRITICAL,
      rules: [
        {
          id: 'hipaa_compliance',
          name: 'HIPAA Compliance',
          description: 'Ensure HIPAA compliance in content',
          condition: {
            type: 'content',
            field: 'text',
            operator: 'pii_detection',
            value: {
              detectMedicalInfo: true,
              detectHealthConditions: true,
              detectTreatmentInfo: true
            },
            threshold: 0.95
          },
          action: PolicyAction.BLOCK,
          weight: 1.0,
          enabled: true
        }
      ],
      mlModels: ['hipaa_detector', 'medical_pii_detector'],
      configuration: {
        enableML: true,
        confidenceThreshold: 0.95,
        enableHumanReview: true,
        reviewThreshold: 0.9,
        legalEscalation: true
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Atlas Moderation System',
        tags: ['healthcare', 'hipaa', 'compliance']
      }
    }
  ],

  finance: [
    {
      id: 'financial_regulation',
      name: 'Financial Regulation',
      description: 'Financial services compliance policies',
      category: PolicyCategory.LEGAL,
      severity: PolicySeverity.CRITICAL,
      rules: [
        {
          id: 'investment_advice',
          name: 'Investment Advice',
          description: 'Detect unauthorized investment advice',
          condition: {
            type: 'content',
            field: 'text',
            operator: 'ml_model',
            model: 'investment_advice_detector',
            threshold: 0.9
          },
          action: PolicyAction.FLAG,
          weight: 1.0,
          enabled: true
        }
      ],
      mlModels: ['investment_advice_detector', 'financial_compliance_detector'],
      configuration: {
        enableML: true,
        confidenceThreshold: 0.9,
        enableHumanReview: true,
        reviewThreshold: 0.8,
        legalEscalation: true
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Atlas Moderation System',
        tags: ['finance', 'regulation', 'compliance']
      }
    }
  ]
};

/**
 * Get policy template by ID
 */
export function getPolicyTemplate(id: string): PolicyTemplate | undefined {
  return [...BUILTIN_POLICY_TEMPLATES, ...Object.values(INDUSTRY_TEMPLATES).flat()]
    .find(template => template.id === id);
}

/**
 * Get policy templates by category
 */
export function getPolicyTemplatesByCategory(category: PolicyCategory): PolicyTemplate[] {
  return [...BUILTIN_POLICY_TEMPLATES, ...Object.values(INDUSTRY_TEMPLATES).flat()]
    .filter(template => template.category === category);
}

/**
 * Get policy templates by industry
 */
export function getPolicyTemplatesByIndustry(industry: string): PolicyTemplate[] {
  return INDUSTRY_TEMPLATES[industry] || [];
}

/**
 * Create custom policy template
 */
export function createCustomPolicyTemplate(
  name: string,
  description: string,
  category: PolicyCategory,
  severity: PolicySeverity,
  rules: any[],
  configuration: any = {}
): PolicyTemplate {
  return {
    id: `custom_${Date.now()}`,
    name,
    description,
    category,
    severity,
    rules,
    mlModels: rules.flatMap((rule: any) =>
      rule.condition.model ? [rule.condition.model] : []
    ).filter((model, index, self) => self.indexOf(model) === index),
    configuration: {
      enableML: true,
      confidenceThreshold: 0.7,
      enableHumanReview: true,
      ...configuration
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Custom',
      tags: ['custom', category.toLowerCase()]
    }
  };
}

/**
 * Clone and customize policy template
 */
export function customizePolicyTemplate(
  template: PolicyTemplate,
  customizations: {
    name?: string;
    description?: string;
    rules?: any[];
    configuration?: any;
    severity?: PolicySeverity;
  }
): PolicyTemplate {
  return {
    ...template,
    id: `custom_${template.id}_${Date.now()}`,
    name: customizations.name || `${template.name} (Customized)`,
    description: customizations.description || template.description,
    severity: customizations.severity || template.severity,
    rules: customizations.rules || template.rules,
    configuration: {
      ...template.configuration,
      ...customizations.configuration
    },
    metadata: {
      ...template.metadata,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Custom',
      tags: [...template.metadata.tags, 'customized']
    }
  };
}

/**
 * Validate policy template
 */
export function validatePolicyTemplate(template: PolicyTemplate): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!template.id) errors.push('Template ID is required');
  if (!template.name) errors.push('Template name is required');
  if (!template.description) errors.push('Template description is required');
  if (!template.category) errors.push('Template category is required');
  if (!template.severity) errors.push('Template severity is required');

  // Rules validation
  if (!template.rules || template.rules.length === 0) {
    errors.push('Template must have at least one rule');
  } else {
    template.rules.forEach((rule, index) => {
      if (!rule.id) errors.push(`Rule ${index} missing ID`);
      if (!rule.name) errors.push(`Rule ${index} missing name`);
      if (!rule.condition) errors.push(`Rule ${index} missing condition`);
      if (!rule.action) errors.push(`Rule ${index} missing action`);
    });
  }

  // Configuration validation
  if (template.configuration) {
    if (template.configuration.confidenceThreshold < 0 || template.configuration.confidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1');
    }
    if (template.configuration.enableML && template.mlModels.length === 0) {
      warnings.push('ML enabled but no ML models specified');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
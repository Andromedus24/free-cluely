import {
  ModerationAnalysis,
  ModerationAction,
  ModerationCategory,
  ModerationSeverity,
  ModerationContentType,
  ModerationConfidence
} from '../types/ModerationTypes';
import { BaseContentFilter, IContentFilter, ContentFilterCapabilities } from './ContentFilter';

/**
 * Image Content Filter
 * Specialized filter for image content analysis
 */
export class ImageContentFilter extends BaseContentFilter {
  readonly name = 'image_filter';
  readonly version = '1.0.0';
  readonly description = 'Advanced image content filtering with visual analysis and metadata detection';

  private nsfwDetector: NSFWDetector;
  private metadataAnalyzer: ImageMetadataAnalyzer;
  private objectDetector: ObjectDetector;

  constructor() {
    super();
    this.nsfwDetector = new NSFWDetector();
    this.metadataAnalyzer = new ImageMetadataAnalyzer();
    this.objectDetector = new ObjectDetector();
  }

  async filter(content: Buffer | string, type: ModerationContentType): Promise<ModerationAnalysis> {
    if (!this.enabled || type !== ModerationContentType.IMAGE) {
      return this.createSafeAnalysis(content, type);
    }

    const startTime = Date.now();
    const flags: any[] = [];

    try {
      const imageData = typeof content === 'string' ? content : content;

      // Metadata analysis
      const metadataFlags = await this.metadataAnalyzer.analyze(imageData);
      flags.push(...metadataFlags);

      // NSFW content detection
      const nsfwFlags = await this.nsfwDetector.detect(imageData);
      flags.push(...nsfwFlags);

      // Object detection
      const objectFlags = await this.objectDetector.detect(imageData);
      flags.push(...objectFlags);

      // Size and format analysis
      const sizeFlags = this.analyzeImageCharacteristics(imageData);
      flags.push(...sizeFlags);

      // Determine overall assessment
      const { category, severity } = this.determineOverallCategoryAndSeverity(flags);

      const analysis = this.createAnalysis(
        content,
        type,
        category,
        severity,
        this.calculateOverallConfidence(flags),
        flags,
        {
          imageSize: typeof content === 'string' ? 'url' : `${content.length} bytes`,
          processingTime: Date.now() - startTime,
          analysisType: 'image'
        }
      );

      analysis.processingTime = Date.now() - startTime;
      return analysis;

    } catch (error) {
      return this.createErrorAnalysis(content, type, error);
    }
  }

  canHandle(type: ModerationContentType): boolean {
    return type === ModerationContentType.IMAGE;
  }

  getCapabilities(): ContentFilterCapabilities {
    return {
      supportedTypes: [ModerationContentType.IMAGE],
      realtime: true,
      confidence: 0.75,
      languages: ['universal'],
      customRules: true,
      learning: false
    };
  }

  private analyzeImageCharacteristics(imageData: Buffer | string): any[] {
    const flags: any[] = [];

    if (typeof imageData === 'string') {
      // URL-based image
      flags.push({
        id: this.generateId(),
        type: 'image_url',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'Image URL provided - limited analysis available',
        evidence: [imageData],
        confidence: {
          score: 0.3,
          confidence: 'low'
        }
      });
    } else {
      // Buffer-based image
      const sizeKB = imageData.length / 1024;

      // Large image detection
      if (sizeKB > 10240) { // > 10MB
        flags.push({
          id: this.generateId(),
          type: 'image_size',
          category: ModerationCategory.CUSTOM,
          severity: ModerationSeverity.MEDIUM,
          message: `Large image detected: ${sizeKB.toFixed(2)}KB`,
          evidence: [sizeKB.toString()],
          confidence: {
            score: 0.8,
            confidence: 'high'
          }
        });
      }

      // Suspicious file patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:image\/svg\+xml/i
      ];

      const imageStr = imageData.toString('latin1');
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(imageStr)) {
          flags.push({
            id: this.generateId(),
            type: 'suspicious_pattern',
            category: ModerationCategory.CUSTOM,
            severity: ModerationSeverity.HIGH,
            message: 'Suspicious pattern detected in image data',
            evidence: [pattern.toString()],
            confidence: {
              score: 0.9,
              confidence: 'high'
            }
          });
          break;
        }
      }
    }

    return flags;
  }

  private determineOverallCategoryAndSeverity(flags: any[]): { category: ModerationCategory; severity: ModerationSeverity } {
    if (flags.length === 0) {
      return { category: ModerationCategory.CUSTOM, severity: ModerationSeverity.LOW };
    }

    // Prioritize NSFW content
    const nsfwFlags = flags.filter(f => f.category === ModerationCategory.ADULT_CONTENT);
    if (nsfwFlags.length > 0) {
      return {
        category: ModerationCategory.ADULT_CONTENT,
        severity: this.getHighestSeverity(nsfwFlags)
      };
    }

    // Check for high-severity flags
    const highSeverityFlags = flags.filter(f => f.severity === ModerationSeverity.HIGH || f.severity === ModerationSeverity.CRITICAL);
    if (highSeverityFlags.length > 0) {
      const mostCommonCategory = this.getMostCommonCategory(highSeverityFlags);
      return {
        category: mostCommonCategory,
        severity: this.getHighestSeverity(highSeverityFlags)
      };
    }

    // Default to most common category and medium severity
    return {
      category: this.getMostCommonCategory(flags),
      severity: ModerationSeverity.MEDIUM
    };
  }

  private calculateOverallConfidence(flags: any[]): ModerationConfidence {
    if (flags.length === 0) {
      return { score: 0.8, confidence: 'high' };
    }

    const avgConfidence = flags.reduce((sum, flag) => sum + flag.confidence.score, 0) / flags.length;
    const confidenceLevel = avgConfidence >= 0.8 ? 'high' : avgConfidence >= 0.6 ? 'medium' : 'low';

    return { score: avgConfidence, confidence: confidenceLevel };
  }

  private getHighestSeverity(flags: any[]): ModerationSeverity {
    const severities = flags.map(f => f.severity);
    const severityOrder = [ModerationSeverity.CRITICAL, ModerationSeverity.HIGH, ModerationSeverity.MEDIUM, ModerationSeverity.LOW];

    for (const severity of severityOrder) {
      if (severities.includes(severity)) {
        return severity;
      }
    }

    return ModerationSeverity.LOW;
  }

  private getMostCommonCategory(flags: any[]): ModerationCategory {
    const categoryCounts = new Map<ModerationCategory, number>();

    flags.forEach(flag => {
      const count = categoryCounts.get(flag.category) || 0;
      categoryCounts.set(flag.category, count + 1);
    });

    let maxCount = 0;
    let mostCommon = ModerationCategory.CUSTOM;

    for (const [category, count] of categoryCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = category;
      }
    }

    return mostCommon;
  }

  private createSafeAnalysis(content: Buffer | string, type: ModerationContentType): ModerationAnalysis {
    return this.createAnalysis(
      content,
      type,
      ModerationCategory.CUSTOM,
      ModerationSeverity.LOW,
      { score: 0.8, confidence: 'high' },
      [],
      { safe: true, filterDisabled: !this.enabled }
    );
  }

  private createErrorAnalysis(content: Buffer | string, type: ModerationContentType, error: any): ModerationAnalysis {
    return this.createAnalysis(
      content,
      type,
      ModerationCategory.CUSTOM,
      ModerationSeverity.LOW,
      { score: 0.3, confidence: 'low' },
      [],
      {
        error: error.message,
        processingFailed: true,
        manualReviewRequired: true
      }
    );
  }
}

// Supporting Classes
// ==================

class NSFWDetector {
  async detect(imageData: Buffer | string): Promise<any[]> {
    const flags: any[] = [];

    try {
      // Placeholder for NSFW detection
      // In production, this would integrate with AI services like:
      // - Google Cloud Vision API
      // - AWS Rekognition
      // - Custom NSFW detection models

      if (typeof imageData === 'string') {
        flags.push({
          id: this.generateId(),
          type: 'nsfw_url',
          category: ModerationCategory.ADULT_CONTENT,
          severity: ModerationSeverity.MEDIUM,
          message: 'Image URL - NSFW analysis requires fetching',
          evidence: [imageData],
          confidence: {
            score: 0.4,
            confidence: 'low'
          }
        });
      } else {
        // Basic heuristics for NSFW detection
        const imageStr = imageData.toString('latin1').toLowerCase();

        // Check for suspicious keywords in image metadata
        const nsfwKeywords = ['adult', 'nsfw', 'explicit', 'mature', 'xxx', 'porn'];
        const foundKeywords = nsfwKeywords.filter(keyword => imageStr.includes(keyword));

        if (foundKeywords.length > 0) {
          flags.push({
            id: this.generateId(),
            type: 'nsfw_metadata',
            category: ModerationCategory.ADULT_CONTENT,
            severity: ModerationSeverity.HIGH,
            message: `NSFW keywords detected in metadata: ${foundKeywords.join(', ')}`,
            evidence: foundKeywords,
            confidence: {
              score: Math.min(foundKeywords.length * 0.3, 0.7),
              confidence: foundKeywords.length > 2 ? 'medium' : 'low'
            }
          });
        }

        // File size heuristic (very large images might be suspicious)
        const sizeMB = imageData.length / (1024 * 1024);
        if (sizeMB > 50) {
          flags.push({
            id: this.generateId(),
            type: 'large_file',
            category: ModerationCategory.CUSTOM,
            severity: ModerationSeverity.LOW,
            message: `Large image file: ${sizeMB.toFixed(2)}MB`,
            evidence: [sizeMB.toString()],
            confidence: {
              score: 0.3,
              confidence: 'low'
            }
          });
        }
      }

    } catch (error) {
      flags.push({
        id: this.generateId(),
        type: 'nsfw_error',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'NSFW detection failed',
        evidence: [error.message],
        confidence: {
          score: 0.2,
          confidence: 'low'
        }
      });
    }

    return flags;
  }

  private generateId(): string {
    return `nsfw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class ImageMetadataAnalyzer {
  async analyze(imageData: Buffer | string): Promise<any[]> {
    const flags: any[] = [];

    try {
      if (typeof imageData === 'string') {
        // URL-based image - limited metadata analysis
        flags.push({
          id: this.generateId(),
          type: 'metadata_url',
          category: ModerationCategory.CUSTOM,
          severity: ModerationSeverity.LOW,
          message: 'Image URL - metadata analysis limited',
          evidence: [imageData],
          confidence: {
            score: 0.3,
            confidence: 'low'
          }
        });
      } else {
        // Basic metadata extraction for buffer-based images
        const metadata = this.extractBasicMetadata(imageData);

        // Check for suspicious metadata
        if (metadata.suspiciousPatterns.length > 0) {
          flags.push({
            id: this.generateId(),
            type: 'suspicious_metadata',
            category: ModerationCategory.CUSTOM,
            severity: ModerationSeverity.MEDIUM,
            message: `Suspicious metadata patterns detected`,
            evidence: metadata.suspiciousPatterns,
            confidence: {
              score: 0.7,
              confidence: 'medium'
            }
          });
        }

        // Check for EXIF data that might contain personal info
        if (metadata.hasExif) {
          flags.push({
            id: this.generateId(),
            type: 'exif_data',
            category: ModerationCategory.PERSONAL_INFO,
            severity: ModerationSeverity.LOW,
            message: 'Image contains EXIF data - may contain personal information',
            evidence: ['EXIF data present'],
            confidence: {
              score: 0.5,
              confidence: 'medium'
            }
          });
        }
      }

    } catch (error) {
      flags.push({
        id: this.generateId(),
        type: 'metadata_error',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'Metadata analysis failed',
        evidence: [error.message],
        confidence: {
          score: 0.2,
          confidence: 'low'
        }
      });
    }

    return flags;
  }

  private extractBasicMetadata(imageData: Buffer): {
    hasExif: boolean;
    suspiciousPatterns: string[];
    format?: string;
    dimensions?: { width: number; height: number };
  } {
    // Placeholder for actual metadata extraction
    // In production, this would use libraries like 'sharp' or 'exif-reader'

    const result = {
      hasExif: false,
      suspiciousPatterns: [] as string[]
    };

    // Basic format detection
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46, 0x38]
    };

    const firstBytes = Array.from(imageData.slice(0, 4));

    for (const [format, signature] of Object.entries(signatures)) {
      if (signature.every((byte, index) => firstBytes[index] === byte)) {
        // Basic EXIF detection for JPEG
        if (format === 'image/jpeg') {
          const exifMarker = imageData.slice(0, Math.min(imageData.length, 10000));
          if (exifMarker.includes(Buffer.from('Exif'))) {
            result.hasExif = true;
          }
        }
        break;
      }
    }

    // Check for suspicious patterns in the image data
    const imageStr = imageData.toString('latin1');
    const suspiciousPatterns = [
      '<script',
      'javascript:',
      'data:text/html',
      'data:application',
      'PHNjcmlw' // base64 encoded '<script'
    ];

    for (const pattern of suspiciousPatterns) {
      if (imageStr.includes(pattern)) {
        result.suspiciousPatterns.push(pattern);
      }
    }

    return result;
  }

  private generateId(): string {
    return `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class ObjectDetector {
  async detect(imageData: Buffer | string): Promise<any[]> {
    const flags: any[] = [];

    try {
      if (typeof imageData === 'string') {
        flags.push({
          id: this.generateId(),
          type: 'object_url',
          category: ModerationCategory.CUSTOM,
          severity: ModerationSeverity.LOW,
          message: 'Image URL - object detection requires fetching',
          evidence: [imageData],
          confidence: {
            score: 0.3,
            confidence: 'low'
          }
        });
      } else {
        // Placeholder for object detection
        // In production, this would integrate with AI vision services

        // For now, perform basic heuristic analysis
        const analysis = this.performBasicHeuristicAnalysis(imageData);

        if (analysis.detectedObjects.length > 0) {
          flags.push({
            id: this.generateId(),
            type: 'object_detection',
            category: ModerationCategory.CUSTOM,
            severity: analysis.severity,
            message: `Objects detected: ${analysis.detectedObjects.join(', ')}`,
            evidence: analysis.detectedObjects,
            confidence: {
              score: analysis.confidence,
              confidence: analysis.confidence > 0.7 ? 'high' : analysis.confidence > 0.5 ? 'medium' : 'low'
            }
          });
        }
      }

    } catch (error) {
      flags.push({
        id: this.generateId(),
        type: 'object_error',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'Object detection failed',
        evidence: [error.message],
        confidence: {
          score: 0.2,
          confidence: 'low'
        }
      });
    }

    return flags;
  }

  private performBasicHeuristicAnalysis(imageData: Buffer): {
    detectedObjects: string[];
    severity: ModerationSeverity;
    confidence: number;
  } {
    // Very basic heuristic analysis
    // In production, this would be replaced with actual AI object detection

    const result = {
      detectedObjects: [] as string[],
      severity: ModerationSeverity.LOW,
      confidence: 0.3
    };

    // Look for text patterns that might indicate certain objects
    const imageStr = imageData.toString('latin1').toLowerCase();

    const objectPatterns = [
      { pattern: 'weapon', objects: ['weapon', 'gun', 'knife'], severity: ModerationSeverity.HIGH },
      { pattern: 'drug', objects: ['drug', 'pill', 'medication'], severity: ModerationSeverity.MEDIUM },
      { pattern: 'alcohol', objects: ['alcohol', 'beer', 'wine'], severity: ModerationSeverity.LOW },
      { pattern: 'tobacco', objects: ['tobacco', 'cigarette', 'smoking'], severity: ModerationSeverity.LOW }
    ];

    for (const { pattern, objects, severity } of objectPatterns) {
      if (imageStr.includes(pattern)) {
        result.detectedObjects.push(...objects);
        if (severity === ModerationSeverity.HIGH || result.severity === ModerationSeverity.LOW) {
          result.severity = severity;
        }
        result.confidence = Math.min(result.confidence + 0.2, 0.8);
      }
    }

    return result;
  }

  private generateId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
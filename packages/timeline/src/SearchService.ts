import { TimelineService } from './TimelineService';
import {
  TimelineEntry,
  TimelineFilter,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
  SearchIndex,
  SearchDocument,
  SearchHighlight,
  SearchFacet,
  SearchAnalytics,
} from './types/TimelineTypes';

export class SearchService {
  private timelineService: TimelineService;
  private searchIndex: SearchIndex = {
    documents: [],
    terms: new Map(),
    metadata: new Map(),
    lastUpdated: new Date(),
  };
  private suggestionsCache: Map<string, SearchSuggestion[]> = new Map();
  private searchAnalytics: SearchAnalytics = {
    totalSearches: 0,
    averageResults: 0,
    topQueries: [],
    popularFilters: [],
    searchLatency: [],
  };

  constructor(timelineService: TimelineService) {
    this.timelineService = timelineService;
    this.initializeSearchIndex();
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    this.searchAnalytics.totalSearches++;

    // Update search analytics
    this.updateSearchAnalytics(query.text);

    // Get entries based on filter
    let entries = await this.timelineService.queryTimeline({
      filter: query.filter,
      pagination: { limit: 1000 }, // Large limit for comprehensive search
    }).then(result => result.entries);

    // Apply text search
    let searchResults: TimelineEntry[] = [];
    let highlights: Record<string, string[]> = {};
    let scores: Record<string, number> = {};

    if (query.semantic) {
      searchResults = await this.semanticSearch(query, entries);
    } else {
      searchResults = await this.textSearch(query, entries);
    }

    // Calculate relevance scores
    scores = this.calculateRelevanceScores(searchResults, query);

    // Generate highlights if requested
    if (query.highlight) {
      highlights = this.generateHighlights(searchResults, query.text);
    }

    // Sort by relevance score
    searchResults.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    const paginatedResults = searchResults.slice(offset, offset + limit);

    // Generate suggestions
    const suggestions = await this.getSuggestions(query.text);

    // Update search latency
    const queryTime = Date.now() - startTime;
    this.searchAnalytics.searchLatency.push(queryTime);
    if (this.searchAnalytics.searchLatency.length > 100) {
      this.searchAnalytics.searchLatency = this.searchAnalytics.searchLatency.slice(-100);
    }

    return {
      entries: paginatedResults,
      highlights,
      scores,
      total: searchResults.length,
      queryTime,
      suggestions: suggestions.slice(0, 5),
    };
  }

  async indexEntry(entry: TimelineEntry): Promise<void> {
    const document: SearchDocument = {
      id: entry.id,
      content: this.extractSearchableContent(entry),
      metadata: {
        type: entry.type,
        status: entry.status,
        tags: entry.tags,
        createdAt: entry.createdAt,
        userId: entry.userId,
        sessionId: entry.sessionId,
        workflowId: entry.workflowId,
        priority: entry.priority,
        cost: entry.cost,
        duration: entry.duration,
        confidence: entry.confidence,
      },
      vectors: await this.generateVectors(entry),
      embeddings: await this.generateEmbeddings(entry),
    };

    this.searchIndex.documents.push(document);
    this.updateInvertedIndex(document);
    this.searchIndex.lastUpdated = new Date();
  }

  async reindex(): Promise<void> {
    // Clear existing index
    this.searchIndex = {
      documents: [],
      terms: new Map(),
      metadata: new Map(),
      lastUpdated: new Date(),
    };

    // Reindex all entries
    const entries = await this.timelineService.queryTimeline({
      pagination: { limit: 10000 },
    }).then(result => result.entries);

    for (const entry of entries) {
      await this.indexEntry(entry);
    }
  }

  async getSearchFacets(filter?: TimelineFilter): Promise<SearchFacet[]> {
    const entries = await this.timelineService.queryTimeline({
      filter,
      pagination: { limit: 10000 },
    }).then(result => result.entries);

    const facets: SearchFacet[] = [];

    // Type facet
    const typeCounts = entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    facets.push({
      name: 'type',
      label: 'Job Type',
      type: 'terms',
      values: Object.entries(typeCounts).map(([value, count]) => ({ value, count })),
    });

    // Status facet
    const statusCounts = entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    facets.push({
      name: 'status',
      label: 'Status',
      type: 'terms',
      values: Object.entries(statusCounts).map(([value, count]) => ({ value, count })),
    });

    // Tags facet
    const tagCounts = entries.reduce((acc, entry) => {
      entry.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    facets.push({
      name: 'tags',
      label: 'Tags',
      type: 'terms',
      values: Object.entries(tagCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    });

    // Date range facet
    const dates = entries.map(e => e.createdAt.getTime()).sort((a, b) => a - b);
    if (dates.length > 0) {
      facets.push({
        name: 'dateRange',
        label: 'Date Range',
        type: 'range',
        values: [{
          from: new Date(dates[0]),
          to: new Date(dates[dates.length - 1]),
          count: dates.length,
        }],
      });
    }

    // Cost range facet
    const costs = entries.filter(e => e.cost !== undefined).map(e => e.cost!).sort((a, b) => a - b);
    if (costs.length > 0) {
      facets.push({
        name: 'costRange',
        label: 'Cost Range',
        type: 'range',
        values: [{
          from: costs[0],
          to: costs[costs.length - 1],
          count: costs.length,
        }],
      });
    }

    return facets;
  }

  async getSuggestions(query: string, limit = 10): Promise<SearchSuggestion[]> {
    const cacheKey = `suggestions:${query.toLowerCase()}`;
    const cached = this.suggestionsCache.get(cacheKey);

    if (cached) {
      return cached.slice(0, limit);
    }

    const suggestions: SearchSuggestion[] = [];

    // Get term-based suggestions
    const termSuggestions = this.getTermSuggestions(query);
    suggestions.push(...termSuggestions);

    // Get metadata-based suggestions
    const metadataSuggestions = this.getMetadataSuggestions(query);
    suggestions.push(...metadataSuggestions);

    // Get content-based suggestions
    const contentSuggestions = await this.getContentSuggestions(query);
    suggestions.push(...contentSuggestions);

    // Remove duplicates and sort by relevance
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    uniqueSuggestions.sort((a, b) => b.score - a.score);

    // Cache the results
    this.suggestionsCache.set(cacheKey, uniqueSuggestions);

    return uniqueSuggestions.slice(0, limit);
  }

  async getSearchAnalytics(): Promise<SearchAnalytics> {
    return {
      ...this.searchAnalytics,
      averageLatency: this.searchAnalytics.searchLatency.length > 0
        ? this.searchAnalytics.searchLatency.reduce((a, b) => a + b, 0) / this.searchAnalytics.searchLatency.length
        : 0,
    };
  }

  async advancedSearch(options: {
    query: string;
    filters?: TimelineFilter;
    mustMatch?: string[];
    shouldMatch?: string[];
    mustNotMatch?: string[];
    fuzzy?: boolean;
    boostFields?: Record<string, number>;
    minimumShouldMatch?: number;
  }): Promise<SearchResult> {
    const {
      query,
      filters,
      mustMatch = [],
      shouldMatch = [],
      mustNotMatch = [],
      fuzzy = false,
      boostFields = {},
      minimumShouldMatch = 1,
    } = options;

    let entries = await this.timelineService.queryTimeline({
      filter: filters,
      pagination: { limit: 1000 },
    }).then(result => result.entries);

    // Apply must-match filters
    if (mustMatch.length > 0) {
      entries = entries.filter(entry =>
        mustMatch.every(term => this.matchesTerm(entry, term, fuzzy))
      );
    }

    // Apply must-not-match filters
    if (mustNotMatch.length > 0) {
      entries = entries.filter(entry =>
        !mustNotMatch.some(term => this.matchesTerm(entry, term, fuzzy))
      );
    }

    // Calculate scores with boost fields
    const scores: Record<string, number> = {};
    for (const entry of entries) {
      let score = this.calculateTextRelevance(entry, query, fuzzy);

      // Apply field boosts
      for (const [field, boost] of Object.entries(boostFields)) {
        if ((entry as any)[field]) {
          score *= boost;
        }
      }

      scores[entry.id] = score;
    }

    // Apply should-match minimum requirement
    if (shouldMatch.length > 0) {
      entries = entries.filter(entry => {
        const matchCount = shouldMatch.filter(term => this.matchesTerm(entry, term, fuzzy)).length;
        return matchCount >= minimumShouldMatch;
      });
    }

    // Sort by score
    entries.sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

    return {
      entries: entries.slice(0, 20),
      highlights: this.generateHighlights(entries, query),
      scores,
      total: entries.length,
      queryTime: Date.now() - startTime,
    };
  }

  // Private helper methods
  private async initializeSearchIndex(): Promise<void> {
    await this.reindex();
  }

  private async textSearch(query: SearchQuery, entries: TimelineEntry[]): Promise<TimelineEntry[]> {
    const searchTerms = this.tokenize(query.text);
    const results: TimelineEntry[] = [];

    for (const entry of entries) {
      const score = this.calculateTextRelevance(entry, query.text, query.fuzzy);
      if (score > 0) {
        results.push(entry);
      }
    }

    return results;
  }

  private async semanticSearch(query: SearchQuery, entries: TimelineEntry[]): Promise<TimelineEntry[]> {
    // Simplified semantic search - in production, use actual vector similarity
    const queryEmbedding = await this.generateQueryEmbedding(query.text);
    const results: TimelineEntry[] = [];

    for (const entry of entries) {
      const document = this.searchIndex.documents.find(d => d.id === entry.id);
      if (document?.embeddings) {
        const similarity = this.calculateCosineSimilarity(queryEmbedding, document.embeddings);
        if (similarity > 0.5) { // Threshold for semantic similarity
          results.push(entry);
        }
      }
    }

    return results;
  }

  private calculateTextRelevance(entry: TimelineEntry, query: string, fuzzy = false): number {
    const terms = this.tokenize(query);
    let score = 0;

    for (const term of terms) {
      if (this.matchesTerm(entry, term, fuzzy)) {
        score += this.getTermWeight(term, entry);
      }
    }

    return score;
  }

  private matchesTerm(entry: TimelineEntry, term: string, fuzzy = false): boolean {
    const content = this.extractSearchableContent(entry).toLowerCase();
    const searchTerm = term.toLowerCase();

    if (fuzzy) {
      return this.fuzzyMatch(content, searchTerm);
    }

    return content.includes(searchTerm);
  }

  private fuzzyMatch(text: string, pattern: string, threshold = 0.8): boolean {
    // Simple fuzzy matching using Levenshtein distance
    const distance = this.levenshteinDistance(text, pattern);
    const maxLength = Math.max(text.length, pattern.length);
    return (maxLength - distance) / maxLength >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getTermWeight(term: string, entry: TimelineEntry): number {
    let weight = 1;

    // Boost for title matches
    if (entry.title.toLowerCase().includes(term.toLowerCase())) {
      weight *= 3;
    }

    // Boost for tag matches
    if (entry.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase()))) {
      weight *= 2;
    }

    // Boost for recent entries
    const daysSinceCreation = (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) {
      weight *= 1.5;
    }

    return weight;
  }

  private generateHighlights(entries: TimelineEntry[], query: string): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    const terms = this.tokenize(query);

    for (const entry of entries) {
      highlights[entry.id] = [];

      // Highlight in title
      if (entry.title) {
        const highlightedTitle = this.highlightText(entry.title, terms);
        if (highlightedTitle !== entry.title) {
          highlights[entry.id].push(`title: ${highlightedTitle}`);
        }
      }

      // Highlight in description
      if (entry.description) {
        const highlightedDesc = this.highlightText(entry.description, terms);
        if (highlightedDesc !== entry.description) {
          highlights[entry.id].push(`description: ${highlightedDesc}`);
        }
      }

      // Highlight in tags
      const matchingTags = entry.tags.filter(tag =>
        terms.some(term => tag.toLowerCase().includes(term.toLowerCase()))
      );
      if (matchingTags.length > 0) {
        highlights[entry.id].push(`tags: ${matchingTags.join(', ')}`);
      }
    }

    return highlights;
  }

  private highlightText(text: string, terms: string[]): string {
    let highlighted = text;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
    return highlighted;
  }

  private calculateRelevanceScores(entries: TimelineEntry[], query: SearchQuery): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const entry of entries) {
      let score = this.calculateTextRelevance(entry, query.text, query.fuzzy);

      // Boost for specific fields if specified
      if (query.fields) {
        for (const field of query.fields) {
          const fieldValue = (entry as any)[field];
          if (fieldValue && typeof fieldValue === 'string') {
            if (fieldValue.toLowerCase().includes(query.text.toLowerCase())) {
              score *= 2;
            }
          }
        }
      }

      scores[entry.id] = score;
    }

    return scores;
  }

  private updateInvertedIndex(document: SearchDocument): void {
    const terms = this.tokenize(document.content);

    for (const term of terms) {
      if (!this.searchIndex.terms.has(term)) {
        this.searchIndex.terms.set(term, []);
      }
      this.searchIndex.terms.get(term)!.push(document.id);
    }

    // Update metadata index
    for (const [key, value] of Object.entries(document.metadata)) {
      const metadataKey = `${key}:${value}`;
      if (!this.searchIndex.metadata.has(metadataKey)) {
        this.searchIndex.metadata.set(metadataKey, []);
      }
      this.searchIndex.metadata.get(metadataKey)!.push(document.id);
    }
  }

  private extractSearchableContent(entry: TimelineEntry): string {
    const parts = [
      entry.title,
      entry.description,
      ...entry.tags,
      JSON.stringify(entry.input),
      JSON.stringify(entry.output),
      JSON.stringify(entry.metadata),
    ];

    return parts.filter(Boolean).join(' ');
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  private async generateVectors(entry: TimelineEntry): number[] {
    // Simplified vector generation - in production, use actual embedding models
    const content = this.extractSearchableContent(entry);
    return this.hashToVector(content);
  }

  private async generateEmbeddings(entry: TimelineEntry): number[] {
    // Simplified embedding generation - in production, use actual embedding models
    return this.generateVectors(entry);
  }

  private async generateQueryEmbedding(query: string): number[] {
    return this.hashToVector(query);
  }

  private hashToVector(text: string, dimensions = 128): number[] {
    // Simple hash-based vector generation
    const vector = new Array(dimensions).fill(0);
    const hash = this.simpleHash(text);

    for (let i = 0; i < dimensions; i++) {
      vector[i] = ((hash >> (i % 32)) & 1) * 2 - 1; // -1 or 1
    }

    return vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  private getTermSuggestions(query: string): SearchSuggestion[] {
    const terms = this.tokenize(query);
    const suggestions: SearchSuggestion[] = [];

    // Find similar terms in the index
    for (const term of terms) {
      const similarTerms = Array.from(this.searchIndex.terms.keys())
        .filter(indexTerm => this.fuzzyMatch(indexTerm, term, 0.7))
        .slice(0, 3);

      for (const similarTerm of similarTerms) {
        suggestions.push({
          text: similarTerm,
          type: 'term',
          score: this.levenshteinDistance(term, similarTerm),
          context: `Found ${this.searchIndex.terms.get(similarTerm)?.length || 0} documents`,
        });
      }
    }

    return suggestions;
  }

  private getMetadataSuggestions(query: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // Search in metadata
    for (const [key, value] of this.searchIndex.metadata.keys()) {
      if (key.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          text: key,
          type: 'metadata',
          score: 0.8,
          context: `Filter by ${key}`,
        });
      }
    }

    return suggestions;
  }

  private async getContentSuggestions(query: string): Promise<SearchSuggestion[]> {
    // In a real implementation, this would use more sophisticated NLP
    const commonPhrases = [
      'error handling',
      'data processing',
      'api integration',
      'user interface',
      'database query',
      'file upload',
      'authentication',
      'authorization',
      'performance optimization',
      'security audit',
    ];

    return commonPhrases
      .filter(phrase => phrase.includes(query.toLowerCase()))
      .map(phrase => ({
        text: phrase,
        type: 'phrase',
        score: 0.9,
        context: 'Common search phrase',
      }));
  }

  private deduplicateSuggestions(suggestions: SearchSuggestion[]): SearchSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.text}:${suggestion.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private updateSearchAnalytics(query: string): void {
    // Update top queries
    const existingQuery = this.searchAnalytics.topQueries.find(q => q.query === query);
    if (existingQuery) {
      existingQuery.count++;
    } else {
      this.searchAnalytics.topQueries.push({ query, count: 1 });
    }

    // Keep only top 100 queries
    this.searchAnalytics.topQueries.sort((a, b) => b.count - a.count);
    this.searchAnalytics.topQueries = this.searchAnalytics.topQueries.slice(0, 100);
  }
}
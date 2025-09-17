export interface AppRecommendation {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  integrationComplexity: 'low' | 'medium' | 'high';
  popular: boolean;
  new: boolean;
  recommendedFor: string[];
  tags: string[];
  rating: number;
  installCount: number;
}

export interface UserProfile {
  id: string;
  preferences: {
    categories: string[];
    complexity: 'low' | 'medium' | 'high';
    interests: string[];
  };
  installedApps: string[];
  usagePatterns: {
    mostUsedCategories: string[];
    sessionCount: number;
    lastActive: Date;
  };
}

export class SmartRecommendationEngine {
  private apps: AppRecommendation[] = [
    {
      id: 'slack',
      name: 'Slack',
      category: 'Communication',
      description: 'Team communication and collaboration platform',
      icon: 'MessageCircle',
      integrationComplexity: 'low',
      popular: true,
      new: false,
      recommendedFor: ['teams', 'developers', 'business'],
      tags: ['chat', 'teams', 'communication'],
      rating: 4.5,
      installCount: 150000
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'Productivity',
      description: 'Schedule management and event coordination',
      icon: 'Calendar',
      integrationComplexity: 'low',
      popular: true,
      new: false,
      recommendedFor: ['professionals', 'teams', 'students'],
      tags: ['calendar', 'scheduling', 'events'],
      rating: 4.3,
      installCount: 200000
    },
    {
      id: 'notion',
      name: 'Notion',
      category: 'Productivity',
      description: 'All-in-one workspace for notes, tasks, wikis, and databases',
      icon: 'FileText',
      integrationComplexity: 'medium',
      popular: true,
      new: false,
      recommendedFor: ['teams', 'students', 'creatives'],
      tags: ['notes', 'wiki', 'database'],
      rating: 4.6,
      installCount: 120000
    },
    {
      id: 'github',
      name: 'GitHub',
      category: 'Development',
      description: 'Code hosting and collaboration platform',
      icon: 'GitBranch',
      integrationComplexity: 'medium',
      popular: true,
      new: false,
      recommendedFor: ['developers', 'teams'],
      tags: ['git', 'code', 'collaboration'],
      rating: 4.4,
      installCount: 180000
    },
    {
      id: 'figma',
      name: 'Figma',
      category: 'Design',
      description: 'Collaborative design tool',
      icon: 'Palette',
      integrationComplexity: 'medium',
      popular: true,
      new: false,
      recommendedFor: ['designers', 'teams', 'creatives'],
      tags: ['design', 'ui', 'collaboration'],
      rating: 4.5,
      installCount: 95000
    },
    {
      id: 'discord',
      name: 'Discord',
      category: 'Communication',
      description: 'Voice, video, and text communication',
      icon: 'Mic',
      integrationComplexity: 'low',
      popular: true,
      new: false,
      recommendedFor: ['gamers', 'communities', 'teams'],
      tags: ['voice', 'chat', 'community'],
      rating: 4.2,
      installCount: 160000
    }
  ];

  getPersonalizedRecommendations(userProfile: UserProfile): AppRecommendation[] {
    const recommendations: AppRecommendation[] = [];

    // Score each app based on user preferences
    const scoredApps = this.apps.map(app => {
      let score = 0;

      // Category matching
      if (userProfile.preferences.categories.includes(app.category)) {
        score += 30;
      }

      // Interest matching
      const matchingInterests = app.tags.filter(tag =>
        userProfile.preferences.interests.some(interest =>
          interest.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(interest.toLowerCase())
        )
      );
      score += matchingInterests.length * 15;

      // Complexity preference
      if (userProfile.preferences.complexity === app.integrationComplexity) {
        score += 20;
      }

      // Popular apps get a boost
      if (app.popular) {
        score += 10;
      }

      // New apps get a boost for discovery
      if (app.new) {
        score += 15;
      }

      // High rating bonus
      score += app.rating * 5;

      // Already installed penalty
      if (userProfile.installedApps.includes(app.id)) {
        score -= 100;
      }

      return { ...app, score };
    });

    // Sort by score and return top recommendations
    return scoredApps
      .filter(app => app.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  getCategoryRecommendations(category: string, limit: number = 4): AppRecommendation[] {
    return this.apps
      .filter(app => app.category === category)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  getTrendingApps(limit: number = 5): AppRecommendation[] {
    return this.apps
      .filter(app => app.popular)
      .sort((a, b) => b.installCount - a.installCount)
      .slice(0, limit);
  }

  getNewReleases(limit: number = 3): AppRecommendation[] {
    return this.apps
      .filter(app => app.new)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  searchApps(query: string): AppRecommendation[] {
    const lowercaseQuery = query.toLowerCase();
    return this.apps.filter(app =>
      app.name.toLowerCase().includes(lowercaseQuery) ||
      app.description.toLowerCase().includes(lowercaseQuery) ||
      app.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      app.category.toLowerCase().includes(lowercaseQuery)
    );
  }
}
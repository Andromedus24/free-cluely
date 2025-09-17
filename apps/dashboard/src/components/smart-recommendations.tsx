"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  TrendingUp,
  Star,
  Clock,
  Users,
  Search,
  Filter,
  Target,
  Zap
} from 'lucide-react';
import { SmartRecommendationEngine, AppRecommendation, UserProfile } from '@/lib/smart-recommendations';

interface SmartRecommendationsProps {
  userId?: string;
  onAppSelect?: (appId: string) => void;
}

export default function SmartRecommendations({ userId, onAppSelect }: SmartRecommendationsProps) {
  const [recommendationEngine] = useState(() => new SmartRecommendationEngine());
  const [activeTab, setActiveTab] = useState<'personalized' | 'trending' | 'new' | 'categories'>('personalized');
  const [recommendations, setRecommendations] = useState<AppRecommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock user profile - in real app, this would come from backend
  const userProfile: UserProfile = {
    id: userId || 'default-user',
    preferences: {
      categories: ['Productivity', 'Communication'],
      complexity: 'medium',
      interests: ['collaboration', 'automation', 'development']
    },
    installedApps: ['slack', 'google-calendar'],
    usagePatterns: {
      mostUsedCategories: ['Productivity', 'Communication'],
      sessionCount: 25,
      lastActive: new Date()
    }
  };

  const categories = [
    'all',
    'Productivity',
    'Communication',
    'Development',
    'Design',
    'Business',
    'AI & Machine Learning',
    'Social Media'
  ];

  useEffect(() => {
    loadRecommendations();
  }, [activeTab, selectedCategory]);

  const loadRecommendations = async () => {
    setIsLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let recs: AppRecommendation[] = [];

    switch (activeTab) {
      case 'personalized':
        recs = recommendationEngine.getPersonalizedRecommendations(userProfile);
        break;
      case 'trending':
        recs = recommendationEngine.getTrendingApps();
        break;
      case 'new':
        recs = recommendationEngine.getNewReleases();
        break;
      case 'categories':
        if (selectedCategory !== 'all') {
          recs = recommendationEngine.getCategoryRecommendations(selectedCategory);
        } else {
          // Show top apps from each category
          const categoriesToFetch = ['Productivity', 'Communication', 'Development', 'Design'];
          recs = categoriesToFetch.flatMap(cat =>
            recommendationEngine.getCategoryRecommendations(cat, 2)
          );
        }
        break;
    }

    setRecommendations(recs);
    setIsLoading(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const searchResults = recommendationEngine.searchApps(query);
      setRecommendations(searchResults);
    } else {
      loadRecommendations();
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAppCard = (app: AppRecommendation, index: number) => (
    <motion.div
      key={app.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <app.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">{app.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{app.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{app.rating}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {app.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className={getComplexityColor(app.integrationComplexity)}>
              {app.integrationComplexity}
            </Badge>
            {app.popular && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <TrendingUp className="w-3 h-3 mr-1" />
                Popular
              </Badge>
            )}
            {app.new && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                New
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-4">
            {app.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => onAppSelect?.(app.id)}
            variant={userProfile.installedApps.includes(app.id) ? "outline" : "default"}
          >
            {userProfile.installedApps.includes(app.id) ? 'Installed' : 'Install'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold">Smart App Recommendations</h2>
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.div>
        <p className="text-lg text-muted-foreground">
          Discover apps tailored to your workflow and preferences
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category === 'all' ? 'All Categories' : category}
          </Button>
        ))}
      </div>

      {/* Recommendation Type Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant={activeTab === 'personalized' ? "default" : "outline"}
          onClick={() => setActiveTab('personalized')}
          className="flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          For You
        </Button>
        <Button
          variant={activeTab === 'trending' ? "default" : "outline"}
          onClick={() => setActiveTab('trending')}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Trending
        </Button>
        <Button
          variant={activeTab === 'new' ? "default" : "outline"}
          onClick={() => setActiveTab('new')}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          New Releases
        </Button>
      </div>

      {/* Recommendations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-8 bg-gray-200 rounded mt-4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((app, index) => renderAppCard(app, index))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No apps found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or browse different categories
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* User Insights */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{userProfile.installedApps.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">Apps Installed</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{userProfile.usagePatterns.sessionCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Sessions</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">
                  {recommendationEngine.getPersonalizedRecommendations(userProfile).length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
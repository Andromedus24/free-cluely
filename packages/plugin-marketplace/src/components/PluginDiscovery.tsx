import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Star,
  Shield,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  Tag,
  AlertTriangle,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  MarketplacePlugin,
  MarketplaceQuery,
  InstallationStatus,
  PluginReview
} from '../types/MarketplaceTypes';

export interface PluginDiscoveryProps {
  onInstall?: (plugin: MarketplacePlugin) => void;
  onView?: (plugin: MarketplacePlugin) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

export const PluginDiscovery: React.FC<PluginDiscoveryProps> = ({
  onInstall,
  onView,
  className,
  theme = 'light'
}) => {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'updated' | 'name'>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [reviews, setReviews] = useState<Record<string, PluginReview[]>>({});

  // Mock categories
  const categories = [
    'All',
    'Development',
    'Productivity',
    'Utilities',
    'Security',
    'AI & ML',
    'Automation',
    'Communication'
  ];

  // Mock plugins data
  const mockPlugins: MarketplacePlugin[] = [
    {
      id: '1',
      name: 'Code Assistant Pro',
      version: '1.2.0',
      description: 'Advanced AI-powered code completion and refactoring tool',
      author: {
        name: 'DevTools Inc',
        email: 'contact@devtools.com'
      },
      category: 'Development',
      tags: ['ai', 'code', 'productivity'],
      price: {
        amount: 19.99,
        currency: 'USD',
        subscription: true
      },
      rating: {
        average: 4.8,
        count: 1250,
        distribution: { 5: 980, 4: 200, 3: 50, 2: 15, 1: 5 }
      },
      downloads: {
        total: 45230,
        monthly: 3200,
        weekly: 850
      },
      manifest: {
        name: 'code-assistant-pro',
        version: '1.2.0',
        description: 'Advanced AI-powered code completion and refactoring tool',
        author: 'DevTools Inc',
        main: 'index.js',
        permissions: ['network', 'automation']
      },
      screenshots: [
        {
          url: 'https://via.placeholder.com/600x400',
          alt: 'Code Assistant Interface',
          width: 600,
          height: 400
        }
      ],
      repository: {
        url: 'https://github.com/devtools/code-assistant-pro',
        type: 'github'
      },
      documentation: {
        url: 'https://docs.devtools.com/code-assistant'
      },
      security: {
        verified: true,
        scanResults: {
          vulnerabilities: [],
          lastScanned: new Date(),
          score: 95
        },
        permissions: ['network', 'automation']
      },
      compatibility: {
        os: ['windows', 'macos', 'linux'],
        arch: ['x64', 'arm64'],
        minVersion: '1.0.0'
      },
      features: [
        'AI-powered code completion',
        'Intelligent refactoring suggestions',
        'Multi-language support',
        'Real-time error detection'
      ],
      requirements: [
        'Node.js 16+',
        '2GB RAM minimum'
      ],
      publishedAt: new Date('2023-06-15'),
      updatedAt: new Date('2023-12-01'),
      isFeatured: true,
      isOfficial: false,
      status: 'published'
    },
    {
      id: '2',
      name: 'Screen Capture Plus',
      version: '2.1.0',
      description: 'Enhanced screenshot and screen recording capabilities',
      author: {
        name: 'Capture Studio',
        email: 'support@capturestudio.com'
      },
      category: 'Utilities',
      tags: ['screenshot', 'recording', 'productivity'],
      price: {
        amount: 0,
        currency: 'USD'
      },
      rating: {
        average: 4.6,
        count: 890,
        distribution: { 5: 650, 4: 180, 3: 40, 2: 15, 1: 5 }
      },
      downloads: {
        total: 23450,
        monthly: 1800,
        weekly: 420
      },
      manifest: {
        name: 'screen-capture-plus',
        version: '2.1.0',
        description: 'Enhanced screenshot and screen recording capabilities',
        author: 'Capture Studio',
        main: 'index.js',
        permissions: ['screen']
      },
      security: {
        verified: true,
        scanResults: {
          vulnerabilities: [],
          lastScanned: new Date(),
          score: 92
        },
        permissions: ['screen']
      },
      compatibility: {
        os: ['windows', 'macos', 'linux'],
        arch: ['x64', 'arm64'],
        minVersion: '1.0.0'
      },
      features: [
        'Advanced screenshot tools',
        'Screen recording with audio',
        'Annotation and markup',
        'Cloud sync integration'
      ],
      publishedAt: new Date('2023-03-20'),
      updatedAt: new Date('2023-11-15'),
      isFeatured: false,
      isOfficial: false,
      status: 'published'
    }
  ];

  useEffect(() => {
    loadPlugins();
  }, [searchQuery, selectedCategory, sortBy]);

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredPlugins = mockPlugins;

      // Apply search filter
      if (searchQuery) {
        filteredPlugins = filteredPlugins.filter(plugin =>
          plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plugin.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Apply category filter
      if (selectedCategory && selectedCategory !== 'All') {
        filteredPlugins = filteredPlugins.filter(plugin => plugin.category === selectedCategory);
      }

      // Apply sorting
      filteredPlugins.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return b.rating.average - a.rating.average;
          case 'downloads':
            return b.downloads.total - a.downloads.total;
          case 'updated':
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });

      setPlugins(filteredPlugins);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, sortBy]);

  const handleInstall = async (plugin: MarketplacePlugin) => {
    setInstalling(prev => new Set(prev).add(plugin.id));

    try {
      // Simulate installation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (onInstall) {
        onInstall(plugin);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setInstalling(prev => {
        const newSet = new Set(prev);
        newSet.delete(plugin.id);
        return newSet;
      });
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={cn(
            'w-4 h-4',
            i <= Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
          )}
        />
      );
    }
    return stars;
  };

  return (
    <div className={cn(
      'w-full max-w-7xl mx-auto p-6',
      theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900',
      className
    )}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plugin Marketplace</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and install plugins to enhance your workflow
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              )}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'px-4 py-2 border rounded-lg flex items-center gap-2',
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={cn(
                'px-4 py-2 border rounded-lg',
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              )}
            >
              <option value="rating">Rating</option>
              <option value="downloads">Downloads</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2"
            >
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category === 'All' ? '' : category)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm transition-colors',
                    (selectedCategory === category) || (category === 'All' && !selectedCategory)
                      ? 'bg-blue-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  {category}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {plugins.length} plugins found
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Shield className="w-4 h-4" />
          <span>All plugins verified</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading plugins...</span>
        </div>
      )}

      {/* Plugin Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plugins.map(plugin => (
            <motion.div
              key={plugin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-lg border p-6 hover:shadow-lg transition-shadow',
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              )}
            >
              {/* Plugin Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{plugin.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    by {plugin.author.name}
                  </p>
                </div>
                {plugin.security.verified && (
                  <Shield className="w-5 h-5 text-green-500" />
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                {plugin.description}
              </p>

              {/* Rating and Downloads */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(plugin.rating.average)}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({plugin.rating.count})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Download className="w-4 h-4" />
                  <span>{formatNumber(plugin.downloads.total)}</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {plugin.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className={cn(
                      'px-2 py-1 rounded-full text-xs',
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tag}
                  </span>
                ))}
                {plugin.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{plugin.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {plugin.price.amount > 0 ? (
                    <>
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="font-semibold">
                        ${plugin.price.amount}
                        {plugin.price.subscription && '/month'}
                      </span>
                    </>
                  ) : (
                    <span className="text-green-500 font-semibold">Free</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(plugin.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleInstall(plugin)}
                  disabled={installing.has(plugin.id)}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                    installing.has(plugin.id)
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                  )}
                >
                  {installing.has(plugin.id) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Installing...
                    </>
                  ) : (
                    'Install'
                  )}
                </button>

                <button
                  onClick={() => onView && onView(plugin)}
                  className={cn(
                    'px-4 py-2 border rounded-lg font-medium',
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  View
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && plugins.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No plugins found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
};

// Utility function
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default PluginDiscovery;
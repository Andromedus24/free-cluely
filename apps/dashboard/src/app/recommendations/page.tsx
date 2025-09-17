"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SmartRecommendations from '@/components/smart-recommendations';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  ArrowLeft,
  CheckCircle,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export default function RecommendationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'productivity', name: 'Productivity', count: 45, icon: 'Target' },
    { id: 'communication', name: 'Communication', count: 32, icon: 'MessageCircle' },
    { id: 'development', name: 'Development', count: 28, icon: 'Code' },
    { id: 'design', name: 'Design', count: 19, icon: 'Palette' },
    { id: 'business', name: 'Business', count: 37, icon: 'Briefcase' },
    { id: 'ai', name: 'AI & ML', count: 23, icon: 'Brain' }
  ];

  const stats = [
    { label: 'Total Apps', value: '300+', icon: 'Package', color: 'text-blue-600' },
    { label: 'Active Users', value: '50K+', icon: 'Users', color: 'text-green-600' },
    { label: 'Integrations', value: '1.2M+', icon: 'Zap', color: 'text-purple-600' },
    { label: 'Success Rate', value: '98%', icon: 'CheckCircle', color: 'text-emerald-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Brain className="w-8 h-8 text-primary" />
                  Smart Recommendations
                </h1>
                <p className="text-muted-foreground mt-1">
                  AI-powered app discovery tailored to your workflow
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-secondary/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Powered by AI
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Category Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Browse by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group"
                >
                  <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 ${
                    selectedCategory === category.id ? 'border-primary bg-primary/5' : 'border-border/50'
                  }`} onClick={() => setSelectedCategory(category.id)}>
                    <CardContent className="pt-6 text-center">
                      <category.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-1">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.count} apps</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Smart Recommendations Component */}
        <SmartRecommendations
          onAppSelect={(appId) => {
            console.log('Selected app:', appId);
            // Here you would handle app installation/integration
          }}
        />

        {/* Additional Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Personalized Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Our AI analyzes your workflow and preferences to recommend the perfect apps for your needs.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Usage pattern analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Preference matching
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Collaborative filtering
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Trending Apps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Discover what's popular in your industry and among users with similar workflows.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Real-time popularity metrics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Industry-specific trends
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Rising star predictions
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Smart Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                One-click setup with intelligent configuration based on your existing tools.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Auto-configuration
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Compatibility checking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Workflow optimization
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
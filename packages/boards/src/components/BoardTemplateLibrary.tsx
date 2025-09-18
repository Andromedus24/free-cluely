import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardTemplate, BoardTemplateCategory } from '../types/BoardTypes';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { BuiltInTemplates } from '../data/BuiltInTemplates';

interface BoardTemplateLibraryProps {
  onTemplateSelect: (template: BoardTemplate) => void;
  onClose: () => void;
  className?: string;
}

interface TemplateFilters {
  category: BoardTemplateCategory | 'all';
  search: string;
  boardType: 'kanban' | 'scrum' | 'list' | 'calendar' | 'timeline' | 'mindmap' | 'gantt' | 'custom' | 'all';
  sortBy: 'popular' | 'newest' | 'rating' | 'name';
}

export const BoardTemplateLibrary: React.FC<BoardTemplateLibraryProps> = ({
  onTemplateSelect,
  onClose,
  className = ''
}) => {
  const [templates, setTemplates] = useState<BoardTemplate[]>(BuiltInTemplates);
  const [filteredTemplates, setFilteredTemplates] = useState<BoardTemplate[]>(BuiltInTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);
  const [filters, setFilters] = useState<TemplateFilters>({
    category: 'all',
    search: '',
    boardType: 'all',
    sortBy: 'popular'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Filter and sort templates
  useEffect(() => {
    let filtered = [...templates];

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(template => template.category === filters.category);
    }

    // Apply board type filter
    if (filters.boardType !== 'all') {
      filtered = filtered.filter(template => template.boardType === filters.boardType);
    }

    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredTemplates(filtered);
  }, [templates, filters]);

  const handleFilterChange = (key: keyof TemplateFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTemplateClick = (template: BoardTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = async (template: BoardTemplate) => {
    setIsLoading(true);
    try {
      // Update template usage count
      const updatedTemplates = templates.map(t =>
        t.id === template.id ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t
      );
      setTemplates(updatedTemplates);

      onTemplateSelect(template);
      onClose();
    } catch (error) {
      console.error('Error using template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categories: { value: BoardTemplateCategory | 'all'; label: string; count: number }[] = [
    { value: 'all', label: 'All Templates', count: templates.length },
    { value: 'project-management', label: 'Project Management', count: templates.filter(t => t.category === 'project-management').length },
    { value: 'software-development', label: 'Software Development', count: templates.filter(t => t.category === 'software-development').length },
    { value: 'marketing', label: 'Marketing', count: templates.filter(t => t.category === 'marketing').length },
    { value: 'sales', label: 'Sales', count: templates.filter(t => t.category === 'sales').length },
    { value: 'hr', label: 'Human Resources', count: templates.filter(t => t.category === 'hr').length },
    { value: 'operations', label: 'Operations', count: templates.filter(t => t.category === 'operations').length },
    { value: 'personal', label: 'Personal', count: templates.filter(t => t.category === 'personal').length },
    { value: 'custom', label: 'Custom', count: templates.filter(t => t.category === 'custom').length }
  ];

  const boardTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'kanban', label: 'Kanban' },
    { value: 'scrum', label: 'Scrum' },
    { value: 'list', label: 'List' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'mindmap', label: 'Mind Map' },
    { value: 'gantt', label: 'Gantt' },
    { value: 'custom', label: 'Custom' }
  ];

  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'name', label: 'Name (A-Z)' }
  ];

  return (
    <motion.div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Board Template Library</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose from {templates.length} professionally designed templates to get started quickly
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search templates..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label} ({category.count})
                  </option>
                ))}
              </select>

              {/* Board Type Filter */}
              <select
                value={filters.boardType}
                onChange={(e) => handleFilterChange('boardType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                {boardTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Sort Options */}
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ml-auto"
                disabled={isLoading}
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Showing {filteredTemplates.length} of {templates.length} templates</span>
            <div className="flex items-center space-x-4">
              <span>💡 Tip: Click any template to preview before using</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplatePreviewModal
            template={selectedTemplate}
            onUse={() => handleUseTemplate(selectedTemplate)}
            onClose={() => setSelectedTemplate(null)}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BoardTemplateLibrary;
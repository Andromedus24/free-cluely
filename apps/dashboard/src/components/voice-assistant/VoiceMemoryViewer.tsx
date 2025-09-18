'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceAssistant } from './VoiceAssistantProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Brain,
  Clock,
  Tag,
  Trash2,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMemoryViewerProps {
  className?: string;
}

export function VoiceMemoryViewer({ className }: VoiceMemoryViewerProps) {
  const { memory, searchMemory, clearCommands } = useVoiceAssistant();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMemory, setFilteredMemory] = useState(memory);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (searchQuery) {
      const results = searchMemory(searchQuery);
      setFilteredMemory(results);
    } else {
      setFilteredMemory(memory);
    }
  }, [searchQuery, memory, searchMemory]);

  useEffect(() => {
    // Filter by selected tags
    if (selectedTags.length > 0) {
      const filtered = memory.filter(item =>
        item.tags.some(tag => selectedTags.includes(tag))
      );
      setFilteredMemory(filtered);
    } else if (!searchQuery) {
      setFilteredMemory(memory);
    }
  }, [selectedTags, memory, searchQuery]);

  const allTags = Array.from(new Set(memory.flatMap(item => item.tags)));

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const exportMemory = () => {
    const data = {
      exported: new Date().toISOString(),
      memories: filteredMemory.map(item => ({
        timestamp: item.timestamp,
        context: JSON.parse(item.context),
        tags: item.tags,
        importance: item.importance
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-memory-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatContext = (context: string) => {
    try {
      const parsed = JSON.parse(context);
      return (
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Transcript:</span> {parsed.transcript}
          </p>
          {parsed.intent && (
            <p className="text-sm">
              <span className="text-muted-foreground">Intent:</span> {parsed.intent}
            </p>
          )}
          {parsed.response && (
            <p className="text-sm">
              <span className="text-muted-foreground">Response:</span> {parsed.response}
            </p>
          )}
        </div>
      );
    } catch {
      return <p className="text-sm">{context}</p>;
    }
  };

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Voice Memory</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportMemory}
              className="h-8 w-8 p-0"
              title="Export memory"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCommands}
              className="h-8 w-8 p-0"
              title="Clear all commands"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search voice memory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Filter by tags:</span>
                {(searchQuery || selectedTags.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-6"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredMemory.length} of {memory.length} memories
          </span>
          {memory.length > 0 && (
            <span>Total memory: {(memory.length * 0.1).toFixed(1)}KB</span>
          )}
        </div>

        {/* Memory List */}
        {filteredMemory.length > 0 ? (
          <ScrollArea className="h-96 rounded-md border">
            <div className="p-3 space-y-3">
              {filteredMemory.map((item, index) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {item.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    {formatContext(item.context)}
                  </div>

                  {item.importance > 1 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Importance:</span>
                      <div className="flex">
                        {[...Array(item.importance)].map((_, i) => (
                          <div key={i} className="w-1 h-3 bg-yellow-500 mx-0.5" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No voice memories found</p>
            {searchQuery && (
              <p className="text-sm">Try adjusting your search or filters</p>
            )}
          </div>
        )}

        {/* Memory Stats */}
        {memory.length > 0 && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{memory.length}</div>
              <div className="text-xs text-muted-foreground">Total Memories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{allTags.length}</div>
              <div className="text-xs text-muted-foreground">Unique Tags</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
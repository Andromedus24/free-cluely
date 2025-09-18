'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceAssistantUI, VoiceMemoryViewer, VoiceAssistantToggle, useVoiceAssistant } from '@/components/voice-assistant';
import {
  Mic,
  Brain,
  Settings,
  History,
  Volume2,
  VolumeX,
  Activity,
  Clock,
  Tag,
  Download
} from 'lucide-react';

export default function VoiceAssistantPage() {
  const { isActive, isListening, commands, startAssistant, stopAssistant, speak, memory } = useVoiceAssistant();
  const [volumeEnabled, setVolumeEnabled] = useState(true);

  const quickCommands = [
    { command: "Hey Atlas, search for productivity apps", description: "Search for apps" },
    { command: "Hey Atlas, create a note about meeting", description: "Create notes" },
    { command: "Hey Atlas, help me organize my workflow", description: "Get help" },
    { command: "Hey Atlas, what's the weather today?", description: "General questions" }
  ];

  const stats = {
    totalCommands: commands.length,
    todayCommands: commands.filter(cmd => {
      const today = new Date().toDateString();
      return new Date(cmd.timestamp).toDateString() === today;
    }).length,
    memoryItems: memory.length,
    accuracy: 92 // Mock accuracy percentage
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Voice Assistant</h1>
            <p className="text-muted-foreground">Control Atlas with your voice</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
          <VoiceAssistantToggle />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Commands</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalCommands}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <div className="text-2xl font-bold">{stats.todayCommands}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Memory Items</span>
            </div>
            <div className="text-2xl font-bold">{stats.memoryItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Accuracy</span>
            </div>
            <div className="text-2xl font-bold">{stats.accuracy}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice Assistant Panel */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="assistant" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assistant">Assistant</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="assistant" className="space-y-4">
              <VoiceAssistantUI />
            </TabsContent>

            <TabsContent value="memory" className="space-y-4">
              <VoiceMemoryViewer />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Voice Assistant Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Voice Output</h4>
                        <p className="text-sm text-muted-foreground">
                          Enable or disable voice responses
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVolumeEnabled(!volumeEnabled)}
                      >
                        {volumeEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Hotword</h4>
                        <p className="text-sm text-muted-foreground">
                          Current activation phrase
                        </p>
                      </div>
                      <Badge variant="outline">Hey Atlas</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">AI Provider</h4>
                        <p className="text-sm text-muted-foreground">
                          Voice recognition service
                        </p>
                      </div>
                      <Badge variant="outline">OpenAI</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Status</h4>
                        <p className="text-sm text-muted-foreground">
                          Current assistant state
                        </p>
                      </div>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Listening' : 'Ready'}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <h4 className="font-medium">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => speak('Voice assistant is ready')}>
                        Test Voice
                      </Button>
                      <Button variant="outline" size="sm" onClick={startAssistant}>
                        Start Assistant
                      </Button>
                      <Button variant="outline" size="sm" onClick={stopAssistant}>
                        Stop Assistant
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Commands Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>Quick Commands</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Try these voice commands to get started:
              </p>
              <div className="space-y-2">
                {quickCommands.map((cmd, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{cmd.command}</p>
                    <p className="text-xs text-muted-foreground">{cmd.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commands.slice(-5).map((command, index) => (
                <div key={command.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {command.transcript.length > 30
                        ? `${command.transcript.substring(0, 30)}...`
                        : command.transcript
                      }
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {command.intent || 'chat'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(command.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}

              {commands.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No voice commands yet. Start by saying "Hey Atlas"!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
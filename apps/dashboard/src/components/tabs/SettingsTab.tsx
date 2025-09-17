'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw } from 'lucide-react';

export function SettingsTab() {
  const [settings, setSettings] = useState({
    llm: {
      provider: 'gemini',
      apiKey: '',
      host: 'http://localhost:11434',
      model: 'llama3.2',
    },
    permissions: {
      screen: true,
      clipboard: false,
      automation: false,
      network: true,
    },
    automation: {
      allowlist: '',
      enabled: false,
    },
    dashboard: {
      port: 3000,
      enabled: true,
    },
    telemetry: {
      enabled: false,
      endpoint: '',
    },
  });

  const handleSave = async () => {
    // Implement save logic
    console.log('Saving settings:', settings);
  };

  const handleReset = () => {
    // Implement reset logic
    console.log('Resetting settings');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>
            Configure your AI model settings for processing requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select 
              value={settings.llm.provider} 
              onValueChange={(value) => setSettings(prev => ({
                ...prev, 
                llm: { ...prev.llm, provider: value as 'gemini' | 'ollama' }
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.llm.provider === 'gemini' && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Gemini API key"
                value={settings.llm.apiKey}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  llm: { ...prev.llm, apiKey: e.target.value }
                }))}
              />
            </div>
          )}

          {settings.llm.provider === 'ollama' && (
            <div className="space-y-2">
              <Label htmlFor="host">Ollama Host</Label>
              <Input
                id="host"
                placeholder="http://localhost:11434"
                value={settings.llm.host}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  llm: { ...prev.llm, host: e.target.value }
                }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="Model name"
              value={settings.llm.model}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                llm: { ...prev.llm, model: e.target.value }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Control which features and data access the application can use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Screen Capture</Label>
              <p className="text-sm text-muted-foreground">
                Allow taking screenshots and screen analysis
              </p>
            </div>
            <Switch
              checked={settings.permissions.screen}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                permissions: { ...prev.permissions, screen: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Clipboard Access</Label>
              <p className="text-sm text-muted-foreground">
                Allow reading and writing to clipboard
              </p>
            </div>
            <Switch
              checked={settings.permissions.clipboard}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                permissions: { ...prev.permissions, clipboard: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automation</Label>
              <p className="text-sm text-muted-foreground">
                Allow browser automation features
              </p>
            </div>
            <Switch
              checked={settings.permissions.automation}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                permissions: { ...prev.permissions, automation: checked }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Network Access</Label>
              <p className="text-sm text-muted-foreground">
                Allow making network requests
              </p>
            </div>
            <Switch
              checked={settings.permissions.network}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                permissions: { ...prev.permissions, network: checked }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure automation security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Automation</Label>
              <p className="text-sm text-muted-foreground">
                Allow browser automation plugins to run
              </p>
            </div>
            <Switch
              checked={settings.automation.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                automation: { ...prev.automation, enabled: checked }
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowlist">Domain Allowlist</Label>
            <Input
              id="allowlist"
              placeholder="example.com,*.domain.com"
              value={settings.automation.allowlist}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                automation: { ...prev.automation, allowlist: e.target.value }
              }))}
            />
            <p className="text-sm text-muted-foreground">
              Comma-separated list of allowed domains for automation
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Settings</CardTitle>
          <CardDescription>
            Configure the web dashboard interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Dashboard</Label>
              <p className="text-sm text-muted-foreground">
                Allow access to the web dashboard
              </p>
            </div>
            <Switch
              checked={settings.dashboard.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                dashboard: { ...prev.dashboard, enabled: checked }
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Dashboard Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="3000"
              value={settings.dashboard.port}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                dashboard: { ...prev.dashboard, port: parseInt(e.target.value) || 3000 }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Telemetry</CardTitle>
          <CardDescription>
            Help improve the application by sharing anonymous usage data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Share Telemetry</Label>
              <p className="text-sm text-muted-foreground">
                Send anonymous usage statistics and error reports
              </p>
            </div>
            <Switch
              checked={settings.telemetry.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                telemetry: { ...prev.telemetry, enabled: checked }
              }))}
            />
          </div>

          {settings.telemetry.enabled && (
            <div className="space-y-2">
              <Label htmlFor="endpoint">Telemetry Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="https://api.example.com/telemetry"
                value={settings.telemetry.endpoint}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  telemetry: { ...prev.telemetry, endpoint: e.target.value }
                }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
        <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
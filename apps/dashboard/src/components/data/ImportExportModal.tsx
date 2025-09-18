'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ImportExportModalProps {
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<string>;
  onImport: (data: string, options: ImportOptions) => Promise<any>;
  onGetTemplate: () => Promise<string>;
}

interface ExportOptions {
  includeJobs: boolean;
  includeArtifacts: boolean;
  includeSessions: boolean;
  includeSettings: boolean;
  redactSensitive: boolean;
  compress: boolean;
  artifactSizeLimit: number;
  dateRange?: {
    start: number;
    end: number;
  };
}

interface ImportOptions {
  overwriteExisting: boolean;
  skipConflicts: boolean;
  validateOnly: boolean;
  dryRun: boolean;
  mergeSettings: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
    value: unknown;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
    value: unknown;
  }>;
  summary: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    warnings: number;
  };
}

export function ImportExportModal({ onClose, onExport, onImport, onGetTemplate }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeJobs: true,
    includeArtifacts: false,
    includeSessions: true,
    includeSettings: true,
    redactSensitive: true,
    compress: true,
    artifactSizeLimit: 10 * 1024 * 1024, // 10MB
  });

  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwriteExisting: false,
    skipConflicts: true,
    validateOnly: false,
    dryRun: false,
    mergeSettings: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);
    setExportResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await onExport(exportOptions);

      clearInterval(progressInterval);
      setProgress(100);
      setExportResult(result);

      // Download the file
      const blob = new Blob([result], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setExportResult(null);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [exportOptions, onExport]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setImportResult(null);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setValidationResult(null);
    setImportResult(null);

    try {
      const fileContent = await selectedFile.text();

      // First validate
      setProgress(30);
      const result = await onImport(fileContent, { ...importOptions, validateOnly: true });
      setValidationResult(result);

      if (!result.isValid && !importOptions.validateOnly) {
        setIsProcessing(false);
        return;
      }

      if (!importOptions.validateOnly && !importOptions.dryRun) {
        setProgress(60);
        await onImport(fileContent, importOptions);
        setImportResult('Import completed successfully!');
      }

      setProgress(100);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult(null);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [selectedFile, importOptions, onImport]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const template = await onGetTemplate();
      const blob = new Blob([template], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'atlas-export-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  }, [onGetTemplate]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Import & Export Data</h2>
          <p className="text-gray-600 mt-1">Manage your Atlas data with import/export functionality</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-6">
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="import">Import Data</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="p-6 pt-0">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Options
                  </CardTitle>
                  <CardDescription>
                    Configure what data to include in your export
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Types</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeJobs" className="text-sm">Jobs</Label>
                          <Switch
                            id="includeJobs"
                            checked={exportOptions.includeJobs}
                            onCheckedChange={(checked) =>
                              setExportOptions(prev => ({ ...prev, includeJobs: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeArtifacts" className="text-sm">Artifacts</Label>
                          <Switch
                            id="includeArtifacts"
                            checked={exportOptions.includeArtifacts}
                            onCheckedChange={(checked) =>
                              setExportOptions(prev => ({ ...prev, includeArtifacts: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeSessions" className="text-sm">Sessions</Label>
                          <Switch
                            id="includeSessions"
                            checked={exportOptions.includeSessions}
                            onCheckedChange={(checked) =>
                              setExportOptions(prev => ({ ...prev, includeSessions: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="includeSettings" className="text-sm">Settings</Label>
                          <Switch
                            id="includeSettings"
                            checked={exportOptions.includeSettings}
                            onCheckedChange={(checked) =>
                              setExportOptions(prev => ({ ...prev, includeSettings: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Security Options</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="redactSensitive" className="text-sm">Redact Sensitive Data</Label>
                          <Switch
                            id="redactSensitive"
                            checked={exportOptions.redactSensitive}
                            onCheckedChange={(checked) =>
                              setExportOptions(prev => ({ ...prev, redactSensitive: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="compress" className="text-sm">Compress Export</Label>
                          <Switch
                            id="compress"
                            checked={exportOptions.compress}
                            onCheckedChange={(checked) =>
                              setExportOptions(prev => ({ ...prev, compress: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button onClick={handleDownloadTemplate} variant="outline" className="mr-3">
                      <FileText className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      onClick={handleExport}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {progress > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Export Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {exportResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Export completed successfully! Your data has been downloaded as a JSON file.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="import" className="p-6 pt-0">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import Data
                  </CardTitle>
                  <CardDescription>
                    Upload and import data from a previous export
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="importFile">Select Export File</Label>
                    <Input
                      id="importFile"
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      disabled={isProcessing}
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-600">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Import Options</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="validateOnly" className="text-sm">Validate Only</Label>
                          <Switch
                            id="validateOnly"
                            checked={importOptions.validateOnly}
                            onCheckedChange={(checked) =>
                              setImportOptions(prev => ({ ...prev, validateOnly: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dryRun" className="text-sm">Dry Run</Label>
                          <Switch
                            id="dryRun"
                            checked={importOptions.dryRun}
                            onCheckedChange={(checked) =>
                              setImportOptions(prev => ({ ...prev, dryRun: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="mergeSettings" className="text-sm">Merge Settings</Label>
                          <Switch
                            id="mergeSettings"
                            checked={importOptions.mergeSettings}
                            onCheckedChange={(checked) =>
                              setImportOptions(prev => ({ ...prev, mergeSettings: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Conflict Resolution</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="overwriteExisting" className="text-sm">Overwrite Existing</Label>
                          <Switch
                            id="overwriteExisting"
                            checked={importOptions.overwriteExisting}
                            onCheckedChange={(checked) =>
                              setImportOptions(prev => ({ ...prev, overwriteExisting: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="skipConflicts" className="text-sm">Skip Conflicts</Label>
                          <Switch
                            id="skipConflicts"
                            checked={importOptions.skipConflicts}
                            onCheckedChange={(checked) =>
                              setImportOptions(prev => ({ ...prev, skipConflicts: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleImport}
                      disabled={!selectedFile || isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          {importOptions.validateOnly ? 'Validating...' : 'Importing...'}
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {importOptions.validateOnly ? 'Validate File' : 'Import Data'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {progress > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          {importOptions.validateOnly ? 'Validation' : 'Import'} Progress
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {validationResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Validation Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {validationResult.summary.totalItems}
                        </div>
                        <div className="text-sm text-gray-600">Total Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {validationResult.summary.validItems}
                        </div>
                        <div className="text-sm text-gray-600">Valid</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {validationResult.summary.invalidItems}
                        </div>
                        <div className="text-sm text-gray-600">Invalid</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {validationResult.summary.warnings}
                        </div>
                        <div className="text-sm text-gray-600">Warnings</div>
                      </div>
                    </div>

                    {validationResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-red-700">Errors</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <div key={index} className="text-sm bg-red-50 p-2 rounded">
                              <Badge variant="destructive" className="mr-2">
                                {error.field}
                              </Badge>
                              {error.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-yellow-700">Warnings</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {validationResult.warnings.map((warning, index) => (
                            <div key={index} className="text-sm bg-yellow-50 p-2 rounded">
                              <Badge variant="outline" className="mr-2">
                                {warning.field}
                              </Badge>
                              {warning.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {importResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
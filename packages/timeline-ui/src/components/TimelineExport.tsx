import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  Database,
  Settings,
  Check,
  Info,
  AlertCircle
} from 'lucide-react';
import { TimelineExportProps } from '../types/TimelineUITypes';
import { cn } from '../utils/cn';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  extension: string;
  icon: React.ReactNode;
  maxSize?: string;
  features?: string[];
}

const exportFormats: ExportFormat[] = [
  {
    id: 'json',
    name: 'JSON',
    description: 'Structured data format for developers',
    extension: 'json',
    icon: <FileCode className="w-5 h-5" />,
    features: ['Full data', 'Metadata included', 'Machine readable']
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'Spreadsheet-compatible format',
    extension: 'csv',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    features: ['Tabular data', 'Excel compatible', 'Basic fields only']
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Professional document format',
    extension: 'pdf',
    icon: <FileText className="w-5 h-5" />,
    maxSize: '10,000 items',
    features: ['Print-ready', 'Formatted layout', 'Include images']
  },
  {
    id: 'xlsx',
    name: 'Excel',
    description: 'Microsoft Excel workbook',
    extension: 'xlsx',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    maxSize: '50,000 items',
    features: ['Multiple sheets', 'Formulas', 'Charts possible']
  },
  {
    id: 'html',
    name: 'HTML',
    description: 'Web page format',
    extension: 'html',
    icon: <FileCode className="w-5 h-5" />,
    features: ['Interactive', 'Styled output', 'Web ready']
  },
  {
    id: 'xml',
    name: 'XML',
    description: 'Structured markup language',
    extension: 'xml',
    icon: <FileCode className="w-5 h-5" />,
    features: ['Hierarchical data', 'Standards-based', 'API friendly']
  }
];

export const TimelineExport: React.FC<TimelineExportProps> = ({
  onExport,
  availableFormats = ['json', 'csv', 'pdf', 'xlsx', 'html', 'xml'],
  loading = false,
  compact = false,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>(availableFormats[0]);
  const [exportOptions, setExportOptions] = useState({
    includeArtifacts: true,
    includeMetadata: true,
    compression: false,
    template: 'default'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExport = useCallback(() => {
    onExport(selectedFormat, exportOptions);
  }, [selectedFormat, exportOptions, onExport]);

  const formatOptions = exportFormats.filter(format => availableFormats.includes(format.id));
  const selectedFormatInfo = formatOptions.find(f => f.id === selectedFormat);

  const handleOptionChange = useCallback((key: string, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          disabled={loading}
          className={cn(
            'px-3 py-2 border border-gray-300 rounded-lg text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          )}
        >
          {formatOptions.map(format => (
            <option key={format.id} value={format.id}>
              {format.name} (.{format.extension})
            </option>
          ))}
        </select>

        <button
          onClick={handleExport}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Export Format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {formatOptions.map(format => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              disabled={loading}
              className={cn(
                'relative p-4 border-2 rounded-lg text-left transition-all',
                selectedFormat === format.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  selectedFormat === format.id
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}>
                  {format.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {format.name}
                    </h4>
                    {selectedFormat === format.id && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {format.description}
                  </p>
                  {format.maxSize && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Max: {format.maxSize}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Format Details */}
      {selectedFormatInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded-lg">
              {selectedFormatInfo.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {selectedFormatInfo.name} Export Details
              </h4>
              <ul className="space-y-1">
                {selectedFormatInfo.features?.map((feature, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Export Options */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Export Options
          </h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={exportOptions.includeArtifacts}
                onChange={(e) => handleOptionChange('includeArtifacts', e.target.checked)}
                disabled={loading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Include Artifacts
                  </span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Export attached files and images
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                disabled={loading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Include Metadata
                  </span>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Export additional metadata and tags
                </p>
              </div>
            </label>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              {/* Compression */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={exportOptions.compression}
                  onChange={(e) => handleOptionChange('compression', e.target.checked)}
                  disabled={loading}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Compress Export
                    </span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create compressed archive to reduce file size
                  </p>
                </div>
              </label>

              {/* Template Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Export Template
                </label>
                <select
                  value={exportOptions.template}
                  onChange={(e) => handleOptionChange('template', e.target.value)}
                  disabled={loading}
                  className={cn(
                    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                  )}
                >
                  <option value="default">Default Template</option>
                  <option value="minimal">Minimal (Essential fields only)</option>
                  <option value="detailed">Detailed (All fields included)</option>
                  <option value="custom">Custom Template</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Start date"
                  />
                  <span className="flex items-center text-gray-500">to</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="End date"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Export Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-2">
              Export Summary
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
              <li>• Format: {selectedFormatInfo?.name} (.{selectedFormatInfo?.extension})</li>
              <li>• Artifacts: {exportOptions.includeArtifacts ? 'Included' : 'Excluded'}</li>
              <li>• Metadata: {exportOptions.includeMetadata ? 'Included' : 'Excluded'}</li>
              <li>• Compression: {exportOptions.compression ? 'Enabled' : 'Disabled'}</li>
              <li>• Template: {exportOptions.template}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Large exports may take several minutes to complete
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Preparing Export...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Start Export
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TimelineExport;
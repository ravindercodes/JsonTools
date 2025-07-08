import React, { useState, useMemo } from 'react';
import { Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  same: string[];
}

interface JsonLine {
  content: string;
  lineNumber: number;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  path?: string;
  indentLevel: number;
}

const JsonCompare: React.FC = () => {
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [leftError, setLeftError] = useState('');
  const [rightError, setRightError] = useState('');
  const [copied, setCopied] = useState<'left' | 'right' | null>(null);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  const parseJson = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  };

  const deepCompare = (obj1: any, obj2: any, path = ''): DiffResult => {
    const result: DiffResult = { added: [], removed: [], modified: [], same: [] };

    if (obj1 === null || obj1 === undefined) obj1 = {};
    if (obj2 === null || obj2 === undefined) obj2 = {};

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = [...new Set([...keys1, ...keys2])];

    allKeys.forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      const value1 = obj1[key];
      const value2 = obj2[key];

      if (!(key in obj1)) {
        result.added.push(currentPath);
      } else if (!(key in obj2)) {
        result.removed.push(currentPath);
      } else if (typeof value1 === 'object' && typeof value2 === 'object' && value1 !== null && value2 !== null) {
        const nestedDiff = deepCompare(value1, value2, currentPath);
        result.added.push(...nestedDiff.added);
        result.removed.push(...nestedDiff.removed);
        result.modified.push(...nestedDiff.modified);
        result.same.push(...nestedDiff.same);
      } else if (value1 !== value2) {
        result.modified.push(currentPath);
      } else {
        result.same.push(currentPath);
      }
    });

    return result;
  };

  const formatJsonWithLineInfo = (jsonString: string, diffResult: DiffResult | null, side: 'left' | 'right'): JsonLine[] => {
    if (!jsonString.trim()) return [];
    
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      const lines = formatted.split('\n');
      
      return lines.map((line, index) => {
        const trimmedLine = line.trim();
        const indentLevel = (line.length - line.trimStart().length) / 2;
        
        // Extract the key from the line to determine its path
        let lineType: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
        let path = '';
        
        if (diffResult && trimmedLine) {
          // Simple path extraction for demonstration
          const keyMatch = trimmedLine.match(/^"([^"]+)":/);
          if (keyMatch) {
            const key = keyMatch[1];
            
            if (side === 'left') {
              if (diffResult.removed.some(p => p.includes(key))) {
                lineType = 'removed';
              } else if (diffResult.modified.some(p => p.includes(key))) {
                lineType = 'modified';
              }
            } else {
              if (diffResult.added.some(p => p.includes(key))) {
                lineType = 'added';
              } else if (diffResult.modified.some(p => p.includes(key))) {
                lineType = 'modified';
              }
            }
          }
        }
        
        return {
          content: line,
          lineNumber: index + 1,
          type: lineType,
          path,
          indentLevel
        };
      });
    } catch (error) {
      return [];
    }
  };

  const diffResult = useMemo(() => {
    const left = parseJson(leftJson);
    const right = parseJson(rightJson);

    if (!left || !right) return null;

    return deepCompare(left, right);
  }, [leftJson, rightJson]);

  const leftLines = useMemo(() => {
    return formatJsonWithLineInfo(leftJson, diffResult, 'left');
  }, [leftJson, diffResult]);

  const rightLines = useMemo(() => {
    return formatJsonWithLineInfo(rightJson, diffResult, 'right');
  }, [rightJson, diffResult]);

  const handleJsonChange = (value: string, side: 'left' | 'right') => {
    if (side === 'left') {
      setLeftJson(value);
      setLeftError('');
      try {
        if (value.trim()) JSON.parse(value);
      } catch (error) {
        setLeftError('Invalid JSON format');
      }
    } else {
      setRightJson(value);
      setRightError('');
      try {
        if (value.trim()) JSON.parse(value);
      } catch (error) {
        setRightError('Invalid JSON format');
      }
    }
  };

  const copyToClipboard = async (text: string, side: 'left' | 'right') => {
    await navigator.clipboard.writeText(text);
    setCopied(side);
    setTimeout(() => setCopied(null), 2000);
  };

  const getLineStyle = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-400';
      case 'modified':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      default:
        return 'bg-white border-l-4 border-gray-200';
    }
  };

  const renderJsonLine = (line: JsonLine, side: 'left' | 'right') => {
    if (showOnlyDifferences && line.type === 'unchanged') {
      return null;
    }

    return (
      <div key={`${side}-${line.lineNumber}`} className={`flex ${getLineStyle(line.type)} hover:bg-opacity-80 transition-colors`}>
        <div className="w-12 flex-shrink-0 text-xs text-gray-500 px-2 py-1 bg-gray-50 border-r select-none">
          {line.lineNumber}
        </div>
        <div className="flex-1 px-3 py-1 font-mono text-sm whitespace-pre overflow-x-auto">
          {line.content}
        </div>
        {line.type !== 'unchanged' && (
          <div className="w-6 flex-shrink-0 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${
              line.type === 'added' ? 'bg-green-500' : 
              line.type === 'removed' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`} />
          </div>
        )}
      </div>
    );
  };

  const sampleJson1 = `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001"
  },
  "hobbies": ["reading", "swimming"],
  "isActive": true
}`;

  const sampleJson2 = `{
  "name": "John Doe",
  "age": 31,
  "email": "john.doe@example.com",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001",
    "country": "USA"
  },
  "hobbies": ["reading", "cycling"],
  "phone": "+1-555-0123",
  "isActive": true
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Compare JSON Objects</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
            className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-md transition-colors ${
              showOnlyDifferences 
                ? 'bg-blue-50 text-blue-700' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {showOnlyDifferences ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showOnlyDifferences ? 'Show All' : 'Differences Only'}</span>
          </button>
          <button
            onClick={() => {
              setLeftJson(sampleJson1);
              setRightJson(sampleJson2);
            }}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={() => {
              setLeftJson('');
              setRightJson('');
              setLeftError('');
              setRightError('');
            }}
            className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* JSON Input Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left JSON */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Original JSON</label>
            <button
              onClick={() => copyToClipboard(leftJson, 'left')}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              {copied === 'left' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied === 'left' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="relative">
            <textarea
              value={leftJson}
              onChange={(e) => handleJsonChange(e.target.value, 'left')}
              placeholder="Paste your first JSON object here..."
              className={`w-full h-64 p-4 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                leftError ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {leftError && (
              <div className="absolute top-2 right-2 flex items-center space-x-1 text-red-500 bg-red-50 px-2 py-1 rounded text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{leftError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right JSON */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Modified JSON</label>
            <button
              onClick={() => copyToClipboard(rightJson, 'right')}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              {copied === 'right' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied === 'right' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="relative">
            <textarea
              value={rightJson}
              onChange={(e) => handleJsonChange(e.target.value, 'right')}
              placeholder="Paste your second JSON object here..."
              className={`w-full h-64 p-4 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                rightError ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {rightError && (
              <div className="absolute top-2 right-2 flex items-center space-x-1 text-red-500 bg-red-50 px-2 py-1 rounded text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{rightError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Statistics */}
      {diffResult && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Added Fields</h4>
              <p className="text-2xl font-bold text-green-600">{diffResult.added.length}</p>
              {diffResult.added.length > 0 && (
                <div className="mt-2 space-y-1">
                  {diffResult.added.slice(0, 3).map((path, index) => (
                    <div key={index} className="text-xs text-green-700 font-mono bg-green-100 px-2 py-1 rounded">
                      {path}
                    </div>
                  ))}
                  {diffResult.added.length > 3 && (
                    <div className="text-xs text-green-600">+{diffResult.added.length - 3} more</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Removed Fields</h4>
              <p className="text-2xl font-bold text-red-600">{diffResult.removed.length}</p>
              {diffResult.removed.length > 0 && (
                <div className="mt-2 space-y-1">
                  {diffResult.removed.slice(0, 3).map((path, index) => (
                    <div key={index} className="text-xs text-red-700 font-mono bg-red-100 px-2 py-1 rounded">
                      {path}
                    </div>
                  ))}
                  {diffResult.removed.length > 3 && (
                    <div className="text-xs text-red-600">+{diffResult.removed.length - 3} more</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Modified Fields</h4>
              <p className="text-2xl font-bold text-yellow-600">{diffResult.modified.length}</p>
              {diffResult.modified.length > 0 && (
                <div className="mt-2 space-y-1">
                  {diffResult.modified.slice(0, 3).map((path, index) => (
                    <div key={index} className="text-xs text-yellow-700 font-mono bg-yellow-100 px-2 py-1 rounded">
                      {path}
                    </div>
                  ))}
                  {diffResult.modified.length > 3 && (
                    <div className="text-xs text-yellow-600">+{diffResult.modified.length - 3} more</div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Unchanged Fields</h4>
              <p className="text-2xl font-bold text-gray-600">{diffResult.same.length}</p>
              {diffResult.same.length > 0 && (
                <div className="mt-2 space-y-1">
                  {diffResult.same.slice(0, 3).map((path, index) => (
                    <div key={index} className="text-xs text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                      {path}
                    </div>
                  ))}
                  {diffResult.same.length > 3 && (
                    <div className="text-xs text-gray-600">+{diffResult.same.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison View */}
      {(leftLines.length > 0 || rightLines.length > 0) && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Side-by-Side Comparison</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-50 border-l-4 border-green-400 rounded-sm"></div>
                  <span className="text-gray-600">Added</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-50 border-l-4 border-red-400 rounded-sm"></div>
                  <span className="text-gray-600">Removed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-sm"></div>
                  <span className="text-gray-600">Modified</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x max-h-96 overflow-hidden">
            {/* Left Side */}
            <div className="overflow-auto">
              <div className="p-3 bg-gray-50 border-b sticky top-0">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Original JSON</span>
                </div>
              </div>
              <div className="divide-y">
                {leftLines.map((line) => renderJsonLine(line, 'left')).filter(Boolean)}
              </div>
            </div>

            {/* Right Side */}
            <div className="overflow-auto">
              <div className="p-3 bg-gray-50 border-b sticky top-0">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Modified JSON</span>
                </div>
              </div>
              <div className="divide-y">
                {rightLines.map((line) => renderJsonLine(line, 'right')).filter(Boolean)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonCompare;
import React, { useState, useMemo } from 'react';
import { Copy, Check, AlertTriangle, Download, Minimize2, Maximize2, Search, X, ChevronUp, ChevronDown } from 'lucide-react';

interface JsonToken {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace';
  value: string;
  line: number;
  column: number;
}

interface SearchResult {
  line: number;
  column: number;
  length: number;
  match: string;
}

const JsonFormatter: React.FC = () => {
  const [inputJson, setInputJson] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const formattedJson = useMemo(() => {
    if (!inputJson.trim()) return '';
    
    try {
      const parsed = JSON.parse(inputJson);
      
      // Sort keys if requested
      const sortedObj = sortKeys ? sortObjectKeys(parsed) : parsed;
      
      return JSON.stringify(sortedObj, null, indentSize);
    } catch (err) {
      return '';
    }
  }, [inputJson, indentSize, sortKeys]);

  const sortObjectKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    } else if (obj !== null && typeof obj === 'object') {
      const sortedObj: any = {};
      Object.keys(obj).sort().forEach(key => {
        sortedObj[key] = sortObjectKeys(obj[key]);
      });
      return sortedObj;
    }
    return obj;
  };

  const tokenizeJson = (jsonString: string): JsonToken[] => {
    const tokens: JsonToken[] = [];
    const lines = jsonString.split('\n');
    
    lines.forEach((line, lineIndex) => {
      let column = 0;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        // Whitespace
        if (/\s/.test(char)) {
          let whitespace = '';
          while (i < line.length && /\s/.test(line[i])) {
            whitespace += line[i];
            i++;
          }
          tokens.push({
            type: 'whitespace',
            value: whitespace,
            line: lineIndex,
            column
          });
          column += whitespace.length;
          continue;
        }
        
        // Strings (keys and values)
        if (char === '"') {
          let string = '"';
          i++;
          while (i < line.length && line[i] !== '"') {
            if (line[i] === '\\') {
              string += line[i] + (line[i + 1] || '');
              i += 2;
            } else {
              string += line[i];
              i++;
            }
          }
          if (i < line.length) {
            string += '"';
            i++;
          }
          
          // Determine if it's a key or string value
          const nextNonWhitespace = line.slice(i).match(/^\s*:/);
          const type = nextNonWhitespace ? 'key' : 'string';
          
          tokens.push({
            type,
            value: string,
            line: lineIndex,
            column
          });
          column += string.length;
          continue;
        }
        
        // Numbers
        if (/[-\d]/.test(char)) {
          let number = '';
          while (i < line.length && /[-\d.eE+]/.test(line[i])) {
            number += line[i];
            i++;
          }
          tokens.push({
            type: 'number',
            value: number,
            line: lineIndex,
            column
          });
          column += number.length;
          continue;
        }
        
        // Booleans and null
        if (/[tfn]/.test(char)) {
          const remaining = line.slice(i);
          if (remaining.startsWith('true')) {
            tokens.push({
              type: 'boolean',
              value: 'true',
              line: lineIndex,
              column
            });
            i += 4;
            column += 4;
            continue;
          } else if (remaining.startsWith('false')) {
            tokens.push({
              type: 'boolean',
              value: 'false',
              line: lineIndex,
              column
            });
            i += 5;
            column += 5;
            continue;
          } else if (remaining.startsWith('null')) {
            tokens.push({
              type: 'null',
              value: 'null',
              line: lineIndex,
              column
            });
            i += 4;
            column += 4;
            continue;
          }
        }
        
        // Punctuation
        tokens.push({
          type: 'punctuation',
          value: char,
          line: lineIndex,
          column
        });
        i++;
        column++;
      }
    });
    
    return tokens;
  };

  const searchInJson = (query: string, jsonString: string): SearchResult[] => {
    if (!query || !jsonString) return [];
    
    const results: SearchResult[] = [];
    const lines = jsonString.split('\n');
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    lines.forEach((line, lineIndex) => {
      const searchLine = caseSensitive ? line : line.toLowerCase();
      let startIndex = 0;
      
      while (true) {
        const index = searchLine.indexOf(searchTerm, startIndex);
        if (index === -1) break;
        
        results.push({
          line: lineIndex,
          column: index,
          length: query.length,
          match: line.slice(index, index + query.length)
        });
        
        startIndex = index + 1;
      }
    });
    
    return results;
  };

  const highlightedJson = useMemo(() => {
    if (!formattedJson) return null;
    
    const tokens = tokenizeJson(formattedJson);
    const searchResults = searchInJson(searchQuery, formattedJson);
    setSearchResults(searchResults);
    
    const getTokenClass = (type: string): string => {
      switch (type) {
        case 'key':
          return 'text-blue-600 font-medium';
        case 'string':
          return 'text-green-600';
        case 'number':
          return 'text-purple-600';
        case 'boolean':
          return 'text-orange-600 font-medium';
        case 'null':
          return 'text-gray-500 font-medium';
        case 'punctuation':
          return 'text-gray-700';
        default:
          return 'text-gray-900';
      }
    };

    const lines = formattedJson.split('\n');
    
    return lines.map((line, lineIndex) => {
      const lineTokens = tokens.filter(token => token.line === lineIndex);
      const lineSearchResults = searchResults.filter(result => result.line === lineIndex);
      
      let renderedLine: React.ReactNode[] = [];
      let currentPos = 0;
      
      lineTokens.forEach((token, tokenIndex) => {
        const tokenStart = token.column;
        const tokenEnd = token.column + token.value.length;
        
        // Check if this token overlaps with any search results
        const overlappingSearches = lineSearchResults.filter(search => 
          search.column < tokenEnd && search.column + search.length > tokenStart
        );
        
        if (overlappingSearches.length > 0) {
          // Handle search highlighting within the token
          let tokenContent = token.value;
          let lastIndex = 0;
          
          overlappingSearches.forEach((search, searchIndex) => {
            const relativeStart = Math.max(0, search.column - tokenStart);
            const relativeEnd = Math.min(token.value.length, search.column + search.length - tokenStart);
            
            if (relativeStart > lastIndex) {
              renderedLine.push(
                <span key={`${lineIndex}-${tokenIndex}-${searchIndex}-before`} className={getTokenClass(token.type)}>
                  {tokenContent.slice(lastIndex, relativeStart)}
                </span>
              );
            }
            
            const isCurrentResult = searchResults.indexOf(search) === currentSearchIndex;
            renderedLine.push(
              <span 
                key={`${lineIndex}-${tokenIndex}-${searchIndex}-highlight`}
                className={`${getTokenClass(token.type)} ${isCurrentResult ? 'bg-yellow-300' : 'bg-yellow-100'} rounded px-1`}
              >
                {tokenContent.slice(relativeStart, relativeEnd)}
              </span>
            );
            
            lastIndex = relativeEnd;
          });
          
          if (lastIndex < tokenContent.length) {
            renderedLine.push(
              <span key={`${lineIndex}-${tokenIndex}-after`} className={getTokenClass(token.type)}>
                {tokenContent.slice(lastIndex)}
              </span>
            );
          }
        } else {
          renderedLine.push(
            <span key={`${lineIndex}-${tokenIndex}`} className={getTokenClass(token.type)}>
              {token.value}
            </span>
          );
        }
      });
      
      return (
        <div key={lineIndex} className="flex">
          <div className="w-12 flex-shrink-0 text-xs text-gray-500 px-2 py-1 bg-gray-50 border-r select-none text-right">
            {lineIndex + 1}
          </div>
          <div className="flex-1 px-3 py-1 font-mono text-sm whitespace-pre">
            {renderedLine}
          </div>
        </div>
      );
    });
  }, [formattedJson, searchQuery, currentSearchIndex, caseSensitive]);

  const minifyJson = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch (err) {
      return jsonString;
    }
  };

  const handleInputChange = (value: string) => {
    setInputJson(value);
    setError('');
    
    if (value.trim()) {
      try {
        JSON.parse(value);
      } catch (err) {
        setError('Invalid JSON format');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    if (direction === 'next') {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else {
      setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  const getJsonStats = () => {
    if (!formattedJson) return null;
    
    try {
      const parsed = JSON.parse(formattedJson);
      const countValues = (obj: any): { objects: number; arrays: number; strings: number; numbers: number; booleans: number; nulls: number } => {
        const stats = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0 };
        
        if (Array.isArray(obj)) {
          stats.arrays++;
          obj.forEach(item => {
            const itemStats = countValues(item);
            Object.keys(itemStats).forEach(key => {
              stats[key as keyof typeof stats] += itemStats[key as keyof typeof itemStats];
            });
          });
        } else if (obj === null) {
          stats.nulls++;
        } else if (typeof obj === 'object') {
          stats.objects++;
          Object.values(obj).forEach(value => {
            const valueStats = countValues(value);
            Object.keys(valueStats).forEach(key => {
              stats[key as keyof typeof stats] += valueStats[key as keyof typeof valueStats];
            });
          });
        } else if (typeof obj === 'string') {
          stats.strings++;
        } else if (typeof obj === 'number') {
          stats.numbers++;
        } else if (typeof obj === 'boolean') {
          stats.booleans++;
        }
        
        return stats;
      };
      
      return countValues(parsed);
    } catch (err) {
      return null;
    }
  };

  const stats = getJsonStats();

  const sampleJson = `{"name":"John Doe","age":30,"email":"john@example.com","isActive":true,"address":{"street":"123 Main St","city":"New York","zipCode":"10001","coordinates":{"lat":40.7128,"lng":-74.0060}},"hobbies":["reading","swimming","coding"],"profile":{"bio":"Software developer with 5+ years experience","skills":["JavaScript","React","Node.js","Python"],"social":{"twitter":"@johndoe","linkedin":"john-doe-123"}}}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">JSON Formatter & Validator</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setInputJson(sampleJson)}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={() => {
              setInputJson('');
              setError('');
              clearSearch();
            }}
            className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Indent Size:</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
              <option value={0}>Minified</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="sortKeys"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="sortKeys" className="text-sm font-medium text-gray-700">
              Sort Keys
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setInputJson(minifyJson(inputJson))}
              disabled={!inputJson.trim() || !!error}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Minify</span>
            </button>
            
            <button
              onClick={() => {
                if (indentSize === 0) setIndentSize(2);
              }}
              disabled={!inputJson.trim() || !!error}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Beautify</span>
            </button>
          </div>
        </div>
      </div>

      {/* JSON Input/Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Input JSON</label>
            <div className="text-sm text-gray-500">
              {inputJson.length} characters
            </div>
          </div>
          <div className="relative">
            <textarea
              value={inputJson}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Paste your JSON here..."
              className={`w-full h-96 p-4 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {error && (
              <div className="absolute top-2 right-2 flex items-center space-x-1 text-red-500 bg-red-50 px-2 py-1 rounded text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Formatted JSON</label>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500">
                {formattedJson.length} characters
              </div>
              <button
                onClick={() => copyToClipboard(formattedJson)}
                disabled={!formattedJson}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={downloadJson}
                disabled={!formattedJson}
                className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {formattedJson && (
            <div className="relative">
              <div className="flex items-center space-x-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in JSON..."
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="caseSensitive"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="caseSensitive" className="text-xs text-gray-600">
                    Aa
                  </label>
                </div>

                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-600">
                      {currentSearchIndex + 1} of {searchResults.length}
                    </span>
                    <button
                      onClick={() => navigateSearch('prev')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigateSearch('next')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="relative border border-gray-300 rounded-lg overflow-hidden">
            {highlightedJson ? (
              <div className="max-h-96 overflow-auto bg-white">
                <div className="divide-y">
                  {highlightedJson}
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50">
                {formattedJson ? 'Processing...' : 'Enter valid JSON to see formatted output'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Color Legend */}
      {formattedJson && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Syntax Highlighting Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 font-medium font-mono">"key"</span>
              <span className="text-gray-600">Keys</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600 font-mono">"string"</span>
              <span className="text-gray-600">Strings</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-600 font-mono">123</span>
              <span className="text-gray-600">Numbers</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-600 font-medium font-mono">true</span>
              <span className="text-gray-600">Booleans</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 font-medium font-mono">null</span>
              <span className="text-gray-600">Null</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-700 font-mono">{`{}`}</span>
              <span className="text-gray-600">Punctuation</span>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">JSON Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.objects}</div>
              <div className="text-sm text-gray-600">Objects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.arrays}</div>
              <div className="text-sm text-gray-600">Arrays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.strings}</div>
              <div className="text-sm text-gray-600">Strings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.numbers}</div>
              <div className="text-sm text-gray-600">Numbers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">{stats.booleans}</div>
              <div className="text-sm text-gray-600">Booleans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.nulls}</div>
              <div className="text-sm text-gray-600">Nulls</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonFormatter;
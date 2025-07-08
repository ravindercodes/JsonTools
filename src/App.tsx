import React, { useState } from 'react';
import { FileText, GitCompareArrows, Code, Zap } from 'lucide-react';
import JsonCompare from './components/JsonCompare';
import JsonFormatter from './components/JsonFormatter';
import TextCompare from './components/TextCompare';

type Tool = 'compare' | 'format' | 'text';

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('compare');

  const tools = [
    { id: 'compare' as Tool, name: 'Compare JSON', icon: GitCompareArrows, description: 'Compare two JSON objects side-by-side' },
    { id: 'format' as Tool, name: 'Format JSON', icon: Code, description: 'Format and beautify JSON with syntax highlighting' },
    { id: 'text' as Tool, name: 'Compare Text', icon: FileText, description: 'Compare any plain text or code blocks' },
  ];

  const renderTool = () => {
    switch (activeTool) {
      case 'compare':
        return <JsonCompare />;
      case 'format':
        return <JsonFormatter />;
      case 'text':
        return <TextCompare />;
      default:
        return <JsonCompare />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">JSON Toolbox</h1>
                <p className="text-sm text-gray-500">Professional developer utilities</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTool === tool.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tool.icon className="w-4 h-4" />
                  <span>{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTool === tool.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tool.icon className="w-4 h-4" />
                <span>{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Description */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-gray-600 text-sm">
            {tools.find(tool => tool.id === activeTool)?.description}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTool()}
      </main>
    </div>
  );
}

export default App;
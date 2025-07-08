import React, { useState, useMemo } from 'react';
import { Copy, Check, FileText, RotateCcw } from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

const TextCompare: React.FC = () => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [copied, setCopied] = useState<'left' | 'right' | null>(null);

  const processText = (text: string): string => {
    let processed = text;
    if (ignoreWhitespace) {
      processed = processed.replace(/\s+/g, ' ').trim();
    }
    if (ignoreCase) {
      processed = processed.toLowerCase();
    }
    return processed;
  };

  const diffResult = useMemo(() => {
    if (!leftText && !rightText) return null;

    const leftLines = processText(leftText).split('\n');
    const rightLines = processText(rightText).split('\n');

    const leftDiff: DiffLine[] = [];
    const rightDiff: DiffLine[] = [];

    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
      const leftLine = leftLines[leftIndex] || '';
      const rightLine = rightLines[rightIndex] || '';

      if (leftIndex >= leftLines.length) {
        // Only right lines remain
        rightDiff.push({ type: 'added', content: rightLine, lineNumber: rightIndex + 1 });
        leftDiff.push({ type: 'added', content: '', lineNumber: leftIndex + 1 });
        rightIndex++;
      } else if (rightIndex >= rightLines.length) {
        // Only left lines remain
        leftDiff.push({ type: 'removed', content: leftLine, lineNumber: leftIndex + 1 });
        rightDiff.push({ type: 'removed', content: '', lineNumber: rightIndex + 1 });
        leftIndex++;
      } else if (leftLine === rightLine) {
        // Lines are the same
        leftDiff.push({ type: 'unchanged', content: leftLine, lineNumber: leftIndex + 1 });
        rightDiff.push({ type: 'unchanged', content: rightLine, lineNumber: rightIndex + 1 });
        leftIndex++;
        rightIndex++;
      } else {
        // Lines are different
        leftDiff.push({ type: 'removed', content: leftLine, lineNumber: leftIndex + 1 });
        rightDiff.push({ type: 'added', content: rightLine, lineNumber: rightIndex + 1 });
        leftIndex++;
        rightIndex++;
      }
    }

    return { left: leftDiff, right: rightDiff };
  }, [leftText, rightText, ignoreWhitespace, ignoreCase]);

  const copyToClipboard = async (text: string, side: 'left' | 'right') => {
    await navigator.clipboard.writeText(text);
    setCopied(side);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStats = () => {
    if (!diffResult) return null;

    const leftStats = {
      added: diffResult.left.filter(line => line.type === 'added').length,
      removed: diffResult.left.filter(line => line.type === 'removed').length,
      unchanged: diffResult.left.filter(line => line.type === 'unchanged').length,
    };

    const rightStats = {
      added: diffResult.right.filter(line => line.type === 'added').length,
      removed: diffResult.right.filter(line => line.type === 'removed').length,
      unchanged: diffResult.right.filter(line => line.type === 'unchanged').length,
    };

    return {
      totalChanges: leftStats.added + leftStats.removed + rightStats.added + rightStats.removed,
      linesAdded: rightStats.added,
      linesRemoved: leftStats.removed,
      linesUnchanged: leftStats.unchanged,
    };
  };

  const stats = getStats();

  const renderDiffLine = (line: DiffLine, isLeft: boolean) => {
    const getLineStyle = (type: string) => {
      switch (type) {
        case 'added':
          return isLeft ? 'bg-green-50 border-l-4 border-green-400' : 'bg-green-50 border-l-4 border-green-400';
        case 'removed':
          return isLeft ? 'bg-red-50 border-l-4 border-red-400' : 'bg-red-50 border-l-4 border-red-400';
        default:
          return 'bg-white border-l-4 border-gray-200';
      }
    };

    return (
      <div key={`${isLeft ? 'left' : 'right'}-${line.lineNumber}`} className={`flex ${getLineStyle(line.type)}`}>
        <div className="w-12 flex-shrink-0 text-xs text-gray-500 px-2 py-1 bg-gray-50 border-r">
          {line.content ? line.lineNumber : ''}
        </div>
        <div className="flex-1 px-3 py-1 font-mono text-sm whitespace-pre-wrap">
          {line.content || ' '}
        </div>
      </div>
    );
  };

  const sampleText1 = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// Usage
const items = [
  { name: 'Apple', price: 1.50 },
  { name: 'Banana', price: 0.75 },
  { name: 'Orange', price: 2.00 }
];

console.log(calculateTotal(items));`;

  const sampleText2 = `function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Usage
const items = [
  { name: 'Apple', price: 1.50, quantity: 2 },
  { name: 'Banana', price: 0.75, quantity: 3 },
  { name: 'Orange', price: 2.00, quantity: 1 },
  { name: 'Grape', price: 3.50, quantity: 1 }
];

console.log('Total:', calculateTotal(items));`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Text Comparison</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setLeftText(sampleText1);
              setRightText(sampleText2);
            }}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={() => {
              setLeftText('');
              setRightText('');
            }}
            className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ignoreWhitespace"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="ignoreWhitespace" className="text-sm font-medium text-gray-700">
              Ignore whitespace
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ignoreCase"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="ignoreCase" className="text-sm font-medium text-gray-700">
              Ignore case
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const temp = leftText;
                setLeftText(rightText);
                setRightText(temp);
              }}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Swap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Text Input Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Original Text</label>
            <button
              onClick={() => copyToClipboard(leftText, 'left')}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              {copied === 'left' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied === 'left' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <textarea
            value={leftText}
            onChange={(e) => setLeftText(e.target.value)}
            placeholder="Paste your original text here..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Right Text */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Modified Text</label>
            <button
              onClick={() => copyToClipboard(rightText, 'right')}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            >
              {copied === 'right' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied === 'right' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <textarea
            value={rightText}
            onChange={(e) => setRightText(e.target.value)}
            placeholder="Paste your modified text here..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalChanges}</div>
              <div className="text-sm text-gray-600">Total Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.linesAdded}</div>
              <div className="text-sm text-gray-600">Lines Added</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.linesRemoved}</div>
              <div className="text-sm text-gray-600">Lines Removed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.linesUnchanged}</div>
              <div className="text-sm text-gray-600">Lines Unchanged</div>
            </div>
          </div>
        </div>
      )}

      {/* Diff View */}
      {diffResult && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Side-by-Side Comparison</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
            <div className="overflow-auto max-h-96">
              <div className="p-3 bg-gray-50 border-b">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Original</span>
                </div>
              </div>
              <div className="divide-y">
                {diffResult.left.map((line, index) => renderDiffLine(line, true))}
              </div>
            </div>
            <div className="overflow-auto max-h-96">
              <div className="p-3 bg-gray-50 border-b">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Modified</span>
                </div>
              </div>
              <div className="divide-y">
                {diffResult.right.map((line, index) => renderDiffLine(line, false))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextCompare;
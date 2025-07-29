'use client';

import { useState } from 'react';
import { Copy, Download, Eye, Code } from 'lucide-react';

interface CodePreviewProps {
  generatedCode: {
    frontend: string;
    backend: string;
    discoveredTools?: string[];
    useCase?: string;
    systemPrompt?: string;
    metadata?: any;
  };
}

export default function CodePreview({ generatedCode }: CodePreviewProps) {
  const [activeCodeTab, setActiveCodeTab] = useState<'frontend' | 'backend'>('frontend');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentCode = activeCodeTab === 'frontend' ? generatedCode.frontend : generatedCode.backend;
  const filename = activeCodeTab === 'frontend' ? 'agent-frontend.html' : 'agent-backend.js';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Code className="w-5 h-5 mr-2" />
            Generated Code
          </h2>
          
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveCodeTab('frontend')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeCodeTab === 'frontend'
                  ? 'bg-purple-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Frontend
            </button>
            <button
              onClick={() => setActiveCodeTab('backend')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeCodeTab === 'backend'
                  ? 'bg-purple-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Backend
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => copyToClipboard(currentCode)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => downloadCode(currentCode, filename)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 300px)' }}>
        {currentCode ? (
          <div className="h-full overflow-auto border border-white/10 rounded-lg">
            <pre className="h-full p-4 text-sm text-green-300 font-mono bg-gray-900/50 overflow-auto whitespace-pre-wrap break-words">
              <code className="block">{currentCode}</code>
            </pre>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center text-white/60 max-w-md">
              <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Code Generated Yet</h3>
              <p className="text-sm mb-4">
                Describe your agent idea and click "Generate Agent" to see the code here.
              </p>
              
              {/* Show metadata if available */}
              {generatedCode.metadata && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-2">Generation Info</h4>
                  <div className="text-xs space-y-1 text-white/80">
                    {generatedCode.discoveredTools?.length && (
                      <div>
                        <span className="text-white/60">Tools:</span> {generatedCode.discoveredTools.join(', ')}
                      </div>
                    )}
                    {generatedCode.useCase && (
                      <div>
                        <span className="text-white/60">Use Case:</span> {generatedCode.useCase}
                      </div>
                    )}
                    <div>
                      <span className="text-white/60">Generated:</span> {new Date(generatedCode.metadata.generatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copy notification */}
      {copied && (
        <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg text-sm">
          Code copied to clipboard!
        </div>
      )}
    </div>
  );
} 
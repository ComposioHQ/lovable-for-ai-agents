'use client';

import { useState } from 'react';
import { Play, RotateCcw, Settings, MessageSquare, Link, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

interface GeneratedAgentProps {
  generatedCode: {
    frontend: string;
    backend: string;
    discoveredTools?: string[];
    useCase?: string;
    systemPrompt?: string;
    metadata?: any;
  };
}

export default function GeneratedAgent({ generatedCode }: GeneratedAgentProps) {
  const [llmApiKey, setLlmApiKey] = useState('');
  const [composioApiKey, setComposioApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<any[]>([]);
  const [toolkitInfos, setToolkitInfos] = useState<Record<string, any>>({});
  const [authConfigs, setAuthConfigs] = useState<Record<string, any>>({});

  const runAgent = async () => {
    if (!llmApiKey || !composioApiKey || !prompt) {
      alert('Please fill in all required fields');
      return;
    }

    if (!generatedCode.discoveredTools || generatedCode.discoveredTools.length === 0) {
      alert('No agent has been generated yet. Please generate an agent first.');
      return;
    }

    setIsRunning(true);
    setResponse('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      // Get user ID from session storage
      const userId = sessionStorage.getItem('composio_user_id') || 'default';
      
      // Use the exact same pattern as the working toolkit-info API call
      const res = await fetch(`/api/execute-generated-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmApiKey,
          composioApiKey,
          prompt,
          discoveredTools: generatedCode.discoveredTools,
          systemPrompt: generatedCode.systemPrompt,
          userId,
          authConfigs: authConfigs
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorMessage = 'Failed to run agent';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      if (data.success) {
        setResponse(data.response);
      } else {
        // Handle different error types
        if (data.requiresConnection) {
          setResponse(`🔗 Connection Required\n\n${data.details}\n\n💡 ${data.suggestion}\n\nTools that need connection: ${generatedCode.discoveredTools?.join(', ') || 'Unknown'}`);
        } else if (data.toolError) {
          setResponse(`🔧 Tool Error\n\n${data.details}\n\nThis might be due to:\n• Missing account connections\n• Invalid permissions\n• Tool configuration issues`);
        } else {
          setResponse(`❌ Error: ${data.error}\n\nDetails: ${data.details || 'Unknown error occurred'}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setResponse('⏱️ Request timed out. Please try again.');
        } else if (error.message.includes('Failed to fetch')) {
          setResponse('🌐 Network error. Please check your connection and try again.');
        } else {
          setResponse(`❌ Error: ${error.message}\n\nPlease check your API keys and try again.`);
        }
      } else {
        setResponse('❌ An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setResponse('');
    setIsRunning(false); // Ensure button is re-enabled
  };

  const clearResponse = () => {
    setResponse('');
  };

  const reloadPage = () => {
    window.location.reload();
  };

  const extractToolkitName = (toolName: string): string => {
    // Handle edge cases like _21EMAIL_FETCH -> _21email
    if (toolName.startsWith('_')) {
      const parts = toolName.split('_');
      if (parts.length >= 3) {
        return (parts[0] + parts[1]).toLowerCase();
      }
    }
    
    // Standard case: GMAIL_FETCH_EMAIL -> gmail
    const firstPart = toolName.split('_')[0];
    return firstPart.toLowerCase();
  };

  const checkConnections = async () => {
    if (!composioApiKey || !generatedCode.discoveredTools?.length) return;

    try {
      // Get toolkit information for each discovered tool
      const toolkitPromises = generatedCode.discoveredTools.map(async (toolName) => {
        const toolkitSlug = extractToolkitName(toolName);
        
        try {
          const res = await fetch(`/api/toolkit-info?slug=${toolkitSlug}&composioApiKey=${encodeURIComponent(composioApiKey)}`);
          if (res.ok) {
            const data = await res.json();
            return { toolName, toolkitSlug, toolkit: data.toolkit };
          }
        } catch (error) {
          console.error(`Error fetching toolkit info for ${toolkitSlug}:`, error);
        }
        
        return { toolName, toolkitSlug, toolkit: null };
      });

      const toolkitResults = await Promise.all(toolkitPromises);
      
      // Build toolkit info map
      const newToolkitInfos: Record<string, any> = {};
      const newConnectionStatuses: any[] = [];
      
      toolkitResults.forEach(({ toolName, toolkitSlug, toolkit }) => {
        if (toolkit) {
          newToolkitInfos[toolkitSlug] = toolkit;
        }
        
        newConnectionStatuses.push({
          tool: toolName,
          toolkitSlug: toolkitSlug,
          connected: false,
          status: 'not_connected',
          authScheme: toolkit?.auth_config_details?.[0]?.mode || 'unknown',
          requiresConnection: true
        });
      });
      
      setToolkitInfos(newToolkitInfos);
      setConnectionStatuses(newConnectionStatuses);
      setShowConnections(true);
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  };

  const connectTool = async (toolName: string, toolkitSlug: string) => {
    try {
      const toolkit = toolkitInfos[toolkitSlug];
      if (!toolkit) {
        alert('Toolkit information not available. Please try again.');
        return;
      }

      const authScheme = toolkit.auth_config_details?.[0]?.mode;
      
      if (authScheme === 'oauth2') {
        // For OAuth2, we need to create auth config first (simplified - in production this would be pre-created)
        alert('OAuth2 connection requires pre-configured auth config. Please set up the integration in Composio dashboard first.');
        const composioDashboardUrl = `https://app.composio.dev/apps/${toolkitSlug}`;
        window.open(composioDashboardUrl, '_blank');
        return;
      }
      
      if (authScheme === 'api_key') {
        const apiKey = (window as any).prompt(`Enter your ${toolkit.name} API Key:`);
        if (!apiKey) return;
        
        // Store the API key for this toolkit
        setAuthConfigs(prev => ({
          ...prev,
          [toolkitSlug]: { apiKey, authScheme: 'api_key' }
        }));
        
        // Update connection status
        setConnectionStatuses(prev => 
          prev.map(status => 
            status.toolkitSlug === toolkitSlug 
              ? { ...status, connected: true, status: 'connected' }
              : status
          )
        );
        
        alert(`${toolkit.name} API key saved successfully!`);
        return;
      }
      
      if (authScheme === 'bearer_token') {
        const bearerToken = (window as any).prompt(`Enter your ${toolkit.name} Bearer Token:`);
        if (!bearerToken) return;
        
        // Store the bearer token for this toolkit
        setAuthConfigs(prev => ({
          ...prev,
          [toolkitSlug]: { bearerToken, authScheme: 'bearer_token' }
        }));
        
        // Update connection status
        setConnectionStatuses(prev => 
          prev.map(status => 
            status.toolkitSlug === toolkitSlug 
              ? { ...status, connected: true, status: 'connected' }
              : status
          )
        );
        
        alert(`${toolkit.name} Bearer token saved successfully!`);
        return;
      }
      
      alert(`Auth scheme "${authScheme}" not yet supported in this demo.`);
    } catch (error) {
      console.error('Error connecting tool:', error);
      alert('Failed to connect tool. Please try again.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Agent Preview
          </h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                showPreview
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              {showPreview ? 'Form View' : 'HTML Preview'}
            </button>
            
            <button
              onClick={reloadPage}
              className="px-3 py-1 bg-white/10 text-white/70 hover:text-white rounded text-sm transition-colors flex items-center"
              title="Reload page"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reload
            </button>
            
            {generatedCode.discoveredTools?.length && (
              <button
                onClick={checkConnections}
                className="px-3 py-1 bg-white/10 text-white/70 hover:text-white rounded text-sm transition-colors flex items-center"
              >
                <Link className="w-3 h-3 mr-1" />
                Connections
              </button>
            )}
          </div>
        </div>

        <button
          onClick={resetForm}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          title="Reset form"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showPreview && generatedCode.frontend ? (
          <div className="h-full">
            <iframe
              srcDoc={generatedCode.frontend}
              className="w-full h-full border-none"
              title="Generated Frontend Preview"
            />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Configuration Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-medium mb-4 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    LLM API Key
                  </label>
                  <input
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="Enter your OpenAI/Anthropic API Key"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Composio API Key
                  </label>
                  <input
                    type="password"
                    value={composioApiKey}
                    onChange={(e) => setComposioApiKey(e.target.value)}
                    placeholder="Enter your Composio API Key"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-medium mb-4">Prompt</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt for the AI agent..."
                rows={4}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              <button
                onClick={runAgent}
                disabled={isRunning || !llmApiKey || !composioApiKey || !prompt || !generatedCode.discoveredTools?.length}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium transition-all hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Agent with GPT-4.1...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Agent (GPT-4.1)
                  </>
                )}
              </button>
            </div>

            {/* Response Section */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium">Agent Response</h3>
                {response && (
                  <button
                    onClick={clearResponse}
                    className="text-sm text-white/60 hover:text-white/80 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="min-h-[200px] bg-black/30 rounded-lg p-4 font-mono text-sm">
                {response ? (
                  <pre className="text-green-300 whitespace-pre-wrap">{response}</pre>
                ) : (
                  <div className="text-white/50 italic">
                    Agent output will appear here...
                  </div>
                )}
              </div>
            </div>

            {/* Agent Info */}
            {generatedCode.useCase && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-medium mb-2">Agent Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-white/60">Use Case:</span>
                    <p className="text-white/80 mt-1">{generatedCode.useCase}</p>
                  </div>
                  {generatedCode.discoveredTools?.length && (
                    <div>
                      <span className="text-white/60">Tools ({generatedCode.discoveredTools.length}):</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedCode.discoveredTools.map((tool, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Agent Status */}
            {!generatedCode.frontend && !generatedCode.backend && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <h3 className="text-lg font-medium text-white/60 mb-2">No Agent Generated</h3>
                <p className="text-white/40">
                  Generate an agent first to test it here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connections Modal */}
      {showConnections && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-white/10 p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">App Connections</h3>
              <button
                onClick={() => setShowConnections(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {connectionStatuses.map((status, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center">
                    {status.connected ? (
                      <Check className="w-4 h-4 text-green-500 mr-3" />
                    ) : status.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-500 mr-3" />
                    ) : (
                      <X className="w-4 h-4 text-yellow-500 mr-3" />
                    )}
                                         <div className="text-left">
                       <span className="text-white font-medium">{toolkitInfos[status.toolkitSlug]?.name || status.toolkitSlug}</span>
                       <div className="text-xs text-white/60">{status.tool}</div>
                       <div className="text-xs text-white/50">Auth: {status.authScheme}</div>
                     </div>
                  </div>
                  
                                     {!status.connected && (
                     <button
                       onClick={() => connectTool(status.tool, status.toolkitSlug)}
                       className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                     >
                       Connect
                     </button>
                   )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-300 text-sm">
                💡 Connected apps will allow your agent to access external services and perform actions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
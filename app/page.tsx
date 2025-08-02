"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Code,
  Eye,
  Settings,
  Zap,
  Link,
  Check,
  X,
  AlertCircle,
  Loader,
  Send,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const COMPOSIO_API_KEY = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

interface GeneratedCode {
  frontend: string;
  backend: string;
  discoveredTools: string[];
  useCase: string;
  systemPrompt: string;
  metadata?: {
    tools: string[];
    useCase: string;
    timestamp: string;
  };
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system" | "connection-status";
  content: string;
  timestamp: Date;
  data?: any;
}

interface ToolkitConnectionStatus {
  connected: boolean;
  status: "connected" | "connecting" | "not_connected";
  authScheme?: string;
  isComposioManaged?: boolean;
  isOAuth2?: boolean;
  isApiKey?: boolean;
  managedSchemes?: string[];
  toolkitSlug?: string;
  connectionId?: string;
  apiKey?: string;
}

export default function Home() {
  const [agentIdea, setAgentIdea] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hi! I'm your AI agent builder. Describe the agent you'd like to create and I'll build both the frontend interface and backend logic for you.",
      timestamp: new Date(),
    },
  ]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [toolkitInfos, setToolkitInfos] = useState<Record<string, any>>({});
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<string, ToolkitConnectionStatus>
  >({});
  const [isCheckingConnections, setIsCheckingConnections] = useState(false);
  const [credentialCollection, setCredentialCollection] = useState<{
    isCollecting: boolean;
    toolkitSlug: string;
    authType: "oauth2" | "api_key";
    credentials: {
      clientId?: string;
      clientSecret?: string;
      apiKey?: string;
    };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize user ID from session storage or generate new one
  useEffect(() => {
    const storedUserId = sessionStorage.getItem("composio_user_id");
    if (storedUserId) {
      setUserId(storedUserId);
      console.log("🔍 [DEBUG] Using existing user ID:", storedUserId);
    } else {
      const newUserId = `user_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      sessionStorage.setItem("composio_user_id", newUserId);
      setUserId(newUserId);
      console.log("🔍 [DEBUG] Generated new user ID:", newUserId);
    }
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to reload only the iframe
  const reloadIframe = () => {
    if (iframeRef.current) {
      try {
        const currentSrc = iframeRef.current.src;

        // If it's a blob URL, we need to regenerate the content
        if (currentSrc.startsWith("blob:")) {
          // Revoke the old blob URL to free memory
          URL.revokeObjectURL(currentSrc);

          // Regenerate the iframe content if we have generated code
          if (generatedCode) {
            // Ensure the frontend code is properly formatted and placeholders are replaced
            const cleanFrontend = generatedCode.frontend
              .replace(/```html\s*/g, '')
              .replace(/```\s*$/g, '')
              .replace(/__LLM_API_KEY__/g, `"${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}"`)
              .replace(/__COMPOSIO_API_KEY__/g, `"${process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || ''}"`)
              .replace(/__USER_ID__/g, `"${userId}"`);

            const newBlob = new Blob([cleanFrontend], { type: "text/html" });
            const newUrl = URL.createObjectURL(newBlob);
            iframeRef.current.src = newUrl;
          }
        } else if (currentSrc.includes("/api/preview")) {
          // For API preview URLs, just reload
          iframeRef.current.src = currentSrc + "&t=" + Date.now();
        } else {
          // For other URLs, just reload
          iframeRef.current.src = currentSrc;
        }
      } catch (error) {
        console.error("Error reloading iframe:", error);
        // Fallback: reset to default preview
        if (iframeRef.current) {
          iframeRef.current.src = "/api/preview?type=default&t=" + Date.now();
        }
      }
    }
  };

  const addMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      },
    ]);
  };

  const extractToolkitName = (toolName: string): string => {
    if (toolName.startsWith("_")) {
      const parts = toolName.split("_");
      if (parts.length >= 3) {
        return (parts[0] + parts[1]).toLowerCase();
      }
    }
    const firstPart = toolName.split("_")[0];
    return firstPart.toLowerCase();
  };

  const handleGenerateAgent = async () => {
    if (!agentIdea.trim()) return;

    setIsGenerating(true);

    // Add user message
    addMessage({
      type: "user",
      content: agentIdea,
    });

    // Add assistant thinking message
    addMessage({
      type: "assistant",
      content:
        "I'll create an AI agent for you. Let me analyze your requirements and generate the code...",
    });

    try {
      const response = await fetch("/api/generate-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIdea }),
      });

      if (response.ok) {
        const code = await response.json();
        setGeneratedCode(code);

        // Add success message with details
        addMessage({
          type: "assistant",
          content: `Great! I've created your "${
            code.useCase
          }" agent. Here's what I built:

**Features:**
${code.discoveredTools
  .map(
    (tool: string) =>
      `• ${tool
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l: string) => l.toUpperCase())}`
  )
  .join("\n")}

**System Capabilities:**
• Frontend interface with input fields for API keys and prompts
• Backend AI agent powered by Vercel AI SDK
• Integration with ${code.discoveredTools.length} Composio tools
• Real-time response streaming

The agent is now ready for testing on the right side!`,
          data: { type: "generation-complete", code },
        });

        // Check for required connections
        if (code.discoveredTools && code.discoveredTools.length > 0) {
          checkToolkitConnections(code.discoveredTools);
        }

        // Update iframe with generated frontend
        if (iframeRef.current) {
          // Clean up any existing blob URL to prevent memory leaks
          if (
            iframeRef.current.src &&
            iframeRef.current.src.startsWith("blob:")
          ) {
            URL.revokeObjectURL(iframeRef.current.src);
          }

          // Ensure the frontend code is properly formatted and placeholders are replaced
          const cleanFrontend = code.frontend
            .replace(/```html\s*/g, '')
            .replace(/```\s*$/g, '')
            .replace(/__LLM_API_KEY__/g, `"${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}"`)
            .replace(/__COMPOSIO_API_KEY__/g, `"${process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || ''}"`)
            .replace(/__USER_ID__/g, `"${userId}"`);

          const blob = new Blob([cleanFrontend], { type: "text/html" });
          const url = URL.createObjectURL(blob);

          console.log(
            "🔍 [DEBUG] Iframe content length:",
            cleanFrontend.length
          );
          console.log("🔍 [DEBUG] Generated blob URL:", url);

          // Set the iframe src directly
          if (iframeRef.current) {
            iframeRef.current.src = url;
          }

          console.log("Updated iframe with AI-generated code");
        }

        setAgentIdea("");
      } else {
        throw new Error("Failed to generate agent");
      }
    } catch (error) {
      addMessage({
        type: "assistant",
        content:
          "I encountered an error while generating your agent. Please try again with a different description.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const checkToolkitConnections = async (tools: string[]) => {
    setIsCheckingConnections(true);

    addMessage({
      type: "system",
      content: "Checking required toolkit connections...",
    });

    try {
      const uniqueToolkits = [...new Set(tools.map(extractToolkitName))];
      if (!COMPOSIO_API_KEY) {
        addMessage({
          type: "assistant",
          content:
                          "Composio API key not configured. Please set NEXT_PUBLIC_COMPOSIO_API_KEY in your environment.",
        });
        setIsCheckingConnections(false);
        return;
      }

      const toolkitPromises = uniqueToolkits.map(async (toolkitSlug) => {
        try {
          const response = await fetch(
            `/api/toolkit-info?slug=${toolkitSlug}&composioApiKey=${encodeURIComponent(
              COMPOSIO_API_KEY
            )}`
          );
          if (response.ok) {
            const data = await response.json();
            return { toolkitSlug, toolkit: data.toolkit };
          } else {
            return { toolkitSlug, toolkit: null };
          }
        } catch (error) {
          return { toolkitSlug, toolkit: null };
        }
      });

      const toolkitResults = await Promise.all(toolkitPromises);

      const newToolkitInfos: Record<string, any> = {};
      const newConnectionStatuses: Record<string, ToolkitConnectionStatus> = {};
      const connectionItems: string[] = [];

      toolkitResults.forEach(({ toolkitSlug, toolkit }) => {
        if (toolkit) {
          newToolkitInfos[toolkitSlug] = toolkit;

          const managedSchemes = toolkit.composio_managed_auth_schemes || [];
          const isComposioManaged = managedSchemes.length > 0;
          const authScheme = toolkit.auth_config_details?.[0]?.mode;
          const managedSchemesLower = managedSchemes.map((s: string) =>
            s.toLowerCase()
          );
          const isOAuth2 =
            managedSchemesLower.includes("oauth2") ||
            managedSchemesLower.includes("oauth") ||
            authScheme?.toLowerCase() === "oauth2";
          const isApiKey =
            managedSchemesLower.includes("api_key") ||
            managedSchemesLower.includes("bearer_token") ||
            managedSchemesLower.includes("apikey") ||
            authScheme?.toLowerCase() === "api_key";

          newConnectionStatuses[toolkitSlug] = {
            connected: false,
            status: "not_connected",
            authScheme: authScheme,
            isComposioManaged: isComposioManaged,
            isOAuth2: isOAuth2,
            isApiKey: isApiKey,
            managedSchemes: managedSchemes,
            toolkitSlug: toolkitSlug,
          };

          const authType = isOAuth2
            ? "OAuth2"
            : isApiKey
            ? "API Key"
            : authScheme;
          const managedStatus = isComposioManaged
            ? "🟢 Composio Managed"
            : "🟡 Custom Setup Required";
          connectionItems.push(
            `**${toolkit.name}** - ${authType} (${managedStatus})`
          );
        }
      });

      setToolkitInfos(newToolkitInfos);
      setConnectionStatuses(newConnectionStatuses);

      // Add connection status message
      addMessage({
        type: "connection-status",
        content: `**Required Connections:**

${connectionItems.join("\n")}

Connect these services to enable your agent's full functionality:`,
        data: { toolkits: newConnectionStatuses },
      });
    } catch (error) {
      console.error("Error checking toolkit connections:", error);
    } finally {
      setIsCheckingConnections(false);
    }
  };

  const handleCredentialSubmit = async () => {
    if (!credentialCollection) return;

    const { toolkitSlug, authType, credentials } = credentialCollection;
    const toolkit = toolkitInfos[toolkitSlug];

    try {
      if (!process.env.NEXT_PUBLIC_COMPOSIO_API_KEY) {
        alert(
                      "Composio API key not configured. Please set NEXT_PUBLIC_COMPOSIO_API_KEY in your environment."
        );
        return;
      }

      addMessage({
        type: "system",
        content: `Connecting ${toolkit?.name || toolkitSlug}...`,
      });

      // Clear the credential collection UI
      setCredentialCollection(null);

      const response = await fetch("/api/create-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composioApiKey: COMPOSIO_API_KEY,
          toolkitSlug,
          authType,
          credentials,
          userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (authType === "oauth2" && data.redirectUrl) {
          // For OAuth2, open redirect URL and wait for connection
          setConnectionStatuses((prev) => ({
            ...prev,
            [toolkitSlug]: { ...prev[toolkitSlug], status: "connecting" },
          }));

          window.open(data.redirectUrl, "_blank");
          if (data.connectionId) {
            waitForOAuthConnection(COMPOSIO_API_KEY, data.connectionId, toolkitSlug);
          }
        } else {
          // For API key, connection should be immediate
          setConnectionStatuses((prev) => ({
            ...prev,
            [toolkitSlug]: {
              ...prev[toolkitSlug],
              connected: true,
              status: "connected",
            },
          }));

          addMessage({
            type: "system",
            content: `✅ ${
              toolkit?.name || toolkitSlug
            } connected successfully!`,
          });
        }
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (error: any) {
      addMessage({
        type: "system",
        content: `❌ Failed to connect ${toolkit?.name || toolkitSlug}: ${
          error.message
        }`,
      });
    }
  };

  const connectToolkit = async (toolkitSlug: string) => {
    const toolkit = toolkitInfos[toolkitSlug];
    const status = connectionStatuses[toolkitSlug];
    if (!toolkit || !status) return;

    // Check if Composio API key is configured
    if (!COMPOSIO_API_KEY) {
      alert(
                    "Composio API key not configured. Please set NEXT_PUBLIC_COMPOSIO_API_KEY in your environment."
      );
      return;
    }

    try {
      if (status.isComposioManaged && status.isOAuth2) {
        // Composio-managed OAuth2 - direct redirect
        addMessage({
          type: "system",
          content: `Initiating OAuth connection for ${toolkit.name}... Please authorize in the popup window.`,
        });

        const response = await fetch("/api/create-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            composioApiKey: COMPOSIO_API_KEY,
            toolkitSlug,
            authType: "oauth2",
            userId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.redirectUrl && data.connectionId) {
            setConnectionStatuses((prev) => ({
              ...prev,
              [toolkitSlug]: { ...prev[toolkitSlug], status: "connecting" },
            }));

            window.open(data.redirectUrl, "_blank");
            waitForOAuthConnection(
              COMPOSIO_API_KEY,
              data.connectionId,
              toolkitSlug
            );
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('OAuth connection failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(`Failed to initiate OAuth connection: ${errorData.error || response.statusText}`);
        }
      } else if (status.isComposioManaged && status.isApiKey) {
        // Composio-managed API key - show input form
        setCredentialCollection({
          isCollecting: true,
          toolkitSlug,
          authType: "api_key",
          credentials: {},
        });
      } else if (!status.isComposioManaged && status.isOAuth2) {
        // Non-Composio managed OAuth2 - collect client ID and secret
        setCredentialCollection({
          isCollecting: true,
          toolkitSlug,
          authType: "oauth2",
          credentials: {},
        });
      } else if (!status.isComposioManaged && status.isApiKey) {
        // Non-Composio managed API key - show input form
        setCredentialCollection({
          isCollecting: true,
          toolkitSlug,
          authType: "api_key",
          credentials: {},
        });
      } else {
        // Unsupported authentication scheme
        addMessage({
          type: "system",
          content: `${toolkit.name} authentication (${status.authScheme}) is not yet supported in this interface.`,
        });
      }
    } catch (error: any) {
      console.error("Error connecting toolkit:", error);
      addMessage({
        type: "system",
        content: `❌ Failed to connect ${toolkit.name}: ${error.message}`,
      });
    }
  };

  const waitForOAuthConnection = async (
    composioApiKey: string,
    connectionId: string,
    toolkitSlug: string
  ) => {
    try {
      const response = await fetch("/api/wait-for-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composioApiKey,
          connectionId,
          timeout: 300000,
        }),
      });

      const data = await response.json();
      const toolkit = toolkitInfos[toolkitSlug];

      if (data.success && data.status === "ACTIVE") {
        setConnectionStatuses((prev) => ({
          ...prev,
          [toolkitSlug]: {
            ...prev[toolkitSlug],
            connected: true,
            status: "connected",
            connectionId: connectionId,
          },
        }));

        addMessage({
          type: "system",
          content: `🎉 ${
            toolkit?.name || toolkitSlug
          } connected successfully! Your agent can now use this service.`,
        });
      } else if (data.status === "EXPIRED" || data.status === "INACTIVE") {
        setConnectionStatuses((prev) => ({
          ...prev,
          [toolkitSlug]: {
            ...prev[toolkitSlug],
            status: "not_connected",
          },
        }));

        addMessage({
          type: "system",
          content: `❌ OAuth connection for ${
            toolkit?.name || toolkitSlug
          } ${data.status.toLowerCase()}. Please try connecting again.`,
        });
      } else if (data.status === "TIMEOUT") {
        setConnectionStatuses((prev) => ({
          ...prev,
          [toolkitSlug]: {
            ...prev[toolkitSlug],
            status: "not_connected",
          },
        }));

        addMessage({
          type: "system",
          content: `⏰ OAuth connection for ${
            toolkit?.name || toolkitSlug
          } timed out. Please try connecting again.`,
        });
      }
    } catch (error) {
      setConnectionStatuses((prev) => ({
        ...prev,
        [toolkitSlug]: {
          ...prev[toolkitSlug],
          status: "not_connected",
        },
      }));

      addMessage({
        type: "system",
        content: `❌ Failed to complete OAuth connection for ${
          toolkitInfos[toolkitSlug]?.name || toolkitSlug
        }. Please try again.`,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateAgent();
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Left Side - Chat Interface */}
      <div className="w-1/2 flex flex-col border-r border-gray-800/50">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                AI Agent Builder
              </h1>
              <p className="text-sm text-gray-400">
                Build intelligent agents with custom interfaces
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages - Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-violet-500/20"
                      : message.type === "system"
                      ? "bg-amber-500/10 text-amber-200 border border-amber-500/20 backdrop-blur-sm"
                      : message.type === "connection-status"
                      ? "bg-gray-900/60 text-gray-100 border border-gray-700/50 backdrop-blur-sm"
                      : "bg-gray-900/60 text-gray-100 border border-gray-700/50 backdrop-blur-sm"
                  }`}
                >
                  <div className="text-[15px] leading-relaxed font-medium prose prose-invert prose-sm max-w-none [&>*]:mb-2 [&>*:last-child]:mb-0 [&_strong]:text-current [&_code]:bg-black/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_ul]:pl-4 [&_li]:mb-1">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-current">
                            {children}
                          </strong>
                        ),
                        code: ({ children }) => (
                          <code className="bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono text-current">
                            {children}
                          </code>
                        ),
                        ul: ({ children }) => (
                          <ul className="pl-4 space-y-1">{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li className="text-current">{children}</li>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Connection Status Buttons */}
                  {message.type === "connection-status" &&
                    message.data?.toolkits && (
                      <div className="mt-5 space-y-3">
                        {Object.entries(
                          message.data.toolkits as Record<
                            string,
                            ToolkitConnectionStatus
                          >
                        ).map(([toolkitSlug, status]) => (
                          <div
                            key={toolkitSlug}
                            className="flex items-center justify-between bg-gray-800/40 rounded-xl p-4 border border-gray-700/30"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-white text-sm">
                                {toolkitInfos[toolkitSlug]?.name || toolkitSlug}
                              </div>
                              <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${
                                    status?.isComposioManaged
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  {status?.isComposioManaged ? "●" : "◐"}{" "}
                                  {status?.isComposioManaged
                                    ? "Managed"
                                    : "Custom"}
                                </span>
                                <span className="text-gray-500">•</span>
                                <span>{status?.authScheme || "unknown"}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => connectToolkit(toolkitSlug)}
                              disabled={status?.status === "connecting"}
                              className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                status?.connected
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-default"
                                  : status?.status === "connecting"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 cursor-not-allowed"
                                  : "bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/30"
                              }`}
                            >
                              {status?.connected
                                ? "✓ Connected"
                                : status?.status === "connecting"
                                ? "⏳ Connecting..."
                                : "Connect"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-gray-900/60 text-gray-100 border border-gray-700/50 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                  <span className="text-[15px] font-medium">
                    Generating your agent...
                  </span>
                </div>
              </div>
            )}

            {/* Auto scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Credential Collection UI */}
        {credentialCollection && (
          <div className="flex-shrink-0 p-6 border-t border-gray-800/50 bg-gray-900/40 backdrop-blur-sm">
            <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/30">
              <h3 className="text-white font-semibold mb-4">
                Connect{" "}
                {toolkitInfos[credentialCollection.toolkitSlug]?.name ||
                  credentialCollection.toolkitSlug}
              </h3>

              {credentialCollection.authType === "oauth2" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={credentialCollection.credentials.clientId || ""}
                      onChange={(e) =>
                        setCredentialCollection((prev) =>
                          prev
                            ? {
                                ...prev,
                                credentials: {
                                  ...prev.credentials,
                                  clientId: e.target.value,
                                },
                              }
                            : null
                        )
                      }
                      placeholder="Enter your client ID"
                      className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={
                        credentialCollection.credentials.clientSecret || ""
                      }
                      onChange={(e) =>
                        setCredentialCollection((prev) =>
                          prev
                            ? {
                                ...prev,
                                credentials: {
                                  ...prev.credentials,
                                  clientSecret: e.target.value,
                                },
                              }
                            : null
                        )
                      }
                      placeholder="Enter your client secret"
                      className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={credentialCollection.credentials.apiKey || ""}
                    onChange={(e) =>
                      setCredentialCollection((prev) =>
                        prev
                          ? {
                              ...prev,
                              credentials: {
                                ...prev.credentials,
                                apiKey: e.target.value,
                              },
                            }
                          : null
                      )
                    }
                    placeholder="Enter your API key"
                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleCredentialSubmit()}
                  disabled={
                    credentialCollection.authType === "oauth2"
                      ? !credentialCollection.credentials.clientId ||
                        !credentialCollection.credentials.clientSecret
                      : !credentialCollection.credentials.apiKey
                  }
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Connect
                </button>
                <button
                  onClick={() => setCredentialCollection(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input - Fixed at Bottom */}
        <div className="flex-shrink-0 p-6 border-t border-gray-800/50 bg-gray-900/20 backdrop-blur-sm">
          <div className="flex gap-3">
            <input
              type="text"
              value={agentIdea}
              onChange={(e) => setAgentIdea(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the AI agent you want to build..."
              disabled={isGenerating}
              className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500/50 focus:bg-gray-900/70 transition-all duration-200 text-[15px] backdrop-blur-sm"
            />
            <button
              onClick={handleGenerateAgent}
              disabled={isGenerating || !agentIdea.trim()}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Building...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Build Agent
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Preview */}
      <div className="w-1/2 flex flex-col bg-gray-950/50">
        {/* Preview Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Live Preview
              </h2>
              <p className="text-sm text-gray-400">
                Your generated agent interface
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={reloadIframe}
                className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg text-sm transition-colors flex items-center gap-2 border border-gray-700/50"
                title="Reload iframe"
              >
                <RefreshCw className="w-3 h-3" />
                Reload
              </button>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400 font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Content - Fixed Height */}
        <div className="flex-1 p-6 bg-gradient-to-br from-gray-900/20 to-gray-800/20 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* HTML Preview - Direct iframe rendering */}
            <iframe
              ref={iframeRef}
              className="flex-1 w-full bg-white shadow-2xl rounded-lg border border-gray-700/50"
              src="/api/preview?type=default"
              title="AI Agent Preview"
            />

            {!generatedCode && (
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Ready to build
                </h3>
                <p className="text-gray-400 text-sm">
                  Generate an agent to see the live preview above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

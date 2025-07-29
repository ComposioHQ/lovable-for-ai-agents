'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Code, Eye, Settings, Zap, Link, Check, X, AlertCircle, Loader, Send, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
  type: 'user' | 'assistant' | 'system' | 'connection-status';
  content: string;
  timestamp: Date;
  data?: any;
}

export default function Home() {
  const [agentIdea, setAgentIdea] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your AI agent builder. Describe the agent you'd like to create and I'll build both the frontend interface and backend logic for you.",
      timestamp: new Date()
    }
  ]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toolkitInfos, setToolkitInfos] = useState<Record<string, any>>({});
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, any>>({});
  const [isCheckingConnections, setIsCheckingConnections] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Helper function to generate iframe HTML
  const generateIframeHTML = (code: any, currentComposioApiKey: string, currentLlmApiKey: string) => {
    // Ensure API keys are properly set from environment
    const composioApiKey = currentComposioApiKey || process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || '';
    const llmApiKey = currentLlmApiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https:; img-src 'self' data: https:;">
    <title>${code.useCase ? code.useCase.charAt(0).toUpperCase() + code.useCase.slice(1) + ' Agent' : 'AI Assistant'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f7;
            --bg-tertiary: #fafafa;
            --text-primary: #1d1d1f;
            --text-secondary: #86868b;
            --text-tertiary: #515154;
            --border-color: #d2d2d7;
            --border-subtle: #e8e8ed;
            --accent: #0071e3;
            --accent-hover: #0077ed;
            --accent-light: #e3f2fd;
            --user-bubble: #007aff;
            --ai-bubble: #f5f5f7;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
            --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
            --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
            --font-stack: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-primary: #000000;
                --bg-secondary: #1c1c1e;
                --bg-tertiary: #2c2c2e;
                --text-primary: #ffffff;
                --text-secondary: #98989d;
                --text-tertiary: #c7c7cc;
                --border-color: #38383a;
                --border-subtle: #2c2c2e;
                --accent: #0a84ff;
                --accent-hover: #409cff;
                --accent-light: #1c3650;
                --user-bubble: #0a84ff;
                --ai-bubble: #2c2c2e;
                --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
                --shadow-md: 0 4px 6px rgba(0,0,0,0.4);
                --shadow-lg: 0 10px 15px rgba(0,0,0,0.5);
            }
        }

        body {
            font-family: var(--font-stack);
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            position: relative;
        }

        .chat-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            max-width: 760px;
            margin: 0 auto;
            background: var(--bg-primary);
        }

        /* Header */
        .chat-header {
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-subtle);
            padding: 16px 20px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ai-avatar {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #5e5ce6 0%, #007aff 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            color: white;
            flex-shrink: 0;
        }

        .header-info h1 {
            font-size: 17px;
            font-weight: 600;
            color: var(--text-primary);
            letter-spacing: -0.01em;
        }

        .header-info p {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 2px;
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            background: #34c759;
            border-radius: 50%;
            margin-left: auto;
            box-shadow: 0 0 0 2px var(--bg-primary);
        }

        /* Messages */
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
        }

        .chat-messages::-webkit-scrollbar {
            width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
            background: var(--text-secondary);
        }

        .message {
            margin-bottom: 16px;
            display: flex;
            animation: messageIn 0.3s ease-out;
        }

        @keyframes messageIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .user-message {
            justify-content: flex-end;
        }

        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 15px;
            line-height: 1.4;
            word-wrap: break-word;
            position: relative;
        }

        .user-message .message-content {
            background: var(--user-bubble);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .agent-message .message-content {
            background: var(--ai-bubble);
            color: var(--text-primary);
            border-bottom-left-radius: 4px;
            border: 1px solid var(--border-subtle);
        }

        @media (prefers-color-scheme: dark) {
            .agent-message .message-content {
                border: none;
            }
        }

        /* Loading animation */
        .loading-message {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
        }

        .loading-dots {
            display: flex;
            gap: 3px;
        }

        .loading-dot {
            width: 8px;
            height: 8px;
            background: var(--text-secondary);
            border-radius: 50%;
            animation: loadingPulse 1.4s ease-in-out infinite;
        }

        .loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dot:nth-child(2) { animation-delay: -0.16s; }
        .loading-dot:nth-child(3) { animation-delay: 0; }

        @keyframes loadingPulse {
            0%, 80%, 100% {
                opacity: 0.3;
                transform: scale(0.8);
            }
            40% {
                opacity: 1;
                transform: scale(1);
            }
        }

        /* Error message */
        .error-message {
            background: #fee;
            color: #d70015;
            border: 1px solid #fcc;
        }

        @media (prefers-color-scheme: dark) {
            .error-message {
                background: #3a1a1a;
                color: #ff6b6b;
                border: 1px solid #4a2a2a;
            }
        }

        /* Input area */
        .chat-input-container {
            background: var(--bg-primary);
            border-top: 1px solid var(--border-subtle);
            padding: 16px 20px 24px;
        }

        .input-wrapper {
            display: flex;
            align-items: flex-end;
            gap: 12px;
            position: relative;
        }

        .input-container {
            flex: 1;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 8px 16px;
            transition: all 0.2s ease;
            position: relative;
            cursor: text;
        }

        .input-container:focus-within {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-light);
        }

        .chat-input {
            width: 100%;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 15px;
            font-family: inherit;
            outline: none;
            resize: none;
            min-height: 24px;
            max-height: 120px;
            line-height: 1.4;
            padding: 0;
            overflow-y: hidden;
            -webkit-appearance: none;
            display: block;
            position: relative;
            z-index: 1;
            pointer-events: auto;
            cursor: text;
        }

        .chat-input::placeholder {
            color: var(--text-secondary);
        }

        .chat-input::-webkit-scrollbar {
            width: 0;
        }

        .send-button {
            width: 36px;
            height: 36px;
            background: var(--accent);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
            background: var(--accent-hover);
            transform: scale(1.05);
        }

        .send-button:active:not(:disabled) {
            transform: scale(0.95);
        }

        .send-button:disabled {
            background: var(--border-color);
            cursor: not-allowed;
            opacity: 0.5;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            .chat-container {
                max-width: 100%;
            }

            .chat-header {
                padding: 12px 16px;
            }

            .chat-messages {
                padding: 16px;
            }

            .message-content {
                max-width: 85%;
                font-size: 16px;
            }

            .chat-input-container {
                padding: 12px 16px 20px;
            }

            .chat-input {
                font-size: 16px; /* Prevents zoom on iOS */
            }
        }

        /* Subtle animations */
        * {
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }

        /* Ensure nothing blocks interactions */
        .chat-container * {
            pointer-events: auto;
        }
        
        /* Specific pointer events for key elements */
        .chat-messages {
            pointer-events: auto;
        }
        
        .chat-input-container {
            pointer-events: auto;
            z-index: 10;
        }
        
        .input-wrapper {
            pointer-events: auto;
        }
        
        .input-container {
            pointer-events: auto;
        }
        
        .chat-input {
            pointer-events: auto !important;
        }
        
        /* Focus visible for accessibility */
        .send-button:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        .chat-input:focus-visible {
            outline: none; /* Handled by container */
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <div class="header-content">
                <div class="ai-avatar">AI</div>
                <div class="header-info">
                    <h1>${code.useCase ? code.useCase.charAt(0).toUpperCase() + code.useCase.slice(1) + ' Agent' : 'AI Assistant'}</h1>
                    <p>${code.discoveredTools && code.discoveredTools.length > 0 ? `Using ${code.discoveredTools.length} tools` : 'Ready to help'}</p>
                </div>
                <div class="status-indicator"></div>
            </div>
        </div>

        <div class="chat-messages" id="chatMessages">
            <div class="message agent-message">
                <div class="message-content">
                    Hello! I'm your AI assistant. ${code.useCase ? `I can help you with ${code.useCase}.` : 'I can help you with various tasks using the available tools.'} What would you like to explore today?
                </div>
            </div>
        </div>

        <div class="chat-input-container">
            <div class="input-wrapper">
                <div class="input-container">
                    <textarea 
                        class="chat-input" 
                        id="chatInput" 
                        placeholder="${code.useCase ? `Ask about ${code.useCase}...` : 'Message AI Assistant...'}" 
                        rows="1"
                    ></textarea>
                </div>
                <button class="send-button" id="sendButton" onclick="sendMessage()" aria-label="Send message">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <script>
        // Error handling for localStorage access issues
        window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('localStorage')) {
                console.warn('localStorage access blocked - this is expected in iframe contexts');
                e.preventDefault();
                return true;
            }
        });
        
        // Override localStorage to prevent errors from third-party scripts
        if (typeof Storage !== 'undefined') {
            try {
                localStorage.getItem('test');
            } catch (e) {
                console.warn('localStorage not available, creating fallback');
                window.localStorage = {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                    clear: () => {},
                    key: () => null,
                    length: 0
                };
            }
        }

        // API Configuration
        const LLM_API_KEY = '${llmApiKey}';
        const COMPOSIO_API_KEY = '${composioApiKey}';
        const USER_ID = '${userId}';
        const API_BASE_URL = window.location.origin || '';
        const DISCOVERED_TOOLS = ${JSON.stringify(code.discoveredTools || [])};
        const SYSTEM_PROMPT = ${JSON.stringify((code.systemPrompt || "You are a helpful AI assistant.").replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())};
        
        // DOM Elements
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        const chatMessages = document.getElementById('chatMessages');
        
        // Auto-resize textarea with proper handling
        function adjustTextareaHeight() {
            chatInput.style.height = '24px'; // Reset height
            const scrollHeight = chatInput.scrollHeight;
            const maxHeight = 120;
            chatInput.style.height = Math.min(scrollHeight, maxHeight) + 'px';
            
            // Enable scrolling if content exceeds max height
            if (scrollHeight > maxHeight) {
                chatInput.style.overflowY = 'auto';
            } else {
                chatInput.style.overflowY = 'hidden';
            }
        }

        chatInput.addEventListener('input', adjustTextareaHeight);

        // Prevent default form submission behavior
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Initialize API check
        function initializeChat() {
            try {
                console.log('Agent initialized with tools:', DISCOVERED_TOOLS);
                console.log('System prompt:', SYSTEM_PROMPT);
                
                if (!COMPOSIO_API_KEY || COMPOSIO_API_KEY === 'YOUR_COMPOSIO_API_KEY_HERE' || COMPOSIO_API_KEY === '') {
                    // Don't disable input, just show warning
                    addMessage('⚠️ Composio API key not configured. Please set your API key in the configuration.', false, true);
                    return;
                }
                
                if (!LLM_API_KEY || LLM_API_KEY === 'YOUR_OPENAI_API_KEY_HERE' || LLM_API_KEY === '') {
                    addMessage('⚠️ OpenAI API key not configured. Please set your API key in the configuration.', false, true);
                    return;
                }

                // Show available tools
                if (DISCOVERED_TOOLS && DISCOVERED_TOOLS.length > 0) {
                    addMessage('🛠️ Available tools: ' + DISCOVERED_TOOLS.join(', '), false, false);
                }

                // Test API connectivity
                testApiConnectivity();
            } catch (error) {
                console.error('Initialization error:', error);
            }
        }

        function addMessage(content, isUser = false, isError = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'agent-message'}\`;
            
            const messageContent = document.createElement('div');
            messageContent.className = \`message-content \${isError ? 'error-message' : ''}\`;
            messageContent.textContent = content;
            
            messageDiv.appendChild(messageContent);
            chatMessages.appendChild(messageDiv);
            
            // Smooth scroll to bottom
            requestAnimationFrame(() => {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }

        function addLoadingMessage() {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message agent-message';
            messageDiv.id = 'loadingMessage';
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content loading-message';
            
            const loadingDots = document.createElement('div');
            loadingDots.className = 'loading-dots';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'loading-dot';
                loadingDots.appendChild(dot);
            }
            
            messageContent.appendChild(loadingDots);
            messageDiv.appendChild(messageContent);
            chatMessages.appendChild(messageDiv);
            
            requestAnimationFrame(() => {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }

        function removeLoadingMessage() {
            const loadingMessage = document.getElementById('loadingMessage');
            if (loadingMessage) {
                loadingMessage.style.opacity = '0';
                setTimeout(() => loadingMessage.remove(), 200);
            }
        }

        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message || sendButton.disabled) return;
            
            // Check if API keys are configured
            if (!LLM_API_KEY || LLM_API_KEY === 'YOUR_OPENAI_API_KEY_HERE' || LLM_API_KEY === '' || 
                !COMPOSIO_API_KEY || COMPOSIO_API_KEY === 'YOUR_COMPOSIO_API_KEY_HERE' || COMPOSIO_API_KEY === '') {
                addMessage('Please configure your API keys before sending messages.', false, true);
                return;
            }
            
            // Add user message
            addMessage(message, true);
            
            // Clear input and reset height
            chatInput.value = '';
            adjustTextareaHeight();
            
            // Show loading
            addLoadingMessage();
            sendButton.disabled = true;
            
            try {
                console.log('Sending message to API:', message);
                
                const requestBody = {
                    llmApiKey: LLM_API_KEY,
                    composioApiKey: COMPOSIO_API_KEY,
                    prompt: message,
                    discoveredTools: DISCOVERED_TOOLS,
                    systemPrompt: SYSTEM_PROMPT,
                    userId: USER_ID
                };
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000);
                
                const response = await fetch(API_BASE_URL + '/api/execute-generated-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                const data = await response.json();
                
                removeLoadingMessage();
                
                if (data.success && data.response) {
                    addMessage(data.response);
                } else {
                    const errorMessage = data.error + (data.details ? ': ' + data.details : '');
                    addMessage('Error: ' + errorMessage, false, true);
                }
            } catch (error) {
                removeLoadingMessage();
                
                if (error.name === 'AbortError') {
                    addMessage('Request timed out. Please try again with a simpler query.', false, true);
                } else if (error.message.includes('Failed to fetch')) {
                    addMessage('Unable to connect to the API. Please check if the server is running.', false, true);
                } else {
                    addMessage('Error: ' + error.message, false, true);
                }
            } finally {
                sendButton.disabled = false;
                chatInput.focus();
            }
        }

        async function testApiConnectivity() {
            try {
                const response = await fetch(API_BASE_URL + '/api/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true, timestamp: Date.now() })
                });
                
                if (response.ok) {
                    console.log('API connectivity test successful');
                } else {
                    console.warn('API connectivity test failed:', response.status);
                }
            } catch (error) {
                console.error('API connectivity test error:', error.message);
            }
        }

        // Test if input is working
        function testInput() {
            const testValue = 'test';
            chatInput.value = testValue;
            if (chatInput.value === testValue) {
                console.log('✅ Input is working');
                chatInput.value = '';
            } else {
                console.error('❌ Input is not working properly');
            }
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded');
            
            // Check if elements exist
            if (!chatInput) {
                console.error('Chat input not found!');
                return;
            }
            
            initializeChat();
            
            // Force focus on input
            setTimeout(() => {
                chatInput.disabled = false; // Ensure it's not disabled
                chatInput.readOnly = false; // Ensure it's not readonly
                chatInput.focus();
                adjustTextareaHeight();
                testInput(); // Test input functionality
                console.log('Input element:', chatInput);
                console.log('Input disabled:', chatInput.disabled);
                console.log('Input readonly:', chatInput.readOnly);
            }, 100);
            
            // Add click handler to input container
            const inputContainer = document.querySelector('.input-container');
            if (inputContainer) {
                inputContainer.addEventListener('click', function(e) {
                    if (e.target !== chatInput) {
                        chatInput.focus();
                        console.log('Container clicked, focusing input');
                    }
                });
            }
            
            // Test input functionality
            chatInput.addEventListener('click', function() {
                console.log('Input clicked');
            });
            
            chatInput.addEventListener('input', function() {
                console.log('Input changed:', this.value);
                adjustTextareaHeight();
            });
        });

        // Handle resize
        window.addEventListener('resize', adjustTextareaHeight);
        
        // Global error handler
        window.addEventListener('error', function(e) {
            console.error('Global error:', e);
        });
        
        // Backup initialization
        window.addEventListener('load', function() {
            if (chatInput && !chatInput.hasAttribute('data-initialized')) {
                chatInput.setAttribute('data-initialized', 'true');
                console.log('Backup initialization running');
                chatInput.disabled = false;
                chatInput.readOnly = false;
                chatInput.focus();
            }
        });
    </script>
</body>
</html>
    `;
  };

  // Initialize user ID from session storage or generate new one
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('composio_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      console.log('🔍 [DEBUG] Using existing user ID:', storedUserId);
    } else {
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('composio_user_id', newUserId);
      setUserId(newUserId);
      console.log('🔍 [DEBUG] Generated new user ID:', newUserId);
    }
    

  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to reload only the iframe
  const reloadIframe = () => {
    if (iframeRef.current) {
      try {
        const currentSrc = iframeRef.current.src;
        
        // If it's a blob URL, we need to regenerate the content
        if (currentSrc.startsWith('blob:')) {
          // Revoke the old blob URL to free memory
          URL.revokeObjectURL(currentSrc);
          
          // Regenerate the iframe content if we have generated code
          if (generatedCode) {
            const currentComposioApiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || '';
            
            const fullHTML = generateIframeHTML(generatedCode, currentComposioApiKey, process.env.NEXT_PUBLIC_OPENAI_API_KEY || '');
            
            const newBlob = new Blob([fullHTML], { type: 'text/html' });
            const newUrl = URL.createObjectURL(newBlob);
            iframeRef.current.src = newUrl;
          }
        } else if (currentSrc.includes('/api/preview')) {
          // For API preview URLs, just reload
          iframeRef.current.src = currentSrc + '&t=' + Date.now();
        } else {
          // For other URLs, just reload
          iframeRef.current.src = currentSrc;
        }
      } catch (error) {
        console.error('Error reloading iframe:', error);
        // Fallback: reset to default preview
        if (iframeRef.current) {
          iframeRef.current.src = '/api/preview?type=default&t=' + Date.now();
        }
      }
    }
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }]);
  };

  const extractToolkitName = (toolName: string): string => {
    if (toolName.startsWith('_')) {
      const parts = toolName.split('_');
      if (parts.length >= 3) {
        return (parts[0] + parts[1]).toLowerCase();
      }
    }
    const firstPart = toolName.split('_')[0];
    return firstPart.toLowerCase();
  };

  const handleGenerateAgent = async () => {
    if (!agentIdea.trim()) return;

    setIsGenerating(true);
    
    // Add user message
    addMessage({
      type: 'user',
      content: agentIdea
    });

    // Add assistant thinking message
    addMessage({
      type: 'assistant',
      content: "I'll create an AI agent for you. Let me analyze your requirements and generate the code...",
    });

    try {
      const response = await fetch('/api/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentIdea })
      });

      if (response.ok) {
        const code = await response.json();
        setGeneratedCode(code);

        // Add success message with details
        addMessage({
          type: 'assistant',
          content: `Great! I've created your "${code.useCase}" agent. Here's what I built:

**Features:**
${code.discoveredTools.map((tool: string) => `• ${tool.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}`).join('\n')}

**System Capabilities:**
• Frontend interface with input fields for API keys and prompts
• Backend AI agent powered by Vercel AI SDK
• Integration with ${code.discoveredTools.length} Composio tools
• Real-time response streaming

The agent is now ready for testing on the right side!`,
          data: { type: 'generation-complete', code }
        });

        // Check for required connections
        if (code.discoveredTools && code.discoveredTools.length > 0) {
          checkToolkitConnections(code.discoveredTools);
        }

        // Update iframe with generated frontend
        if (iframeRef.current) {
          // Clean up any existing blob URL to prevent memory leaks
          if (iframeRef.current.src && iframeRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(iframeRef.current.src);
          }
          
          // Ensure the frontend code is properly formatted
          const cleanFrontend = code.frontend.replace(/```html\s*/g, '').replace(/```\s*$/g, '');
          
          // Use environment Composio API key
          const currentComposioApiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY || '';
          
          console.log('🔍 [DEBUG] Generating iframe with user ID:', userId);

          // Ensure currentComposioApiKey is a string
          if (!currentComposioApiKey) {
            throw new Error('Composio API key is not defined. Please set NEXT_PUBLIC_COMPOSIO_API_KEY in your environment.');
          }

          const fullHTML = generateIframeHTML(code, currentComposioApiKey as string, process.env.NEXT_PUBLIC_OPENAI_API_KEY || '');
          const blob = new Blob([fullHTML], { type: 'text/html' });
          const url = URL.createObjectURL(blob);

          console.log('🔍 [DEBUG] Iframe content length:', fullHTML.length);
          console.log('🔍 [DEBUG] Generated blob URL:', url);
          
          // Set the iframe src directly without the timeout
          if (iframeRef.current) {
            iframeRef.current.src = url;
          }
          
          console.log('Updated iframe with generated code');
        }
        
        setAgentIdea('');
      } else {
        throw new Error('Failed to generate agent');
      }
    } catch (error) {
      addMessage({
        type: 'assistant',
        content: "I encountered an error while generating your agent. Please try again with a different description."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const checkToolkitConnections = async (tools: string[]) => {
    setIsCheckingConnections(true);
    
    addMessage({
      type: 'system',
      content: "Checking required toolkit connections..."
    });

    try {
      const uniqueToolkits = [...new Set(tools.map(extractToolkitName))];
      const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
      
      if (!apiKey) {
        addMessage({
          type: 'assistant',
          content: "Composio API key not configured. Please set NEXT_PUBLIC_COMPOSIO_API_KEY in your environment."
        });
        setIsCheckingConnections(false);
        return;
      }
      
              const toolkitPromises = uniqueToolkits.map(async (toolkitSlug) => {
          try {
            const response = await fetch(`/api/toolkit-info?slug=${toolkitSlug}&composioApiKey=${encodeURIComponent(apiKey)}`);
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
      const newConnectionStatuses: Record<string, any> = {};
      const connectionItems: string[] = [];
      
      toolkitResults.forEach(({ toolkitSlug, toolkit }) => {
        if (toolkit) {
          newToolkitInfos[toolkitSlug] = toolkit;
          
          const managedSchemes = toolkit.composio_managed_auth_schemes || [];
          const isComposioManaged = managedSchemes.length > 0;
          const authScheme = toolkit.auth_config_details?.[0]?.mode;
          const managedSchemesLower = managedSchemes.map((s: string) => s.toLowerCase());
          const isOAuth2 = managedSchemesLower.includes('oauth2') || 
                          managedSchemesLower.includes('oauth') ||
                          authScheme?.toLowerCase() === 'oauth2';
          const isApiKey = managedSchemesLower.includes('api_key') || 
                          managedSchemesLower.includes('bearer_token') ||
                          managedSchemesLower.includes('apikey') ||
                          authScheme?.toLowerCase() === 'api_key';
          
          newConnectionStatuses[toolkitSlug] = {
            connected: false,
            status: 'not_connected',
            authScheme: authScheme,
            isComposioManaged: isComposioManaged,
            isOAuth2: isOAuth2,
            isApiKey: isApiKey,
            managedSchemes: managedSchemes,
            toolkitSlug: toolkitSlug
          };

          const authType = isOAuth2 ? 'OAuth2' : isApiKey ? 'API Key' : authScheme;
          const managedStatus = isComposioManaged ? '🟢 Composio Managed' : '🟡 Custom Setup Required';
          connectionItems.push(`**${toolkit.name}** - ${authType} (${managedStatus})`);
        }
      });
      
      setToolkitInfos(newToolkitInfos);
      setConnectionStatuses(newConnectionStatuses);

      // Add connection status message
      addMessage({
        type: 'connection-status',
        content: `**Required Connections:**

${connectionItems.join('\n')}

Connect these services to enable your agent's full functionality:`,
        data: { toolkits: newConnectionStatuses }
      });

    } catch (error) {
      console.error('Error checking toolkit connections:', error);
    } finally {
      setIsCheckingConnections(false);
    }
  };

  const connectToolkit = async (toolkitSlug: string) => {
    const toolkit = toolkitInfos[toolkitSlug];
    const status = connectionStatuses[toolkitSlug];
    if (!toolkit || !status) return;

    try {
      const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
      if (!apiKey) {
        alert('Composio API key not configured. Please set NEXT_PUBLIC_COMPOSIO_API_KEY in your environment.');
        return;
      }
      
      // Reload the iframe to update with the new Composio API key
      if (iframeRef.current) {
        reloadIframe();
      }

      if (status.isComposioManaged && status.isOAuth2) {
        addMessage({
          type: 'system',
          content: `Initiating OAuth connection for ${toolkit.name}... Please authorize in the popup window.`
        });

        try {
          const response = await fetch('/api/create-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              composioApiKey: apiKey,
              toolkitSlug,
              authType: 'oauth2',
              userId
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.redirectUrl && data.connectionId) {
              setConnectionStatuses(prev => ({
                ...prev,
                [toolkitSlug]: { ...prev[toolkitSlug], status: 'connecting' }
              }));
              
              window.open(data.redirectUrl, '_blank');
              waitForOAuthConnection(apiKey, data.connectionId, toolkitSlug);
            }
          }
        } catch (error) {
          addMessage({
            type: 'system',
            content: `❌ Failed to initiate OAuth connection for ${toolkit.name}. Please try again.`
          });
        }
        
      } else if (status.isComposioManaged && status.isApiKey) {
        const apiKey = (window as any).prompt(`Enter your ${toolkit.name} API Key:`);
        if (!apiKey) return;
        
        try {
          const response = await fetch('/api/create-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              composioApiKey: apiKey,
              toolkitSlug,
              authType: 'api_key',
              credentials: { apiKey },
              userId
            })
          });

          if (response.ok) {
            setConnectionStatuses(prev => ({
              ...prev,
              [toolkitSlug]: { ...prev[toolkitSlug], connected: true, status: 'connected', apiKey }
            }));
            
            addMessage({
              type: 'system',
              content: `✅ ${toolkit.name} connected successfully!`
            });
          } else {
            throw new Error('Connection failed');
          }
        } catch (error) {
          addMessage({
            type: 'system',
            content: `❌ Failed to connect ${toolkit.name} with API key. Please check your credentials.`
          });
        }
        
      } else if (!status.isComposioManaged) {
        addMessage({
          type: 'system',
          content: `${toolkit.name} requires custom app setup in the Composio dashboard. Opening configuration page...`
        });
        window.open(`https://app.composio.dev/apps/${toolkitSlug}`, '_blank');
        
      } else {
        addMessage({
          type: 'system',
          content: `${toolkit.name} authentication (${status.authScheme}) is not yet supported in this interface.`
        });
      }
      
    } catch (error) {
      console.error('Error connecting toolkit:', error);
      addMessage({
        type: 'system',
        content: `❌ Failed to connect ${toolkit.name}. Please try again.`
      });
    }
  };

  const waitForOAuthConnection = async (composioApiKey: string, connectionId: string, toolkitSlug: string) => {
    try {
      const response = await fetch('/api/wait-for-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          composioApiKey,
          connectionId,
          timeout: 300000
        })
      });

      const data = await response.json();
      const toolkit = toolkitInfos[toolkitSlug];
      
      if (data.success && data.status === 'ACTIVE') {
        setConnectionStatuses(prev => ({
          ...prev,
          [toolkitSlug]: { 
            ...prev[toolkitSlug], 
            connected: true, 
            status: 'connected',
            connectionId: connectionId
          }
        }));
        
        addMessage({
          type: 'system',
          content: `🎉 ${toolkit?.name || toolkitSlug} connected successfully! Your agent can now use this service.`
        });
        
      } else if (data.status === 'EXPIRED' || data.status === 'INACTIVE') {
        setConnectionStatuses(prev => ({
          ...prev,
          [toolkitSlug]: { 
            ...prev[toolkitSlug], 
            status: 'not_connected' 
          }
        }));
        
        addMessage({
          type: 'system',
          content: `❌ OAuth connection for ${toolkit?.name || toolkitSlug} ${data.status.toLowerCase()}. Please try connecting again.`
        });
        
      } else if (data.status === 'TIMEOUT') {
        setConnectionStatuses(prev => ({
          ...prev,
          [toolkitSlug]: { 
            ...prev[toolkitSlug], 
            status: 'not_connected' 
          }
        }));
        
        addMessage({
          type: 'system',
          content: `⏰ OAuth connection for ${toolkit?.name || toolkitSlug} timed out. Please try connecting again.`
        });
      }
      
    } catch (error) {
      setConnectionStatuses(prev => ({
        ...prev,
        [toolkitSlug]: { 
          ...prev[toolkitSlug], 
          status: 'not_connected' 
        }
      }));
      
      addMessage({
        type: 'system',
        content: `❌ Failed to complete OAuth connection for ${toolkitInfos[toolkitSlug]?.name || toolkitSlug}. Please try again.`
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
              <h1 className="text-xl font-semibold text-white tracking-tight">AI Agent Builder</h1>
              <p className="text-sm text-gray-400">Build intelligent agents with custom interfaces</p>
            </div>
          </div>
        </div>

        {/* Chat Messages - Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-violet-500/20'
                    : message.type === 'system'
                    ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20 backdrop-blur-sm'
                    : message.type === 'connection-status'
                    ? 'bg-gray-900/60 text-gray-100 border border-gray-700/50 backdrop-blur-sm'
                    : 'bg-gray-900/60 text-gray-100 border border-gray-700/50 backdrop-blur-sm'
                }`}>
                  <div className="text-[15px] leading-relaxed font-medium prose prose-invert prose-sm max-w-none [&>*]:mb-2 [&>*:last-child]:mb-0 [&_strong]:text-current [&_code]:bg-black/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_ul]:pl-4 [&_li]:mb-1">
                    <ReactMarkdown 
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-current">{children}</strong>,
                        code: ({ children }) => <code className="bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono text-current">{children}</code>,
                        ul: ({ children }) => <ul className="pl-4 space-y-1">{children}</ul>,
                        li: ({ children }) => <li className="text-current">{children}</li>
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Connection Status Buttons */}
                  {message.type === 'connection-status' && message.data?.toolkits && (
                    <div className="mt-5 space-y-3">
                      {Object.entries(message.data.toolkits).map(([toolkitSlug, status]: [string, any]) => (
                        <div key={toolkitSlug} className="flex items-center justify-between bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">
                              {toolkitInfos[toolkitSlug]?.name || toolkitSlug}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${
                                status?.isComposioManaged 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {status?.isComposioManaged ? '●' : '◐'} {status?.isComposioManaged ? 'Managed' : 'Custom'}
                              </span>
                              <span className="text-gray-500">•</span>
                              <span>{status?.authScheme || 'unknown'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => connectToolkit(toolkitSlug)}
                            disabled={status?.status === 'connecting'}
                            className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                              status?.connected 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-default'
                                : status?.status === 'connecting'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20 cursor-not-allowed'
                                : 'bg-violet-500/15 text-violet-400 border border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/30'
                            }`}
                          >
                            {status?.connected 
                              ? '✓ Connected' 
                              : status?.status === 'connecting'
                              ? '⏳ Connecting...'
                              : 'Connect'
                            }
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
                  <span className="text-[15px] font-medium">Generating your agent...</span>
                </div>
              </div>
            )}
            
            {/* Auto scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

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
              <h2 className="text-lg font-semibold text-white tracking-tight">Live Preview</h2>
              <p className="text-sm text-gray-400">Your generated agent interface</p>
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
                <h3 className="text-lg font-semibold text-white mb-2">Ready to build</h3>
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

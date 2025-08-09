import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Composio } from '@composio/core';
import { VercelProvider } from "@composio/vercel";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const composioApiKey = process.env.COMPOSIO_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { agentIdea } = await req.json();

    if (!agentIdea) {
      return NextResponse.json({ error: 'Agent idea is required' }, { status: 400 });
    }

    // Initialize Composio for tool discovery
    if (!composioApiKey) {
      return NextResponse.json(
        {
          error:
            "Composio API key not configured. Please set COMPOSIO_API_KEY in your environment.",
        },
        { status: 500 }
      );
    }
    
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider()
    });

    // Step 1: Generate use case from agent idea
    const useCasePrompt = `
Based on this agent idea: "${agentIdea}"

Generate a concise, specific use case description that captures the core functionality and required actions. 
Focus on what the agent needs to DO, not what it is. Use action verbs and be specific about the domain.

Examples:
- Agent idea: "Customer support agent that handles refunds and tracks orders"
  Use case: "customer support automation and order management"

- Agent idea: "Social media manager that schedules posts on twitter"  
  Use case: "social media content scheduling and analytics"

- Agent idea: "Email marketing assistant for campaigns"
  Use case: "email campaign management and automation"

Generate only the use case description (2-4 words), no explanations.
    `;

    // Check for OpenAI API key
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const useCaseResult = await generateText({
      model: openai('gpt-4.1'),
      prompt: useCasePrompt,
      maxTokens: 100,
    });

    const useCase = useCaseResult.text.trim();

    // Step 2: Discover required tools using COMPOSIO_SEARCH_TOOLS
    let discoveredTools: string[] = ['COMPOSIO']; // Default fallback tools
    
    try {
      // Get the search tools first
      const searchTools = await composio.tools.get('default', {
        tools: ['COMPOSIO_SEARCH_TOOLS']
      });
      // Use AI to determine likely tools based on use case
      const toolSelectionPrompt = `
Based on this use case: "${useCase}"

Use only the search tools to find the most relevant tools for the use case and return the tool names.

Return only a comma-separated list of 3-5 most relevant tool names that are from the search tool outputs. No explanations.
      `;
      const toolSelectionResult = await generateText({
        model: openai('gpt-4.1'),
        prompt: toolSelectionPrompt,
        tools: searchTools,
        maxSteps: 5,
      });

      const suggestedTools = toolSelectionResult.text
        .split(',')
        .map(tool => tool.trim())
        .filter(tool => tool.length > 0);

      discoveredTools = [...new Set([...suggestedTools])];
      
    } catch (error: any) {
      console.warn('Tool discovery failed, using defaults:', error?.message || error);
    }

    // Step 3: Generate system prompt for the agent
    const systemPromptResult = await generateText({
      model: openai('gpt-4.1'),
      prompt: `Create a focused system prompt for an AI agent with this idea: "${agentIdea}"

The agent will have access to these Composio tools: ${discoveredTools.join(', ')}

Requirements:
- Be specific about the agent's role and capabilities
- Explain what the agent can do with the available tools
- Mention specific use cases and workflows
- Keep it concise but comprehensive (2-3 sentences)
- Focus on helping the user effectively
- Don't mention technical details about the tools, focus on what the user can accomplish

Example format: "You are a [role] agent that helps users [main purpose]. You can [specific capabilities using tools] and [other capabilities]. Ask me what you'd like to accomplish and I'll help you get it done."

Generate only the system prompt text.`,
      maxTokens: 400,
    });

    // Step 4: Generate frontend code with working JavaScript
    const frontendPrompt = `
Create a complete, single-file HTML page for a modern AI chat interface based on this idea: "${agentIdea}"

**Non-Negotiable Requirements:**

1.  **HTML Structure:**
    *   The \`<body>\` must have \`display: flex; flex-direction: column; height: 100vh;\` to create a full-height container.
    *   A header \`<div class="chat-header">\` displaying the agent's name: "${agentIdea}".
    *   A message container \`<div class="chat-messages" id="chatMessages">\`.
    *   An initial message from the assistant welcoming the user.
    *   A message input form container \`<div class="chat-input-container">\`.
    *   The form must contain a \`<textarea id="chatInput">\` and a send \`<button id="sendButton">\`.

2.  **Styling (Inline CSS):**
    *   Create a modern, clean, responsive chat interface. Use a dark theme with a professional color palette.
    *   The styling **must** be fully contained within a \`<style>\` tag in the \`<head>\`. Do not use external stylesheets.
    *   **Layout CSS is critical:**
        *   \`body { display: flex; flex-direction: column; height: 100vh; margin: 0; }\`
        *   \`.chat-messages { flex-grow: 1; overflow-y: auto; padding: 20px; }\`
        *   \`.chat-input-container { display: flex; padding: 10px; border-top: 1px solid #333; }\`
    *   Include styles for user messages (e.g., blue background, right-aligned) and agent messages (e.g., gray background, left-aligned).
    *   Style the loading indicator and error messages to be clear and visually distinct.
    *   The textarea should be responsive (\`width: 100%\`) and auto-resize based on content.

3.  **JavaScript Logic (Inline Script):**
    *   All JavaScript must be within a single \`<script>\` tag at the end of the \`<body>\`.
    *   Define a constant for user ID only (API keys must NOT be exposed in the browser):
        \`\`\`javascript
        const USER_ID = __USER_ID__;
        \`\`\`
    *   The script must get the following data, which is already embedded in this prompt:
        *   \`const DISCOVERED_TOOLS = ${JSON.stringify(discoveredTools)};\`
        *   \`const SYSTEM_PROMPT = ${JSON.stringify(systemPromptResult.text.replace(/"/g, '\\"'))};\`
    *   **The send button's \`onclick\` event must trigger a \`sendMessage\` function with the following behavior:**
        1.  It must read the text from the \`chatInput\` textarea.
        2.  It must display the user's message on the screen.
        3.  It must show a loading indicator while waiting for the response.
        4.  Inside the \`sendMessage\` function, it must define the base URL for API calls: \`const API_BASE_URL = window.location.origin;\`.
        5.  **It must send a POST request to \`\${API_BASE_URL}/api/execute-generated-agent\`**.
        6.  The request body **MUST** be a JSON object with this exact structure (do NOT include API keys):
            \`\`\`json
            {
              "prompt": "The user's message",
              "discoveredTools": DISCOVERED_TOOLS,
              "systemPrompt": SYSTEM_PROMPT,
              "userId": USER_ID
            }
            \`\`\`
        7.  It must handle the JSON response from the API, displaying either the agent's \`response\` text or the \`error\` and \`details\` if the call fails.
        8.  It must remove the loading indicator after the response is received.

Generate only the complete, single HTML file. Do not wrap it in markdown or provide any explanation.
    `;

    const frontendResult = await generateText({
      model: openai('gpt-4.1'),
      prompt: frontendPrompt,
      maxTokens: 4000,
    });

    // Step 5: Generate backend code using the template structure
    const backendTemplate = `
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  try {
    const { composioApiKey, prompt, userId = "default" } = await req.json();

    if (!composioApiKey || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Composio
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider(),
    });

    // Get tools for this agent - ${agentIdea}
    const tools = await composio.tools.get(userId, {
      tools: [${discoveredTools.map(tool => `"${tool.toUpperCase()}"`).join(', ')}]
    });

    // System prompt for ${agentIdea}
    const systemPrompt = \`${systemPromptResult.text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;

    // Generate response using the agent
    const { text } = await generateText({
      model: openai("gpt-4.1"),
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      tools,
      maxSteps: 5,
    });

    console.log('Agent response:', text);
    
    return NextResponse.json({ 
      response: text,
      success: true,
      metadata: {
        toolsUsed: [${discoveredTools.map(tool => `"${tool}"`).join(', ')}],
        useCase: "${useCase}",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute agent', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500 }
    );
  }
}`;

    const backendResult = {
      text: backendTemplate
    };

    return NextResponse.json({
      frontend: frontendResult.text,
      backend: backendResult.text,
      discoveredTools: discoveredTools,
      useCase: useCase,
      systemPrompt: systemPromptResult.text,
      metadata: {
        agentIdea,
        toolCount: discoveredTools.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating agent:', error);
    return NextResponse.json(
      { error: 'Failed to generate agent', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

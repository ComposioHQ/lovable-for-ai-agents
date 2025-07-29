import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Composio } from '@composio/core';
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  try {
    const { agentIdea } = await req.json();

    if (!agentIdea) {
      return NextResponse.json({ error: 'Agent idea is required' }, { status: 400 });
    }

    // Initialize Composio for tool discovery
    const composioApiKey = process.env.COMPOSIO_API_KEY;
    if (!composioApiKey) {
      return NextResponse.json({ error: 'Composio API key not configured' }, { status: 500 });
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
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
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
    } catch (error) {
      console.warn('Tool discovery failed, using defaults:', error);
    }

    // Step 3: Generate system prompt for the agent
    const systemPromptResult = await generateText({
      model: openai('gpt-4o-mini'),
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
Create a complete HTML page for an AI agent interface based on this idea: "${agentIdea}"

Requirements:
1. Create a modern, clean HTML page with inline CSS and JavaScript
2. Must include these input fields:
   - LLM API Key (password input with id="llmApiKey")
   - Composio API Key (password input with id="composioApiKey") 
   - Prompt (textarea with id="prompt" and placeholder specific to the agent's purpose)
3. Include a "Run Agent" button that actually calls the API
4. Include a response area (div with id="response") to display agent output
5. Add JavaScript that makes real API calls to /api/execute-generated-agent
6. Handle loading states, errors, and success responses
7. Use these discovered tools: ${discoveredTools.join(', ')}
8. Use this system prompt: "${systemPromptResult.text.replace(/"/g, '\\"')}"
9. Make it responsive and user-friendly with modern CSS
10. Add proper form validation
11. Add a header with the agent's name: "${agentIdea}"

The JavaScript should:
- Collect form values (llmApiKey, composioApiKey, prompt)
- Make POST request to /api/execute-generated-agent
- Pass discoveredTools: ${JSON.stringify(discoveredTools)}
- Pass systemPrompt: "${systemPromptResult.text.replace(/"/g, '\\"')}"
- Show loading state while request is in progress
- Display response or error in the response area
- Handle connection required errors with helpful messages
- Show specific error types (connection, tool errors, etc.) with appropriate styling

Generate only the complete HTML code with inline CSS and JavaScript. No explanations.
    `;

    const frontendResult = await generateText({
      model: openai('gpt-4o-mini'),
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
    const { llmApiKey, composioApiKey, prompt, userId = "default" } = await req.json();

    if (!llmApiKey || !composioApiKey || !prompt) {
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
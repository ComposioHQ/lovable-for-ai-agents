import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  console.log('🔍 [DEBUG] execute-generated-agent API called');
  
  try {
    const body = await req.json();
    console.log('🔍 [DEBUG] Request body received:', {
      hasLlmApiKey: !!body.llmApiKey,
      hasComposioApiKey: !!body.composioApiKey,
      hasPrompt: !!body.prompt,
      discoveredTools: body.discoveredTools,
      systemPrompt: body.systemPrompt,
      userId: body.userId,
      authConfigsKeys: Object.keys(body.authConfigs || {})
    });

    const { llmApiKey, composioApiKey, prompt, discoveredTools, systemPrompt, userId = "default", authConfigs = {} } = body;

    if (!llmApiKey || !composioApiKey || !prompt) {
      console.log('❌ [DEBUG] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!discoveredTools || discoveredTools.length === 0) {
      console.log('❌ [DEBUG] No tools discovered');
      return NextResponse.json({ error: 'No tools discovered for this agent' }, { status: 400 });
    }

    console.log('🔍 [DEBUG] Initializing Composio with API key');
    
    // Initialize Composio
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider(),
    });

    console.log('🔍 [DEBUG] Getting tools for discovered tools:', discoveredTools);
    
    // Get tools for this agent using the discovered tools
    let tools;
    try {
      console.log('🔍 [DEBUG] Attempting to load tools for user:', userId);
      tools = await composio.tools.get(userId, {
        tools: discoveredTools.map((tool: string) => tool.toUpperCase())
      });
      console.log('✅ [DEBUG] Tools loaded successfully:', tools.length, 'tools');
    } catch (toolsError: any) {
      console.log('❌ [DEBUG] Tools loading error:', toolsError.message);
      console.log('❌ [DEBUG] Error details:', toolsError);
      
      // If tools fail to load due to missing connections, provide helpful error
      if (toolsError.message?.includes('No connected accounts')) {
        console.log('❌ [DEBUG] No connected accounts error detected');
        return NextResponse.json({
          error: 'Connection Required',
          details: 'Some tools require connected accounts. Please connect the required services first.',
          success: false,
          requiresConnection: true,
          authConfigs: authConfigs
        }, { status: 400 });
      }
      throw toolsError;
    }

    // Use the provided system prompt
    const finalSystemPrompt = systemPrompt || "You are a helpful AI agent. Use the available tools to assist the user.";
    
    console.log('🔍 [DEBUG] Using system prompt:', finalSystemPrompt);

    // Generate response using the agent
    let text: string;
    
    console.log('🔍 [DEBUG] Starting AI generation with prompt:', prompt);
    
    try {
      console.log('🔍 [DEBUG] Calling OpenAI with tools count:', tools.length);
      
      const result = await generateText({
        model: openai("gpt-4.1"),
        messages: [
          {
            role: "system",
            content: finalSystemPrompt
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        tools,
        maxSteps: 5,
      });
      
      text = result.text;
      console.log('✅ [DEBUG] AI generation successful, response length:', text.length);
    } catch (toolError: any) {
      console.log('❌ [DEBUG] AI generation error:', toolError.name, toolError.message);
      console.log('❌ [DEBUG] Error details:', toolError);
      // Handle tool execution errors, especially "no connected accounts"
      if (toolError.name === 'AI_ToolExecutionError' || toolError.message?.includes('No connected accounts found')) {
        const toolName = toolError.toolName || 'Unknown tool';
        const appName = toolName.split('_')[0]?.toLowerCase() || 'the required service';
        
        return NextResponse.json({
          error: 'Account Connection Required',
          details: `The agent tried to use ${toolName} but no connected accounts were found. Please connect your ${appName} account first.`,
          success: false,
          requiresConnection: true,
          toolName: toolName,
          appName: appName,
          suggestion: `Go to the Connections tab and connect your ${appName} account to enable this functionality.`
        }, { status: 400 });
      }
      
      // Handle other tool execution errors
      if (toolError.name === 'AI_ToolExecutionError') {
        return NextResponse.json({
          error: 'Tool Execution Failed',
          details: `Failed to execute ${toolError.toolName || 'tool'}: ${toolError.message}`,
          success: false,
          toolError: true,
          toolName: toolError.toolName
        }, { status: 400 });
      }
      
      // Re-throw other errors to be handled by the outer catch block
      throw toolError;
    }

    console.log('✅ [DEBUG] Generated agent response:', text);
    
    return NextResponse.json({ 
      response: text,
      success: true,
      metadata: {
        toolsUsed: discoveredTools,
        systemPrompt: finalSystemPrompt,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Generated agent execution error:', error);
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to execute generated agent', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500 }
    );
  }
} 
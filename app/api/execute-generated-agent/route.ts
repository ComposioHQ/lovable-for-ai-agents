import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

// (Rate limiting removed per user request)

export async function POST(req: NextRequest) {
  
  try {
    const body = await req.json();

    const {
      prompt,
      discoveredTools,
      systemPrompt,
      userId = "default",
      authConfigs = {},
    } = body;
    const composioApiKey = process.env.COMPOSIO_API_KEY;

    if (!composioApiKey || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!discoveredTools || discoveredTools.length === 0) {

      return NextResponse.json({ error: 'No tools discovered for this agent' }, { status: 400 });
    }


    
    // Initialize Composio
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider(),
    });

    // Get tools for this agent using the discovered tools
    let tools;
    try {
      
      tools = await composio.tools.get(userId, {
        tools: discoveredTools.map((tool: string) => tool.toUpperCase())
      });
    } catch (toolsError: any) {
      console.error('Tools loading error:', toolsError.message);
      
      // If tools fail to load due to missing connections, provide helpful error
      if (toolsError.message?.includes('No connected accounts')) {
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
    


    // Generate response using the agent
    let text: string;
    

    
    try {
  
      
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

    } catch (toolError: any) {
      console.error('AI generation error:', toolError.message);
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

    
    return NextResponse.json({ 
      response: text,
      success: true,
      metadata: {
        toolsUsed: discoveredTools,
        systemPrompt: finalSystemPrompt,
        timestamp: new Date().toISOString()
      }
    }, { headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }});

  } catch (error) {
    console.error('❌ [DEBUG] Generated agent execution error:', error);
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to execute generated agent', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500, headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }}
    );
  }
} 

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}
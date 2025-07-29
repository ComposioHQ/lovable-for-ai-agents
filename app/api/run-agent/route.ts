import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Composio } from '@composio/core';
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  try {
    const { llmApiKey, composioApiKey, prompt, agentCode } = await req.json();

    if (!llmApiKey || !composioApiKey || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Composio with the provided API key
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider()
    });

    // Get available tools (you can customize this based on the agent type)
    const tools = await composio.tools.get('default', {
      tools: [
        'COMPOSIO'
      ]
    });

    // Create OpenAI instance with provided API key
    const openai = createOpenAI({
      apiKey: llmApiKey
    });
    const model = openai('gpt-4.1');

    // Stream the response
    const result = await streamText({
      model: model,
      tools: tools,
      maxSteps: 10,
      messages: [
        {
          role: 'system',
          content: `You are an AI agent. Your task is to help the user with their request. You have access to various tools to assist you. Be helpful, accurate, and concise in your responses.`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Return streaming response
    return new Response(result.toDataStreamResponse().body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Error running agent:', error);
    
    // Return error as a stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
        controller.enqueue(encoder.encode(errorMessage));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
} 
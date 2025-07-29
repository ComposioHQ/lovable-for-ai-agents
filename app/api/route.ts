import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { Composio } from '@composio/core'
import { VercelProvider } from "@composio/vercel";
import { openai } from "@ai-sdk/openai";

export async function POST(req: NextRequest) {
    const { messages } = await req.json();
    const composio = new Composio({
        apiKey: process.env.COMPOSIO_API_KEY,
        provider: new VercelProvider()
    })    
    
    const tools = await composio.tools.get('default',{
        toolkits: [
            'COMPOSIO'
        ]
    })

    const response = await streamText({
        model: openai('gpt-4.1'),
        tools: tools,   
        maxSteps: 20,
        messages: messages
    })

    return response.toDataStreamResponse()
}
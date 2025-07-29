import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const toolkitSlug = searchParams.get('slug');
    const composioApiKey = searchParams.get('composioApiKey');

    if (!toolkitSlug || !composioApiKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get toolkit information from Composio API
    const response = await fetch(`https://backend.composio.dev/api/v3/toolkits/${toolkitSlug}`, {
      method: 'GET',
      headers: {
        'x-api-key': composioApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Composio API error: ${response.status} - ${errorText}`);
    }

    const toolkitData = await response.json();

    return NextResponse.json({
      success: true,
      toolkit: toolkitData
    });

  } catch (error) {
    console.error('Error fetching toolkit info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch toolkit information', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500 }
    );
  }
} 
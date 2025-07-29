import { NextRequest, NextResponse } from "next/server";
import { Composio } from '@composio/core';
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  try {
    const { composioApiKey, requiredApps } = await req.json();

    if (!composioApiKey) {
      return NextResponse.json({ error: 'Composio API key is required' }, { status: 400 });
    }

    if (!requiredApps || !Array.isArray(requiredApps)) {
      return NextResponse.json({ error: 'Required apps list is needed' }, { status: 400 });
    }

    // Initialize Composio with the provided API key
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider()
    });

    // Get integration status for each required app
    const connectionStatuses = [];
    
    for (const app of requiredApps) {
      try {
        // For now, mark all as not connected - user will need to connect manually
        // This can be enhanced once we have the correct Composio integration API
        connectionStatuses.push({
          app: app,
          connected: false,
          integrationId: null,
          status: 'not_connected',
          requiresAuth: true
        });
      } catch (error) {
        connectionStatuses.push({
          app: app,
          connected: false,
          error: `Failed to check ${app} integration`,
          status: 'error'
        });
      }
    }

    return NextResponse.json({
      connections: connectionStatuses,
      totalApps: requiredApps.length,
      connectedApps: connectionStatuses.filter(c => c.connected).length
    });

  } catch (error) {
    console.error('Error checking app connections:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check app connections', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const composioApiKey = searchParams.get('composioApiKey');
    const app = searchParams.get('app');

    if (!composioApiKey || !app) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider()
    });

    // Generate connection URL for the specific app
    // For now, return a placeholder URL - this will be enhanced with proper Composio integration
    const baseUrl = process.env.API_BASE_URL;
    const connectionUrl = `https://app.composio.dev/apps/${app}/connect?redirect_uri=${encodeURIComponent(baseUrl + '/connections/callback')}`;

    return NextResponse.json({
      connectionUrl: connectionUrl,
      integrationId: `temp_${app}_${Date.now()}`,
      app: app,
      message: 'Please visit the Composio dashboard to complete the integration'
    });

  } catch (error) {
    console.error('Error creating connection URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create connection URL', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 
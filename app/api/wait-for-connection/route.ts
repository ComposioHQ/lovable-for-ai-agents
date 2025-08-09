import { NextRequest, NextResponse } from "next/server";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  try {
    const {
      connectionId,
      userId = "default",
      timeout = 300000,
    } = await req.json();
    const composioApiKey = process.env.COMPOSIO_API_KEY;

    if (!composioApiKey || !connectionId) {
      return NextResponse.json(
        {
          error: composioApiKey
            ? "Missing required fields: connectionId"
            : "Composio API key not configured on the server",
        },
        { status: 400 }
      );
    }

    // Initialize Composio SDK
    const composio = new Composio({
      apiKey: composioApiKey,
      provider: new VercelProvider()
    });

    console.log(`Waiting for connection ${connectionId} to be established...`);

    try {
      // Wait for the connection to be established
      // This will poll Composio until the OAuth flow is completed
      const connectedAccount = await composio.connectedAccounts.get(connectionId);
      
      // If it's already active, return immediately
      if (connectedAccount.status === 'ACTIVE') {
        return NextResponse.json({
          success: true,
          status: 'ACTIVE',
          connectedAccount: connectedAccount,
          message: 'Connection established successfully'
        });
      }

      // Otherwise, we need to implement a polling mechanism
      // since the JS SDK doesn't have a direct wait_for_connection method like Python
      const startTime = Date.now();
      const pollInterval = 2000; // Poll every 2 seconds
      
      while (Date.now() - startTime < timeout) {
        const currentConnection = await composio.connectedAccounts.get(connectionId);
        
        console.log(`Connection ${connectionId} status: ${currentConnection.status}`);
        
        if (currentConnection.status === 'ACTIVE') {
          return NextResponse.json({
            success: true,
            status: 'ACTIVE',
            connectedAccount: currentConnection,
            message: 'Connection established successfully'
          });
        }
        
        if (currentConnection.status === 'EXPIRED' || currentConnection.status === 'INACTIVE') {
          return NextResponse.json({
            success: false,
            status: currentConnection.status,
            message: `Connection ${currentConnection.status.toLowerCase()}`,
            connectedAccount: currentConnection
          });
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      // Timeout reached
      return NextResponse.json({
        success: false,
        status: 'TIMEOUT',
        message: 'Connection establishment timed out',
        timeout: timeout
      });

    } catch (connectionError: any) {
      console.error('Error waiting for connection:', connectionError);
      
      // Check if it's a connection not found error
      if (connectionError.message?.includes('not found')) {
        return NextResponse.json({
          success: false,
          status: 'NOT_FOUND',
          message: 'Connection not found. It may have expired.',
          details: connectionError.message
        }, { status: 404 });
      }
      
      throw connectionError;
    }

  } catch (error) {
    console.error('Error in wait-for-connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to wait for connection', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500 }
    );
  }
}

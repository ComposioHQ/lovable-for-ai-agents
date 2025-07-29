import { NextRequest, NextResponse } from "next/server";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

export async function POST(req: NextRequest) {
  try {
    const { composioApiKey, toolkitSlug, authType, credentials, userId = "default" } = await req.json();

    if (!composioApiKey || !toolkitSlug || !authType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Get toolkit information to understand auth requirements
    const toolkitResponse = await fetch(`https://backend.composio.dev/api/v3/toolkits/${toolkitSlug}`, {
      method: 'GET',
      headers: {
        'x-api-key': composioApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!toolkitResponse.ok) {
      throw new Error(`Failed to get toolkit info: ${toolkitResponse.status}`);
    }

    const toolkitData = await toolkitResponse.json();
    
    // Debug logging
    console.log(`Toolkit ${toolkitSlug} data:`, {
      name: toolkitData.name,
      composio_managed_auth_schemes: toolkitData.composio_managed_auth_schemes,
      auth_config_details: toolkitData.auth_config_details,
      authType: authType
    });
    
         // Handle case-insensitive auth type checking
     const managedSchemes = toolkitData.composio_managed_auth_schemes || [];
     const managedSchemesLower = managedSchemes.map((s: string) => s.toLowerCase());
    const authTypeLower = authType.toLowerCase();
    
    const isComposioManaged = managedSchemesLower.includes(authTypeLower) || 
                             managedSchemesLower.includes(authTypeLower.replace('_', ''));

    if (isComposioManaged && (authTypeLower === 'oauth2' || authTypeLower === 'oauth')) {
      // Initialize Composio SDK
      const composio = new Composio({
        apiKey: composioApiKey,
        provider: new VercelProvider()
      });

      try {
        // Step 2: Create auth config using Composio managed auth (recommended approach)
        const authConfig = await composio.authConfigs.create(toolkitSlug.toUpperCase(), {
          name: `${toolkitData.name} OAuth Config`,
          type: "use_composio_managed_auth", // This is the key difference!
        });

        console.log('Created auth config:', authConfig);

        // Step 3: Initiate OAuth connection using SDK
        const connRequest = await composio.connectedAccounts.initiate(
          userId, 
          authConfig.id
        );

        console.log('Connection request:', connRequest);

        return NextResponse.json({
          success: true,
          authType: 'oauth2',
          redirectUrl: connRequest.redirectUrl,
          connectionId: connRequest.id,
          authConfigId: authConfig.id,
          message: 'OAuth2 connection initiated. Please complete authorization.'
        });

      } catch (sdkError: any) {
        console.error('SDK Error:', sdkError);
        throw new Error(`Composio SDK error: ${sdkError.message}`);
      }

    } else if (isComposioManaged && (authTypeLower === 'api_key' || authTypeLower === 'bearer_token' || authTypeLower === 'apikey')) {
      // Initialize Composio SDK
      const composio = new Composio({
        apiKey: composioApiKey,
        provider: new VercelProvider()
      });

      try {
        // For API keys, we can create auth config and connect directly
        // First create the auth config
        const authConfig = await composio.authConfigs.create(toolkitSlug.toUpperCase(), {
          name: `${toolkitData.name} API Key Config`,
          type: "use_custom_auth",
          authScheme: authTypeLower === 'bearer_token' ? 'BEARER_TOKEN' : 'API_KEY',
          credentials: {
            ...(authTypeLower === 'bearer_token' 
              ? { token: credentials?.bearerToken || credentials?.apiKey }
              : { api_key: credentials?.apiKey }
            )
          }
        });

        console.log('Created API key auth config:', authConfig);

        // Then initiate connection directly (no redirect needed for API keys)
        const connRequest = await composio.connectedAccounts.initiate(userId, authConfig.id);

        console.log('API key connection request:', connRequest);

        return NextResponse.json({
          success: true,
          authType: authType,
          connectionId: connRequest.id,
          authConfigId: authConfig.id,
          message: `${toolkitSlug} connected successfully with ${authType}`
        });

      } catch (sdkError: any) {
        console.error('SDK Error for API key:', sdkError);
        throw new Error(`Composio SDK error: ${sdkError.message}`);
      }

    } else {
      // Not composio managed - requires additional setup
      return NextResponse.json({
        success: false,
        needsCustomSetup: true,
        toolkit: toolkitData,
        message: `${toolkitData.name} requires custom auth configuration. Please set up your own app credentials in the Composio dashboard.`,
        dashboardUrl: `https://app.composio.dev/apps/${toolkitSlug}`
      });
    }

  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create connection', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, 
      { status: 500 }
    );
  }
}
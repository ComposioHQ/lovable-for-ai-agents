import { NextRequest, NextResponse } from "next/server";
import { Composio, AuthScheme } from "@composio/core";
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

    // Helper function to get or create auth config for API key authentication
    const getOrCreateAuthConfig = async (toolkitSlug: string, authType: string, isComposioManaged: boolean) => {
      const composioInstance = new Composio({
        apiKey: composioApiKey,
        provider: new VercelProvider()
      });
      
      try {
        // First, list existing auth configs to see if one already exists
        const existingConfigs = await composioInstance.authConfigs.list();
        console.log('Existing auth configs:', existingConfigs.items.map((config: any) => ({ 
          id: config.id, 
          name: config.name, 
          toolkit: config.toolkit,
          type: config.type 
        })));
        
        // Look for existing auth config for this toolkit and auth type
        const existingConfig = existingConfigs.items.find((config: any) => {
          const toolkitMatch = config.toolkit?.toLowerCase() === toolkitSlug.toLowerCase();
          const typeMatch = isComposioManaged ? 
            config.type === "use_composio_managed_auth" : 
            config.type === "use_custom_auth";
          return toolkitMatch && typeMatch;
        });
        
        if (existingConfig) {
          console.log(`Found existing auth config for ${toolkitSlug}:`, existingConfig.id);
          return existingConfig.id;
        }
        
        // No existing config found, create a new one
        console.log(`Creating new auth config for ${toolkitSlug}, managed: ${isComposioManaged}`);
        
        if (isComposioManaged) {
          // For Composio-managed auth, create using managed auth
          const authConfig = await composioInstance.authConfigs.create(toolkitSlug.toUpperCase(), {
            name: `${toolkitData.name} Managed Config`,
            type: "use_composio_managed_auth",
          });
          return authConfig.id;
        } else {
          // For custom auth, create with appropriate auth scheme
          const authScheme = authType.toLowerCase() === 'bearer_token' ? 'BEARER_TOKEN' : 
                           authType.toLowerCase() === 'oauth2' ? 'OAUTH2' : 'API_KEY';
          
          const authConfig = await composioInstance.authConfigs.create(toolkitSlug.toUpperCase(), {
            name: `${toolkitData.name} Custom Config`,
            type: "use_custom_auth",
            authScheme: authScheme,
            credentials: {} // Empty initially, filled during connection
          });
          return authConfig.id;
        }
      } catch (error: any) {
        console.error('Error in getOrCreateAuthConfig:', error);
        throw new Error(`Failed to get or create auth config: ${error.message}`);
      }
    };
    
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
        // Step 2: Get or create auth config using the helper function
        const authConfigId = await getOrCreateAuthConfig(toolkitSlug, authType, true);
        
        console.log(`Using auth config ID for OAuth2 ${toolkitSlug}:`, authConfigId);

        // Step 3: Initiate OAuth connection using SDK
        const connRequest = await composio.connectedAccounts.initiate(
          userId, 
          authConfigId
        );

        console.log('Connection request:', connRequest);

        return NextResponse.json({
          success: true,
          authType: 'oauth2',
          redirectUrl: connRequest.redirectUrl,
          connectionId: connRequest.id,
          authConfigId: authConfigId,
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
        // Get or create auth config for this toolkit
        const authConfigId = await getOrCreateAuthConfig(toolkitSlug, authType, isComposioManaged);
        
        console.log(`Using auth config ID for ${toolkitSlug}:`, authConfigId);

        // Use AuthScheme.APIKey() for proper API key connection
        const connRequest = await composio.connectedAccounts.initiate(userId, authConfigId, {
          config: AuthScheme.APIKey({
            api_key: credentials?.apiKey
          })
        });

        console.log('API key connection request:', connRequest);

        return NextResponse.json({
          success: true,
          authType: authType,
          connectionId: connRequest.id,
          authConfigId: authConfigId,
          message: `${toolkitSlug} connected successfully with ${authType}`
        });

      } catch (sdkError: any) {
        console.error('SDK Error for API key:', sdkError);
        throw new Error(`Composio SDK error: ${sdkError.message}`);
      }

    } else if (!isComposioManaged && (authTypeLower === 'oauth2' || authTypeLower === 'oauth')) {
      // Non-Composio managed OAuth2 - create custom auth config with client credentials
      const composio = new Composio({
        apiKey: composioApiKey,
        provider: new VercelProvider()
      });

      try {
        if (!credentials?.clientId || !credentials?.clientSecret) {
          return NextResponse.json(
            { 
              error: 'Client ID and Client Secret are required for OAuth2 authentication',
              success: false
            },
            { status: 400 }
          );
        }

        // Use standard OAuth2 field names
        const credentialsObj = {
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret
        };

        console.log(`Using OAuth2 credentials for ${toolkitSlug}:`, credentialsObj);

        // Create custom auth config with correct field names
        const authConfig = await composio.authConfigs.create(toolkitSlug.toUpperCase(), {
          name: `${toolkitData.name} Custom OAuth Config`,
          type: "use_custom_auth",
          authScheme: 'OAUTH2',
          credentials: credentialsObj
        });

        console.log('Created custom OAuth2 auth config:', authConfig);

        // Initiate OAuth connection
        const connRequest = await composio.connectedAccounts.initiate(userId, authConfig.id);

        console.log('Custom OAuth2 connection request:', connRequest);

        return NextResponse.json({
          success: true,
          authType: 'oauth2',
          redirectUrl: connRequest.redirectUrl,
          connectionId: connRequest.id,
          authConfigId: authConfig.id,
          message: 'Custom OAuth2 connection initiated. Please complete authorization.'
        });

      } catch (sdkError: any) {
        console.error('SDK Error for custom OAuth2:', sdkError);
        return NextResponse.json(
          { 
            error: `Failed to create custom OAuth2 connection: ${sdkError.message}`,
            success: false
          },
          { status: 500 }
        );
      }

    } else if (!isComposioManaged && (authTypeLower === 'api_key' || authTypeLower === 'bearer_token' || authTypeLower === 'apikey')) {
      // Non-Composio managed API key - create custom auth config
      const composio = new Composio({
        apiKey: composioApiKey,
        provider: new VercelProvider()
      });

      try {
        if (!credentials?.apiKey) {
          return NextResponse.json(
            { 
              error: 'API Key is required for API key authentication',
              success: false
            },
            { status: 400 }
          );
        }

        // For custom auth, create with appropriate auth scheme
        const authScheme = authType.toLowerCase() === 'bearer_token' ? 'BEARER_TOKEN' : 'API_KEY';
        
        const authConfig = await composio.authConfigs.create(toolkitSlug.toUpperCase(), {
          name: `${toolkitData.name} Custom Config`,
          type: "use_custom_auth",
          authScheme: authScheme,
          credentials: {} // Empty initially, filled during connection
        });
        
        console.log(`Created custom auth config for ${toolkitSlug}:`, authConfig.id);
        
        // Use AuthScheme.APIKey() for proper API key connection
        const connRequest = await composio.connectedAccounts.initiate(userId, authConfig.id, {
          config: AuthScheme.APIKey({
            api_key: credentials.apiKey
          })
        });

        console.log('Custom API key connection request:', connRequest);

        return NextResponse.json({
          success: true,
          authType: authType,
          connectionId: connRequest.id,
          authConfigId: authConfig.id,
          message: `${toolkitSlug} connected successfully with custom ${authType}`
        });

      } catch (sdkError: any) {
        console.error('SDK Error for custom API key:', sdkError);
        return NextResponse.json(
          { 
            error: `Failed to create custom API key connection: ${sdkError.message}`,
            success: false
          },
          { status: 500 }
        );
      }

    } else {
      // Unsupported authentication scheme
      return NextResponse.json({
        success: false,
        error: `Authentication scheme '${authType}' is not supported for ${toolkitData.name}`,
        message: `${toolkitData.name} requires an unsupported authentication method.`
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
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const connectedAccountId = searchParams.get('connectedAccountId');
    const appName = searchParams.get('appName');

    console.log('OAuth callback received:', { status, connectedAccountId, appName });

    // Return a simple HTML page that closes the popup and notifies parent
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Connection ${status === 'success' ? 'Successful' : 'Failed'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        .success { color: #10b981; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="${status === 'success' ? 'success' : 'error'}">
            ${status === 'success' ? '✅ Connection Successful!' : '❌ Connection Failed'}
        </h1>
        <p>
            ${status === 'success' 
                ? `${appName || 'Service'} has been connected successfully.`
                : 'There was an error connecting the service.'
            }
        </p>
        <p><small>You can close this window.</small></p>
    </div>
    
    <script>
        // Notify parent window and close popup
        if (window.opener) {
            window.opener.postMessage({
                type: 'oauth-callback',
                status: '${status}',
                connectedAccountId: '${connectedAccountId}',
                appName: '${appName}'
            }, '*');
        }
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
} 
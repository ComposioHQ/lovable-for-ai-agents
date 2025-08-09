import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    const composioApiKey = process.env.COMPOSIO_API_KEY;

    if (!slug || !composioApiKey) {
      return NextResponse.json(
        {
          error: !slug
            ? "Missing required parameter: slug"
            : "Composio API key not configured on the server",
        },
        { status: 400 }
      );
    }

    // Get toolkit information from Composio API
    const response = await fetch(
      `https://backend.composio.dev/api/v3/toolkits/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": composioApiKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      // Log limited details server-side only
      console.error("Composio API error", { status: response.status });
      return NextResponse.json(
        {
          error: "Failed to fetch toolkit information",
          success: false,
        },
        { status: 502 }
      );
    }

    const toolkitData = await response.json();

    return NextResponse.json({
      success: true,
      toolkit: toolkitData,
    });
  } catch (error) {
    console.error("Error fetching toolkit info:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch toolkit information",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
} 
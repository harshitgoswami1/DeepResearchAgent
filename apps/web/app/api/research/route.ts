import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getBackendUrl(request: NextRequest) {
  const configuredUrl =
    process.env.BACKEND_URL?.trim() ||
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8000";
  }

  return `${request.nextUrl.origin}/backend`;
}

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl(request);

  if (!backendUrl) {
    return NextResponse.json(
      {
        error: "Backend URL is not configured.",
        details:
          "If you are using Vercel Services, make sure the backend service is mounted at `/backend`. Otherwise set the `API_URL` environment variable to your deployed FastAPI backend URL.",
      },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: "The request payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${backendUrl}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const responseText = await response.text();

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not reach the backend.",
        details:
          error instanceof Error
            ? error.message
            : "The request to the backend failed.",
      },
      { status: 502 },
    );
  }
}

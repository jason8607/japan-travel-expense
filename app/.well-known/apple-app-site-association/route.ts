import { NextResponse } from "next/server";

/** iOS Universal Links — enable Associated Domains + set APPLE_TEAM_ID on the host. */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return new NextResponse(null, { status: 404 });
  }

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.com.jasonchen.ryocho`,
          paths: ["/trip/*/join", "/trip/*/invite"],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}

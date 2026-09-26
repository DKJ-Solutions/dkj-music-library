// Kaal statusendpoint om de OAuth-flow te kunnen testen/verifiëren zonder geheimen prijs te
// geven: geeft nooit het access/refresh token zelf terug, alleen óf en tot wanneer de verbinding
// geldig is.
import { NextResponse } from "next/server";
import { readTokens } from "@/lib/spotify/tokenStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tokens = readTokens();
  if (!tokens) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    scope: tokens.scope,
    expiresAt: new Date(tokens.expiresAt).toISOString(),
  });
}

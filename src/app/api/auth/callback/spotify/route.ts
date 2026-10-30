// Stap 2 van de Authorization Code Flow: Spotify stuurt de gebruiker hier terug naartoe met
// ?code=...&state=.... Wisselt de code server-side in voor een token-paar (POST naar het
// token-endpoint met Authorization: Basic base64(client_id:client_secret)) en slaat ze op in de
// lokale token-store.
//
// LET OP: dit pad (/api/auth/callback/spotify) moet EXACT overeenkomen met de redirect-URI die
// in het Spotify Developer Dashboard is geregistreerd
// (http://127.0.0.1:3000/api/auth/callback/spotify -- zie src/lib/spotify/config.ts).
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "spotify_oauth_state";

function redirectToStatusPage(request: NextRequest, query: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/spotify?${query}`, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (error) {
    return redirectToStatusPage(request, `error=${encodeURIComponent(error)}`);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    // Ontbrekende/niet-matchende state wijst op een CSRF-poging of een verlopen/dubbel gebruikte
    // login-poging (de cookie leeft maar 10 minuten) -- in beide gevallen niet inwisselen.
    return redirectToStatusPage(request, "error=state_mismatch");
  }

  try {
    await exchangeCodeForTokens(code);
  } catch (err) {
    console.error("[api/auth/callback/spotify] token-exchange mislukt:", err);
    return redirectToStatusPage(request, "error=token_exchange_failed");
  }

  return redirectToStatusPage(request, "connected=1");
}

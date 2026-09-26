// Stap 1 van de Authorization Code Flow: redirect naar Spotify's authorize-endpoint. Server-side,
// géén PKCE -- het client_secret komt pas in de callback-route aan bod (zie het dossier, §1).
//
// STAP 0, EEN HOP ERVOOR: deze route zet zichzelf eerst op de juiste HOST. Wie de app op
// `localhost:3000` opent, krijgt zijn state-cookie op host `localhost`, terwijl de callback per
// definitie op `127.0.0.1` binnenkomt (Spotify weigert `localhost` als redirect-URI sinds 2025). Voor
// een browser zijn dat verschillende hosts: de cookie gaat niet mee en de login faalt op "state komt
// niet overeen" -- zie lib/spotify/redirectHost.ts voor het hele verhaal.
//
// Dat was eerder een waarschuwing op /spotify ("open de app op 127.0.0.1"). Een instructie die je elke
// keer moet onthouden is echter een gebrek, niet een oplossing: de route weet zélf op welke host hij
// hoort te staan, dus stuurt hij de browser daar nu naartoe vóórdat de cookie wordt gezet. Eén extra
// hop, en de login werkt ongeacht het adres in de balk.
//
// BEWUST ALLEEN DEZE ROUTE, geen middleware over de hele app. De rest van de hub werkt prima op elke
// host (de token-store staat op schijf, dus de verbindingsstatus is host-onafhankelijk), en een globale
// host-redirect zou de app onbereikbaar maken vanaf een ander apparaat op het netwerk -- terwijl juist
// alleen de OAuth-flow aan `127.0.0.1` vastzit.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSpotifyConfig, SPOTIFY_AUTHORIZE_URL, SPOTIFY_SCOPES } from "@/lib/spotify/config";
import { SpotifyConfigError } from "@/lib/spotify/errors";
import { findRedirectHostMismatch } from "@/lib/spotify/redirectHost";

// fs/crypto vereisen de Node-runtime, niet de edge-runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "spotify_oauth_state";

/** Het pad van deze route zelf -- het doel van de host-correctie hieronder. */
const LOGIN_PATH = "/api/auth/login/spotify";

export async function GET(request: NextRequest) {
  let config;
  try {
    config = getSpotifyConfig();
  } catch (err) {
    if (err instanceof SpotifyConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  // Staan we op de verkeerde host, dan eerst hierheen terug op de juiste -- vóór de state-cookie, want
  // die zou op deze host belanden en daarmee onbruikbaar zijn. Geen cookie zetten en geen redirect naar
  // Spotify: de volgende hop doet dat werk opnieuw, dan wél op de host waar de callback aankomt.
  const hostMismatch = findRedirectHostMismatch(
    request.headers.get("host"),
    config.redirectUri,
    LOGIN_PATH
  );
  if (hostMismatch) {
    return NextResponse.redirect(hostMismatch.correctUrl);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const authorizeUrl = new URL(SPOTIFY_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  // Korte-levensduur CSRF-cookie: de callback-route vergelijkt 'm met de teruggegeven
  // state-parameter, vóór er een code wordt ingewisseld.
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}

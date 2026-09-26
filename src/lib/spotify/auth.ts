// Server-side token-uitwisseling voor de Authorization Code Flow (géén PKCE, zie het dossier,
// §1: de serverkant bewaart het client_secret veilig als env-var). Twee aanroepers:
// - de callback-route: wisselt de authorization code in voor het eerste token-paar;
// - fase 3 (nog te bouwen): roept getValidAccessToken() aan vóór elke Spotify-API-call.

import { getSpotifyConfig, SPOTIFY_TOKEN_URL } from "./config";
import { SpotifyReauthRequiredError, SpotifyTokenExchangeError } from "./errors";
import { clearTokens, readTokens, writeTokens, type SpotifyTokenRecord } from "./tokenStore";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

// Ververs 60s vóór het echte verlopen, zodat een net-op-tijd API-call in fase 3 niet alsnog
// tegen een net-verlopen access token aanloopt door netwerklatentie.
const EXPIRY_SKEW_MS = 60_000;

// In-flight-refresh-cache: tot 4 gelijktijdige sync-workers (zie ingest.ts, DEFAULT_CONCURRENCY)
// roepen elk voor eigen rekening getValidAccessToken() aan. Verloopt het token net terwijl ze
// allemaal actief zijn, dan zouden ze zonder deze cache elk apart een refresh starten en over
// dezelfde tokens.json racen (laatste schrijver wint, de rest gebruikt straks een verouderd
// refresh_token). Door alle gelijktijdige aanroepers dezelfde promise te laten delen, ververst er
// maar één keer, en wachten de andere workers gewoon op datzelfde resultaat.
let inFlightRefresh: Promise<SpotifyTokenRecord> | null = null;

function refreshAccessTokenShared(refreshToken: string): Promise<SpotifyTokenRecord> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAccessToken(refreshToken).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestToken(body: URLSearchParams): Promise<SpotifyTokenResponse> {
  const { clientId, clientSecret } = getSpotifyConfig();

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(clientId, clientSecret),
    },
    body,
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    // invalid_grant bij een refresh-token-aanvraag betekent: verlopen (de 6-maanden-limiet, zie
    // het dossier §6) of ingetrokken. Dit is de verwachte levenscyclus, geen bug -- de lokale
    // tokens worden weggegooid en de aanroeper krijgt een specifieke fout om een "log opnieuw
    // in"-melding te tonen, in plaats van te crashen of eindeloos te blijven proberen.
    if (res.status === 400 && (data as { error?: string } | null)?.error === "invalid_grant") {
      clearTokens();
      throw new SpotifyReauthRequiredError();
    }
    throw new SpotifyTokenExchangeError(
      `Spotify token-endpoint gaf ${res.status} terug`,
      res.status,
      data
    );
  }

  return data as SpotifyTokenResponse;
}

function toTokenRecord(
  response: SpotifyTokenResponse,
  previousRefreshToken?: string
): SpotifyTokenRecord {
  const now = Date.now();
  return {
    accessToken: response.access_token,
    // Spotify geeft bij een refresh niet altijd een nieuwe refresh_token terug -- ontbreekt hij,
    // dan blijft de oude geldig en moet die bewaard blijven.
    refreshToken: response.refresh_token ?? previousRefreshToken ?? "",
    tokenType: response.token_type,
    scope: response.scope,
    expiresAt: now + response.expires_in * 1000,
    obtainedAt: now,
  };
}

// Stap 2 van de Authorization Code Flow: wissel de authorization code in voor het eerste
// token-paar. Aangeroepen vanuit de callback-route (POST https://accounts.spotify.com/api/token,
// grant_type=authorization_code, Authorization: Basic base64(client_id:client_secret)).
export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokenRecord> {
  const { redirectUri } = getSpotifyConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await requestToken(body);
  if (!response.refresh_token) {
    // Zou niet moeten gebeuren bij een authorization_code-exchange, maar zonder refresh_token
    // kan de app na 1 uur niets meer ophalen -- beter nu hard falen dan straks stil vastlopen.
    throw new SpotifyTokenExchangeError(
      "Spotify gaf geen refresh_token terug bij de code-exchange",
      200,
      response
    );
  }

  const tokens = toTokenRecord(response);
  writeTokens(tokens);
  return tokens;
}

// grant_type=refresh_token: access token verloopt na 3600s, de refresh token zelf na 6 maanden
// vanaf de originele autorisatie (zie het dossier, §1/§6).
export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenRecord> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await requestToken(body);
  const tokens = toTokenRecord(response, refreshToken);
  writeTokens(tokens);
  return tokens;
}

// De enige aanroep die fase 3 nodig heeft: geeft een geldig access token terug, ververst 'm eerst
// zo nodig, en gooit SpotifyReauthRequiredError door als er (nog) niet is ingelogd of de refresh
// token niet meer geldig is. De aanroeper toont dan de "log opnieuw in bij Spotify"-melding --
// geen silent failure, geen oneindige retry.
export async function getValidAccessToken(): Promise<string> {
  const tokens = readTokens();
  if (!tokens || !tokens.refreshToken) {
    throw new SpotifyReauthRequiredError("Nog niet ingelogd bij Spotify.");
  }

  if (Date.now() < tokens.expiresAt - EXPIRY_SKEW_MS) {
    return tokens.accessToken;
  }

  const refreshed = await refreshAccessTokenShared(tokens.refreshToken);
  return refreshed.accessToken;
}

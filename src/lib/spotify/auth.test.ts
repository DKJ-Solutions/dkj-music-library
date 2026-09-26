// Token-uitwisseling/refresh/getValidAccessToken. `fetch` naar accounts.spotify.com wordt hier
// ALTIJD gemockt -- deze tests mogen nooit het echte netwerk op en nooit echte credentials nodig
// hebben. De token-store schrijft naar een tijdelijk pad (SPOTIFY_TOKEN_STORE_PATH), nooit naar
// de echte .data/-map.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { exchangeCodeForTokens, getValidAccessToken, refreshAccessToken } from "./auth";
import { SpotifyReauthRequiredError, SpotifyTokenExchangeError } from "./errors";
import { readTokens, writeTokens, type SpotifyTokenRecord } from "./tokenStore";

let tempDir: string;
const originalEnv: Record<string, string | undefined> = {};
const ENV_KEYS = [
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "SPOTIFY_TOKEN_STORE_PATH",
] as const;

let fetchMock: ReturnType<typeof vi.fn>;

function mockFetchResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function makeTokens(overrides: Partial<SpotifyTokenRecord> = {}): SpotifyTokenRecord {
  return {
    accessToken: "old-access-token",
    refreshToken: "old-refresh-token",
    tokenType: "Bearer",
    scope: "playlist-read-private playlist-read-collaborative",
    expiresAt: Date.now() + 3_600_000,
    obtainedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-auth-"));

  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.SPOTIFY_CLIENT_ID = "test-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = "test-client-secret";
  process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback/spotify";
  process.env.SPOTIFY_TOKEN_STORE_PATH = path.join(tempDir, "tokens.json");

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("exchangeCodeForTokens", () => {
  it("wisselt een code in via de juiste request-vorm en slaat het resultaat op", async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "fresh-access-token",
        token_type: "Bearer",
        scope: "playlist-read-private playlist-read-collaborative",
        expires_in: 3600,
        refresh_token: "fresh-refresh-token",
      })
    );

    const tokens = await exchangeCodeForTokens("auth-code-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://accounts.spotify.com/api/token");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

    const expectedAuth = `Basic ${Buffer.from("test-client-id:test-client-secret").toString("base64")}`;
    expect(init.headers.Authorization).toBe(expectedAuth);

    const body = init.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("auth-code-123");
    expect(body.get("redirect_uri")).toBe("http://127.0.0.1:3000/api/auth/callback/spotify");

    expect(tokens.accessToken).toBe("fresh-access-token");
    expect(tokens.refreshToken).toBe("fresh-refresh-token");
    expect(readTokens()).toEqual(tokens);
  });

  it("gooit SpotifyTokenExchangeError als er geen refresh_token terugkomt bij de exchange", async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "fresh-access-token",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        // geen refresh_token
      })
    );

    await expect(exchangeCodeForTokens("auth-code-123")).rejects.toBeInstanceOf(
      SpotifyTokenExchangeError
    );
    expect(readTokens()).toBeNull();
  });

  it("gooit SpotifyTokenExchangeError met status en body bij een niet-invalid_grant-fout", async () => {
    fetchMock.mockResolvedValueOnce(mockFetchResponse(500, { error: "server_error" }));

    await expect(exchangeCodeForTokens("auth-code-123")).rejects.toMatchObject({
      status: 500,
      body: { error: "server_error" },
    });
  });
});

describe("refreshAccessToken", () => {
  it("behoudt de oude refresh_token als de respons er geen nieuwe teruggeeft", async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "refreshed-access-token",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        // geen refresh_token in de respons -- Spotify doet dit niet altijd
      })
    );

    const tokens = await refreshAccessToken("bestaande-refresh-token");

    expect(tokens.accessToken).toBe("refreshed-access-token");
    expect(tokens.refreshToken).toBe("bestaande-refresh-token");
    expect(readTokens()?.refreshToken).toBe("bestaande-refresh-token");
  });

  it("gebruikt de nieuwe refresh_token als de respons er wél een teruggeeft", async () => {
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "refreshed-access-token",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        refresh_token: "gloednieuw-refresh-token",
      })
    );

    const tokens = await refreshAccessToken("bestaande-refresh-token");
    expect(tokens.refreshToken).toBe("gloednieuw-refresh-token");
  });

  it("invalid_grant: wist de token-store en gooit SpotifyReauthRequiredError (geen retry, geen silent failure)", async () => {
    writeTokens(makeTokens());
    fetchMock.mockResolvedValueOnce(mockFetchResponse(400, { error: "invalid_grant" }));

    await expect(refreshAccessToken("verlopen-refresh-token")).rejects.toBeInstanceOf(
      SpotifyReauthRequiredError
    );
    expect(readTokens()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getValidAccessToken", () => {
  it("gooit SpotifyReauthRequiredError als er nog niet is ingelogd (geen tokens)", async () => {
    await expect(getValidAccessToken()).rejects.toBeInstanceOf(SpotifyReauthRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gooit SpotifyReauthRequiredError als de opgeslagen tokens geen refreshToken hebben", async () => {
    writeTokens(makeTokens({ refreshToken: "" }));
    await expect(getValidAccessToken()).rejects.toBeInstanceOf(SpotifyReauthRequiredError);
  });

  it("geeft het bestaande access token terug zonder te verversen als het nog ruim geldig is", async () => {
    writeTokens(makeTokens({ accessToken: "nog-geldig-token", expiresAt: Date.now() + 3_600_000 }));

    const token = await getValidAccessToken();

    expect(token).toBe("nog-geldig-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ververst wél zodra het token binnen de 60s-skew-grens verloopt", async () => {
    writeTokens(makeTokens({ accessToken: "bijna-verlopen-token", expiresAt: Date.now() + 30_000 }));
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "net-ververst-token",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        refresh_token: "nieuwe-refresh-token",
      })
    );

    const token = await getValidAccessToken();

    expect(token).toBe("net-ververst-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propageert SpotifyReauthRequiredError als de refresh tijdens getValidAccessToken invalid_grant teruggeeft", async () => {
    writeTokens(makeTokens({ expiresAt: Date.now() - 1_000 }));
    fetchMock.mockResolvedValueOnce(mockFetchResponse(400, { error: "invalid_grant" }));

    await expect(getValidAccessToken()).rejects.toBeInstanceOf(SpotifyReauthRequiredError);
    expect(readTokens()).toBeNull();
  });

  it("deelt de refresh tussen gelijktijdige aanroepers -- geen race op tokens.json (bv. 4 sync-workers tegelijk)", async () => {
    writeTokens(makeTokens({ accessToken: "bijna-verlopen-token", expiresAt: Date.now() + 30_000 }));
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "net-ververst-token",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        refresh_token: "nieuwe-refresh-token",
      })
    );

    const [tokenA, tokenB, tokenC, tokenD] = await Promise.all([
      getValidAccessToken(),
      getValidAccessToken(),
      getValidAccessToken(),
      getValidAccessToken(),
    ]);

    expect([tokenA, tokenB, tokenC, tokenD]).toEqual([
      "net-ververst-token",
      "net-ververst-token",
      "net-ververst-token",
      "net-ververst-token",
    ]);
    // Precies één token-request, ondanks 4 gelijktijdige aanroepers.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readTokens()?.refreshToken).toBe("nieuwe-refresh-token");
  });

  it("start ná een afgeronde refresh weer een nieuwe (de in-flight-cache blijft niet oneindig hangen)", async () => {
    writeTokens(makeTokens({ accessToken: "bijna-verlopen-token-1", expiresAt: Date.now() + 30_000 }));
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "ververst-1",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        refresh_token: "refresh-1",
      })
    );
    await getValidAccessToken();

    writeTokens(makeTokens({ accessToken: "bijna-verlopen-token-2", refreshToken: "refresh-1", expiresAt: Date.now() + 30_000 }));
    fetchMock.mockResolvedValueOnce(
      mockFetchResponse(200, {
        access_token: "ververst-2",
        token_type: "Bearer",
        scope: "playlist-read-private",
        expires_in: 3600,
        refresh_token: "refresh-2",
      })
    );
    const token = await getValidAccessToken();

    expect(token).toBe("ververst-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

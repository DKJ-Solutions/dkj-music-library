// Config-laag: leest/valideert de Spotify-env-vars. getSpotifyConfig() leest process.env
// lazily bij elke aanroep (geen module-state), dus deze tests zetten/herstellen de relevante
// keys rond elke test in plaats van modules te resetten.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SPOTIFY_REDIRECT_URI, getSpotifyConfig } from "./config";
import { SpotifyConfigError } from "./errors";

const ENV_KEYS = ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REDIRECT_URI"] as const;
let originalEnv: Record<(typeof ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  originalEnv = {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
  };
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getSpotifyConfig", () => {
  it("gooit SpotifyConfigError als SPOTIFY_CLIENT_ID ontbreekt", () => {
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    expect(() => getSpotifyConfig()).toThrow(SpotifyConfigError);
  });

  it("gooit SpotifyConfigError als SPOTIFY_CLIENT_SECRET ontbreekt", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    expect(() => getSpotifyConfig()).toThrow(SpotifyConfigError);
  });

  it("gooit SpotifyConfigError als beide env-vars ontbreken", () => {
    expect(() => getSpotifyConfig()).toThrow(SpotifyConfigError);
  });

  it("gooit SpotifyConfigError bij een localhost-redirect-URI, ook al zijn de andere waarden geldig", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    process.env.SPOTIFY_REDIRECT_URI = "http://localhost:3000/api/auth/callback/spotify";

    expect(() => getSpotifyConfig()).toThrow(SpotifyConfigError);
    expect(() => getSpotifyConfig()).toThrow(/127\.0\.0\.1/);
  });

  it("parsed een geldige config correct, inclusief expliciete redirect-URI", () => {
    process.env.SPOTIFY_CLIENT_ID = "abc123";
    process.env.SPOTIFY_CLIENT_SECRET = "s3cr3t";
    process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback/spotify";

    expect(getSpotifyConfig()).toEqual({
      clientId: "abc123",
      clientSecret: "s3cr3t",
      redirectUri: "http://127.0.0.1:3000/api/auth/callback/spotify",
    });
  });

  it("valt terug op DEFAULT_SPOTIFY_REDIRECT_URI als SPOTIFY_REDIRECT_URI niet is gezet", () => {
    process.env.SPOTIFY_CLIENT_ID = "abc123";
    process.env.SPOTIFY_CLIENT_SECRET = "s3cr3t";

    const config = getSpotifyConfig();
    expect(config.redirectUri).toBe(DEFAULT_SPOTIFY_REDIRECT_URI);
    expect(config.redirectUri).not.toContain("localhost");
  });
});

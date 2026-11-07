// Config-laag: leest/valideert de Spotify-env-vars. getSpotifyConfig() leest process.env
// lazily bij elke aanroep (geen module-state), dus deze tests zetten/herstellen de relevante
// keys rond elke test in plaats van modules te resetten.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SPOTIFY_REDIRECT_URI, getSpotifyConfig } from "./config";
import { SpotifyConfigError } from "./errors";

const noRecover = () => {};
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
    expect(() => getSpotifyConfig(noRecover)).toThrow(SpotifyConfigError);
  });

  it("gooit SpotifyConfigError als SPOTIFY_CLIENT_SECRET ontbreekt", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    expect(() => getSpotifyConfig(noRecover)).toThrow(SpotifyConfigError);
  });

  it("gooit SpotifyConfigError als beide env-vars ontbreken", () => {
    expect(() => getSpotifyConfig(noRecover)).toThrow(SpotifyConfigError);
  });

  it("gooit SpotifyConfigError bij een localhost-redirect-URI, ook al zijn de andere waarden geldig", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    process.env.SPOTIFY_REDIRECT_URI = "http://localhost:3000/api/auth/callback/spotify";

    expect(() => getSpotifyConfig(noRecover)).toThrow(SpotifyConfigError);
    expect(() => getSpotifyConfig(noRecover)).toThrow(/127\.0\.0\.1/);
  });

  it("parsed een geldige config correct, inclusief expliciete redirect-URI", () => {
    process.env.SPOTIFY_CLIENT_ID = "abc123";
    process.env.SPOTIFY_CLIENT_SECRET = "s3cr3t";
    process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback/spotify";

    expect(getSpotifyConfig(noRecover)).toEqual({
      clientId: "abc123",
      clientSecret: "s3cr3t",
      redirectUri: "http://127.0.0.1:3000/api/auth/callback/spotify",
    });
  });

  it("valt terug op DEFAULT_SPOTIFY_REDIRECT_URI als SPOTIFY_REDIRECT_URI niet is gezet", () => {
    process.env.SPOTIFY_CLIENT_ID = "abc123";
    process.env.SPOTIFY_CLIENT_SECRET = "s3cr3t";

    const config = getSpotifyConfig(noRecover);
    expect(config.redirectUri).toBe(DEFAULT_SPOTIFY_REDIRECT_URI);
    expect(config.redirectUri).not.toContain("localhost");
  });

  it("probeert het herstel als een sleutel ontbreekt, en gebruikt wat dat oplevert (#128)", () => {
    let calls = 0;
    const config = getSpotifyConfig(() => {
      calls++;
      process.env.SPOTIFY_CLIENT_ID = "hersteld-id";
      process.env.SPOTIFY_CLIENT_SECRET = "hersteld-secret";
    });
    expect(calls).toBe(1);
    expect(config.clientId).toBe("hersteld-id");
  });

  it("slaat het herstel over als beide sleutels er al zijn", () => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    let calls = 0;
    getSpotifyConfig(() => calls++);
    expect(calls).toBe(0);
  });

  it("noemt npm run env:onedrive als het herstel niets oplevert", () => {
    expect(() => getSpotifyConfig(noRecover)).toThrow(/npm run env:onedrive/);
  });
});

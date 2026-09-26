// Token-store: lokale JSON-store op schijf. De tests schrijven NOOIT naar de echte .data/-map --
// SPOTIFY_TOKEN_STORE_PATH wordt per test overridden naar een tijdelijk pad onder de OS-temp,
// dat na afloop weer wordt opgeruimd.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { clearTokens, readTokens, writeTokens, type SpotifyTokenRecord } from "./tokenStore";

let tempDir: string;
let originalStorePath: string | undefined;

function makeTokens(overrides: Partial<SpotifyTokenRecord> = {}): SpotifyTokenRecord {
  return {
    accessToken: "access-123",
    refreshToken: "refresh-abc",
    tokenType: "Bearer",
    scope: "playlist-read-private playlist-read-collaborative",
    expiresAt: Date.now() + 3_600_000,
    obtainedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-tokenstore-"));
  originalStorePath = process.env.SPOTIFY_TOKEN_STORE_PATH;
  process.env.SPOTIFY_TOKEN_STORE_PATH = path.join(tempDir, "nested", "tokens.json");
});

afterEach(() => {
  if (originalStorePath === undefined) delete process.env.SPOTIFY_TOKEN_STORE_PATH;
  else process.env.SPOTIFY_TOKEN_STORE_PATH = originalStorePath;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readTokens", () => {
  it("geeft null terug als het store-bestand nog niet bestaat", () => {
    expect(readTokens()).toBeNull();
  });

  it("geeft null terug en waarschuwt bij kapotte/onparseerbare JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storePath = process.env.SPOTIFY_TOKEN_STORE_PATH as string;
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "dit is geen geldige JSON {{{", "utf8");

    expect(readTokens()).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});

describe("writeTokens / readTokens round-trip", () => {
  it("schrijft en leest exact dezelfde tokens terug", () => {
    const tokens = makeTokens();
    writeTokens(tokens);

    expect(readTokens()).toEqual(tokens);
  });

  it("maakt de bovenliggende map(pen) aan als die nog niet bestaan", () => {
    const storePath = process.env.SPOTIFY_TOKEN_STORE_PATH as string;
    expect(fs.existsSync(path.dirname(storePath))).toBe(false);

    writeTokens(makeTokens());

    expect(fs.existsSync(storePath)).toBe(true);
  });

  it("overschrijft een eerder geschreven token-record volledig", () => {
    writeTokens(makeTokens({ accessToken: "eerste-token" }));
    writeTokens(makeTokens({ accessToken: "tweede-token" }));

    expect(readTokens()?.accessToken).toBe("tweede-token");
  });
});

describe("clearTokens", () => {
  it("verwijdert een bestaand store-bestand, readTokens geeft daarna null", () => {
    writeTokens(makeTokens());
    expect(readTokens()).not.toBeNull();

    clearTokens();

    expect(readTokens()).toBeNull();
  });

  it("is een no-op (geen crash) als er nog geen store-bestand is", () => {
    expect(() => clearTokens()).not.toThrow();
  });
});

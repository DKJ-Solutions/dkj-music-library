// worldStore: lokale, sync-bestendige wereld-correctie-laag, los van de Spotify-snapshot. De
// tests schrijven NOOIT naar de echte data/-map -- SPOTIFY_WORLD_STORE_PATH wordt per test
// overridden naar een tijdelijk pad onder de OS-temp, dat na afloop weer wordt opgeruimd (zelfde
// patroon als doneStore.test.ts).
//
// Fixture-ids zijn bewust kaal alfanumeriek (bv. "playlist1", niet "playlist-1") -- sinds de
// playlist-id-vorm-check (zie overrideSafety.ts) is een streepje geen geldige playlist-id meer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  clearWorldOverride,
  getWorldOverride,
  readWorldOverrides,
  setWorldOverride,
} from "./worldStore";

let tempDir: string;
const originalEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["SPOTIFY_WORLD_STORE_PATH"] as const;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-worldstore-"));
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.SPOTIFY_WORLD_STORE_PATH = path.join(tempDir, "nested", "worlds.json");
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readWorldOverrides", () => {
  it("geeft een leeg object terug als het store-bestand nog niet bestaat", () => {
    expect(readWorldOverrides()).toEqual({});
  });

  it("geeft een leeg object terug en waarschuwt bij kapotte/onparseerbare JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storePath = process.env.SPOTIFY_WORLD_STORE_PATH as string;
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "geen geldige JSON {{{", "utf8");

    expect(readWorldOverrides()).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("getWorldOverride", () => {
  it("geeft null terug voor een playlist die nog nooit gecorrigeerd is", () => {
    expect(getWorldOverride("playlistonbekend")).toBeNull();
  });

  it("geeft null terug voor een ongeldige playlist-id, i.p.v. te crashen", () => {
    expect(getWorldOverride("__proto__")).toBeNull();
    expect(getWorldOverride("playlist-1")).toBeNull();
    expect(getWorldOverride("")).toBeNull();
  });
});

describe("setWorldOverride / getWorldOverride round-trip", () => {
  it("zet en leest de override van één playlist terug", () => {
    setWorldOverride("playlist1", "djcylow");

    expect(getWorldOverride("playlist1")).toBe("djcylow");
    expect(getWorldOverride("playlist2")).toBeNull(); // andere playlists blijven ongemoeid
  });

  it("legt een updatedAt-tijdstip vast", () => {
    setWorldOverride("playlist1", "mmc");

    const overrides = readWorldOverrides();
    expect(overrides["playlist1"].world).toBe("mmc");
    expect(new Date(overrides["playlist1"].updatedAt).toString()).not.toBe("Invalid Date");
  });

  it("overschrijft alleen de aangeraakte playlist bij een nieuwe correctie, andere blijven intact", () => {
    setWorldOverride("playlist1", "mmc");
    setWorldOverride("playlist2", "prive");
    setWorldOverride("playlist1", "djcylow"); // Dave corrigeert 'm nogmaals

    expect(readWorldOverrides()).toMatchObject({
      playlist1: { world: "djcylow" },
      playlist2: { world: "prive" },
    });
  });

  it("maakt de bovenliggende map(pen) aan als die nog niet bestaan", () => {
    const storePath = process.env.SPOTIFY_WORLD_STORE_PATH as string;
    expect(fs.existsSync(path.dirname(storePath))).toBe(false);

    setWorldOverride("playlist1", "mmc");

    expect(fs.existsSync(storePath)).toBe(true);
  });

  it("gooit een fout bij een ongeldige playlist-id i.p.v. 'm alsnog weg te schrijven", () => {
    expect(() => setWorldOverride("__proto__", "mmc")).toThrow();
    expect(() => setWorldOverride("playlist-1", "mmc")).toThrow();
    expect(() => setWorldOverride("", "mmc")).toThrow();
    expect(readWorldOverrides()).toEqual({}); // niets weggeschreven
  });

  it("een verworpen '__proto__'-id vervuilt Object.prototype niet", () => {
    expect(() => setWorldOverride("__proto__", "mmc")).toThrow();
    expect(({} as Record<string, unknown>).world).toBeUndefined();
  });
});

describe("clearWorldOverride", () => {
  it("wist een bestaande override weer -- de playlist valt terug op 'geen override' (null)", () => {
    setWorldOverride("playlist1", "djcylow");
    expect(getWorldOverride("playlist1")).toBe("djcylow");

    clearWorldOverride("playlist1");

    expect(getWorldOverride("playlist1")).toBeNull();
  });

  it("raakt andere overrides niet aan", () => {
    setWorldOverride("playlist1", "djcylow");
    setWorldOverride("playlist2", "prive");

    clearWorldOverride("playlist1");

    expect(getWorldOverride("playlist2")).toBe("prive");
  });

  it("is een no-op (geen fout) als er nog geen override bestond", () => {
    expect(() => clearWorldOverride("playlistonbekend")).not.toThrow();
    expect(readWorldOverrides()).toEqual({});
  });

  it("is een no-op (geen fout) bij een ongeldige playlist-id, ook als er al overrides bestaan", () => {
    setWorldOverride("playlist1", "djcylow");

    expect(() => clearWorldOverride("__proto__")).not.toThrow();
    expect(() => clearWorldOverride("toString")).not.toThrow();
    expect(getWorldOverride("playlist1")).toBe("djcylow"); // ongemoeid
  });
});

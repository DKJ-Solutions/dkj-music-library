// bpmStore: lokale, sync-bestendige BPM-correctie-laag, los van de Spotify-snapshot. De tests
// schrijven NOOIT naar de echte data/-map -- SPOTIFY_BPM_STORE_PATH wordt per test overridden naar
// een tijdelijk pad onder de OS-temp, dat na afloop weer wordt opgeruimd (zelfde patroon als
// worldStore.test.ts).
//
// Fixture-ids zijn bewust kaal alfanumeriek (bv. "playlist1", niet "playlist-1") -- sinds de
// playlist-id-vorm-check (zie overrideSafety.ts) is een streepje geen geldige playlist-id meer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  clearBpmOverride,
  getBpmOverride,
  readBpmOverrides,
  setBpmOverride,
} from "./bpmStore";

let tempDir: string;
const originalEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["SPOTIFY_BPM_STORE_PATH"] as const;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-bpmstore-"));
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.SPOTIFY_BPM_STORE_PATH = path.join(tempDir, "nested", "bpm.json");
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readBpmOverrides", () => {
  it("geeft een leeg object terug als het store-bestand nog niet bestaat", () => {
    expect(readBpmOverrides()).toEqual({});
  });

  it("geeft een leeg object terug en waarschuwt bij kapotte/onparseerbare JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storePath = process.env.SPOTIFY_BPM_STORE_PATH as string;
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "geen geldige JSON {{{", "utf8");

    expect(readBpmOverrides()).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("getBpmOverride", () => {
  it("geeft null terug voor een playlist die nog nooit gecorrigeerd is", () => {
    expect(getBpmOverride("playlistonbekend")).toBeNull();
  });

  it("geeft null terug voor een ongeldige playlist-id, i.p.v. te crashen", () => {
    expect(getBpmOverride("__proto__")).toBeNull();
    expect(getBpmOverride("playlist-1")).toBeNull();
    expect(getBpmOverride("")).toBeNull();
  });
});

describe("setBpmOverride / getBpmOverride round-trip", () => {
  it("zet en leest de override van één playlist terug", () => {
    setBpmOverride("playlist1", 176);

    expect(getBpmOverride("playlist1")).toBe(176);
    expect(getBpmOverride("playlist2")).toBeNull(); // andere playlists blijven ongemoeid
  });

  it("legt een updatedAt-tijdstip vast", () => {
    setBpmOverride("playlist1", 128);

    const overrides = readBpmOverrides();
    expect(overrides["playlist1"].bpm).toBe(128);
    expect(new Date(overrides["playlist1"].updatedAt).toString()).not.toBe("Invalid Date");
  });

  it("overschrijft alleen de aangeraakte playlist bij een nieuwe correctie, andere blijven intact", () => {
    setBpmOverride("playlist1", 96);
    setBpmOverride("playlist2", 112);
    setBpmOverride("playlist1", 176); // Dave corrigeert 'm nogmaals

    expect(readBpmOverrides()).toMatchObject({
      playlist1: { bpm: 176 },
      playlist2: { bpm: 112 },
    });
  });

  it("maakt de bovenliggende map(pen) aan als die nog niet bestaan", () => {
    const storePath = process.env.SPOTIFY_BPM_STORE_PATH as string;
    expect(fs.existsSync(path.dirname(storePath))).toBe(false);

    setBpmOverride("playlist1", 128);

    expect(fs.existsSync(storePath)).toBe(true);
  });

  it("gooit een fout bij een ongeldige playlist-id i.p.v. 'm alsnog weg te schrijven", () => {
    expect(() => setBpmOverride("__proto__", 128)).toThrow();
    expect(() => setBpmOverride("playlist-1", 128)).toThrow();
    expect(() => setBpmOverride("", 128)).toThrow();
    expect(readBpmOverrides()).toEqual({}); // niets weggeschreven
  });

  it("een verworpen '__proto__'-id vervuilt Object.prototype niet", () => {
    expect(() => setBpmOverride("__proto__", 128)).toThrow();
    expect(({} as Record<string, unknown>).bpm).toBeUndefined();
  });
});

describe("clearBpmOverride", () => {
  it("wist een bestaande override weer -- de playlist valt terug op 'geen override' (null)", () => {
    setBpmOverride("playlist1", 176);
    expect(getBpmOverride("playlist1")).toBe(176);

    clearBpmOverride("playlist1");

    expect(getBpmOverride("playlist1")).toBeNull();
  });

  it("raakt andere overrides niet aan", () => {
    setBpmOverride("playlist1", 176);
    setBpmOverride("playlist2", 112);

    clearBpmOverride("playlist1");

    expect(getBpmOverride("playlist2")).toBe(112);
  });

  it("is een no-op (geen fout) als er nog geen override bestond", () => {
    expect(() => clearBpmOverride("playlistonbekend")).not.toThrow();
    expect(readBpmOverrides()).toEqual({});
  });

  it("is een no-op (geen fout) bij een ongeldige playlist-id, ook als er al overrides bestaan", () => {
    setBpmOverride("playlist1", 176);

    expect(() => clearBpmOverride("__proto__")).not.toThrow();
    expect(() => clearBpmOverride("toString")).not.toThrow();
    expect(getBpmOverride("playlist1")).toBe(176); // ongemoeid
  });
});

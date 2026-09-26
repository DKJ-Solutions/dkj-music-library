// doneStore: lokale, sync-bestendige "afgerond"-laag, los van de Spotify-snapshot. De tests
// schrijven NOOIT naar de echte data/-map -- SPOTIFY_DONE_STORE_PATH wordt per test overridden
// naar een tijdelijk pad onder de OS-temp, dat na afloop weer wordt opgeruimd (zelfde patroon als
// snapshotStore.test.ts).
//
// Fixture-ids zijn bewust kaal alfanumeriek (bv. "playlist1", niet "playlist-1") -- sinds de
// playlist-id-vorm-check (zie overrideSafety.ts) is een streepje geen geldige playlist-id meer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getDoneStatus, readDoneStatuses, setDoneStatus } from "./doneStore";

let tempDir: string;
const originalEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["SPOTIFY_DONE_STORE_PATH"] as const;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-donestore-"));
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.SPOTIFY_DONE_STORE_PATH = path.join(tempDir, "nested", "done.json");
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readDoneStatuses", () => {
  it("geeft een leeg object terug als het store-bestand nog niet bestaat", () => {
    expect(readDoneStatuses()).toEqual({});
  });

  it("geeft een leeg object terug en waarschuwt bij kapotte/onparseerbare JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storePath = process.env.SPOTIFY_DONE_STORE_PATH as string;
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "geen geldige JSON {{{", "utf8");

    expect(readDoneStatuses()).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("getDoneStatus", () => {
  it("geeft false terug voor een playlist die nog nooit is aangeraakt", () => {
    expect(getDoneStatus("playlistonbekend")).toBe(false);
  });

  it("geeft false terug voor een ongeldige playlist-id, i.p.v. te crashen", () => {
    expect(getDoneStatus("__proto__")).toBe(false);
    expect(getDoneStatus("playlist-1")).toBe(false);
    expect(getDoneStatus("")).toBe(false);
  });
});

describe("setDoneStatus / getDoneStatus round-trip", () => {
  it("zet en leest de status van één playlist terug", () => {
    setDoneStatus("playlist1", true);

    expect(getDoneStatus("playlist1")).toBe(true);
    expect(getDoneStatus("playlist2")).toBe(false); // andere playlists blijven ongemoeid
  });

  it("legt een updatedAt-tijdstip vast", () => {
    setDoneStatus("playlist1", true);

    const statuses = readDoneStatuses();
    expect(statuses["playlist1"].done).toBe(true);
    expect(new Date(statuses["playlist1"].updatedAt).toString()).not.toBe("Invalid Date");
  });

  it("overschrijft alleen de aangeraakte playlist, andere statussen blijven intact", () => {
    setDoneStatus("playlist1", true);
    setDoneStatus("playlist2", true);
    setDoneStatus("playlist1", false); // Dave heruit 'm weer geopend

    expect(readDoneStatuses()).toMatchObject({
      playlist1: { done: false },
      playlist2: { done: true },
    });
  });

  it("maakt de bovenliggende map(pen) aan als die nog niet bestaan", () => {
    const storePath = process.env.SPOTIFY_DONE_STORE_PATH as string;
    expect(fs.existsSync(path.dirname(storePath))).toBe(false);

    setDoneStatus("playlist1", true);

    expect(fs.existsSync(storePath)).toBe(true);
  });

  it("gooit een fout bij een ongeldige playlist-id i.p.v. 'm alsnog weg te schrijven", () => {
    expect(() => setDoneStatus("__proto__", true)).toThrow();
    expect(() => setDoneStatus("playlist-1", true)).toThrow();
    expect(() => setDoneStatus("", true)).toThrow();
    expect(readDoneStatuses()).toEqual({}); // niets weggeschreven
  });

  it("een verworpen '__proto__'-id vervuilt Object.prototype niet", () => {
    expect(() => setDoneStatus("__proto__", true)).toThrow();
    expect(({} as Record<string, unknown>).done).toBeUndefined();
  });
});

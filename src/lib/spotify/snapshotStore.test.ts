// snapshotStore: lokale JSON-store + lichte historie-opzet. De tests schrijven NOOIT naar de
// echte data/-map -- SPOTIFY_SNAPSHOT_STORE_PATH/SPOTIFY_SNAPSHOT_HISTORY_DIR worden per test
// overridden naar een tijdelijk pad onder de OS-temp, dat na afloop weer wordt opgeruimd.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  archiveCurrentSnapshot,
  readSnapshot,
  writeSnapshot,
} from "./snapshotStore";
import type { Snapshot } from "./types";

let tempDir: string;
const originalEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["SPOTIFY_SNAPSHOT_STORE_PATH", "SPOTIFY_SNAPSHOT_HISTORY_DIR"] as const;

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    syncedAt: new Date().toISOString(),
    playlists: [],
    ...overrides,
  };
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-snapshotstore-"));
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  process.env.SPOTIFY_SNAPSHOT_STORE_PATH = path.join(tempDir, "nested", "snapshot.json");
  process.env.SPOTIFY_SNAPSHOT_HISTORY_DIR = path.join(tempDir, "history");
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readSnapshot", () => {
  it("geeft null terug als het store-bestand nog niet bestaat", () => {
    expect(readSnapshot()).toBeNull();
  });

  it("geeft null terug en waarschuwt bij kapotte/onparseerbare JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storePath = process.env.SPOTIFY_SNAPSHOT_STORE_PATH as string;
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, "geen geldige JSON {{{", "utf8");

    expect(readSnapshot()).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("writeSnapshot / readSnapshot round-trip", () => {
  it("schrijft en leest exact dezelfde snapshot terug", () => {
    const snapshot = makeSnapshot();
    writeSnapshot(snapshot);

    expect(readSnapshot()).toEqual(snapshot);
  });

  it("maakt de bovenliggende map(pen) aan als die nog niet bestaan", () => {
    const storePath = process.env.SPOTIFY_SNAPSHOT_STORE_PATH as string;
    expect(fs.existsSync(path.dirname(storePath))).toBe(false);

    writeSnapshot(makeSnapshot());

    expect(fs.existsSync(storePath)).toBe(true);
  });
});

describe("archiveCurrentSnapshot", () => {
  it("is een no-op als er nog geen snapshot bestaat (eerste sync ooit)", () => {
    expect(() => archiveCurrentSnapshot()).not.toThrow();
    const historyDir = process.env.SPOTIFY_SNAPSHOT_HISTORY_DIR as string;
    expect(fs.existsSync(historyDir)).toBe(false);
  });

  it("kopieert de bestaande snapshot naar de historie-map vóórdat 'm overschreven wordt", () => {
    writeSnapshot(makeSnapshot({ playlists: [] }));

    archiveCurrentSnapshot();

    const historyDir = process.env.SPOTIFY_SNAPSHOT_HISTORY_DIR as string;
    const entries = fs.readdirSync(historyDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^snapshot-.*\.json$/);
  });

  it("snoeit de historie terug tot de bewaargrens (oudste eerst weg)", () => {
    writeSnapshot(makeSnapshot());
    const historyDir = process.env.SPOTIFY_SNAPSHOT_HISTORY_DIR as string;
    fs.mkdirSync(historyDir, { recursive: true });

    // Simuleer 12 al bestaande, oudere historie-bestanden (de bewaargrens is 10).
    for (let i = 0; i < 12; i++) {
      fs.writeFileSync(
        path.join(historyDir, `snapshot-2020-01-01T00-00-${String(i).padStart(2, "0")}-000Z.json`),
        "{}"
      );
    }

    archiveCurrentSnapshot();

    const entries = fs.readdirSync(historyDir);
    // 12 bestaande + 1 nieuwe = 13, gesnoeid tot 10.
    expect(entries).toHaveLength(10);
  });
});

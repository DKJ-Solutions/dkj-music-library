// cacheStore: lokale JSON-cache, atomair geschreven. De tests schrijven NOOIT naar de echte data/-map --
// MUSICBRAINZ_RELEASE_YEAR_CACHE_PATH wordt per test overridden naar een tijdelijk pad onder de
// OS-temp, dat na afloop weer wordt opgeruimd. Zelfde opzet als spotify/snapshotStore.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { foundReleaseYears, readReleaseYearCache, writeReleaseYearCache, type ReleaseYearCache } from "./cacheStore";

let tempDir: string;
let cachePath: string;
const ENV_KEY = "MUSICBRAINZ_RELEASE_YEAR_CACHE_PATH";
let originalEnv: string | undefined;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-music-library-musicbrainz-cachestore-"));
  cachePath = path.join(tempDir, "nested", "release-years.json");
  originalEnv = process.env[ENV_KEY];
  process.env[ENV_KEY] = cachePath;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalEnv;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("readReleaseYearCache", () => {
  it("geeft een lege Map terug als het cachebestand nog niet bestaat", () => {
    expect(readReleaseYearCache()).toEqual(new Map());
  });

  it("geeft een lege Map terug en waarschuwt bij kapotte/onparseerbare JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, "geen geldige JSON {{{", "utf8");

    expect(readReleaseYearCache()).toEqual(new Map());
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("writeReleaseYearCache / readReleaseYearCache round-trip", () => {
  it("schrijft en leest exact dezelfde cache terug, inclusief een 'niet gevonden' (year: null)", () => {
    const cache: ReleaseYearCache = new Map([
      ["spotify1", { year: 1966, recordingId: "rec-1", fetchedAt: "2026-09-28T00:00:00.000Z" }],
      ["spotify2", { year: null, fetchedAt: "2026-09-28T00:00:00.000Z" }],
    ]);
    writeReleaseYearCache(cache);

    expect(readReleaseYearCache()).toEqual(cache);
  });

  it("maakt de bovenliggende map(pen) aan als die nog niet bestaan", () => {
    expect(fs.existsSync(path.dirname(cachePath))).toBe(false);

    writeReleaseYearCache(new Map());

    expect(fs.existsSync(cachePath)).toBe(true);
  });

  it("schrijft atomair: geen .tmp-bestand blijft achter", () => {
    writeReleaseYearCache(new Map([["a", { year: 2000, fetchedAt: "2026-09-28T00:00:00.000Z" }]]));

    expect(fs.existsSync(`${cachePath}.tmp`)).toBe(false);
    expect(fs.existsSync(cachePath)).toBe(true);
  });
});

describe("foundReleaseYears", () => {
  it("neemt alleen de tracks mee waarvoor MusicBrainz een jaar teruggaf, niet de 'niet gevonden'-tracks", () => {
    const years = foundReleaseYears(
      new Map([
        ["a", { year: 1966, recordingId: "r1", fetchedAt: "2026-09-28T00:00:00Z" }],
        ["b", { year: null, fetchedAt: "2026-09-28T00:00:00Z" }],
      ])
    );
    expect(years.get("a")).toBe(1966);
    expect(years.has("b")).toBe(false);
  });
});

// localMusicConfig: de lokale, git-ignored instelling van de muziekmap (#144). De tests lezen NOOIT de
// echte data/-map -- LOCAL_MUSIC_CONFIG_PATH wijst per test naar een tijdelijk pad.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { parseLocalMusicConfig, readLocalMusicConfig } from "./localMusicConfig";

let tempDir: string;
let originalPath: string | undefined;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-music-library-local-music-"));
  originalPath = process.env.LOCAL_MUSIC_CONFIG_PATH;
  process.env.LOCAL_MUSIC_CONFIG_PATH = path.join(tempDir, "local-music.json");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  if (originalPath === undefined) delete process.env.LOCAL_MUSIC_CONFIG_PATH;
  else process.env.LOCAL_MUSIC_CONFIG_PATH = originalPath;
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("parseLocalMusicConfig", () => {
  it("neemt de map over, zonder witruimte eromheen", () => {
    expect(parseLocalMusicConfig({ musicFolder: "  E:\\Music  " })).toEqual({ musicFolder: "E:\\Music" });
  });

  it("geeft null bij een lege, ontbrekende of verkeerd getypte map", () => {
    expect(parseLocalMusicConfig({ musicFolder: "  " }).musicFolder).toBeNull();
    expect(parseLocalMusicConfig({}).musicFolder).toBeNull();
    expect(parseLocalMusicConfig({ musicFolder: 42 }).musicFolder).toBeNull();
    expect(parseLocalMusicConfig(null).musicFolder).toBeNull();
  });
});

describe("readLocalMusicConfig", () => {
  it("geeft geen map als het bestand ontbreekt", () => {
    expect(readLocalMusicConfig()).toEqual({ musicFolder: null });
  });

  it("leest de map uit het bestand", () => {
    fs.writeFileSync(process.env.LOCAL_MUSIC_CONFIG_PATH as string, JSON.stringify({ musicFolder: "D:/Muziek" }));
    expect(readLocalMusicConfig()).toEqual({ musicFolder: "D:/Muziek" });
  });

  it("negeert ongeldige JSON met een waarschuwing", () => {
    fs.writeFileSync(process.env.LOCAL_MUSIC_CONFIG_PATH as string, "{ niet geldig");
    expect(readLocalMusicConfig()).toEqual({ musicFolder: null });
    expect(console.warn).toHaveBeenCalled();
  });
});

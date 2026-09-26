// privateRules: de lokale, git-ignored persoonlijke regels (eigen account, privé-namen). De tests
// lezen NOOIT de echte data/-map -- SPOTIFY_PRIVATE_RULES_PATH wijst per test naar een tijdelijk pad
// (zelfde patroon als worldStore.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { parsePrivateRules, readPrivateRules } from "./privateRules";

let tempDir: string;
let originalPath: string | undefined;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-music-library-private-rules-"));
  originalPath = process.env.SPOTIFY_PRIVATE_RULES_PATH;
  process.env.SPOTIFY_PRIVATE_RULES_PATH = path.join(tempDir, "private-rules.json");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  if (originalPath === undefined) delete process.env.SPOTIFY_PRIVATE_RULES_PATH;
  else process.env.SPOTIFY_PRIVATE_RULES_PATH = originalPath;
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("parsePrivateRules", () => {
  it("compileert de patronen hoofdletterongevoelig en neemt het account over", () => {
    const rules = parsePrivateRules({ ownerUserId: " abc123 ", priveNamePatterns: ["zondag\\s+favorite"] });
    expect(rules.ownerUserId).toBe("abc123");
    expect(rules.priveNamePatterns).toHaveLength(1);
    expect(rules.priveNamePatterns[0].test("Green Full | ZONDAG Favorite")).toBe(true);
  });

  it("slaat een ongeldige regex over met een waarschuwing, en houdt de rest", () => {
    const rules = parsePrivateRules({ priveNamePatterns: ["(kapot", "feestje"] });
    expect(rules.priveNamePatterns.map((pattern) => pattern.source)).toEqual(["feestje"]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("valt terug op geen account en geen patronen bij een onverwachte vorm", () => {
    expect(parsePrivateRules(null)).toEqual({ ownerUserId: null, priveNamePatterns: [] });
    expect(parsePrivateRules({ ownerUserId: "", priveNamePatterns: "feestje" })).toEqual({
      ownerUserId: null,
      priveNamePatterns: [],
    });
  });
});

describe("readPrivateRules", () => {
  it("geeft lege regels en waarschuwt als het bestand ontbreekt", () => {
    expect(readPrivateRules()).toEqual({ ownerUserId: null, priveNamePatterns: [] });
    expect(console.warn).toHaveBeenCalled();
  });

  it("leest het bestand", () => {
    fs.writeFileSync(
      process.env.SPOTIFY_PRIVATE_RULES_PATH as string,
      JSON.stringify({ ownerUserId: "abc123", priveNamePatterns: ["feestje"] })
    );
    const rules = readPrivateRules();
    expect(rules.ownerUserId).toBe("abc123");
    expect(rules.priveNamePatterns[0].test("Feestje")).toBe(true);
  });

  it("negeert ongeldige JSON in plaats van te crashen", () => {
    fs.writeFileSync(process.env.SPOTIFY_PRIVATE_RULES_PATH as string, "{ geen json");
    expect(readPrivateRules()).toEqual({ ownerUserId: null, priveNamePatterns: [] });
  });
});

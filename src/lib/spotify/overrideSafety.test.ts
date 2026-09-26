// overrideSafety: de gedeelde prototype-pollution-verdediging voor de drie override-stores
// (bpmStore.ts/worldStore.ts/doneStore.ts). Los getest, zodat elke store zelf alleen de dunne
// laag erbovenop hoeft te dekken (zie *Store.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createOverrideContainer, hasOverride, isValidPlaylistId, readOverrideFile } from "./overrideSafety";

describe("isValidPlaylistId", () => {
  it("accepteert kale alfanumerieke ids (de vorm van een echte Spotify-playlist-id)", () => {
    expect(isValidPlaylistId("37i9dQZF1DXcBWIGoYBM5M")).toBe(true);
    expect(isValidPlaylistId("a")).toBe(true);
  });

  it("verwerpt lege strings", () => {
    expect(isValidPlaylistId("")).toBe(false);
  });

  it("verwerpt '__proto__' (bevat underscores, geen kaal alfanumeriek Spotify-id)", () => {
    // "constructor"/"prototype" zijn zelf wél kaal alfanumeriek en dus in theorie een geldige
    // vorm -- geen probleem, want die zijn op een prototype-loos object (zie
    // createOverrideContainer hieronder) gewoon een onschuldige eigen eigenschap, geen
    // prototype-herschrijving zoals "__proto__" dat via bracket-assignment wél zou zijn.
    expect(isValidPlaylistId("__proto__")).toBe(false);
  });

  it("verwerpt ids met tekens buiten [A-Za-z0-9] (streepjes, punten, slashes, spaties)", () => {
    expect(isValidPlaylistId("playlist-1")).toBe(false);
    expect(isValidPlaylistId("playlist.1")).toBe(false);
    expect(isValidPlaylistId("../etc/passwd")).toBe(false);
    expect(isValidPlaylistId("playlist 1")).toBe(false);
  });

  it("verwerpt een onredelijk lange id", () => {
    expect(isValidPlaylistId("a".repeat(65))).toBe(false);
    expect(isValidPlaylistId("a".repeat(64))).toBe(true);
  });
});

describe("createOverrideContainer", () => {
  it("levert een object zonder prototype -- geen geërfde Object.prototype-namen", () => {
    const container = createOverrideContainer<{ done: boolean }>();
    expect(Object.getPrototypeOf(container)).toBeNull();
    expect(hasOverride(container, "toString")).toBe(false);
  });

  it("laat een sleutel als '__proto__' gewoon als eigen eigenschap landen, geen prototype-herschrijving", () => {
    const container = createOverrideContainer<{ done: boolean }>();
    container.__proto__ = { done: true } as unknown as { done: boolean };

    // Geen prototype-vervuiling: de container zelf blijft prototype-loos, en een vers object
    // elders in de codebase krijgt er geen extra eigenschap bij.
    expect(Object.getPrototypeOf(container)).toBeNull();
    expect(({} as Record<string, unknown>).done).toBeUndefined();
    expect(hasOverride(container, "__proto__")).toBe(true);
  });
});

describe("hasOverride", () => {
  it("geeft true terug voor een eigen sleutel, false voor een geërfde Object.prototype-naam", () => {
    const container = createOverrideContainer<{ done: boolean }>();
    container["playlist1"] = { done: true };

    expect(hasOverride(container, "playlist1")).toBe(true);
    expect(hasOverride(container, "toString")).toBe(false);
    expect(hasOverride(container, "hasOwnProperty")).toBe(false);
  });
});

describe("readOverrideFile", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-spotify-overridesafety-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("geeft een leeg, prototype-loos object terug als het bestand nog niet bestaat", () => {
    const result = readOverrideFile(path.join(tempDir, "missing.json"), "testStore");
    expect(result).toEqual({});
    expect(Object.getPrototypeOf(result)).toBeNull();
  });

  it("geeft een leeg object terug en waarschuwt bij kapotte JSON (geen crash)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const storePath = path.join(tempDir, "broken.json");
    fs.writeFileSync(storePath, "geen geldige JSON {{{", "utf8");

    const result = readOverrideFile(storePath, "testStore");

    expect(result).toEqual({});
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("leest een geldig bestand in een prototype-loos object, óók als het zelf een '__proto__'-sleutel bevat", () => {
    const storePath = path.join(tempDir, "overrides.json");
    // JSON.parse() zelf behandelt "__proto__" al als een gewone eigen sleutel (niet als een
    // prototype-herschrijving, zie het commentaar in overrideSafety.ts) -- deze test bewijst dat
    // readOverrideFile() die eigenschap ook na het herkopiëren behoudt, zonder alsnog te vervuilen.
    fs.writeFileSync(
      storePath,
      JSON.stringify({ playlist1: { done: true }, __proto__: { done: false } }),
      "utf8"
    );

    const result = readOverrideFile<{ done: boolean }>(storePath, "testStore");

    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(hasOverride(result, "playlist1")).toBe(true);
    expect(({} as Record<string, unknown>).done).toBeUndefined();
  });
});

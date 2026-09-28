// @vitest-environment jsdom
// registerPrefs.ts: laden/bewaren/valideren van de filterstand van het trackregister. De component zelf
// (TrackRegister.tsx) is getest in TrackRegister.test.tsx.
import { beforeEach, describe, expect, it } from "vitest";
import {
  REGISTER_PREFS_KEY,
  defaultRegisterPrefs,
  isDefaultRegisterPrefs,
  loadRegisterPrefs,
  saveRegisterPrefs,
  validateRegisterPrefs,
  type RegisterPrefs,
  type RegisterPrefsOptions,
} from "./registerPrefs";

const OPTIONS: RegisterPrefsOptions = {
  bpm: ["128BPM", "96BPM"],
  genre: ["EDM", "OST"],
  album: ["Green Light (f)"],
  group: ["MMC", "DJ CYLOW"],
  sortKeys: ["dkjTitle", "year"],
};

beforeEach(() => window.localStorage.clear());

describe("loadRegisterPrefs / saveRegisterPrefs", () => {
  it("levert de standaardstand op als er nog niets bewaard is", () => {
    expect(loadRegisterPrefs(OPTIONS)).toEqual(defaultRegisterPrefs());
  });

  it("bewaart en herstelt een gekozen filter", () => {
    const prefs: RegisterPrefs = { ...defaultRegisterPrefs(), genre: "EDM", sort: { key: "year", dir: "desc" } };
    saveRegisterPrefs(prefs);
    expect(loadRegisterPrefs(OPTIONS)).toEqual(prefs);
  });

  it("bewaart page niet -- die staat niet eens op RegisterPrefs", () => {
    const prefs = defaultRegisterPrefs();
    saveRegisterPrefs(prefs);
    const stored = JSON.parse(window.localStorage.getItem(REGISTER_PREFS_KEY) ?? "{}");
    expect(stored).not.toHaveProperty("page");
  });

  it("rendert (levert de standaardstand op) bij corrupte JSON, zonder te gooien", () => {
    window.localStorage.setItem(REGISTER_PREFS_KEY, "{dit is geen JSON");
    expect(loadRegisterPrefs(OPTIONS)).toEqual(defaultRegisterPrefs());
  });

  it("levert de standaardstand op als localStorage niet leesbaar is", () => {
    const original = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new Error("geblokkeerd (bv. privémodus)");
    };
    try {
      expect(loadRegisterPrefs(OPTIONS)).toEqual(defaultRegisterPrefs());
    } finally {
      window.localStorage.getItem = original;
    }
  });

  it("gooit niet als het schrijven faalt", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("vol");
    };
    try {
      expect(() => saveRegisterPrefs(defaultRegisterPrefs())).not.toThrow();
    } finally {
      window.localStorage.setItem = original;
    }
  });
});

describe("validateRegisterPrefs", () => {
  it("negeert een genre dat niet meer in de data bestaat, en houdt de rest van de stand", () => {
    const result = validateRegisterPrefs({ genre: "BESTAAT-NIET", bpm: "128BPM" }, OPTIONS);
    expect(result.genre).toBe("");
    expect(result.bpm).toBe("128BPM");
  });

  it("accepteert EMPTY_FILTER en de lege waarde (alle) bij elk select-filter", () => {
    const result = validateRegisterPrefs({ bpm: "__leeg__", genre: "", album: "__leeg__", group: "" }, OPTIONS);
    expect([result.bpm, result.genre, result.album, result.group]).toEqual(["__leeg__", "", "__leeg__", ""]);
  });

  it("negeert een ongeldige sort-key of richting", () => {
    expect(validateRegisterPrefs({ sort: { key: "geen-kolom", dir: "asc" } }, OPTIONS).sort).toBeNull();
    expect(validateRegisterPrefs({ sort: { key: "year", dir: "zijwaarts" } }, OPTIONS).sort).toBeNull();
    expect(validateRegisterPrefs({ sort: { key: "year", dir: "desc" } }, OPTIONS).sort).toEqual({ key: "year", dir: "desc" });
  });

  it("negeert een ongeldige columnSet", () => {
    expect(validateRegisterPrefs({ columnSet: "wat-dan-ook" }, OPTIONS).columnSet).toBe("visible");
    expect(validateRegisterPrefs({ columnSet: "hidden" }, OPTIONS).columnSet).toBe("hidden");
  });

  it("negeert een year dat geen cijferreeks is", () => {
    expect(validateRegisterPrefs({ yearFrom: "2000", yearTo: "twintighonderd" }, OPTIONS)).toMatchObject({
      yearFrom: "2000",
      yearTo: "",
    });
  });

  it("valt terug op de standaardstand bij iets dat geen object is", () => {
    expect(validateRegisterPrefs("EDM", OPTIONS)).toEqual(defaultRegisterPrefs());
    expect(validateRegisterPrefs(null, OPTIONS)).toEqual(defaultRegisterPrefs());
    expect(validateRegisterPrefs(42, OPTIONS)).toEqual(defaultRegisterPrefs());
  });

  it("valt terug op de standaardstand bij lege JSON", () => {
    expect(validateRegisterPrefs({}, OPTIONS)).toEqual(defaultRegisterPrefs());
  });
});

describe("isDefaultRegisterPrefs", () => {
  it("is waar voor de standaardstand, onwaar zodra iets afwijkt", () => {
    expect(isDefaultRegisterPrefs(defaultRegisterPrefs())).toBe(true);
    expect(isDefaultRegisterPrefs({ ...defaultRegisterPrefs(), genre: "EDM" })).toBe(false);
    expect(isDefaultRegisterPrefs({ ...defaultRegisterPrefs(), columnSet: "hidden" })).toBe(false);
    expect(isDefaultRegisterPrefs({ ...defaultRegisterPrefs(), sort: { key: "year", dir: "asc" } })).toBe(false);
  });
});

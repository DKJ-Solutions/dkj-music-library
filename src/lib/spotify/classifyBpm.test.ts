// classifyBpm.ts: de BPM-classificatie-heuristiek binnen MMC. Elk voorbeeld hieronder is een echte
// naam uit Dave's snapshot (data/spotify/snapshot.json, git-ignored) waar mogelijk -- zelfde
// conventie als classifyWorld.test.ts.
import { describe, expect, it } from "vitest";
import { classifyMmcBpm, MMC_BPM_TIERS, BPM_TIER_META, type ClassifiableBpmPlaylist } from "./classifyBpm";
import { parsePlaylistName } from "./parsePlaylistName";

function classify(name: string): ReturnType<typeof classifyMmcBpm> {
  const playlist: ClassifiableBpmPlaylist = { name, parsed: parsePlaylistName(name) };
  return classifyMmcBpm(playlist);
}

describe("classifyMmcBpm -- regel 1: de twee expliciete naam-uitzonderingen", () => {
  it("'Happy Lofi Beats | Cyan Music Mood' -> 96 (echte snapshot-naam)", () => {
    expect(classify("Happy Lofi Beats | Cyan Music Mood (f) Vol. 1")).toBe(96);
  });

  it("'NEW Deep House Mix' -> 112, ondanks dat het typeLabel 'House Mix' normaal 128 zou geven "
    + "(echte snapshot-naam)", () => {
    expect(classify("NEW Deep House Mix | 112BPM | Green Music Mood (f) Vol. 1")).toBe(112);
  });
});

describe("classifyMmcBpm -- regel 2/3: typeLabel-familie -> vaste BPM", () => {
  it("House Mix -> 128", () => {
    expect(classify("House Mix 🟠 Orange Full (f) 🟠 Vol. X")).toBe(128);
  });

  it("Drum & Bass -> 176", () => {
    expect(classify("Drum & Bass 🟢 Green Light (f) 🟢 Vol. 3")).toBe(176);
  });

  it("Drum & Bass Mix -> 176 (dezelfde samengevoegde typeLabel-familie)", () => {
    expect(classify("Drum & Bass Mix 🧊 Cyan Full (f) 🧊 Vol. 1")).toBe(176);
  });

  it("een expliciete BPM-annotatie in de naam wint NIET van het typeLabel (House Mix blijft 128)", () => {
    expect(classify("House Mix | 176BPM | Vol. 1")).toBe(128);
  });
});

describe("classifyMmcBpm -- regel 4: een expliciete BPM in de naam als vangnet zonder herkend typeLabel", () => {
  it("gebruikt parsed.bpm als die toevallig een bekende MMC-tier is", () => {
    expect(classify("Iets zonder typeLabel | 112BPM | Vol. 1")).toBe(112);
  });

  it("geeft null terug als de BPM in de naam geen bekende MMC-tier is", () => {
    expect(classify("Iets zonder typeLabel | 140BPM | Vol. 1")).toBeNull();
  });
});

describe("classifyMmcBpm -- regel 5: geen enkele regel van toepassing -> null (overig/onbekend)", () => {
  it("geeft null terug zonder typeLabel, zonder bpm-annotatie, zonder naam-uitzondering", () => {
    expect(classify("Willekeurige naam zonder structuur")).toBeNull();
  });

  it("geeft null terug voor een lege naam", () => {
    expect(classify("")).toBeNull();
  });
});

describe("MMC_BPM_TIERS / BPM_TIER_META", () => {
  it("heeft precies de vier bekende tiers, in oplopende volgorde", () => {
    expect(MMC_BPM_TIERS).toEqual([96, 112, 128, 176]);
  });

  it("heeft voor elke tier een label en een route onder /spotify/musicmoodcolours", () => {
    for (const tier of MMC_BPM_TIERS) {
      const meta = BPM_TIER_META[tier];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.href.startsWith("/spotify/musicmoodcolours")).toBe(true);
    }
  });
});

// spotifyId: `id_spotify` uit de mix-bron als de sleutel die in de playlistbeschrijving komt te staan
// (Dave, 2026-08-11). Drie dingen worden hier vastgelegd:
//
//  1. wélke waarden de vormcontrole doorlaat -- een sleutel die niet als segment in een beschrijving
//     kan staan, of die niet op acht cijfers eindigt, is geen sleutel;
//  2. dat de staart van `id_spotify` moet kloppen met `id`, en dat een tegenspraak BLOKKEERT in plaats
//     van dat er een van de twee stilzwijgend wint;
//  3. dat een blokkade het schrijven niet stillegt maar terugvalt op het kale ID -- de beschrijving
//     zonder sleutel zou een stap terug zijn.
import { describe, expect, it } from "vitest";
import { descriptionKeyOf, mixIdFromSpotifyId, normalizeSpotifyId, spotifyIdBlocker } from "./spotifyId";
import type { Mix } from "./types";

function makeMix(overrides: Partial<Mix> = {}): Mix {
  return {
    id: "20251108",
    file: "light-cyan.json",
    spotifyId: "mmc_edm_128bpm_light_f_cyan_20251108",
    title: "Nu-Disco Mix · Cyan Light (f) · Vol. 5",
    spotifyTitle: null,
    genre: "Nu-Disco",
    subgenre: "Nu-Disco",
    color: "Cyan",
    density: "Light",
    gender: "f",
    volume: 5,
    date: "2025-11-08",
    bpm: 128,
    slug: null,
    topArtists: [],
    tracks: [],
    ...overrides,
  };
}

describe("normalizeSpotifyId", () => {
  it("neemt een geldige sleutel letterlijk over", () => {
    expect(normalizeSpotifyId("mmc_edm_128bpm_light_f_cyan_20251108")).toBe(
      "mmc_edm_128bpm_light_f_cyan_20251108"
    );
  });

  it("haalt omringende witruimte weg -- dat is geen betekenisverschil", () => {
    expect(normalizeSpotifyId("  mmc_edm_176bpm_full_m_blue_20220406 ")).toBe(
      "mmc_edm_176bpm_full_m_blue_20220406"
    );
  });

  it("levert null bij een lege of ontbrekende waarde", () => {
    expect(normalizeSpotifyId(undefined)).toBeNull();
    expect(normalizeSpotifyId(null)).toBeNull();
    expect(normalizeSpotifyId("   ")).toBeNull();
  });

  it("wijst een waarde ZONDER datumstaart af -- daar valt niet op te koppelen", () => {
    expect(normalizeSpotifyId("mmc_edm_128bpm_light_f_cyan")).toBeNull();
  });

  it("wijst een waarde MET witruimte af -- die kan geen segment in een beschrijving zijn", () => {
    expect(normalizeSpotifyId("mmc edm 128bpm 20251108")).toBeNull();
    expect(normalizeSpotifyId("mmc_edm · 20251108")).toBeNull();
  });

  it("laat het kale ID er niet als sleutel doorheen -- dat is `id`, niet `id_spotify`", () => {
    // De vorm eist minstens één woorddeel vóór de datum. Anders zou een bron die `id_spotify` per
    // ongeluk met `id` vult onopgemerkt blijven.
    expect(normalizeSpotifyId("20251108")).toBeNull();
  });
});

describe("mixIdFromSpotifyId", () => {
  it("levert de acht cijfers aan de staart", () => {
    expect(mixIdFromSpotifyId("mmc_edm_128bpm_light_f_cyan_20251108")).toBe("20251108");
  });

  it("levert null als de vorm niet klopt", () => {
    expect(mixIdFromSpotifyId("mmc_edm_light_cyan")).toBeNull();
    expect(mixIdFromSpotifyId(null)).toBeNull();
  });
});

describe("spotifyIdBlocker", () => {
  it("blokkeert niets als bron en mix het eens zijn", () => {
    expect(spotifyIdBlocker(makeMix())).toBeNull();
  });

  it("blokkeert een mix zonder id -- er is dan geen sleutel om te schrijven", () => {
    expect(spotifyIdBlocker(makeMix({ id: "" }))).toContain("geen id");
  });

  it("blokkeert een ontbrekende of vormloze id_spotify, met de verwachte vorm erbij", () => {
    const reden = spotifyIdBlocker(makeMix({ spotifyId: null }));
    expect(reden).toContain("id_spotify");
    expect(reden).toContain("mmc_edm_128bpm_light_f_cyan_20251108");
  });

  it("BLOKKEERT een staart die een andere mix aanwijst -- de bron spreekt zichzelf dan tegen", () => {
    // Dit is de reden dat dit mechanisme bestaat: zonder deze controle zou de beschrijving van mix
    // 20251108 een sleutel gaan dragen die naar 20240408 wijst, en zou de brug die playlist daarna aan
    // de verkeerde mix koppelen.
    const reden = spotifyIdBlocker(makeMix({ spotifyId: "mmc_edm_128bpm_light_f_cyan_20240408" }));
    expect(reden).toContain("20240408");
    expect(reden).toContain("20251108");
    expect(reden).toContain("djcylow-react");
  });
});

describe("descriptionKeyOf", () => {
  it("levert de volle sleutel waar de bron te vertrouwen is", () => {
    expect(descriptionKeyOf(makeMix())).toBe("mmc_edm_128bpm_light_f_cyan_20251108");
  });

  it("valt terug op het kale mix-ID bij een blokkade -- niet op niets", () => {
    // De blokkade gaat over het OPWAARDEREN. Een beschrijving zonder sleutel zou geen spiegel meer zijn,
    // en dat is een stap terug ten opzichte van wat er al staat.
    expect(descriptionKeyOf(makeMix({ spotifyId: null }))).toBe("20251108");
    expect(descriptionKeyOf(makeMix({ spotifyId: "mmc_edm_128bpm_light_f_cyan_20240408" }))).toBe(
      "20251108"
    );
  });
});

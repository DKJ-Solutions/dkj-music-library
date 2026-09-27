// mixDescription: de playlistbeschrijving als spiegel van de mix-JSON. De afspraak die Dave opgaf:
//
//     Tech House · Red Light (m) · Vol. 6 · 20260615
//
// De zwaartepunten hieronder: dat de formatter precies die vorm oplevert, dat de parser hem terugleest
// (round-trip), dat vrije tekst van Dave nooit verdwijnt, en dat compareDescription per véld meldt waar
// de twee bronnen uiteenlopen -- want dat laatste is het doel: niet alleen schrijven, ook zien wáár het
// niet klopt.
import { describe, expect, it } from "vitest";
import {
  compareDescription,
  formatMixDescription,
  parseMixDescription,
  withMixDescription,
  withoutMixDescription,
} from "./mixDescription";
import { parseMixIdTag } from "./mixIdTag";
import type { Mix } from "./types";

function makeMix(over: Partial<Mix> = {}): Mix {
  return {
    id: "20260615",
    file: "light-red.json",
    spotifyId: null,
    title: "Tech House · Red Light (m) Mix · Vol. 6",
    spotifyTitle: null,
    genre: "House",
    subgenre: "Tech House",
    color: "Red",
    density: "Light",
    gender: "m",
    volume: 6,
    date: "2026-06-15",
    bpm: 128,
    slug: null,
    topArtists: ["Chris Lake"],
    tracks: ["Chris Lake - Turn Off The Lights"],
    ...over,
  };
}

describe("formatMixDescription", () => {
  it("levert exact de afgesproken vorm", () => {
    expect(formatMixDescription(makeMix())).toBe("Tech House · Red Light (m) · Vol. 6 · 20260615");
  });

  it("laat lege velden weg in plaats van een leeg segment te tonen", () => {
    // Een legacy-entry zonder subgenre en zonder volume. "Blue Full (f) · 20240408" is leesbaar;
    // " · Blue Full (f) · Vol.  · 20240408" niet.
    const legacy = makeMix({
      id: "20240408",
      subgenre: null,
      color: "Blue",
      density: "Full",
      gender: "f",
      volume: null,
    });
    expect(formatMixDescription(legacy)).toBe("Blue Full (f) · 20240408");
  });

  it("levert een lege string bij een mix zonder ID -- dan valt er niets te spiegelen", () => {
    expect(formatMixDescription(makeMix({ id: "" }))).toBe("");
  });

  it("zet het ID altijd achteraan, ook als alleen het ID over is", () => {
    const kaal = makeMix({ subgenre: null, color: null, density: null, gender: null, volume: null });
    expect(formatMixDescription(kaal)).toBe("20260615");
  });

  // De vormwissel van 2026-08-11: waar het kale ID stond, staat nu `id_spotify` uit de bron.
  it("schrijft id_spotify als sleutel zodra de bron er een levert", () => {
    const mix = makeMix({ spotifyId: "mmc_edm_128bpm_light_m_red_20260615" });
    expect(formatMixDescription(mix)).toBe(
      "Tech House · Red Light (m) · Vol. 6 · mmc_edm_128bpm_light_m_red_20260615"
    );
  });

  it("valt terug op het kale ID als de bron zichzelf tegenspreekt", () => {
    // De staart wijst een ándere mix aan dan waar hij bij staat -- zie spotifyIdBlocker. Dan is de
    // oude, veilige vorm het antwoord, niet de tegenstrijdige sleutel en ook niet een lege beschrijving.
    const scheef = makeMix({ spotifyId: "mmc_edm_128bpm_light_m_red_20240408" });
    expect(formatMixDescription(scheef)).toBe("Tech House · Red Light (m) · Vol. 6 · 20260615");
  });
});

describe("parseMixDescription", () => {
  it("leest de velden terug uit de eigen vorm (round-trip)", () => {
    const mix = makeMix();
    const geparsed = parseMixDescription(formatMixDescription(mix));
    expect(geparsed).toEqual({
      subgenre: "Tech House",
      color: "Red",
      density: "Light",
      gender: "m",
      volume: 6,
      mixId: "20260615",
      // De helper zet geen `spotifyId`, dus valt de formatter terug op het kale ID -- en dan is de
      // sleutel zoals hij er staat gelijk aan het mix-ID.
      key: "20260615",
    });
  });

  it("leest ook het korte, legacy-achtige blok", () => {
    const geparsed = parseMixDescription("Blue Full (f) · 20240408");
    expect(geparsed).toMatchObject({ subgenre: null, color: "Blue", density: "Full", gender: "f" });
    expect(geparsed?.volume).toBeNull();
  });

  it("negeert vrije tekst achter het blok", () => {
    const geparsed = parseMixDescription(
      "Tech House · Red Light (m) · Vol. 6 · 20260615 — Lekker in de auto"
    );
    expect(geparsed?.subgenre).toBe("Tech House");
    expect(geparsed?.mixId).toBe("20260615");
  });

  it("levert null als er geen blok in staat", () => {
    expect(parseMixDescription("Gewoon een mooie playlist")).toBeNull();
    expect(parseMixDescription("")).toBeNull();
    expect(parseMixDescription(null)).toBeNull();
  });

  it("herkent het oude mix:-formaat, zodat bestaande beschrijvingen niet stuklopen", () => {
    const geparsed = parseMixDescription("mix:20260615 — Liquid D&B");
    expect(geparsed?.mixId).toBe("20260615");
    // De velden staan er niet in: dat is precies waarom zo'n beschrijving "outdated" hoort te zijn.
    expect(geparsed?.subgenre).toBeNull();
    expect(geparsed?.volume).toBeNull();
  });

  it("is tolerant voor extra witruimte -- de beschrijving is met de hand aan te passen", () => {
    const geparsed = parseMixDescription("Tech House ·  Red Light (m)  · Vol.6 · 20260615");
    expect(geparsed).toMatchObject({ subgenre: "Tech House", volume: 6, mixId: "20260615" });
  });

  it("laat het ID ook door de sleutel-parser lezen -- één afspraak, twee lezers", () => {
    const beschrijving = formatMixDescription(makeMix());
    expect(parseMixIdTag(beschrijving)).toBe(parseMixDescription(beschrijving)?.mixId);
  });
});

describe("withMixDescription", () => {
  it("zet het blok op een lege beschrijving", () => {
    expect(withMixDescription(null, makeMix())).toBe("Tech House · Red Light (m) · Vol. 6 · 20260615");
    expect(withMixDescription("   ", makeMix())).toBe("Tech House · Red Light (m) · Vol. 6 · 20260615");
  });

  it("zet het blok VÓÓR bestaande vrije tekst en laat die staan", () => {
    expect(withMixDescription("Lekker in de auto", makeMix())).toBe(
      "Tech House · Red Light (m) · Vol. 6 · 20260615 — Lekker in de auto"
    );
  });

  it("vervangt een verouderd blok en houdt de vrije tekst", () => {
    const oud = "Deep House · Red Light (m) · Vol. 1 · 20260615 — Lekker in de auto";
    expect(withMixDescription(oud, makeMix())).toBe(
      "Tech House · Red Light (m) · Vol. 6 · 20260615 — Lekker in de auto"
    );
  });

  it("vervangt ook een oude mix:-tag -- de overstap gaat automatisch", () => {
    expect(withMixDescription("mix:20260615 — Liquid D&B", makeMix())).toBe(
      "Tech House · Red Light (m) · Vol. 6 · 20260615 — Liquid D&B"
    );
    expect(withMixDescription("mix:20260615", makeMix())).toBe(
      "Tech House · Red Light (m) · Vol. 6 · 20260615"
    );
  });

  it("is idempotent -- twee keer schrijven verandert niets meer", () => {
    const eerste = withMixDescription("Lekker in de auto", makeMix());
    expect(withMixDescription(eerste, makeMix())).toBe(eerste);
  });

  it("laat de beschrijving ongemoeid als er niets te spiegelen valt", () => {
    expect(withMixDescription("Lekker in de auto", makeMix({ id: "" }))).toBe("Lekker in de auto");
  });
});

describe("withoutMixDescription", () => {
  it("komt heen en terug weer op de oorspronkelijke tekst uit", () => {
    const origineel = "Lekker in de auto";
    expect(withoutMixDescription(withMixDescription(origineel, makeMix()))).toBe(origineel);
  });

  it("laat een lege beschrijving over als er alleen een blok stond", () => {
    expect(withoutMixDescription("Tech House · Red Light (m) · Vol. 6 · 20260615")).toBe("");
  });

  it("laat tekst zonder blok ongemoeid", () => {
    expect(withoutMixDescription("Gewoon tekst")).toBe("Gewoon tekst");
    expect(withoutMixDescription(null)).toBe("");
  });
});

// Het doel van deze hele exercitie: niet alleen schrijven, maar kunnen zien wáár de twee bronnen niet
// overeenkomen.
describe("compareDescription", () => {
  it("meldt 'missing' als de beschrijving nog geen blok draagt", () => {
    expect(compareDescription("", makeMix()).state).toBe("missing");
    expect(compareDescription("Gewoon een playlist", makeMix()).state).toBe("missing");
  });

  it("meldt 'in-sync' als elk veld klopt", () => {
    const resultaat = compareDescription(formatMixDescription(makeMix()), makeMix());
    expect(resultaat.state).toBe("in-sync");
    expect(resultaat.diffs).toEqual([]);
  });

  it("blijft 'in-sync' met vrije tekst erachter -- die is van Dave, niet van de vergelijking", () => {
    const met = `${formatMixDescription(makeMix())} — Lekker in de auto`;
    expect(compareDescription(met, makeMix()).state).toBe("in-sync");
  });

  it("meldt per veld wat afwijkt en wat er zou moeten staan", () => {
    // De JSON is bijgesteld nadat de beschrijving was geschreven: ander subgenre én ander volume.
    const oud = "Deep House · Red Light (m) · Vol. 1 · 20260615";
    const resultaat = compareDescription(oud, makeMix());

    expect(resultaat.state).toBe("outdated");
    expect(resultaat.diffs).toEqual([
      { field: "subgenre", inDescription: "Deep House", inMix: "Tech House" },
      { field: "volume", inDescription: "1", inMix: "6" },
    ]);
  });

  it("gebruikt de veldnamen van de mix-bron, want die is de bron van waarheid", () => {
    // In de app heten ze density/gender; in de JSON power/frequency. De melding volgt de JSON.
    const oud = "Tech House · Red Full (f) · Vol. 6 · 20260615";
    expect(compareDescription(oud, makeMix()).diffs.map((d) => d.field)).toEqual([
      "power",
      "frequency",
    ]);
  });

  it("negeert verschil in hoofdletters -- dat is geen inhoudelijke afwijking", () => {
    const anders = "tech house · red light (M) · Vol. 6 · 20260615";
    expect(compareDescription(anders, makeMix()).state).toBe("in-sync");
  });

  it("rekent twee lege velden niet als afwijking", () => {
    const legacy = makeMix({ id: "20240408", subgenre: null, volume: null, color: "Blue", density: "Full", gender: "f" });
    expect(compareDescription(formatMixDescription(legacy), legacy).state).toBe("in-sync");
  });

  // De werkvoorraad van de vormwissel: een playlist die nog het kale ID draagt is niet fout gekoppeld,
  // maar wel verouderd -- en dat hoort als zodanig zichtbaar te zijn, per veld, zoals elk ander verschil.
  it("meldt het kale ID als een afwijking op id_spotify, met de doelwaarde erbij", () => {
    const mix = makeMix({ spotifyId: "mmc_edm_128bpm_light_m_red_20260615" });
    const resultaat = compareDescription("Tech House · Red Light (m) · Vol. 6 · 20260615", mix);

    expect(resultaat.state).toBe("outdated");
    expect(resultaat.diffs).toEqual([
      {
        field: "id_spotify",
        inDescription: "20260615",
        inMix: "mmc_edm_128bpm_light_m_red_20260615",
      },
    ]);
  });

  it("meldt géén afwijking op id_spotify zolang de bron zichzelf tegenspreekt", () => {
    // Anders zou een fout in de bron zich hier als werkvoorraad tonen, terwijl er niets te schrijven is.
    const scheef = makeMix({ spotifyId: "mmc_edm_128bpm_light_m_red_20240408" });
    expect(compareDescription("Tech House · Red Light (m) · Vol. 6 · 20260615", scheef).state).toBe(
      "in-sync"
    );
  });

  it("ziet een oude mix:-tag als 'outdated' -- de velden ontbreken er nog", () => {
    const resultaat = compareDescription("mix:20260615", makeMix());
    expect(resultaat.state).toBe("outdated");
    expect(resultaat.diffs.map((d) => d.field)).toEqual([
      "subgenre",
      "color",
      "power",
      "frequency",
      "volume",
    ]);
  });
});

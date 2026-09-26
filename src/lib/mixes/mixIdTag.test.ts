// mixIdTag: de LEESKANT van de harde sleutel -- het mix-ID uit een playlistbeschrijving halen. Twee
// vormen moeten werken: de huidige (kaal ID als laatste `·`-segment, Dave 2026-07-25) en de oude
// (`mix:20260303`), zodat beschrijvingen die al geschreven zijn niet stuklopen bij de overstap.
//
// De schrijfkant woont in mixDescription.ts en heeft daar zijn eigen tests.
import { describe, expect, it } from "vitest";
import { hasMixId, isKeySegment, parseMixIdTag } from "./mixIdTag";

// De vorm van sinds 2026-08-11: het laatste segment is `id_spotify` in plaats van het kale ID. Dat de
// acht cijfers er nog steeds uit komen is wat de overgang zonder knip laat verlopen -- de rest van de
// app koppelt op dat ID en merkt van de vormwissel niets.
describe("parseMixIdTag -- de huidige vorm (id_spotify achteraan)", () => {
  it("leest het mix-ID uit de staart van de volle sleutel", () => {
    expect(
      parseMixIdTag("Nu-Disco · Cyan Light (f) · Vol. 5 · mmc_edm_128bpm_light_f_cyan_20251108")
    ).toBe("20251108");
  });

  it("leest hem ook met vrije tekst erachter", () => {
    expect(
      parseMixIdTag("Nu-Disco · Cyan Light (f) · Vol. 5 · mmc_edm_128bpm_light_f_cyan_20251108 — Zomer")
    ).toBe("20251108");
  });

  it("negeert een sleutel die NIET het laatste segment is", () => {
    expect(parseMixIdTag("mmc_edm_128bpm_light_f_cyan_20251108 · Vol. 5")).toBeNull();
  });
});

describe("isKeySegment", () => {
  it("herkent alle drie de vormen als sleutel-segment", () => {
    expect(isKeySegment("mmc_edm_128bpm_light_f_cyan_20251108")).toBe(true);
    expect(isKeySegment("20260615")).toBe(true);
    expect(isKeySegment("mix:20260615")).toBe(true);
  });

  it("houdt een gewoon veld erbuiten", () => {
    expect(isKeySegment("Vol. 6")).toBe(false);
    expect(isKeySegment("Red Light (m)")).toBe(false);
    expect(isKeySegment("Tech House")).toBe(false);
  });
});

describe("parseMixIdTag -- de huidige vorm (kaal ID achteraan)", () => {
  it("leest het ID uit een volledige spiegel-beschrijving", () => {
    expect(parseMixIdTag("Tech House · Red Light (m) · Vol. 6 · 20260615")).toBe("20260615");
  });

  it("leest het ID ook met vrije tekst erachter", () => {
    expect(parseMixIdTag("Tech House · Red Light (m) · Vol. 6 · 20260615 — Lekker in de auto")).toBe(
      "20260615"
    );
  });

  it("werkt met een kort blok, bv. een legacy-mix zonder subgenre of volume", () => {
    expect(parseMixIdTag("Blue Full (f) · 20240408")).toBe("20240408");
  });

  it("negeert een kaal getal ZONDER voorafgaand segment -- dan is het geen ID maar tekst", () => {
    // Precies de dubbelzinnigheid die het oude `mix:`-voorvoegsel afdekte; hier doet de positie dat.
    expect(parseMixIdTag("20260615")).toBeNull();
    expect(parseMixIdTag("Opgenomen op 20260303")).toBeNull();
  });

  it("negeert een kaal getal dat NIET het laatste segment is", () => {
    // Er staat nog een segment achter, dus dit is niet de afgesproken plek voor het ID.
    expect(parseMixIdTag("Tech House · 20260615 · Vol. 6")).toBeNull();
  });

  it("leest het ID vóór de vrije-tekst-scheiding, niet een datum erachter", () => {
    expect(parseMixIdTag("Tech House · Red Light (m) · Vol. 6 · 20260615 — sinds 20240101")).toBe(
      "20260615"
    );
  });
});

describe("parseMixIdTag -- de oude vorm (mix:-voorvoegsel)", () => {
  it("blijft leesbaar, ook met vrije tekst erachter", () => {
    expect(parseMixIdTag("mix:20260303")).toBe("20260303");
    expect(parseMixIdTag("mix:20260303 — Tech House, Vol. 1")).toBe("20260303");
  });

  it("vindt de tag ook midden in een beschrijving", () => {
    expect(parseMixIdTag("Liquid Drum & Bass mix van maart. mix:20240408")).toBe("20240408");
  });

  it("is tolerant voor hoofdletters en witruimte rond de dubbele punt", () => {
    expect(parseMixIdTag("MIX:20260303")).toBe("20260303");
    expect(parseMixIdTag("Mix: 20260303")).toBe("20260303");
    expect(parseMixIdTag("mix : 20260303")).toBe("20260303");
  });

  it("eist acht cijfers", () => {
    expect(parseMixIdTag("mix:2026030")).toBeNull(); // zeven
  });

  it("neemt bij meerdere tags de eerste", () => {
    expect(parseMixIdTag("mix:20260303 en mix:20240408")).toBe("20260303");
  });
});

describe("parseMixIdTag -- geen ID", () => {
  it("levert null bij tekst zonder ID, leeg, null of undefined", () => {
    expect(parseMixIdTag("Gewoon een mooie playlist")).toBeNull();
    expect(parseMixIdTag("")).toBeNull();
    expect(parseMixIdTag(null)).toBeNull();
    expect(parseMixIdTag(undefined)).toBeNull();
  });
});

describe("hasMixId", () => {
  it("onderscheidt het juiste ID van een verkeerd en van een ontbrekend", () => {
    expect(hasMixId("Tech House · Red Light (m) · Vol. 6 · 20260615", "20260615")).toBe(true);
    expect(hasMixId("Tech House · Red Light (m) · Vol. 6 · 20240408", "20260615")).toBe(false);
    expect(hasMixId("geen id", "20260615")).toBe(false);
    expect(hasMixId(null, "20260615")).toBe(false);
  });

  it("werkt ook op de oude vorm", () => {
    expect(hasMixId("mix:20260615", "20260615")).toBe(true);
  });
});

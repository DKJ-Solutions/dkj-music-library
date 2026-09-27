import { describe, expect, it } from "vitest";
import { primaryArtistOf, remixArtistOf, versionPart } from "./primaryArtist";

describe("versionPart", () => {
  it("vindt het stuk na een streepje of tussen haakjes met een versiewoord", () => {
    expect(versionPart("Filmic - CRi Remix")).toBe("CRi Remix");
    expect(versionPart("Maybe (Fred V & Grafix Remix)")).toBe("Fred V & Grafix Remix");
    expect(versionPart("Wings (I Won't Let You Down) [Krakota Remix]")).toBe("Krakota Remix");
    expect(versionPart("Tribute To Me - Mixed")).toBeNull();
    expect(versionPart("Light Me Up (feat. Rêve)")).toBeNull();
  });
});

describe("primaryArtistOf", () => {
  it("geeft de remixer of editor voorrang op de hoofdartiest", () => {
    expect(primaryArtistOf("Filmic - CRi Remix", ["Above & Beyond", "CRi"])).toBe("CRi");
    expect(primaryArtistOf("Sun In Your Eyes - Spencer Brown Edit", ["Above & Beyond", "Spencer Brown"])).toBe("Spencer Brown");
    expect(primaryArtistOf("Falling (JORDAZ Radio Mix)", ["Aaron Smith", "Indiblu", "JORDAZ"])).toBe("JORDAZ");
  });

  it("kiest bij twee remixers de eerstgenoemde", () => {
    expect(primaryArtistOf("Surge - PROFF & Igor Garanin Remix", ["Above & Beyond", "PROFF", "Igor Garanin"])).toBe("PROFF");
  });

  it("vergelijkt zonder hoofdletters, accenten en leestekens", () => {
    expect(remixArtistOf("Be Alive - Krunk Remix Edit", ["Bonka", "Luciana", "Krunk!"])).toBe("Krunk!");
    expect(remixArtistOf("Something - Keeno remix", ["Aze", "Keeno"])).toBe("Keeno");
  });

  it("houdt de hoofdartiest bij een versie zonder naam, of een naam die niet bij de track staat", () => {
    expect(primaryArtistOf("Levels - Radio Edit", ["Avicii"])).toBe("Avicii");
    expect(primaryArtistOf("Vois sur ton chemin - Techno Mix", ["BENNETT"])).toBe("BENNETT");
    expect(primaryArtistOf("The Wolves - Lenzman Remix", ["Amy Steele"])).toBe("Amy Steele");
    expect(primaryArtistOf("Drowsy Maggie", ["Aaron Dolan", "Harvey Dhar"])).toBe("Aaron Dolan");
  });

  it("matcht een naam alleen als heel woord", () => {
    expect(remixArtistOf("We Are Your Family - Aristo Club Mix", ["Aristofreeks", "Kathy Sledge"])).toBeNull();
  });

  it("geeft null zonder artiesten", () => {
    expect(primaryArtistOf("Iets - X Remix", [])).toBeNull();
    expect(primaryArtistOf(null, [])).toBeNull();
  });
});

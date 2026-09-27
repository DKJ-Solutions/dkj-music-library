import { describe, expect, it } from "vitest";
import { primaryArtistOf, remixArtistOf, titleCreditOf, versionParts } from "./primaryArtist";

describe("versionParts", () => {
  it("vindt de stukken na een streepje of tussen haakjes met een versiewoord, de laatste eerst", () => {
    expect(versionParts("Filmic - CRi Remix")).toEqual(["CRi Remix"]);
    expect(versionParts("Maybe (Fred V & Grafix Remix)")).toEqual(["Fred V & Grafix Remix"]);
    expect(versionParts("Wings (I Won't Let You Down) [Krakota Remix]")).toEqual(["Krakota Remix"]);
    expect(versionParts("Iets (A Remix) - B Edit")).toEqual(["B Edit", "A Remix"]);
    expect(versionParts("Tribute To Me - Mixed")).toEqual([]);
    expect(versionParts("Light Me Up (feat. Rêve)")).toEqual([]);
  });
});

describe("primaryArtistOf", () => {
  it("geeft de remixer of editor voorrang op de hoofdartiest", () => {
    expect(primaryArtistOf("Filmic - CRi Remix", ["Above & Beyond", "CRi"])).toBe("CRi");
    expect(primaryArtistOf("Sun In Your Eyes - Spencer Brown Edit", ["Above & Beyond", "Spencer Brown"])).toBe("Spencer Brown");
    expect(primaryArtistOf("Falling (JORDAZ Radio Mix)", ["Aaron Smith", "Indiblu", "JORDAZ"])).toBe("JORDAZ");
  });

  it("kiest bij twee remixers van de track de eerstgenoemde", () => {
    expect(primaryArtistOf("Surge - PROFF & Igor Garanin Remix", ["Above & Beyond", "PROFF", "Igor Garanin"])).toBe("PROFF");
  });

  it("vergelijkt artiesten zonder hoofdletters, accenten en leestekens, en neemt de Spotify-spelling", () => {
    expect(remixArtistOf("Be Alive - Krunk Remix Edit", ["Bonka", "Luciana", "Krunk!"])).toBe("Krunk!");
    expect(remixArtistOf("Something - Keeno remix", ["Aze", "Keeno"])).toBe("Keeno");
    expect(remixArtistOf("We Are Your Family - Aristo Club Mix", ["Aristofreeks", "Kathy Sledge"])).toBeNull();
  });

  it("neemt de naam uit de titel als de remixer niet bij de track staat", () => {
    expect(primaryArtistOf("The Wolves - Lenzman Remix", ["Amy Steele"])).toBe("Lenzman");
    expect(primaryArtistOf("Good Times - Martin Sharp Remix", ["Aristofreeks", "The Next Step"])).toBe("Martin Sharp");
    expect(primaryArtistOf("Vois sur ton chemin - Techno Mix", ["BENNETT"])).toBe("Techno");
  });

  it("houdt de hoofdartiest bij een versie zonder naam, of een titel zonder versie", () => {
    expect(primaryArtistOf("Levels - Radio Edit", ["Avicii"])).toBe("Avicii");
    expect(primaryArtistOf("Scavenger - Original Mix", ["Andromedha"])).toBe("Andromedha");
    expect(primaryArtistOf("Highway - Extended Club Mix", ["X"])).toBe("X");
    expect(primaryArtistOf("Drowsy Maggie", ["Aaron Dolan", "Harvey Dhar"])).toBe("Aaron Dolan");
  });

  it("geeft null zonder artiesten en zonder credit", () => {
    expect(primaryArtistOf("Iets - Radio Edit", [])).toBeNull();
    expect(primaryArtistOf(null, [])).toBeNull();
  });
});

describe("titleCreditOf", () => {
  it("laat versiewoorden, een jaartal erachter en aanhalingstekens weg", () => {
    expect(titleCreditOf("Destination Calabria - Drunkenmunky 2007 Remake")).toBe("Drunkenmunky");
    expect(titleCreditOf("Aristo - Aristo Club Mix")).toBe("Aristo");
    expect(titleCreditOf("My Selecta - 'Monster Funk' Mix - Edit")).toBe("Monster Funk");
    expect(titleCreditOf("I Leave the World Today - Special D. Remix Edit")).toBe("Special D.");
  });

  it("neemt bij een komma de eerste naam, en laat een & staan", () => {
    expect(titleCreditOf("Shine on Me - Misha Klein, No Hopes Remix")).toBe("Misha Klein");
    expect(titleCreditOf("The Siren - Camo & Krooked Remix")).toBe("Camo & Krooked");
  });

  it("ziet een jaartal, plaatformaat of landcode niet als naam", () => {
    expect(titleCreditOf("Days Go By - 2019 Mix")).toBeNull();
    expect(titleCreditOf("All Night Long - 2K21 Mix")).toBeNull();
    expect(titleCreditOf("Horny - '98 Radio Edit")).toBeNull();
    expect(titleCreditOf('Knock on Wood - 1985 7" Remix')).toBeNull();
    expect(titleCreditOf("The Groovy Cycle - 12inch Mix")).toBeNull();
    expect(titleCreditOf("Watch Out - Uk Radio Edit")).toBeNull();
    expect(titleCreditOf("Private Show - Re-Edit")).toBeNull();
    expect(titleCreditOf("Show Me the Light - feat. Starling - VIP")).toBeNull();
  });

  it("laat een artiest die 1991 heet gewoon voorgaan", () => {
    expect(primaryArtistOf("Tell Me Why - 1991 Remix", ["Supermode", "1991"])).toBe("1991");
  });
});

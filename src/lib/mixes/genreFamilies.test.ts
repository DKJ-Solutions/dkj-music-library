// De afleiding van Dave's bovenste laag (TYPE: EDM/ROCK/POP/ALT) uit de genre-velden van de
// mix-JSON's en uit de naamgevingsfamilie van een playlist. Pure functies, geen fs.
import { describe, expect, it } from "vitest";
import { GENRE_FAMILIES, genreToFamily, isGenreFamily, typeLabelToFamily } from "./genreFamilies";

describe("GENRE_FAMILIES", () => {
  it("bevat precies Dave's vier soorten, in zijn eigen volgorde", () => {
    expect(GENRE_FAMILIES).toEqual(["EDM", "ROCK", "POP", "ALT"]);
  });
});

describe("isGenreFamily", () => {
  it("herkent een familie ongeacht casing en witruimte", () => {
    expect(isGenreFamily("EDM")).toBe(true);
    expect(isGenreFamily(" edm ")).toBe(true);
    expect(isGenreFamily("Pop")).toBe(true);
  });

  it("wijst een genre af dat geen familie is, en null", () => {
    expect(isGenreFamily("House")).toBe(false);
    expect(isGenreFamily("Tech House")).toBe(false);
    expect(isGenreFamily(null)).toBe(false);
  });
});

describe("genreToFamily", () => {
  it("mapt de vier toegestane genre-waarden uit de veldspec naar EDM", () => {
    // src/data/mixes/README.md §genre schrijft precies deze vier voor.
    expect(genreToFamily("House")).toBe("EDM");
    expect(genreToFamily("Techno")).toBe("EDM");
    expect(genreToFamily("Nu-Disco")).toBe("EDM");
    expect(genreToFamily("Drum & Bass")).toBe("EDM");
  });

  it("werkt ook op een subgenre, zodat een entry met alleen een subgenre niet leeg blijft", () => {
    expect(genreToFamily("Tech House")).toBe("EDM");
    expect(genreToFamily("Liquid Drum & Bass")).toBe("EDM");
    expect(genreToFamily("Melodic Techno")).toBe("EDM");
    expect(genreToFamily("Progressive House")).toBe("EDM");
  });

  it("verdraagt de schrijfvarianten die in de bestanden voorkomen", () => {
    expect(genreToFamily("Drum and Bass")).toBe("EDM");
    expect(genreToFamily("DnB")).toBe("EDM");
    expect(genreToFamily("Nu Disco")).toBe("EDM");
  });

  it("geeft een legacy-entry die zélf al een familie draagt ongewijzigd terug", () => {
    // De JSON's dragen een handvol `"genre": "EDM"`-entries -- volgens de veldspec fout, maar echt.
    expect(genreToFamily("EDM")).toBe("EDM");
  });

  it("geeft null bij niets of bij een onbekend genre -- liever leeg dan een gok", () => {
    expect(genreToFamily(null)).toBeNull();
    expect(genreToFamily("")).toBeNull();
    expect(genreToFamily("Kerstmuziek")).toBeNull();
  });
});

describe("typeLabelToFamily", () => {
  it("leidt de soort af uit de naamgevingsfamilies waar die onmiskenbaar is", () => {
    expect(typeLabelToFamily("House Mix")).toBe("EDM");
    expect(typeLabelToFamily("Drum & Bass (Mix)")).toBe("EDM");
    expect(typeLabelToFamily("EDM-emmer")).toBe("EDM");
    expect(typeLabelToFamily("Music Mood")).toBe("EDM");
    expect(typeLabelToFamily("Classic Pop")).toBe("POP");
    expect(typeLabelToFamily("ALT")).toBe("ALT");
  });

  it("laat de gelegenheids-families leeg -- die zeggen niets over de muzieksoort", () => {
    expect(typeLabelToFamily("Top 100")).toBeNull();
    expect(typeLabelToFamily("OST")).toBeNull();
    expect(typeLabelToFamily("D&D")).toBeNull();
    expect(typeLabelToFamily("Phase/Feestzaal")).toBeNull();
  });

  it("geeft null zonder herkend typeLabel", () => {
    expect(typeLabelToFamily(null)).toBeNull();
  });
});

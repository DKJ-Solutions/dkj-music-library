import { describe, expect, it } from "vitest";
import { fileNameOf, fileTitle, joinArtists, safeFileName, titleNameOf } from "./fileName";

describe("fileNameOf", () => {
  it("volgt Dave's voorbeelden", () => {
    expect(fileNameOf("Higher - David Penn Remix", ["Abel Ramos", "David Penn"])).toBe("Abel Ramos - Higher (David Penn Remix)");
    expect(fileNameOf("Bryde's Whale - New Ordinance Edit", ["Airdraw", "Jo.E", "Aaren", "New Ordinance"])).toBe(
      "Airdraw, Jo.E & Aaren - Bryde's Whale (New Ordinance Edit)"
    );
    expect(fileNameOf("Can You Feel It - Luttrell Remix", ["Jaded", "Luttrell"])).toBe("Jaded - Can You Feel It (Luttrell Remix)");
  });

  it("haalt bij twee remixers ze allebei uit het artiestendeel", () => {
    expect(fileNameOf("Surge - PROFF & Igor Garanin Remix", ["Above & Beyond", "PROFF", "Igor Garanin"])).toBe(
      "Above & Beyond - Surge (PROFF & Igor Garanin Remix)"
    );
  });

  it("laat een remixer die niet bij de track staat gewoon in de versie", () => {
    expect(fileNameOf("The Wolves - Lenzman Remix", ["Amy Steele"])).toBe("Amy Steele - The Wolves (Lenzman Remix)");
  });

  it("houdt de hoofdartiest als die zelf de remix maakte", () => {
    expect(fileNameOf("Heartbeat Loud - Andy C VIP", ["Andy C", "Fiora"])).toBe("Andy C & Fiora - Heartbeat Loud (Andy C VIP)");
  });

  it("zet een versie tussen haakjes en laat bestaande haakjes staan", () => {
    expect(fileNameOf("Levels - Radio Edit", ["Avicii"])).toBe("Avicii - Levels (Radio Edit)");
    expect(fileNameOf("Falling (JORDAZ Radio Mix)", ["Aaron Smith", "Indiblu", "JORDAZ"])).toBe(
      "Aaron Smith & Indiblu - Falling (JORDAZ Radio Mix)"
    );
    expect(fileNameOf("Drowsy Maggie", ["Aaron Dolan", "Harvey Dhar"])).toBe("Aaron Dolan & Harvey Dhar - Drowsy Maggie");
  });

  it("zet een artiest die de titel als featuring noemt niet nog eens vooraan", () => {
    expect(fileNameOf("Take Over Control (feat. Eva Simons) - Radio Edit", ["Afrojack", "Eva Simons"])).toBe(
      "Afrojack - Take Over Control (feat. Eva Simons) (Radio Edit)"
    );
  });

  it("herkent een remixer die de titel korter noemt, en featuring zonder haakjes", () => {
    expect(fileNameOf("Lose My Mind (feat. Mr Gabriel) [Luttrell Remix]", ["Jai Wolf", "Eric Luttrell"])).toBe(
      "Jai Wolf - Lose My Mind (feat. Mr Gabriel) [Luttrell Remix]"
    );
    expect(fileNameOf("Kawir feat. Hatami", ["SIAAH", "HATAMI"])).toBe("SIAAH - Kawir feat. Hatami");
    expect(fileNameOf("Run with the Wolves", ["The Prodigy", "Wolves"])).toBe("The Prodigy & Wolves - Run with the Wolves");
  });

  it("geeft null zonder titel", () => {
    expect(fileNameOf(null, ["A"])).toBeNull();
    expect(fileNameOf("  ", ["A"])).toBeNull();
  });
});

describe("hulpfuncties", () => {
  it("joinArtists", () => {
    expect([joinArtists([]), joinArtists(["A"]), joinArtists(["A", "B"]), joinArtists(["A", "B", "C"])]).toEqual([
      "", "A", "A & B", "A, B & C",
    ]);
  });

  it("fileTitle zet elk stuk na een streepje tussen haakjes", () => {
    expect(fileTitle("Somebody to Love (Salt Shaker Remix) - Radio Edit")).toBe("Somebody to Love (Salt Shaker Remix) (Radio Edit)");
    expect(fileTitle("19-2000 - Soulchild Remix")).toBe("19-2000 (Soulchild Remix)");
  });

  it("safeFileName haalt wat Windows weigert eruit", () => {
    expect(safeFileName("AC/DC - Demedim Mi?")).toBe("AC-DC - Demedim Mi");
    expect(safeFileName('Ba:sen - "Live" <1>|*')).toBe("Ba-sen - Live 1");
    expect(safeFileName("Track...")).toBe("Track");
  });
});

describe("titleNameOf", () => {
  it("geeft alleen de titel, in de vorm van dkj_file; een remix van een artiest blijft staan", () => {
    expect(titleNameOf("Higher - David Penn Remix")).toBe("Higher (David Penn Remix)");
    expect(titleNameOf("Falling (JORDAZ Radio Mix)")).toBe("Falling (JORDAZ Radio Mix)");
  });

  it("haalt generieke versie-aanduidingen weg", () => {
    expect(titleNameOf("99 Biker Friends (Main Version) (Explicit)")).toBe("99 Biker Friends");
    expect(titleNameOf("2 up in the Morning (Radio Mix)")).toBe("2 up in the Morning");
    expect(titleNameOf("Levels - Radio Edit")).toBe("Levels");
    expect(titleNameOf("Title - Main Version - Explicit")).toBe("Title");
    expect(titleNameOf("Title (Remastered 2011)")).toBe("Title");
    expect(titleNameOf('Title (7" Single Edit; 2017 Remaster)')).toBe("Title");
    expect(titleNameOf("Title [Mixed]")).toBe("Title");
    expect(titleNameOf("Title (Radio-Edit)")).toBe("Title");
  });

  it("haalt featuring weg, tussen haakjes en los", () => {
    expect(titleNameOf("Titanium (feat. Sia)")).toBe("Titanium");
    expect(titleNameOf("Song [ft. X] (Extended Mix)")).toBe("Song");
    expect(titleNameOf("Song feat. X (Radio Edit)")).toBe("Song");
  });

  it("laat van een groep met meerdere delen alleen het generieke deel weg", () => {
    expect(titleNameOf("Song (Danny Byrd Remix; Explicit)")).toBe("Song (Danny Byrd Remix)");
    expect(titleNameOf("Hey (Hayden James Remix, Extended)")).toBe("Hey (Hayden James Remix)");
  });

  it("laat staan wat bij de titel hoort", () => {
    expect(titleNameOf("(I Can't Get No) Satisfaction")).toBe("(I Can't Get No) Satisfaction");
    expect(titleNameOf("Blue (Da Ba Dee)")).toBe("Blue (Da Ba Dee)");
    expect(titleNameOf("Shake (Shake, Shake, Shake)")).toBe("Shake (Shake, Shake, Shake)");
  });

  it("valt terug op de titel met versie als er anders niets overblijft", () => {
    expect(titleNameOf("(Radio Edit)")).toBe("(Radio Edit)");
  });

  it("laat tekens staan die een bestandsnaam niet mag hebben, en geeft null zonder titel", () => {
    expect(titleNameOf("What?  Why: Now")).toBe("What? Why: Now");
    expect(titleNameOf("  ")).toBeNull();
    expect(titleNameOf(null)).toBeNull();
  });
});

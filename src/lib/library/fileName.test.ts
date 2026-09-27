import { describe, expect, it } from "vitest";
import { fileNameOf, fileTitle, joinArtists, safeFileName } from "./fileName";

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

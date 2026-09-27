import { describe, expect, it } from "vitest";
import { isLiveTitle, studioTitleOf } from "./liveTitle";

describe("studioTitleOf", () => {
  it("laat een live-stuk na een streepje weg, en alles erachter", () => {
    expect(studioTitleOf("Clocks - Live")).toBe("Clocks");
    expect(studioTitleOf("Neon - Live at the Nokia Theatre, Los Angeles, CA - December 2007")).toBe("Neon");
    expect(studioTitleOf("Layla - Acoustic; Live at MTV Unplugged, 1992; 2013 Remaster")).toBe("Layla");
    expect(studioTitleOf("Mess of Me - Live [Bonus Track]")).toBe("Mess of Me");
    expect(studioTitleOf("Song - Radio Edit - Live")).toBe("Song - Radio Edit");
  });

  it("laat een live-stuk tussen haakjes weg, maar niet aan het begin van de titel", () => {
    expect(studioTitleOf("Alive (Live)")).toBe("Alive");
    expect(studioTitleOf("Lady Marmalade - Live (1998 Hammerstein Ballroom)")).toBe("Lady Marmalade");
    expect(studioTitleOf("(Can't Live Without Your) Love And Affection")).toBe("(Can't Live Without Your) Love And Affection");
  });

  it("laat live in de titel zelf staan", () => {
    for (const title of ["Live Forever", "Live Is Life", "Played-A-Live (The Bongo Song)", "Live Another Day - M&F's Mix"]) {
      expect(studioTitleOf(title)).toBe(title);
      expect(isLiveTitle(title)).toBe(false);
    }
    expect(studioTitleOf("Live Is Life - Live")).toBe("Live Is Life");
  });

  it("herkent een live-titel", () => {
    expect(isLiveTitle("About A Girl - Live")).toBe(true);
    expect(isLiveTitle("About A Girl")).toBe(false);
  });
});

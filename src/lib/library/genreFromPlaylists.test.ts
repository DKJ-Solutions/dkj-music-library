import { describe, expect, it } from "vitest";
import { genreFromPlaylists, genreOfPlaylist } from "./genreFromPlaylists";

describe("genreOfPlaylist", () => {
  it("leest het genre als los woord uit de naam", () => {
    expect(genreOfPlaylist("Magenta Light (m) ♦️ 128BPM EDM")).toBe("EDM");
    expect(genreOfPlaylist("Purple Light (f) 🟣 Classic Pop")).toBe("POP");
    expect(genreOfPlaylist("Dutch Pop | DJ Cylow")).toBe("POP");
    expect(genreOfPlaylist("Green Light (f) | POP | Bruiloft")).toBe("POP");
    expect(genreOfPlaylist("Yellow Full (m) 🟡 ALT")).toBe("ALT");
    expect(genreOfPlaylist("Magenta Full | OST")).toBe("OST");
  });

  it("telt House Mix, Drum & Bass en DNB als EDM", () => {
    expect(genreOfPlaylist("House Mix 🟠 Orange Full (f) 🟠 Vol. X")).toBe("EDM");
    expect(genreOfPlaylist("Drum & Bass Mix 🟠 Orange Light (m) 🟠 Vol. X")).toBe("EDM");
    expect(genreOfPlaylist("Green Light (f) |  DNB | Bruiloft | Love")).toBe("EDM");
  });

  it("telt geen woord dat het genre alleen bevat, en geeft null zonder genre", () => {
    expect(genreOfPlaylist("Popcorn Classics")).toBeNull();
    expect(genreOfPlaylist("Alternative Hits")).toBeNull();
    expect(genreOfPlaylist("Orange Full (f) 🟠 Top 100")).toBeNull();
    expect(genreOfPlaylist("Phase 1, Feestzaal (2026)")).toBeNull();
  });
});

describe("genreFromPlaylists", () => {
  it("kiest het genre dat de meeste playlists noemen", () => {
    expect(genreFromPlaylists(["Red Full (m) 🔴 ALT", "Red Full (m) 🔴 176BPM EDM", "Drum & Bass 🔴 Red Full (m) 🔴 Vol. X"])).toBe("EDM");
    expect(genreFromPlaylists(["Orange Full (f) 🟠 Top 100", "All Pop"])).toBe("POP");
  });

  it("blijft leeg bij een gelijke stand of zonder genre", () => {
    expect(genreFromPlaylists(["Blue Light (f) 🔵 Classic Pop", "Blue Light (f) 🔵 ALT"])).toBeNull();
    expect(genreFromPlaylists(["Orange Full (f) 🟠 Top 100"])).toBeNull();
    expect(genreFromPlaylists([])).toBeNull();
  });
});

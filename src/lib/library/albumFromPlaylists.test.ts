import { describe, expect, it } from "vitest";
import { albumFromPlaylists, albumOfPlaylist, albumsOfPlaylists, isFeestzaalPlaylist } from "./albumFromPlaylists";

describe("albumOfPlaylist", () => {
  it("haalt kleur, dichtheid en geslacht uit de naam, in elke volgorde", () => {
    expect(albumOfPlaylist("Magenta Light (m) ♦️ 128BPM EDM")).toBe("Magenta Light (m)");
    expect(albumOfPlaylist("House Mix 🟠 Orange Full (f) 🟠 Vol. X")).toBe("Orange Full (f)");
    expect(albumOfPlaylist("EDM 128BPM 🟠 Orange Light (f) 🟠 Vol. 1")).toBe("Orange Light (f)");
  });

  it("geeft null als een van de drie ontbreekt", () => {
    expect(albumOfPlaylist("Green Full | OST")).toBeNull();
    expect(albumOfPlaylist("Mijn favorieten")).toBeNull();
  });
});

describe("albumFromPlaylists", () => {
  it("geeft het album als alle album-playlists hetzelfde noemen", () => {
    expect(albumFromPlaylists(["Magenta Light (m) ♦️ 128BPM EDM", "Mijn favorieten", "Magenta Light (m) ♦️ Top 100"])).toBe(
      "Magenta Light (m)"
    );
  });

  it("blijft leeg bij verschillende albums of geen album-playlist", () => {
    expect(albumFromPlaylists(["Cyan Full (f) 🧊 Classic Pop", "Green Full (f) 🟢 Classic Pop"])).toBeNull();
    expect(albumFromPlaylists(["Green Full | OST"])).toBeNull();
    expect(albumFromPlaylists([])).toBeNull();
  });

  it("geeft Cyan Full (f) bij een Feestzaal-playlist, ook als de andere playlists iets anders noemen", () => {
    expect(albumFromPlaylists(["Phase 2A, Feestzaal (2026)"])).toBe("Cyan Full (f)");
    expect(albumFromPlaylists(["ALLES | Feestzaal (2026) | DJ Cylow", "Cyan Light (f) 🧊 Classic Pop"])).toBe("Cyan Full (f)");
    expect(albumFromPlaylists(["Green Full (f) 🟢 Classic Pop", "Cyan Light (f) 🧊 Classic Pop", "phase 1, feestzaal"])).toBe("Cyan Full (f)");
  });
});

describe("isFeestzaalPlaylist", () => {
  it("herkent Feestzaal als los woord, zonder op hoofdletters te letten", () => {
    expect(isFeestzaalPlaylist("Phase 3D, Feestzaal (2026)")).toBe(true);
    expect(isFeestzaalPlaylist("FEESTZAAL")).toBe(true);
    expect(isFeestzaalPlaylist("Feestzaalhuur")).toBe(false);
    expect(isFeestzaalPlaylist("Magenta Light (m) ♦️ 128BPM EDM")).toBe(false);
  });
});

describe("albumsOfPlaylists", () => {
  it("noemt elk album één keer, in de volgorde van de opties", () => {
    expect(
      albumsOfPlaylists(["Green Light (f) 🟢 Pop", "Cyan Full (f) 🧊 Classic Pop", "Mijn favorieten", "Green Full (f) 🟢 Classic Pop", "Cyan Full (f) 🧊 Top 100"])
    ).toEqual(["Green Light (f)", "Green Full (f)", "Cyan Full (f)"]);
    expect(albumsOfPlaylists(["Green Full | OST"])).toEqual([]);
  });
});

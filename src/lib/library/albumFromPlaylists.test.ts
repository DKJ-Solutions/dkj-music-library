import { describe, expect, it } from "vitest";
import { albumFromPlaylists, albumOfPlaylist } from "./albumFromPlaylists";

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
});

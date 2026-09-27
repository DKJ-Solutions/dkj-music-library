import { describe, expect, it } from "vitest";
import { bpmFromPlaylists, bpmOfPlaylist } from "./bpmFromPlaylists";

describe("bpmOfPlaylist", () => {
  it("leest de BPM uit de naam, ook 144", () => {
    expect(bpmOfPlaylist("Magenta Light (m) ♦️ 128BPM EDM")).toBe("128BPM");
    expect(bpmOfPlaylist("Green Light (f) 🟢 EDM 112BPM")).toBe("112BPM");
    expect(bpmOfPlaylist("Red Full (m) 🔴 144BPM EDM")).toBe("144BPM");
  });

  it("volgt de vaste regels: House Mix 128, Drum & Bass Mix en D&B 176", () => {
    expect(bpmOfPlaylist("House Mix 🟠 Orange Full (f) 🟠 Vol. X")).toBe("128BPM");
    expect(bpmOfPlaylist("Drum & Bass Mix 🟠 Orange Light (m) 🟠 Vol. X")).toBe("176BPM");
    expect(bpmOfPlaylist("D&B")).toBe("176BPM");
    expect(bpmOfPlaylist("Green Light (f) |  DNB | Bruiloft | Love")).toBe("176BPM");
  });

  it("geeft null zonder BPM", () => {
    expect(bpmOfPlaylist("Orange Full (f) 🟠 Top 100")).toBeNull();
    expect(bpmOfPlaylist("Phase 1, Feestzaal (2026)")).toBeNull();
  });
});

describe("bpmFromPlaylists", () => {
  it("kiest de BPM die de meeste playlists noemen", () => {
    expect(bpmFromPlaylists(["Magenta Full (m) ♦️ 176BPM EDM", "Red Full (f) 🔴 176BPM EDM", "Magenta Light (m) ♦️ 128BPM EDM"])).toBe(
      "176BPM"
    );
    expect(bpmFromPlaylists(["Orange Full (f) 🟠 Top 100", "Orange Light (m) 🟠 128BPM EDM"])).toBe("128BPM");
  });

  it("blijft leeg bij een gelijke stand of zonder BPM", () => {
    expect(bpmFromPlaylists(["Cyan Full (m) 🧊 112BPM EDM", "Cyan Full (m) 🧊 128BPM EDM"])).toBeNull();
    expect(bpmFromPlaylists(["Orange Full (f) 🟠 ALT"])).toBeNull();
    expect(bpmFromPlaylists([])).toBeNull();
  });
});

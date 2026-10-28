import { describe, expect, it } from "vitest";
import type { Playlist } from "@/lib/spotify/types";
import { isPreparationPlaylist, preparationHref, preparationTitlesOf, preparationPlaylists } from "./preparation";

function playlist(id: string, name: string, trackCount = 0): Playlist {
  return {
    id,
    name,
    uri: `spotify:playlist:${id}`,
    collaborative: false,
    public: false,
    snapshotId: "s",
    owner: { id: "dave", displayName: null },
    images: [],
    description: null,
    trackCount,
    tracks: [],
  };
}

describe("isPreparationPlaylist", () => {
  it("herkent een naam die op Vol. X eindigt, in elke schrijfwijze", () => {
    expect(isPreparationPlaylist("House Mix 🟢 Green Light (f) 🟢 Vol. X")).toBe(true);
    expect(isPreparationPlaylist("Drum & Bass Mix 🟢 Green Light (f) 🟢 Vol.  X")).toBe(true);
    expect(isPreparationPlaylist("Drum & Bass Mix 🟠 Orange Full (f) 🟠 Vol X")).toBe(true);
    expect(isPreparationPlaylist("Drum & Bass Mix 🟡 Yellow Full (m) 🟡 Vol. x")).toBe(true);
  });

  it("laat een genummerde mix en een andere X liggen", () => {
    expect(isPreparationPlaylist("House Mix 🔴 Red Light (m) 🔴 Vol. 6")).toBe(false);
    expect(isPreparationPlaylist("Top 100 REMIX")).toBe(false);
  });
});

describe("preparationPlaylists", () => {
  it("zet de werkbak met de meeste tracks vooraan", () => {
    const ids = preparationPlaylists([
      playlist("1", "House Mix 🧊 Cyan Light (f) 🧊 Vol. X", 3),
      playlist("2", "Drum & Bass ♦️ Magenta Full (m) ♦️ Vol. X", 68),
      playlist("3", "House Mix 🟡 Yellow Light (m) 🟡 Vol. X", 67),
    ]).map((p) => p.playlist.id);
    expect(ids).toEqual(["2", "3", "1"]);
  });

  it("zet bij een gelijk aantal House Mix vóór Drum & Bass, en daarbinnen de kleuren in de volgorde van Planned", () => {
    const names = preparationPlaylists([
      playlist("1", "Drum & Bass Mix 🧊 Cyan Light (f) 🧊 Vol. X"),
      playlist("2", "House Mix 🟢 Green Light (f) 🟢 Vol. X"),
      playlist("3", "House Mix 🧊 Cyan Light (m) 🧊 Vol. X"),
      playlist("4", "House Mix 🔴 Red Light (m) 🔴 Vol. 6"),
      playlist("5", "House Mix 🧊 Cyan Light (f) 🧊 Vol. X"),
    ]).map((p) => p.playlist.id);
    expect(names).toEqual(["5", "3", "2", "1"]);
  });
});

describe("preparationTitlesOf", () => {
  it("geeft elke werkbak-pagina de playlistnaam", () => {
    expect(preparationTitlesOf([playlist("abc", "House Mix 🟢 Green Light (f) 🟢 Vol. X")])).toEqual({
      [preparationHref("abc")]: "House Mix 🟢 Green Light (f) 🟢 Vol. X",
    });
  });
});

// De Classic Pop-tabel: de rijen uit de snapshot (toClassicPopRows in playlistTableRows.ts) en het zoeken,
// sorteren en benoemen daarvan (classicPopTable.ts). De weergave (ClassicPopTable.tsx) blijft hier buiten.
import { describe, expect, it } from "vitest";
import { sortRows } from "@/lib/sortRows";
import { classicPopLabel, classicPopSortKey, filterClassicPopRows, isClassicPopPlaylist } from "./classicPopTable";
import { toClassicPopRows } from "./playlistTableRows";
import type { Playlist, PlaylistItem } from "./types";

function item(id: string, name: string, over: { artists?: string[]; addedAt?: string | null; releaseDate?: string } = {}): PlaylistItem {
  return {
    addedAt: "addedAt" in over ? (over.addedAt ?? null) : "2026-08-24T13:25:21Z",
    addedBy: "someone",
    isLocal: false,
    track: {
      id,
      uri: `spotify:track:${id}`,
      name,
      artists: (over.artists ?? ["Artiest"]).map((artistName, i) => ({ id: `${id}-a${i}`, name: artistName })),
      album: { id: `${id}-album`, name: "Album", images: [], releaseDate: over.releaseDate ?? "1985-01-01" },
      durationMs: 200_000,
    },
  };
}

function playlist(id: string, name: string, tracks: PlaylistItem[]): Playlist {
  return {
    id,
    name,
    uri: `spotify:playlist:${id}`,
    collaborative: false,
    public: true,
    snapshotId: "s",
    owner: { id: "o", displayName: "Eigenaar" },
    images: [],
    description: null,
    trackCount: tracks.length,
    tracks,
  };
}

describe("isClassicPopPlaylist / classicPopLabel", () => {
  it("herkent Classic Pop overal in de naam, hoofdletterongevoelig", () => {
    expect(isClassicPopPlaylist("Classic Pop | DJ Cylow")).toBe(true);
    expect(isClassicPopPlaylist("Cyan Full (f) 🧊 Classic Pop")).toBe(true);
    expect(isClassicPopPlaylist("magenta light ♦️classic pop")).toBe(true);
    expect(isClassicPopPlaylist("Classic Rock")).toBe(false);
    expect(isClassicPopPlaylist("Pop Classics")).toBe(false);
  });

  it("haalt Classic Pop van het eind van de naam, en houdt de naam als er niets overblijft", () => {
    expect(classicPopLabel("Cyan Full (f) 🧊 Classic Pop")).toBe("Cyan Full (f) 🧊");
    expect(classicPopLabel("Magenta Full (f) ♦️Classic Pop")).toBe("Magenta Full (f) ♦️");
    expect(classicPopLabel("Classic Pop | DJ Cylow")).toBe("Classic Pop | DJ Cylow");
    expect(classicPopLabel("Classic Pop")).toBe("Classic Pop");
  });
});

describe("toClassicPopRows", () => {
  const playlists = [
    playlist("main", "Classic Pop | DJ Cylow", [item("a", "Take On Me", { artists: ["a-ha"], addedAt: "2026-03-01T00:00:00Z" }), item("b", "Rehab")]),
    playlist("rock", "Classic Rock", [item("c", "Niet Classic Pop")]),
    playlist("cyan", "Cyan Full (f) 🧊 Classic Pop", [
      item("a", "Take On Me", { artists: ["a-ha"], addedAt: "2025-01-01T00:00:00Z" }),
      item("a", "Take On Me", { artists: ["a-ha"], addedAt: "2027-01-01T00:00:00Z" }),
      { addedAt: null, addedBy: null, isLocal: true, track: null },
    ]),
  ];

  it("toont elk nummer uit een Classic Pop-playlist één keer, in de volgorde waarin het opduikt", () => {
    const rows = toClassicPopRows(playlists);
    expect(rows.map((r) => r.trackId)).toEqual(["a", "b"]);
  });

  it("noemt elke playlist van een nummer één keer, en het vroegste toevoegmoment", () => {
    const [takeOnMe, rehab] = toClassicPopRows(playlists);
    expect(takeOnMe.playlists.map((p) => [p.id, p.label])).toEqual([
      ["main", "Classic Pop | DJ Cylow"],
      ["cyan", "Cyan Full (f) 🧊"],
    ]);
    expect(takeOnMe.firstAddedAt).toBe("2025-01-01T00:00:00Z");
    expect(rehab.playlists.map((p) => p.id)).toEqual(["main"]);
  });

  it("neemt het vroegste jaar van MusicBrainz, het Trackregister en het album", () => {
    const [takeOnMe, rehab] = toClassicPopRows(playlists, new Map([["a", 1990]]), new Map([["a", 1984]]));
    expect([takeOnMe.year, takeOnMe.albumYear]).toEqual([1984, 1985]);
    expect(rehab.year).toBe(1985);
  });

  it("geeft een lege lijst zonder Classic Pop-playlist", () => {
    expect(toClassicPopRows([playlists[1]])).toEqual([]);
  });
});

describe("filterClassicPopRows / classicPopSortKey", () => {
  const rows = toClassicPopRows([
    playlist("main", "Classic Pop | DJ Cylow", [item("a", "Take On Me", { artists: ["a-ha"] }), item("b", "Rehab", { artists: ["Amy Winehouse"] })]),
    playlist("cyan", "Cyan Full (f) 🧊 Classic Pop", [item("a", "Take On Me", { artists: ["a-ha"] })]),
  ]);

  it("zoekt ook op de naam van een playlist", () => {
    expect(filterClassicPopRows(rows, "cyan").map((r) => r.trackId)).toEqual(["a"]);
    expect(filterClassicPopRows(rows, "winehouse").map((r) => r.trackId)).toEqual(["b"]);
    expect(filterClassicPopRows(rows, "  ")).toHaveLength(2);
  });

  it("sorteert de playlist-kolom op het aantal playlists", () => {
    const sorted = sortRows(rows, { column: "playlists", direction: "desc" }, classicPopSortKey);
    expect(sorted.map((r) => r.trackId)).toEqual(["a", "b"]);
  });
});

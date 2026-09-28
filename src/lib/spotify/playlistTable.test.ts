// De playlist-tabel: de rijen uit een snapshot-playlist (playlistTableRows.ts) en het zoeken, sorteren en
// opmaken daarvan (playlistTable.ts). De weergave (PlaylistTable.tsx) blijft hier buiten.
import { describe, expect, it } from "vitest";
import { sortRows } from "@/lib/sortRows";
import { filterPlaylistRows, formatDuration, playlistSortKey, trackUrl, type PlaylistTableRow } from "./playlistTable";
import { toPlaylistTableRows, userNamesFromSnapshot } from "./playlistTableRows";
import type { Playlist, PlaylistItem } from "./types";

function item(
  id: string,
  name: string,
  over: { artists?: string[]; album?: string; releaseDate?: string | null; durationMs?: number; addedBy?: string | null } = {}
): PlaylistItem {
  return {
    addedAt: "2026-08-24T13:25:21Z",
    addedBy: "addedBy" in over ? (over.addedBy ?? null) : "someone",
    isLocal: false,
    track: {
      id,
      uri: `spotify:track:${id}`,
      name,
      artists: (over.artists ?? ["Artiest"]).map((artistName, i) => ({ id: `${id}-a${i}`, name: artistName })),
      album: { id: `${id}-album`, name: over.album ?? "Album", images: [], releaseDate: "releaseDate" in over ? over.releaseDate : "2007-10-09" },
      durationMs: over.durationMs ?? 200_000,
    },
  };
}

function playlist(tracks: PlaylistItem[], owner = { id: "o", displayName: "Eigenaar" as string | null }): Playlist {
  return {
    id: `pl-${owner.id}`,
    name: "Test",
    uri: "spotify:playlist:pl",
    collaborative: false,
    public: true,
    snapshotId: "s",
    owner,
    images: [],
    description: null,
    trackCount: tracks.length,
    tracks,
  };
}

describe("toPlaylistTableRows", () => {
  it("maakt één rij per nummer, in de volgorde van de playlist, met het jaar uit de albumdatum", () => {
    const rows = toPlaylistTableRows(
      playlist([item("a", "No One", { artists: ["Alicia Keys"], releaseDate: "2007-10-09" }), item("b", "Rehab", { releaseDate: "2006" })])
    );
    expect(rows.map((r) => [r.position, r.title, r.year])).toEqual([
      [1, "No One", 2007],
      [2, "Rehab", 2006],
    ]);
    expect(rows[0].artists).toEqual(["Alicia Keys"]);
  });

  it("laat een item zonder track weg, maar houdt de positie gelijk aan die op Spotify", () => {
    const local: PlaylistItem = { addedAt: null, addedBy: null, isLocal: true, track: null };
    const rows = toPlaylistTableRows(playlist([item("a", "Een"), local, item("c", "Drie")]));
    expect(rows.map((r) => r.position)).toEqual([1, 3]);
  });

  it("geeft geen jaar bij een album zonder datum", () => {
    expect(toPlaylistTableRows(playlist([item("a", "X", { releaseDate: null })]))[0].year).toBeNull();
  });
});

describe("toevoeger", () => {
  const snapshot = {
    syncedAt: "2026-09-28T00:00:00Z",
    playlists: [
      playlist([], { id: "u1", displayName: "Bas van Leeuwen" }),
      playlist([], { id: "u2", displayName: null }),
    ],
  };

  it("zet het user-id om in de naam van die gebruiker als eigenaar van een playlist in de snapshot", () => {
    const names = userNamesFromSnapshot(snapshot);
    expect(names.get("u1")).toBe("Bas van Leeuwen");
    expect(names.has("u2")).toBe(false);
  });

  it("toont de naam, anders het user-id, en niets als Spotify het niet weet", () => {
    const rows = toPlaylistTableRows(
      playlist([item("a", "A", { addedBy: "u1" }), item("b", "B", { addedBy: "onbekend" }), item("c", "C", { addedBy: null })]),
      userNamesFromSnapshot(snapshot)
    );
    expect(rows.map((r) => r.addedBy)).toEqual(["Bas van Leeuwen", "onbekend", null]);
  });

  it("is doorzoekbaar en sorteerbaar", () => {
    const rows = toPlaylistTableRows(
      playlist([item("a", "A", { addedBy: "u1" }), item("b", "B", { addedBy: "anna" })]),
      userNamesFromSnapshot(snapshot)
    );
    expect(filterPlaylistRows(rows, "bas").map((r) => r.title)).toEqual(["A"]);
    expect(sortRows(rows, { column: "addedBy", direction: "asc" }, playlistSortKey).map((r) => r.addedBy)).toEqual(["anna", "Bas van Leeuwen"]);
  });
});

describe("filterPlaylistRows", () => {
  const rows = toPlaylistTableRows(
    playlist([
      item("a", "Rehab", { artists: ["Amy Winehouse"], album: "Back To Black" }),
      item("b", "Déjà Vu", { artists: ["Beyoncé", "Jay-Z"], album: "B'Day" }),
    ])
  );

  it("zoekt in titel, artiest en album, hoofdletter- en accent-ongevoelig", () => {
    expect(filterPlaylistRows(rows, "deja").map((r) => r.title)).toEqual(["Déjà Vu"]);
    expect(filterPlaylistRows(rows, "JAY-Z").map((r) => r.title)).toEqual(["Déjà Vu"]);
    expect(filterPlaylistRows(rows, "black").map((r) => r.title)).toEqual(["Rehab"]);
  });

  it("geeft alles terug bij een lege zoekterm", () => {
    expect(filterPlaylistRows(rows, "  ")).toHaveLength(2);
  });
});

describe("sorteren", () => {
  const rows: PlaylistTableRow[] = toPlaylistTableRows(
    playlist([
      item("a", "Zulu", { releaseDate: "1999", durationMs: 300_000 }),
      item("b", "The Alpha", { releaseDate: null, durationMs: 100_000 }),
      item("c", "Mike", { releaseDate: "1980", durationMs: 200_000 }),
    ])
  );

  it("sorteert op titel zonder lidwoord vooraan", () => {
    expect(sortRows(rows, { column: "title", direction: "asc" }, playlistSortKey).map((r) => r.title)).toEqual(["The Alpha", "Mike", "Zulu"]);
  });

  it("zet een leeg jaar onderaan, ook aflopend", () => {
    expect(sortRows(rows, { column: "year", direction: "desc" }, playlistSortKey).map((r) => r.year)).toEqual([1999, 1980, null]);
  });

  it("sorteert duur numeriek", () => {
    expect(sortRows(rows, { column: "duration", direction: "asc" }, playlistSortKey).map((r) => r.durationMs)).toEqual([100_000, 200_000, 300_000]);
  });
});

describe("formatDuration", () => {
  it("schrijft m:ss, en h:mm:ss vanaf een uur", () => {
    expect(formatDuration(254_523)).toBe("4:15");
    expect(formatDuration(59_000)).toBe("0:59");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });
});

describe("trackUrl", () => {
  it("linkt naar het nummer op Spotify", () => {
    expect(trackUrl("0mZ5GyrHG908lqrHaTw4hi")).toBe("https://open.spotify.com/track/0mZ5GyrHG908lqrHaTw4hi");
  });
});

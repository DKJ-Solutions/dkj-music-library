import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { ARTISTS_TABLE, applyLibraryIdsFromSnapshot, readArtistNames } from "./artistIds";
import {
  isOwnPlaylist,
  ownPlaylistsOnly,
  planSharedOnlyRemovals,
  removeSharedOnlyTracks,
  sharedOnlySpotifyIds,
} from "./ownPlaylists";
import { getTrack, listTracks } from "./trackStore";
import { readTrackIdOf } from "./trackIds";
import type { Playlist, Snapshot, Track } from "@/lib/spotify/types";

const ME = "me";

const track = (id: string, artist = id): Track => ({
  id,
  uri: `spotify:track:${id}`,
  name: id,
  artists: [{ id: `a-${artist}`, name: `Artiest ${artist}` }],
  album: { id: "al", name: "Album", images: [] },
  durationMs: 1,
});

function playlist(id: string, owner: string, ...tracks: Track[]): Playlist {
  return {
    id, name: id, uri: `spotify:playlist:${id}`, collaborative: false, public: true, snapshotId: "s",
    owner: { id: owner, displayName: null }, images: [], description: null, trackCount: tracks.length,
    tracks: tracks.map((t) => ({ addedAt: null, addedBy: null, isLocal: false, track: t })),
  };
}

const snap = (...playlists: Playlist[]): Snapshot => ({ syncedAt: "2026-09-28T00:00:00Z", playlists });

describe("isOwnPlaylist en ownPlaylistsOnly", () => {
  it("houdt alleen de playlists van het eigen account over", () => {
    const s = snap(playlist("eigen", ME), playlist("gedeeld", "ander"));
    expect(isOwnPlaylist(s.playlists[0], ME)).toBe(true);
    expect(isOwnPlaylist(s.playlists[1], ME)).toBe(false);
    expect(ownPlaylistsOnly(s, ME).playlists.map((p) => p.id)).toEqual(["eigen"]);
  });

  it("laat alles staan zonder eigen account", () => {
    const s = snap(playlist("eigen", ME), playlist("gedeeld", "ander"));
    expect(isOwnPlaylist(s.playlists[1], null)).toBe(true);
    expect(ownPlaylistsOnly(s, null)).toBe(s);
  });
});

describe("sharedOnlySpotifyIds", () => {
  it("kent alleen de tracks die in geen enkele eigen playlist staan", () => {
    const s = snap(playlist("eigen", ME, track("beide")), playlist("gedeeld", "ander", track("beide"), track("alleen-gedeeld")));
    expect([...sharedOnlySpotifyIds(s, ME)]).toEqual(["alleen-gedeeld"]);
    expect(sharedOnlySpotifyIds(s, null).size).toBe(0);
  });
});

describe("planSharedOnlyRemovals", () => {
  it("houdt een nummer waarvan een andere Spotify-variant in een eigen playlist staat", () => {
    const s = snap(playlist("eigen", ME, track("single")), playlist("gedeeld", "ander", track("compilatie"), track("weg")));
    const links = new Map([["single", "T1"], ["compilatie", "T1"], ["weg", "T2"], ["nergens", "T3"]]);
    expect([...planSharedOnlyRemovals(s, ME, links)]).toEqual(["T2"]);
  });
});

describe("removeSharedOnlyTracks", () => {
  it("haalt nummers, koppelingen en artiesten uit alleen gedeelde playlists weg, en laat de rest staan", () => {
    const { db } = openLibraryDb(":memory:");
    const alles = snap(
      playlist("eigen", ME, track("eigen-nummer", "x"), track("beide", "y")),
      playlist("gedeeld", "ander", track("beide", "y"), track("alleen-gedeeld", "z"))
    );
    // Zoals vóór deze regel: alles in de bibliotheek, ook uit de gedeelde playlist.
    applyLibraryIdsFromSnapshot(db, alles);
    expect(listTracks(db)).toHaveLength(3);
    const idOf = readTrackIdOf(db);
    // En een nummer dat in geen enkele playlist meer staat: dat blijft, want de bibliotheek is een back-up.
    applyLibraryIdsFromSnapshot(db, snap(playlist("oud", ME, track("verdwenen", "v"))));
    const verdwenen = readTrackIdOf(db).get("verdwenen")!;

    const result = removeSharedOnlyTracks(db, alles, ME);
    expect(result).toEqual({ tracksRemoved: 1, artistsRemoved: 1 });
    expect(getTrack(db, idOf.get("alleen-gedeeld")!)).toBeNull();
    expect(getTrack(db, idOf.get("beide")!)).not.toBeNull();
    expect(getTrack(db, idOf.get("eigen-nummer")!)).not.toBeNull();
    expect(getTrack(db, verdwenen)).not.toBeNull();
    expect(readTrackIdOf(db).has("alleen-gedeeld")).toBe(false);
    expect(Object.values(readArtistNames(db)).sort()).toEqual(["Artiest v", "Artiest x", "Artiest y"]);

    // Opnieuw draaien doet niets.
    expect(removeSharedOnlyTracks(db, alles, ME)).toEqual({ tracksRemoved: 0, artistsRemoved: 0 });
  });

  it("haalt niets weg zonder eigen account", () => {
    const { db } = openLibraryDb(":memory:");
    const alles = snap(playlist("gedeeld", "ander", track("alleen-gedeeld")));
    applyLibraryIdsFromSnapshot(db, alles);
    expect(removeSharedOnlyTracks(db, alles, null)).toEqual({ tracksRemoved: 0, artistsRemoved: 0 });
    expect(listTracks(db)).toHaveLength(1);
    const artists = db.prepare(`SELECT COUNT(*) AS n FROM ${ARTISTS_TABLE}`).get() as { n: number };
    expect(Number(artists.n)).toBe(1);
  });

  it("brengt een nummer uit een gedeelde playlist met de eigen snapshot niet meer binnen", () => {
    const { db } = openLibraryDb(":memory:");
    const alles = snap(playlist("eigen", ME, track("eigen-nummer")), playlist("gedeeld", "ander", track("alleen-gedeeld")));
    applyLibraryIdsFromSnapshot(db, ownPlaylistsOnly(alles, ME));
    expect(listTracks(db).map((t) => t.spotify_track_id)).toEqual(["eigen-nummer"]);
  });
});

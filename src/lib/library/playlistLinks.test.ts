import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { applyPlaylistLinks, planPlaylistLinks, playlistUrl } from "./playlistLinks";
import { getTrack, upsertTracks } from "./trackStore";
import { ensureSpotifyLinkTable } from "./trackIds";
import type { Playlist, Snapshot, Track } from "@/lib/spotify/types";

const track = (id: string): Track => ({
  id,
  uri: `spotify:track:${id}`,
  name: id,
  artists: [{ id: "a", name: "A" }],
  album: { id: "al", name: "Album", images: [] },
  durationMs: 1,
});

function playlist(id: string, name: string, ...tracks: Track[]): Playlist {
  return {
    id, name, uri: `spotify:playlist:${id}`, collaborative: false, public: true, snapshotId: "s",
    owner: { id: "me", displayName: null }, images: [], description: null, trackCount: tracks.length,
    tracks: tracks.map((t) => ({ addedAt: null, addedBy: null, isLocal: false, track: t })),
  };
}

const snap = (...playlists: Playlist[]): Snapshot => ({ syncedAt: "2026-09-27T00:00:00Z", playlists });

describe("planPlaylistLinks", () => {
  it("geeft per track de playlists in snapshot-volgorde, zonder dubbelen, ook over releasevarianten heen", () => {
    const ids = new Map([["s1", "T1"], ["s2", "T1"], ["s3", "T2"]]);
    const plan = planPlaylistLinks(
      snap(playlist("p1", "Eén", track("s1"), track("s1")), playlist("p2", "Twee", track("s2"), track("s3")), playlist("p3", "Drie", track("x"))),
      ids
    );
    expect(plan.get("T1")).toEqual([{ id: "p1", name: "Eén" }, { id: "p2", name: "Twee" }]);
    expect(plan.get("T2")).toEqual([{ id: "p2", name: "Twee" }]);
    expect(plan.has("x")).toBe(false);
  });
});

describe("applyPlaylistLinks", () => {
  it("ververst het veld bij elke sync, schrijft alleen wat verandert, en maakt het leeg als de track nergens meer staat", () => {
    const { db } = openLibraryDb(":memory:");
    ensureSpotifyLinkTable(db);
    upsertTracks(db, [{ dkj_track_id: "T1" }, { dkj_track_id: "T2" }]);
    db.exec(`INSERT INTO spotify_track_ids (spotify_track_id, dkj_track_id, song_key) VALUES ('s1','T1','k1'), ('s2','T2','k2')`);
    const first = snap(playlist("p1", "Eén", track("s1"), track("s2")));
    expect(applyPlaylistLinks(db, first)).toBe(2);
    expect(getTrack(db, "T1")?.dkj_playlists).toEqual([{ id: "p1", name: "Eén" }]);
    expect(applyPlaylistLinks(db, first)).toBe(0);
    expect(applyPlaylistLinks(db, snap(playlist("p1", "Eén (nieuw)", track("s1"))))).toBe(2);
    expect(getTrack(db, "T1")?.dkj_playlists).toEqual([{ id: "p1", name: "Eén (nieuw)" }]);
    expect(getTrack(db, "T2")?.dkj_playlists).toBeNull();
  });
});

describe("playlistUrl", () => {
  it("wijst naar open.spotify.com", () => {
    expect(playlistUrl("37i9dQZF1DX")).toBe("https://open.spotify.com/playlist/37i9dQZF1DX");
  });
});

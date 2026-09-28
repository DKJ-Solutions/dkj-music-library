import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { applyReleaseYears, planReleaseYears, yearOf } from "./releaseYears";
import { getTrack, upsertTracks } from "./trackStore";
import { ensureSpotifyLinkTable } from "./trackIds";
import type { Playlist, Snapshot, Track } from "@/lib/spotify/types";

const track = (id: string, releaseDate?: string | null): Track => ({
  id,
  uri: `spotify:track:${id}`,
  name: id,
  artists: [{ id: "a", name: "A" }],
  album: { id: "al", name: "Album", images: [], releaseDate },
  durationMs: 1,
});

function playlist(id: string, ...tracks: Track[]): Playlist {
  return {
    id, name: id, uri: `spotify:playlist:${id}`, collaborative: false, public: true, snapshotId: "s",
    owner: { id: "me", displayName: null }, images: [], description: null, trackCount: tracks.length,
    tracks: tracks.map((t) => ({ addedAt: null, addedBy: null, isLocal: false, track: t })),
  };
}

const snap = (...playlists: Playlist[]): Snapshot => ({ syncedAt: "2026-09-28T00:00:00Z", playlists });

describe("yearOf", () => {
  it("leest het jaar uit elke precisie van release_date", () => {
    expect(yearOf("1997-05-12")).toBe(1997);
    expect(yearOf("1997-05")).toBe(1997);
    expect(yearOf("1997")).toBe(1997);
  });

  it("geeft null zonder bruikbaar jaar", () => {
    expect(yearOf(null)).toBeNull();
    expect(yearOf(undefined)).toBeNull();
    expect(yearOf("")).toBeNull();
    expect(yearOf("0000")).toBeNull();
    expect(yearOf("19970512")).toBeNull();
  });
});

describe("planReleaseYears", () => {
  it("neemt per track het vroegste jaar over alle Spotify-varianten", () => {
    const ids = new Map([["single", "T1"], ["compilatie", "T1"], ["ander", "T2"]]);
    const plan = planReleaseYears(
      snap(playlist("p1", track("compilatie", "2015-01-01")), playlist("p2", track("single", "1997"), track("ander", null)), playlist("p3", track("onbekend", "2000"))),
      ids
    );
    expect(plan.get("T1")).toBe(1997);
    expect(plan.has("T2")).toBe(false);
    expect(plan.size).toBe(1);
  });
});

describe("applyReleaseYears", () => {
  it("vult year alleen zolang het leeg is", () => {
    const { db } = openLibraryDb(":memory:");
    ensureSpotifyLinkTable(db);
    upsertTracks(db, [{ dkj_track_id: "T1" }, { dkj_track_id: "T2", year: 1980 }]);
    db.exec(`INSERT INTO spotify_track_ids (spotify_track_id, dkj_track_id, song_key) VALUES ('s1','T1','k1'), ('s2','T2','k2')`);
    const first = snap(playlist("p1", track("s1", "2001-03-04"), track("s2", "2010")));
    expect(applyReleaseYears(db, first)).toBe(1);
    expect(getTrack(db, "T1")?.year).toBe(2001);
    expect(getTrack(db, "T2")?.year).toBe(1980);
    expect(applyReleaseYears(db, first)).toBe(0);
  });
});

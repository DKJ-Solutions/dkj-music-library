import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { getTrack, listTracks, upsertTracks } from "./trackStore";
import { applyTrackIdsFromSnapshot, formatTrackId, planTrackIds, songKey } from "./trackIds";
import type { Playlist, Snapshot, Track } from "@/lib/spotify/types";

function track(id: string, name: string, artistIds: string[] = ["a1"]): Track {
  return {
    id,
    uri: `spotify:track:${id}`,
    name,
    artists: artistIds.map((a) => ({ id: a, name: `Artist ${a}` })),
    album: { id: "al", name: "Album", images: [] },
    durationMs: 180000,
  };
}

function snapshot(...playlists: (Track | null)[][]): Snapshot {
  return {
    syncedAt: "2026-09-27T00:00:00Z",
    playlists: playlists.map(
      (tracks, i): Playlist => ({
        id: `p${i}`,
        name: `Playlist ${i}`,
        uri: `spotify:playlist:p${i}`,
        collaborative: false,
        public: true,
        snapshotId: "s",
        owner: { id: "me", displayName: null },
        images: [],
        description: null,
        trackCount: tracks.length,
        tracks: tracks.map((t) => ({ addedAt: null, addedBy: null, isLocal: false, track: t })),
      })
    ),
  };
}

const memoryDb = () => openLibraryDb(":memory:").db;

describe("formatTrackId / songKey", () => {
  it("vult aan tot zes cijfers en groeit daarna door", () => {
    expect(formatTrackId(1)).toBe("T000001");
    expect(formatTrackId(1234567)).toBe("T1234567");
  });

  it("negeert hoofdletters, randspaties en de volgorde van artiesten", () => {
    expect(songKey(track("x", " Song A ", ["b", "a"]))).toBe(songKey(track("y", "song a", ["a", "b"])));
  });

  it("houdt een andere titel of andere artiesten apart", () => {
    expect(songKey(track("x", "Song A"))).not.toBe(songKey(track("y", "Song A - Radio Edit")));
    expect(songKey(track("x", "Song A", ["a1"]))).not.toBe(songKey(track("y", "Song A", ["a2"])));
  });
});

describe("planTrackIds", () => {
  it("geeft elk nummer één ID, in volgorde van eerste voorkomen, en voegt releasevarianten samen", () => {
    const plan = planTrackIds(
      snapshot([track("s1", "Song A"), track("s2", "Song B")], [track("s3", "song a"), track("s1", "Song A"), null]),
      [],
      []
    );
    expect(plan.newTracks.map((t) => [t.trackId, t.track.id])).toEqual([
      ["T000001", "s1"],
      ["T000002", "s2"],
    ]);
    expect(plan.newLinks.map((l) => [l.spotifyTrackId, l.trackId])).toEqual([
      ["s1", "T000001"],
      ["s2", "T000002"],
      ["s3", "T000001"],
    ]);
  });

  it("hergebruikt bestaande koppelingen en telt verder vanaf het hoogste eigen ID", () => {
    const known = { spotifyTrackId: "s1", trackId: "T000007", songKey: songKey(track("s1", "Song A")) };
    const plan = planTrackIds(
      snapshot([track("s1", "Song A"), track("s9", "Song A"), track("s2", "Song B")]),
      [known],
      ["T000007", "eigen-import-id"]
    );
    expect(plan.newTracks.map((t) => t.trackId)).toEqual(["T000008"]);
    expect(plan.newLinks.map((l) => [l.spotifyTrackId, l.trackId])).toEqual([
      ["s9", "T000007"],
      ["s2", "T000008"],
    ]);
  });
});

describe("applyTrackIdsFromSnapshot", () => {
  it("maakt tracks met Spotify-metadata en koppelt elke Spotify-ID", () => {
    const db = memoryDb();
    const result = applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A"), track("s2", "song a")]));
    expect(result).toEqual({ newTracks: 1, newLinks: 2, totalLinks: 2 });
    expect(getTrack(db, "T000001")).toMatchObject({
      spotify_track_id: "s1",
      title: "Song A",
      artists: ["Artist a1"],
      album: "Album",
      duration_ms: 180000,
    });
  });

  it("is stabiel: opnieuw draaien doet niets, en een nieuwe variant van een verdwenen nummer houdt zijn ID", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A")]));
    expect(applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A")]))).toEqual({
      newTracks: 0,
      newLinks: 0,
      totalLinks: 1,
    });

    const later = applyTrackIdsFromSnapshot(db, snapshot([track("s5", "Song A"), track("s6", "Song C")]));
    expect(later).toEqual({ newTracks: 1, newLinks: 2, totalLinks: 3 });
    expect(listTracks(db).map((t) => t.dkj_track_id)).toEqual(["T000001", "T000002"]);
  });

  it("laat zelf ingevulde velden van een bestaande track staan", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A")]));
    upsertTracks(db, [{ dkj_track_id: "T000001", title: "Mijn eigen titel", bpm: 128 }]);
    applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A"), track("s2", "Song A")]));
    expect(getTrack(db, "T000001")).toMatchObject({ title: "Mijn eigen titel", bpm: 128 });
  });
});

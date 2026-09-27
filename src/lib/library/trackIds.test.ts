import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { getTrack, listTracks, upsertTracks } from "./trackStore";
import { applyTrackIdsFromSnapshot, formatTrackId, planTrackIds, renumberLegacyTrackIds, songKey } from "./trackIds";
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

/** De eigen artiest-ID's die artistIds.ts in het echt zou geven. */
const ARTISTS = new Map([
  ["a1", "ART01"],
  ["a2", "ART02"],
]);

describe("formatTrackId / songKey", () => {
  it("plakt artiest-ID en volgnummer aan elkaar met een streepje, minstens twee cijfers", () => {
    expect(formatTrackId("PRO02", 1)).toBe("PRO02-01");
    expect(formatTrackId("IMM01", 143)).toBe("IMM01-143");
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
  it("nummert per hoofdartiest, in volgorde van eerste voorkomen, en voegt releasevarianten samen", () => {
    const plan = planTrackIds(
      snapshot(
        [track("s1", "Song A"), track("s2", "Song B", ["a2", "a1"]), track("s4", "Song C")],
        [track("s3", "song a"), track("s1", "Song A"), null]
      ),
      [],
      [],
      ARTISTS
    );
    expect(plan.newTracks.map((t) => [t.trackId, t.track.id])).toEqual([
      ["ART01-01", "s1"],
      ["ART02-01", "s2"],
      ["ART01-02", "s4"],
    ]);
    expect(plan.newLinks.map((l) => [l.spotifyTrackId, l.trackId])).toEqual([
      ["s1", "ART01-01"],
      ["s2", "ART02-01"],
      ["s4", "ART01-02"],
      ["s3", "ART01-01"],
    ]);
  });

  it("hergebruikt bestaande koppelingen en neemt het laagste vrije volgnummer", () => {
    const known = { spotifyTrackId: "s1", trackId: "ART01-02", songKey: songKey(track("s1", "Song A")) };
    const plan = planTrackIds(
      snapshot([track("s1", "Song A"), track("s9", "Song A"), track("s2", "Song B"), track("s3", "Song C")]),
      [known],
      ["ART01-02", "eigen-import-id"],
      ARTISTS
    );
    expect(plan.newTracks.map((t) => t.trackId)).toEqual(["ART01-01", "ART01-03"]);
    expect(plan.newLinks.map((l) => [l.spotifyTrackId, l.trackId])).toEqual([
      ["s9", "ART01-02"],
      ["s2", "ART01-01"],
      ["s3", "ART01-03"],
    ]);
  });

  it("groeit na 99 door, en geeft een hoofdartiest zonder eigen ID XXX00", () => {
    const existing = Array.from({ length: 99 }, (_, i) => formatTrackId("ART01", i + 1));
    const plan = planTrackIds(snapshot([track("s1", "Song A"), track("s2", "Song B", ["onbekend"])]), [], existing, ARTISTS);
    expect(plan.newTracks.map((t) => t.trackId)).toEqual(["ART01-100", "XXX00-01"]);
  });
});

describe("applyTrackIdsFromSnapshot", () => {
  it("maakt tracks met Spotify-metadata en eigen artiest-ID's, en koppelt elke Spotify-ID", () => {
    const db = memoryDb();
    const result = applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A"), track("s2", "song a")]), ARTISTS);
    expect(result).toEqual({ newTracks: 1, newLinks: 2, totalLinks: 2 });
    expect(getTrack(db, "ART01-01")).toMatchObject({
      spotify_track_id: "s1",
      title: "Song A",
      artists: ["Artist a1"],
      album: "Album",
      duration_ms: 180000,
      dkj_artist_ids: ["ART01"],
    });
  });

  it("is stabiel: opnieuw draaien doet niets, en een nieuwe variant van een verdwenen nummer houdt zijn ID", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A")]), ARTISTS);
    expect(applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A")]), ARTISTS)).toEqual({
      newTracks: 0,
      newLinks: 0,
      totalLinks: 1,
    });

    const later = applyTrackIdsFromSnapshot(db, snapshot([track("s5", "Song A"), track("s6", "Song C")]), ARTISTS);
    expect(later).toEqual({ newTracks: 1, newLinks: 2, totalLinks: 3 });
    expect(listTracks(db).map((t) => t.dkj_track_id)).toEqual(["ART01-01", "ART01-02"]);
  });

  it("laat zelf ingevulde velden van een bestaande track staan", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A")]), ARTISTS);
    upsertTracks(db, [{ dkj_track_id: "ART01-01", title: "Mijn eigen titel", bpm: 128 }]);
    applyTrackIdsFromSnapshot(db, snapshot([track("s1", "Song A"), track("s2", "Song A")]), ARTISTS);
    expect(getTrack(db, "ART01-01")).toMatchObject({ title: "Mijn eigen titel", bpm: 128 });
  });
});

describe("renumberLegacyTrackIds", () => {
  it("nummert oude T-ID's per hoofdartiest om in de volgorde van het oude nummer, koppelingen incluis", () => {
    const db = memoryDb();
    upsertTracks(db, [
      { dkj_track_id: "T000002", title: "Tweede", dkj_artist_ids: ["PRO02"] },
      { dkj_track_id: "T000001", title: "Eerste", dkj_artist_ids: ["PRO02", "AMY01"] },
      { dkj_track_id: "T000003", title: "Valerie", dkj_artist_ids: ["AMY01"] },
      { dkj_track_id: "T000010", title: "Zonder artiest" },
      { dkj_track_id: "PRO02-01", title: "Al nieuw" },
    ]);
    applyTrackIdsFromSnapshot(db, snapshot([]), ARTISTS); // maakt de koppeltabel
    const link = db.prepare("INSERT INTO spotify_track_ids VALUES (?, ?, ?)");
    link.run("sp-1", "T000001", "k1");
    link.run("sp-2", "T000001", "k1");

    expect(renumberLegacyTrackIds(db)).toBe(4);
    expect(listTracks(db).map((t) => [t.dkj_track_id, t.title])).toEqual([
      ["AMY01-01", "Valerie"],
      ["PRO02-01", "Al nieuw"],
      ["PRO02-02", "Eerste"],
      ["PRO02-03", "Tweede"],
      ["XXX00-01", "Zonder artiest"],
    ]);
    const links = db.prepare("SELECT dkj_track_id FROM spotify_track_ids").all().map((r) => r.dkj_track_id);
    expect(links).toEqual(["PRO02-02", "PRO02-02"]);
    expect(renumberLegacyTrackIds(db)).toBe(0);
  });
});

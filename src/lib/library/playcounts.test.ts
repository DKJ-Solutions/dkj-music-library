import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { applyPlaycounts, countPlays, planPlaycounts, trackIdFromUri } from "./playcounts";
import { getTrack, upsertTracks } from "./trackStore";
import { ensureSpotifyLinkTable } from "./trackIds";

const play = (id: string | null, ms: number | null = 200_000) => ({
  spotify_track_uri: id === null ? null : `spotify:track:${id}`,
  ms_played: ms,
});

describe("trackIdFromUri", () => {
  it("leest het ID uit een track-URI en niets anders", () => {
    expect(trackIdFromUri("spotify:track:5xQqhsIGGdNoS1AY6Qy8ub")).toBe("5xQqhsIGGdNoS1AY6Qy8ub");
    expect(trackIdFromUri("spotify:episode:abc")).toBeNull();
    expect(trackIdFromUri(null)).toBeNull();
    expect(trackIdFromUri("")).toBeNull();
  });
});

describe("countPlays", () => {
  it("telt per Spotify-ID, pas vanaf 30 seconden", () => {
    const counts = countPlays([play("a"), play("a"), play("a", 29_999), play("a", 30_000), play("b"), play(null)]);
    expect(counts).toEqual(new Map([["a", 3], ["b", 1]]));
  });

  it("slaat een regel zonder ms_played over", () => {
    expect(countPlays([play("a", null)]).size).toBe(0);
  });

  it("neemt een andere drempel aan", () => {
    expect(countPlays([play("a", 5_000)], 0).get("a")).toBe(1);
  });
});

describe("planPlaycounts", () => {
  it("telt de plays van alle Spotify-varianten op bij één track en laat onbekende weg", () => {
    const plan = planPlaycounts(
      new Map([["single", 4], ["album", 2], ["vreemd", 9]]),
      new Map([["single", "T1"], ["album", "T1"]])
    );
    expect(plan).toEqual(new Map([["T1", 6]]));
  });
});

describe("applyPlaycounts", () => {
  it("zet het aantal, 0 zonder plays, en schrijft alleen wat verandert", () => {
    const { db } = openLibraryDb(":memory:");
    ensureSpotifyLinkTable(db);
    upsertTracks(db, [
      { dkj_track_id: "T1", spotify_track_id: "s1" },
      { dkj_track_id: "T2", spotify_track_id: "s2" },
      { dkj_track_id: "T3", spotify_track_id: "s3" },
    ]);
    // T3 staat (nog) niet in de koppeltabel en wordt via zijn eigen spotify_track_id gevonden.
    db.exec(
      `INSERT INTO spotify_track_ids (spotify_track_id, dkj_track_id, song_key) VALUES ('s1','T1','k1'), ('s1b','T1','k1'), ('s2','T2','k2')`
    );

    const plays = new Map([["s1", 2], ["s1b", 1], ["s3", 5], ["los", 7]]);
    expect(applyPlaycounts(db, plays)).toEqual({ changed: 3, played: 2, unmatchedPlays: 7 });
    expect(getTrack(db, "T1")?.spotify_playcount).toBe(3);
    expect(getTrack(db, "T2")?.spotify_playcount).toBe(0);
    expect(getTrack(db, "T3")?.spotify_playcount).toBe(5);

    expect(applyPlaycounts(db, plays).changed).toBe(0);
    expect(applyPlaycounts(db, new Map([["s2", 1]])).changed).toBe(3);
    expect(getTrack(db, "T1")?.spotify_playcount).toBe(0);
  });
});

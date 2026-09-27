import { describe, expect, it } from "vitest";
import type { MixLink, MixLinkStatus } from "@/lib/mixes/matchMixes";
import type { Playlist, Snapshot, Track } from "@/lib/spotify/types";
import { openLibraryDb } from "./db";
import { applyDjcylowMixes, mixUrl, planDjcylowMixes } from "./djcylowMixes";
import { getTrack, upsertTracks } from "./trackStore";
import { ensureSpotifyLinkTable } from "./trackIds";

const track = (id: string): Track => ({
  id,
  uri: `spotify:track:${id}`,
  name: id,
  artists: [{ id: "a", name: "A" }],
  album: { id: "al", name: "Album", images: [] },
  durationMs: 1,
});

function playlist(id: string, ...tracks: Track[]): Playlist {
  return {
    id, name: id, uri: `spotify:playlist:${id}`, collaborative: false, public: true, snapshotId: "s",
    owner: { id: "me", displayName: null }, images: [], description: null, trackCount: tracks.length,
    tracks: tracks.map((t) => ({ addedAt: null, addedBy: null, isLocal: false, track: t })),
  };
}

const snap = (...playlists: Playlist[]): Snapshot => ({ syncedAt: "2026-09-27T00:00:00Z", playlists });

/** Alleen de velden die planDjcylowMixes leest. */
function link(id: string, slug: string | null, status: MixLinkStatus, playlistId: string | null): MixLink {
  return {
    mix: { id, slug, title: `Mix ${id}` },
    status,
    playlist: playlistId ? { id: playlistId } : null,
  } as unknown as MixLink;
}

describe("planDjcylowMixes", () => {
  const ids = new Map([["s1", "T1"], ["s2", "T1"], ["s3", "T2"]]);
  const snapshot = snap(playlist("p1", track("s1"), track("s3")), playlist("p2", track("s2")), playlist("emmer", track("s3")));

  it("geeft per track de mixen van de eigen playlists, nieuwste eerst, zonder dubbelen over releasevarianten heen", () => {
    const plan = planDjcylowMixes(
      snapshot,
      [link("20250101", "oud", "own-playlist", "p1"), link("20260101", "nieuw", "work-queue", "p2"), link("20260101", "nieuw", "own-playlist", "p1")],
      ids
    );
    expect(plan.get("T1")).toEqual([{ slug: "nieuw", name: "Mix 20260101" }, { slug: "oud", name: "Mix 20250101" }]);
    expect(plan.get("T2")).toEqual([{ slug: "nieuw", name: "Mix 20260101" }, { slug: "oud", name: "Mix 20250101" }]);
  });

  it("slaat een emmer, een niet-gekoppelde mix en een mix zonder pagina over", () => {
    const plan = planDjcylowMixes(
      snapshot,
      [link("1", "emmer", "bucket-only", "emmer"), link("2", "weg", "unmatched", null), link("3", null, "own-playlist", "p1")],
      ids
    );
    expect(plan.size).toBe(0);
  });
});

describe("applyDjcylowMixes", () => {
  it("ververst het veld bij elke sync, maar laat het staan zonder mix-bron", () => {
    const { db } = openLibraryDb(":memory:");
    ensureSpotifyLinkTable(db);
    upsertTracks(db, [{ dkj_track_id: "T1" }, { dkj_track_id: "T2" }]);
    db.exec(`INSERT INTO spotify_track_ids (spotify_track_id, dkj_track_id, song_key) VALUES ('s1','T1','k1'), ('s2','T2','k2')`);
    const snapshot = snap(playlist("p1", track("s1"), track("s2")));
    const links = [link("20260615", "red", "own-playlist", "p1")];
    expect(applyDjcylowMixes(db, snapshot, { mixCount: 1, links })).toBe(2);
    expect(getTrack(db, "T1")?.djcylow_mix).toEqual([{ slug: "red", name: "Mix 20260615" }]);
    expect(applyDjcylowMixes(db, snapshot, { mixCount: 1, links })).toBe(0);
    expect(applyDjcylowMixes(db, snapshot, { mixCount: 0, links: [] })).toBe(0);
    expect(getTrack(db, "T1")?.djcylow_mix).toEqual([{ slug: "red", name: "Mix 20260615" }]);
    expect(applyDjcylowMixes(db, snap(playlist("p1", track("s1"))), { mixCount: 1, links })).toBe(1);
    expect(getTrack(db, "T2")?.djcylow_mix).toBeNull();
  });
});

describe("mixUrl", () => {
  it("wijst naar de mixpagina op djcylow.com", () => {
    expect(mixUrl("red-light-m-edm-128bpm-20260615")).toBe("https://djcylow.com/luister/mix/red-light-m-edm-128bpm-20260615");
  });
});

import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { applyArtistIdsFromSnapshot, artistPrefix, formatArtistId, planArtistIds } from "./artistIds";
import { exportLibrary, restoreLibrary } from "./libraryFile";
import { applyTrackIdsFromSnapshot } from "./trackIds";
import { getTrack, upsertTracks } from "./trackStore";
import type { Playlist, Snapshot, Track } from "@/lib/spotify/types";

function track(id: string, name: string, artists: [string, string][]): Track {
  return {
    id,
    uri: `spotify:track:${id}`,
    name,
    artists: artists.map(([artistId, artistName]) => ({ id: artistId, name: artistName })),
    album: { id: "al", name: "Album", images: [] },
    durationMs: 180000,
  };
}

function snapshot(...tracks: Track[]): Snapshot {
  const playlist: Playlist = {
    id: "p0",
    name: "Playlist",
    uri: "spotify:playlist:p0",
    collaborative: false,
    public: true,
    snapshotId: "s",
    owner: { id: "me", displayName: null },
    images: [],
    description: null,
    trackCount: tracks.length,
    tracks: tracks.map((t) => ({ addedAt: null, addedBy: null, isLocal: false, track: t })),
  };
  return { syncedAt: "2026-09-27T00:00:00Z", playlists: [playlist] };
}

const memoryDb = () => openLibraryDb(":memory:").db;

describe("artistPrefix", () => {
  it.each([
    ["Martin Garrix", "MAR"],
    ["The Prodigy", "PRO"],
    ["De Dijk", "DIJ"],
    ["A Tribe Called Quest", "TRI"],
    ["Die Antwoord", "ANT"],
    ["Les Rythmes Digitales", "RYT"],
    ["L'Impératrice", "IMP"],
    ["'t Hof van Commerce", "HOF"],
    ["Röyksopp", "ROY"],
    ["Øfdream", "OFD"],
    ["Sérgio Mendes", "SER"],
    ["T.I.", "TIX"],
    ["U2", "UXX"],
    ["1991", "XXX"],
    ["Theo Kottis", "THE"],
    ["The", "THE"],
    ["A$AP Rocky", "AAP"],
  ])("%s -> %s", (name, prefix) => {
    expect(artistPrefix(name)).toBe(prefix);
  });

  it("zet het nummer op minstens twee cijfers en laat het daarna doorgroeien", () => {
    expect(formatArtistId("PRO", 1)).toBe("PRO01");
    expect(formatArtistId("PRO", 100)).toBe("PRO100");
  });
});

describe("planArtistIds", () => {
  it("geeft per Spotify-artiest één ID, in volgorde van eerste voorkomen, met het laagste vrije nummer", () => {
    const plan = planArtistIds(
      snapshot(
        track("t1", "Animals", [["a1", "Martin Garrix"]]),
        track("t2", "Uptown Funk", [["a2", "Mark Ronson"], ["a3", "Bruno Mars"]]),
        track("t3", "Scared to Be Lonely", [["a1", "Martin Garrix"], ["a4", "Dua Lipa"]])
      ),
      [{ spotifyArtistId: "old", artistId: "MAR02" }]
    );
    expect(plan.map((a) => [a.name, a.artistId])).toEqual([
      ["Martin Garrix", "MAR01"],
      ["Mark Ronson", "MAR03"],
      ["Bruno Mars", "BRU01"],
      ["Dua Lipa", "DUA01"],
    ]);
  });

  it("slaat artiesten over die al een ID hebben", () => {
    const plan = planArtistIds(snapshot(track("t1", "Animals", [["a1", "Martin Garrix"]])), [
      { spotifyArtistId: "a1", artistId: "MAR07" },
    ]);
    expect(plan).toEqual([]);
  });

  it("gaat na MAR99 door met MAR100 in plaats van een artiest over te slaan", () => {
    const existing = Array.from({ length: 99 }, (_, i) => ({ spotifyArtistId: `x${i}`, artistId: formatArtistId("MAR", i + 1) }));
    const plan = planArtistIds(snapshot(track("t1", "Animals", [["a1", "Martin Garrix"]])), existing);
    expect(plan[0].artistId).toBe("MAR100");
  });

  it("houdt twee artiesten met dezelfde naam maar een ander Spotify-ID apart", () => {
    const plan = planArtistIds(
      snapshot(track("t1", "A", [["a1", "Matrix"]]), track("t2", "B", [["a2", "Matrix"]])),
      []
    );
    expect(plan.map((a) => a.artistId)).toEqual(["MAT01", "MAT02"]);
  });
});

describe("applyArtistIdsFromSnapshot", () => {
  const snap = snapshot(
    track("t1", "Uptown Funk", [["a2", "Mark Ronson"], ["a3", "Bruno Mars"]]),
    track("t2", "Uptown Funk", [["a2", "Mark Ronson"], ["a3", "Bruno Mars"]]),
    track("t3", "Valerie", [["a2", "Mark Ronson"], ["a5", "Amy Winehouse"]])
  );

  it("vult dkj_artist_ids per track, hoofdartiest eerst, en doet bij opnieuw draaien niets", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snap);
    expect(applyArtistIdsFromSnapshot(db, snap)).toEqual({ newArtists: 3, tracksFilled: 2, totalArtists: 3 });
    expect(getTrack(db, "T000001")?.dkj_artist_ids).toEqual(["MAR01", "BRU01"]);
    expect(getTrack(db, "T000002")?.dkj_artist_ids).toEqual(["MAR01", "AMY01"]);
    expect(applyArtistIdsFromSnapshot(db, snap)).toEqual({ newArtists: 0, tracksFilled: 0, totalArtists: 3 });
  });

  it("laat een zelf ingevulde dkj_artist_ids staan", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snap);
    upsertTracks(db, [{ dkj_track_id: "T000001", dkj_artist_ids: ["ZZZ01"] }]);
    applyArtistIdsFromSnapshot(db, snap);
    expect(getTrack(db, "T000001")?.dkj_artist_ids).toEqual(["ZZZ01"]);
  });

  it("gaat mee in de export, en een export van vóór de artiesten zet gewoon terug", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "artist-ids-"));
    try {
      const db = memoryDb();
      applyTrackIdsFromSnapshot(db, snap);
      applyArtistIdsFromSnapshot(db, snap);
      exportLibrary(db, dir);
      expect(fs.readFileSync(path.join(dir, "artists.ndjson"), "utf8").trim().split("\n")).toHaveLength(3);

      const target = memoryDb();
      expect(restoreLibrary(target, dir).artists).toBe(3);
      expect(applyArtistIdsFromSnapshot(target, snap).newArtists).toBe(0);

      fs.rmSync(path.join(dir, "artists.ndjson"));
      expect(restoreLibrary(memoryDb(), dir).artists).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

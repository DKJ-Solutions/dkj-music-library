import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import {
  refreshTitles,
  applyArtistIdsFromSnapshot,
  applyLibraryIdsFromSnapshot,
  artistPrefix,
  fillAlbumArtists,
  fillDefaultRatings,
  fillPrimaryArtists,
  formatArtistId,
  planArtistIds,
} from "./artistIds";
import { exportLibrary, restoreLibrary } from "./libraryFile";
import { applyTrackIdsFromSnapshot } from "./trackIds";
import { getTrack, listTracks, upsertTracks } from "./trackStore";
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

  it("geeft nieuwe tracks hun ID en dkj_artist_id in één keer, en doet bij opnieuw draaien niets", () => {
    const db = memoryDb();
    const first = applyLibraryIdsFromSnapshot(db, snap);
    expect(first.artists).toEqual({ newArtists: 3, tracksFilled: 0, totalArtists: 3 });
    expect(first.tracks.newTracks).toBe(2);
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_artist_id).toEqual(["MAR01", "BRU01"]);
    expect(getTrack(db, "MAR01-AMY01-01")?.dkj_artist_id).toEqual(["MAR01", "AMY01"]);
    const again = applyLibraryIdsFromSnapshot(db, snap);
    expect([again.artists.newArtists, again.renumbered, again.tracks.newTracks]).toEqual([0, 0, 0]);
  });

  it("vult dkj_artist_id bij bestaande tracks die het nog niet hadden, hoofdartiest eerst", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snap, new Map()); // tracks van vóór de artiest-ID's: XXX00-NN
    expect(applyArtistIdsFromSnapshot(db, snap).tracksFilled).toBe(2);
    expect(getTrack(db, "XXX00-01")?.dkj_artist_id).toEqual(["MAR01", "BRU01"]);
  });

  it("laat een zelf ingevulde dkj_artist_id staan", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snap, new Map());
    upsertTracks(db, [{ dkj_track_id: "XXX00-01", dkj_artist_id: ["ZZZ01"] }]);
    applyArtistIdsFromSnapshot(db, snap);
    expect(getTrack(db, "XXX00-01")?.dkj_artist_id).toEqual(["ZZZ01"]);
  });

  it("zet in dkj_artist de eerste artiest uit het rijtje, en laat een zelf ingevulde staan", () => {
    const db = memoryDb();
    applyLibraryIdsFromSnapshot(db, snap);
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_artist).toBe("Mark Ronson");
    upsertTracks(db, [
      { dkj_track_id: "MAR01-BRU01-01", dkj_artist: null },
      { dkj_track_id: "MAR01-AMY01-01", dkj_artist: "Amy Winehouse" },
      { dkj_track_id: "LOS01-01", artists: [] },
    ]);
    expect(fillPrimaryArtists(db)).toBe(1);
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_artist).toBe("Mark Ronson");
    expect(getTrack(db, "MAR01-AMY01-01")?.dkj_artist).toBe("Amy Winehouse");
    expect(getTrack(db, "LOS01-01")?.dkj_artist).toBeNull();
    expect(fillPrimaryArtists(db)).toBe(0);
  });

  it("geeft in dkj_artist de remixer voorrang, ook bij het aanvullen van bestaande tracks", () => {
    const remix = snapshot(track("t9", "Uptown Funk - Bruno Mars Remix", [["a2", "Mark Ronson"], ["a3", "Bruno Mars"]]));
    const db = memoryDb();
    applyLibraryIdsFromSnapshot(db, remix);
    const id = listTracks(db)[0].dkj_track_id;
    expect(getTrack(db, id)?.dkj_artist).toBe("Bruno Mars");
    expect(getTrack(db, id)?.dkj_file).toBe("Mark Ronson - Uptown Funk (Bruno Mars Remix)");
    upsertTracks(db, [{ dkj_track_id: id, dkj_artist: null }]);
    expect(fillPrimaryArtists(db)).toBe(1);
    expect(getTrack(db, id)?.dkj_artist).toBe("Bruno Mars");
  });

  it("vult dkj_album uit de playlists als die één album noemen, en laat het anders leeg", () => {
    const db = memoryDb();
    const eenduidig = { ...snapshot(track("t1", "Uptown Funk", [["a2", "Mark Ronson"], ["a3", "Bruno Mars"]])).playlists[0], id: "p1", name: "Green Full (f) 🟢 128BPM EDM" };
    const tweede = { ...eenduidig, id: "p2", name: "Green Full (f) 🟢 Top 100" };
    const anders = { ...snapshot(track("t3", "Valerie", [["a2", "Mark Ronson"], ["a5", "Amy Winehouse"]])).playlists[0], id: "p3", name: "Cyan Light (m) 🧊 ALT" };
    const ookAnders = { ...anders, id: "p4", name: "Red Full (m) 🔴 ALT" };
    const result = applyLibraryIdsFromSnapshot(db, { syncedAt: "x", playlists: [eenduidig, tweede, anders, ookAnders] });
    expect(result.albumsFilled).toBe(1);
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_album).toBe("Green Full (f)");
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_bpm).toBe("128BPM");
    expect(getTrack(db, "MAR01-AMY01-01")?.dkj_album).toBeNull();
  });

  it("zet in dkj_albumartiest alle artiesten in Spotify-volgorde, en laat een zelf ingevulde staan", () => {
    const db = memoryDb();
    applyLibraryIdsFromSnapshot(db, snap);
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_albumartiest).toBe("Mark Ronson, Bruno Mars");
    upsertTracks(db, [
      { dkj_track_id: "MAR01-BRU01-01", dkj_albumartiest: null },
      { dkj_track_id: "MAR01-AMY01-01", dkj_albumartiest: "Mark Ronson feat. Amy Winehouse" },
      { dkj_track_id: "LOS01-01", artists: [] },
    ]);
    expect(fillAlbumArtists(db)).toBe(1);
    expect(getTrack(db, "MAR01-BRU01-01")?.dkj_albumartiest).toBe("Mark Ronson, Bruno Mars");
    expect(getTrack(db, "MAR01-AMY01-01")?.dkj_albumartiest).toBe("Mark Ronson feat. Amy Winehouse");
    expect(getTrack(db, "LOS01-01")?.dkj_albumartiest).toBeNull();
    expect(fillAlbumArtists(db)).toBe(0);
  });

  it("nummert oude T-ID's om zodra de artiesten bekend zijn", () => {
    const db = memoryDb();
    applyTrackIdsFromSnapshot(db, snap, new Map());
    db.exec("UPDATE spotify_track_ids SET dkj_track_id = REPLACE(dkj_track_id, 'XXX00-0', 'T00000')");
    db.exec("UPDATE tracks SET dkj_track_id = REPLACE(dkj_track_id, 'XXX00-0', 'T00000')");
    const result = applyLibraryIdsFromSnapshot(db, snap);
    expect(result.renumbered).toBe(2);
    expect(listTracks(db).map((t) => t.dkj_track_id)).toEqual(["MAR01-AMY01-01", "MAR01-BRU01-01"]);
  });

  it("gaat mee in de export, en een export van vóór de artiesten zet gewoon terug", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "artist-ids-"));
    try {
      const db = memoryDb();
      applyLibraryIdsFromSnapshot(db, snap);
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

describe("refreshTitles", () => {
  it("maakt een afgeleide dkj_title schoon, laat een zelf ingevulde staan, en doet de tweede keer niets", () => {
    const { db } = openLibraryDb(":memory:");
    upsertTracks(db, [
      { dkj_track_id: "A", title: "2 up in the Morning - Radio Mix", dkj_title: "2 up in the Morning (Radio Mix)" },
      { dkj_track_id: "B", title: "Titanium (feat. Sia)", dkj_title: "Mijn Titanium" },
      { dkj_track_id: "C", title: "Higher - David Penn Remix", dkj_title: "Higher (David Penn Remix)" },
    ]);
    expect(refreshTitles(db)).toBe(1);
    expect(getTrack(db, "A")?.dkj_title).toBe("2 up in the Morning");
    expect(getTrack(db, "B")?.dkj_title).toBe("Mijn Titanium");
    expect(getTrack(db, "C")?.dkj_title).toBe("Higher (David Penn Remix)");
    expect(refreshTitles(db)).toBe(0);
  });
});

describe("fillDefaultRatings", () => {
  it("zet tier-4 waar dkj_rating leeg is en laat een zelf gekozen waardering staan", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a" }, { dkj_track_id: "b", dkj_rating: "tier-7" }]);
    expect(fillDefaultRatings(db)).toBe(1);
    expect([getTrack(db, "a")?.dkj_rating, getTrack(db, "b")?.dkj_rating]).toEqual(["tier-4", "tier-7"]);
    expect(fillDefaultRatings(db)).toBe(0);
  });

  it("zet een waardering onder de oude naam (star-N) om naar tier-N met hetzelfde getal", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a", dkj_rating: "tier-4" }, { dkj_track_id: "b", dkj_rating: "tier-4" }]);
    db.prepare(`UPDATE tracks SET dkj_rating = 'star-3' WHERE dkj_track_id = 'a'`).run();
    fillDefaultRatings(db);
    expect([getTrack(db, "a")?.dkj_rating, getTrack(db, "b")?.dkj_rating]).toEqual(["tier-3", "tier-4"]);
  });
});

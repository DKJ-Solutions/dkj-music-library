import { describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { openLibraryDb } from "./db";
import { mergeLiveVariants, studioSongKey } from "./liveVariants";
import { ensureSpotifyLinkTable } from "./trackIds";
import { listTracks, upsertTracks } from "./trackStore";

function library() {
  const { db } = openLibraryDb(":memory:");
  ensureSpotifyLinkTable(db);
  const insert = db.prepare("INSERT INTO spotify_track_ids VALUES (?, ?, ?)");
  return { db, link: (spotifyId: string, trackId: string, key: string) => insert.run(spotifyId, trackId, key) };
}

const links = (db: DatabaseSync) =>
  db.prepare("SELECT spotify_track_id, dkj_track_id, song_key FROM spotify_track_ids ORDER BY spotify_track_id").all();

describe("studioSongKey", () => {
  it("haalt de live-aanduiding uit het titeldeel en laat de artiesten staan", () => {
    expect(studioSongKey("clocks - live|a1,a2")).toBe("clocks|a1,a2");
    expect(studioSongKey("live forever|a1")).toBe("live forever|a1");
  });
});

describe("mergeLiveVariants", () => {
  it("voegt een live-variant samen met de studioversie onder het laagste ID, velden aangevuld", () => {
    const { db, link } = library();
    const title = "You Shook Me All Night Long";
    upsertTracks(db, [
      {
        dkj_track_id: "ACD01-02",
        spotify_track_id: "live",
        title: `${title} - Live at River Plate - December 2009`,
        artists: ["AC/DC"],
        album: "Live at River Plate",
        bpm: 127,
        dkj_artist_ids: ["ACD01"],
        spotify_playlist: [{ id: "p1", name: "softrock" }],
        dkj_group: ["Prive"],
      },
      {
        dkj_track_id: "ACD01-38",
        spotify_track_id: "studio",
        title,
        artists: ["AC/DC"],
        album: "Back In Black",
        dkj_artist_ids: ["ACD01"],
        spotify_playlist: [{ id: "p2", name: "classic" }, { id: "p1", name: "softrock" }],
        dkj_group: ["Prive", "Overige"],
      },
      { dkj_track_id: "ACD01-03", spotify_track_id: "other", title: "Thunderstruck", artists: ["AC/DC"] },
    ]);
    link("live", "ACD01-02", `${title.toLowerCase()} - live at river plate - december 2009|acdc`);
    link("studio", "ACD01-38", `${title.toLowerCase()}|acdc`);
    link("other", "ACD01-03", "thunderstruck|acdc");

    expect(mergeLiveVariants(db)).toEqual({ merged: 1, retitled: 0 });
    expect(listTracks(db).map((t) => t.dkj_track_id)).toEqual(["ACD01-02", "ACD01-03"]);
    expect(listTracks(db)[0]).toMatchObject({
      spotify_track_id: "studio",
      title,
      album: "Back In Black",
      bpm: 127,
      spotify_playlist: [{ id: "p2", name: "classic" }, { id: "p1", name: "softrock" }],
      dkj_group: ["Prive", "Overige"],
    });
    expect(links(db)).toEqual([
      { spotify_track_id: "live", dkj_track_id: "ACD01-02", song_key: `${title.toLowerCase()}|acdc` },
      { spotify_track_id: "other", dkj_track_id: "ACD01-03", song_key: "thunderstruck|acdc" },
      { spotify_track_id: "studio", dkj_track_id: "ACD01-02", song_key: `${title.toLowerCase()}|acdc` },
    ]);
    expect(mergeLiveVariants(db)).toEqual({ merged: 0, retitled: 0 });
  });

  it("geeft een rij met alleen een live-titel de schone titel, en dkj_file mee zolang die afgeleid was", () => {
    const { db, link } = library();
    upsertTracks(db, [
      {
        dkj_track_id: "NIR01-04",
        title: "About A Girl - Live",
        artists: ["Nirvana"],
        dkj_file: "Nirvana - About A Girl (Live)",
        dkj_artist: "Nirvana",
      },
      { dkj_track_id: "NIR01-05", title: "Lithium - Live", artists: ["Nirvana"], dkj_file: "Mijn eigen naam" },
    ]);
    link("a", "NIR01-04", "about a girl - live|n");
    link("b", "NIR01-05", "lithium - live|n");

    expect(mergeLiveVariants(db)).toEqual({ merged: 0, retitled: 2 });
    expect(listTracks(db).map((t) => [t.title, t.dkj_file, t.dkj_artist])).toEqual([
      ["About A Girl", "Nirvana - About A Girl", "Nirvana"],
      ["Lithium", "Mijn eigen naam", null],
    ]);
    expect(links(db).map((l) => l.song_key)).toEqual(["about a girl|n", "lithium|n"]);
  });
});

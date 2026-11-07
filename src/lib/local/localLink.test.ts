// setTrackLocalFile (#151): de eigen koppeling van een track aan een lokaal bestand.
import { describe, expect, it } from "vitest";
import { openLibraryDb } from "@/lib/library/db";
import { countTracks, getTrack, upsertTracks } from "@/lib/library/trackStore";
import { normaliseLocalPath, setTrackLocalFile } from "./localLink";

const memoryDb = () => openLibraryDb(":memory:").db;

describe("normaliseLocalPath", () => {
  it("zet backslashes om, knipt witruimte en maakt van leeg null", () => {
    expect(normaliseLocalPath(String.raw`  Map\Sub\Track.mp3 `)).toBe("Map/Sub/Track.mp3");
    expect(normaliseLocalPath("   ")).toBeNull();
    expect(normaliseLocalPath(null)).toBeNull();
  });
});

describe("setTrackLocalFile", () => {
  it("zet en wist dkj_local_file van een bestaande track, en laat de rest staan", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a", dkj_file: "Artist - Song" }]);
    expect(setTrackLocalFile(db, "a", String.raw`Map\Song.mp3`)).toBe("Map/Song.mp3");
    expect(getTrack(db, "a")).toMatchObject({ dkj_local_file: "Map/Song.mp3", dkj_file: "Artist - Song" });
    expect(setTrackLocalFile(db, "a", null)).toBeNull();
    expect(getTrack(db, "a")?.dkj_local_file).toBeNull();
  });

  it("maakt geen nieuwe track aan voor een onbekend ID", () => {
    const db = memoryDb();
    expect(setTrackLocalFile(db, "bestaat-niet", "x.mp3")).toBeUndefined();
    expect(countTracks(db)).toBe(0);
  });
});

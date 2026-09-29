import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { setTrackRating } from "./rating";
import { TrackInputError, countTracks, getTrack, upsertTracks } from "./trackStore";

const memoryDb = () => openLibraryDb(":memory:").db;

describe("setTrackRating", () => {
  it("zet dkj_rating van een bestaande track, in de spelling van de options", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a", dkj_rating: "tier-4", title: "Eén" }]);
    expect(setTrackRating(db, "a", "TIER-7")).toBe("tier-7");
    expect(getTrack(db, "a")).toMatchObject({ dkj_rating: "tier-7", title: "Eén" });
  });

  it("maakt geen nieuwe track aan voor een onbekend ID", () => {
    const db = memoryDb();
    expect(setTrackRating(db, "bestaat-niet", "tier-2")).toBeNull();
    expect(countTracks(db)).toBe(0);
  });

  it("weigert een waarde die geen optie is, en laat de oude staan", () => {
    const db = memoryDb();
    upsertTracks(db, [{ dkj_track_id: "a", dkj_rating: "tier-4" }]);
    expect(() => setTrackRating(db, "a", "tier-9")).toThrow(TrackInputError);
    expect(getTrack(db, "a")?.dkj_rating).toBe("tier-4");
  });
});

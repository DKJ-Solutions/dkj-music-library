import { describe, expect, it } from "vitest";
import { openLibraryDb } from "./db";
import { fillGroupsFromWorlds, groupsOfPlaylist, planGroups } from "./groupFromWorlds";
import { getTrack, upsertTracks } from "./trackStore";

describe("groupsOfPlaylist", () => {
  it("geeft de groep van de wereld, en MMC bij een beschrijving", () => {
    expect(groupsOfPlaylist({ world: "prive", description: null })).toEqual(["Prive"]);
    expect(groupsOfPlaylist({ world: "djcylow", description: "" })).toEqual(["DJ CYLOW"]);
    expect(groupsOfPlaylist({ world: "prive", description: "De mix van deze maand" })).toEqual(["MMC", "Prive"]);
  });
});

describe("planGroups", () => {
  it("neemt alle groepen van de playlists, in vaste volgorde, zonder dubbelen", () => {
    const byId = new Map([["p1", ["Prive"]], ["p2", ["MMC"]], ["p3", ["Prive"]]]);
    expect(planGroups(["p1", "p2", "p3", "onbekend"], byId)).toEqual(["MMC", "Prive"]);
    expect(planGroups(["onbekend"], byId)).toEqual([]);
  });
});

describe("fillGroupsFromWorlds", () => {
  it("vult alleen lege velden, en laat een zelf ingevulde groep staan", () => {
    const { db } = openLibraryDb(":memory:");
    upsertTracks(db, [
      { dkj_track_id: "T1", spotify_playlist: [{ id: "p1", name: "A" }, { id: "p2", name: "B" }] },
      { dkj_track_id: "T2", spotify_playlist: [{ id: "p1", name: "A" }], dkj_group: ["MMC"] },
      { dkj_track_id: "T3", spotify_playlist: [{ id: "p9", name: "?" }] },
    ]);
    const playlists = [
      { id: "p1", world: "djcylow" as const, description: null },
      { id: "p2", world: "prive" as const, description: "met beschrijving" },
    ];
    expect(fillGroupsFromWorlds(db, playlists)).toBe(1);
    expect(getTrack(db, "T1")?.dkj_group).toEqual(["MMC", "DJ CYLOW", "Prive"]);
    expect(getTrack(db, "T2")?.dkj_group).toEqual(["MMC"]);
    expect(getTrack(db, "T3")?.dkj_group).toBeNull();
    expect(fillGroupsFromWorlds(db, playlists)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { EMPTY_FILTER, countBy, filterRegister, searchText, sortRegister, toRegisterRow, type RegisterRow } from "./register";
import type { StoredTrack } from "./trackStore";

function stored(over: Partial<StoredTrack> = {}): StoredTrack {
  return {
    dkj_track_id: "MAR01-BRU01-01",
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
    title: "Uptown Funk",
    dkj_artist_ids: ["MAR01", "BRU01"],
    dkj_artist: "Mark Ronson",
    dkj_albumartiest: "Mark Ronson, Bruno Mars",
    dkj_bpm: null,
    dkj_album: null,
    dkj_file: "Mark Ronson - Uptown Funk",
    dkj_group: ["MMC"],
    spotify_playlist: [{ id: "p1", name: "Funk" }, { bad: true }],
    ...over,
  };
}

describe("toRegisterRow", () => {
  it("neemt de eigen velden over en zoekt de artiestnamen op", () => {
    const row = toRegisterRow(stored({ dkj_bpm: "112BPM" }), { MAR01: "Mark Ronson" });
    expect(row).toEqual({
      id: "MAR01-BRU01-01",
      title: "Uptown Funk",
      artistIds: ["MAR01", "BRU01"],
      artistNames: ["Mark Ronson", "BRU01"],
      artist: "Mark Ronson",
      albumArtist: "Mark Ronson, Bruno Mars",
      bpm: "112BPM",
      album: null,
      albumCandidates: [],
      file: "Mark Ronson - Uptown Funk",
      groups: ["MMC"],
      playlists: [{ id: "p1", name: "Funk" }],
    });
  });

  it("maakt van ontbrekende of lege velden null en een lege lijst", () => {
    const row = toRegisterRow(stored({ dkj_artist_ids: null, dkj_artist: "", title: null }), {});
    expect([row.artistIds, row.artist, row.title]).toEqual([[], null, ""]);
  });
});

describe("filterRegister", () => {
  const rows: RegisterRow[] = [
    toRegisterRow(stored({ dkj_bpm: "128BPM", dkj_album: "Green Light (f)" }), {}),
    toRegisterRow(stored({ dkj_track_id: "ROY01-01", title: "Eple", dkj_artist_ids: ["ROY01"], dkj_artist: "Röyksopp", dkj_albumartiest: "Röyksopp" }), {}),
  ];
  const hay = rows.map(searchText);
  const run = (filter: Partial<{ term: string; bpm: string; album: string; group: string }>) =>
    filterRegister(rows, hay, { term: "", bpm: "", album: "", ...filter }).map((row) => row.id);

  it("zoekt ook op playlistnaam", () => {
    expect(run({ term: "funk" })).toEqual(["MAR01-BRU01-01", "ROY01-01"]);
  });

  it("zoekt zonder accenten of hoofdletters, ook in artiest-ID's", () => {
    expect(run({ term: "royksopp" })).toEqual(["ROY01-01"]);
    expect(run({ term: "BRU01" })).toEqual(["MAR01-BRU01-01"]);
  });

  it("filtert op dkj_group", () => {
    expect(run({ group: "MMC" })).toEqual(["MAR01-BRU01-01", "ROY01-01"]);
    expect(run({ group: EMPTY_FILTER })).toEqual([]);
  });

  it("filtert op een optie en op leeg", () => {
    expect(run({ bpm: "128BPM" })).toEqual(["MAR01-BRU01-01"]);
    expect(run({ bpm: EMPTY_FILTER })).toEqual(["ROY01-01"]);
    expect(run({ album: "Green Light (f)", term: "uptown" })).toEqual(["MAR01-BRU01-01"]);
    expect(run({ album: "Green Full (f)" })).toEqual([]);
  });

  it("telt per waarde, leeg onder EMPTY_FILTER", () => {
    expect(countBy(rows, "bpm")).toEqual(new Map([["128BPM", 1], [EMPTY_FILTER, 1]]));
  });
});

describe("sortRegister", () => {
  const base = toRegisterRow(stored(), {});
  const rows: RegisterRow[] = [
    { ...base, id: "A", bpm: "112BPM", groups: ["MMC"] },
    { ...base, id: "B", bpm: null, groups: [] },
    { ...base, id: "C", bpm: "96BPM", groups: ["DJ CYLOW"] },
  ];
  const ids = (list: RegisterRow[]) => list.map((row) => row.id);

  it("sorteert numeriek, met lege cellen onderaan in beide richtingen", () => {
    expect(ids(sortRegister(rows, { key: "bpm", dir: "asc" }))).toEqual(["C", "A", "B"]);
    expect(ids(sortRegister(rows, { key: "bpm", dir: "desc" }))).toEqual(["A", "C", "B"]);
  });

  it("sorteert een lijstkolom op zijn waarden", () => {
    expect(ids(sortRegister(rows, { key: "groups", dir: "asc" }))).toEqual(["C", "A", "B"]);
  });

  it("laat de volgorde staan zonder sortering, en verandert de invoer niet", () => {
    expect(ids(sortRegister(rows, null))).toEqual(["A", "B", "C"]);
    sortRegister(rows, { key: "id", dir: "desc" });
    expect(ids(rows)).toEqual(["A", "B", "C"]);
  });
});

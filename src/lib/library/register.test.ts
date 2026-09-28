import { describe, expect, it } from "vitest";
import { EMPTY_FILTER, countBy, filterRegister, searchText, sortRegister, toRegisterRow, type RegisterRow } from "./register";
import type { StoredTrack } from "./trackStore";

function stored(over: Partial<StoredTrack> = {}): StoredTrack {
  return {
    dkj_track_id: "MAR01-BRU01-01",
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
    title: "Uptown Funk",
    dkj_artist_id: ["MAR01", "BRU01"],
    dkj_artist: "Mark Ronson",
    dkj_albumartiest: "Mark Ronson, Bruno Mars",
    year: 2014,
    dkj_bpm: null,
    dkj_genre: null,
    dkj_album: null,
    dkj_file: "Mark Ronson - Uptown Funk",
    dkj_group: ["MMC"],
    dkj_title: "Uptown Funk",
    spotify_playlist: [{ id: "p1", name: "Funk" }, { bad: true }],
    djcylow_mix: [{ slug: "red-light-m-edm-128bpm-20260615", name: "Red Mix" }, { slug: 1 }],
    ...over,
  };
}

describe("toRegisterRow", () => {
  it("neemt de eigen velden over en zoekt de artiestnamen op", () => {
    const row = toRegisterRow(stored({ dkj_bpm: "112BPM", dkj_genre: "POP" }), { MAR01: "Mark Ronson" });
    expect(row).toEqual({
      id: "MAR01-BRU01-01",
      title: "Uptown Funk",
      artistIds: ["MAR01", "BRU01"],
      artistNames: ["Mark Ronson", "BRU01"],
      artist: "Mark Ronson",
      albumArtist: "Mark Ronson, Bruno Mars",
      year: "2014",
      bpm: "112BPM",
      genre: "POP",
      album: null,
      albumCandidates: [],
      file: "Mark Ronson - Uptown Funk",
      dkjTitle: "Uptown Funk",
      groups: ["MMC"],
      playlists: [{ id: "p1", name: "Funk" }],
      mixes: [{ slug: "red-light-m-edm-128bpm-20260615", name: "Red Mix" }],
    });
  });

  it("maakt van ontbrekende of lege velden null en een lege lijst", () => {
    const row = toRegisterRow(stored({ dkj_artist_id: null, dkj_artist: "", title: null, year: null }), {});
    expect([row.artistIds, row.artist, row.title, row.year]).toEqual([[], null, "", null]);
  });
});

describe("filterRegister", () => {
  const rows: RegisterRow[] = [
    toRegisterRow(stored({ dkj_bpm: "128BPM", dkj_genre: "EDM", dkj_album: "Green Light (f)" }), {}),
    toRegisterRow(stored({ dkj_track_id: "ROY01-01", title: "Eple", dkj_artist_id: ["ROY01"], dkj_artist: "Röyksopp", dkj_albumartiest: "Röyksopp" }), {}),
  ];
  const hay = rows.map(searchText);
  const run = (filter: Partial<{ term: string; bpm: string; genre: string; album: string; group: string }>) =>
    filterRegister(rows, hay, { term: "", bpm: "", album: "", ...filter }).map((row) => row.id);

  it("zoekt ook op playlistnaam", () => {
    expect(run({ term: "funk" })).toEqual(["MAR01-BRU01-01", "ROY01-01"]);
  });

  it("zoekt zonder accenten of hoofdletters, ook in artiest-ID's", () => {
    expect(run({ term: "royksopp" })).toEqual(["ROY01-01"]);
    expect(run({ term: "BRU01" })).toEqual(["MAR01-BRU01-01"]);
  });

  it("filtert op dkj_genre", () => {
    expect(run({ genre: "EDM" })).toEqual(["MAR01-BRU01-01"]);
    expect(run({ genre: EMPTY_FILTER })).toEqual(["ROY01-01"]);
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

  it("sorteert op year, met een onbekend jaar onderaan", () => {
    const jaren: RegisterRow[] = [
      { ...base, id: "A", year: "2014" },
      { ...base, id: "B", year: null },
      { ...base, id: "C", year: "1997" },
    ];
    expect(ids(sortRegister(jaren, { key: "year", dir: "asc" }))).toEqual(["C", "A", "B"]);
    expect(ids(sortRegister(jaren, { key: "year", dir: "desc" }))).toEqual(["A", "C", "B"]);
  });

  it("zoekt op het jaar", () => {
    expect(searchText({ ...base, year: "1997" })).toContain("1997");
  });

  it("sorteert een lijstkolom op zijn waarden", () => {
    expect(ids(sortRegister(rows, { key: "groups", dir: "asc" }))).toEqual(["C", "A", "B"]);
  });

  it("negeert leestekens zoals ', ... en ( in de titel", () => {
    const titels: RegisterRow[] = [
      { ...base, id: "Z", dkjTitle: "Zombie" },
      { ...base, id: "T", dkjTitle: "'Til Tuesday" },
      { ...base, id: "B", dkjTitle: "...Baby One More Time" },
      { ...base, id: "H", dkjTitle: "(Here I Am)" },
      { ...base, id: "A", dkjTitle: "Abba" },
    ];
    expect(ids(sortRegister(titels, { key: "dkjTitle", dir: "asc" }))).toEqual(["A", "B", "H", "T", "Z"]);
  });

  it("negeert een lidwoord vooraan (A, An, The), maar alleen als los woord", () => {
    const titels: RegisterRow[] = [
      { ...base, id: "Beatles", dkjTitle: "The Beatles" },
      { ...base, id: "Tribe", dkjTitle: "A Tribe Called Quest" },
      { ...base, id: "Emotion", dkjTitle: "an Emotion" },
      { ...base, id: "Abba", dkjTitle: "Abba" },
      { ...base, id: "Aha", dkjTitle: "A-ha" },
      { ...base, id: "Cure", dkjTitle: "'The Cure'" },
      { ...base, id: "Theory", dkjTitle: "Theory of a Deadman" },
    ];
    expect(ids(sortRegister(titels, { key: "dkjTitle", dir: "asc" }))).toEqual([
      "Abba",
      "Aha",
      "Beatles",
      "Cure",
      "Emotion",
      "Theory",
      "Tribe",
    ]);
  });

  it("laat een titel die alleen uit een lidwoord bestaat staan", () => {
    const titels: RegisterRow[] = [
      { ...base, id: "TheThe", dkjTitle: "The The" },
      { ...base, id: "A", dkjTitle: "A" },
      { ...base, id: "Zombie", dkjTitle: "Zombie" },
    ];
    expect(ids(sortRegister(titels, { key: "dkjTitle", dir: "asc" }))).toEqual(["A", "TheThe", "Zombie"]);
  });

  it("laat spaties wel meetellen: woorden blijven woorden", () => {
    const titels: RegisterRow[] = [
      { ...base, id: "2", dkjTitle: "Dela" },
      { ...base, id: "1", dkjTitle: "De La Soul" },
    ];
    expect(ids(sortRegister(titels, { key: "dkjTitle", dir: "asc" }))).toEqual(["1", "2"]);
  });

  it("laat de volgorde staan zonder sortering, en verandert de invoer niet", () => {
    expect(ids(sortRegister(rows, null))).toEqual(["A", "B", "C"]);
    sortRegister(rows, { key: "id", dir: "desc" });
    expect(ids(rows)).toEqual(["A", "B", "C"]);
  });
});

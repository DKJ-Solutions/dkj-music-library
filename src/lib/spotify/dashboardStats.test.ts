// dashboardStats.ts: de pure aggregatie-laag onder /spotify/dashboard (dedup, top-artiesten,
// verdelingen). Deze tests bouwen kleine, met de hand geconstrueerde snapshots/verrijkte
// playlists op -- geen echte data/spotify/snapshot.json nodig (die is git-ignored en persoonlijk).
import { describe, expect, it } from "vitest";
import {
  computeDedupSummary,
  computeTopArtists,
  findDuplicateTracks,
  sumTracksByColor,
  sumTracksByMmcBpm,
  sumTracksByWorld,
  topDuplicateArtists,
} from "./dashboardStats";
import type { Playlist, PlaylistItem, Snapshot, Track } from "./types";
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import type { ParsedPlaylistName } from "./parsePlaylistName";

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    uri: "spotify:track:track-1",
    name: "Some Song",
    artists: [{ id: "artist-1", name: "Some Artist" }],
    album: { id: "album-1", name: "Some Album", images: [] },
    durationMs: 200000,
    ...overrides,
  };
}

function makeItem(track: Track | null): PlaylistItem {
  return { addedAt: null, addedBy: null, isLocal: false, track };
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "p1",
    name: "Playlist 1",
    uri: "spotify:playlist:p1",
    collaborative: false,
    public: true,
    snapshotId: "snap-1",
    owner: { id: "eigen-account-id", displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 0,
    tracks: [],
    ...overrides,
  };
}

function makeSnapshot(playlists: Playlist[]): Snapshot {
  return { syncedAt: "2026-07-23T00:00:00Z", playlists };
}

describe("collectDuplicates / findDuplicateTracks", () => {
  it("levert niets op als geen enkele track in 2+ playlists voorkomt", () => {
    const shared = makeTrack({ id: "t1" });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: [makeItem(shared)] }),
      makePlaylist({ id: "p2", tracks: [makeItem(makeTrack({ id: "t2" }))] }),
    ]);

    expect(findDuplicateTracks(snapshot)).toEqual([]);
  });

  it("vindt een track die in 2 distincte playlists voorkomt", () => {
    const shared = makeTrack({ id: "t1", name: "Shared Song", artists: [{ id: "a1", name: "Artist A" }] });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", name: "Playlist A", tracks: [makeItem(shared)] }),
      makePlaylist({ id: "p2", name: "Playlist B", tracks: [makeItem(shared)] }),
    ]);

    const duplicates = findDuplicateTracks(snapshot);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toMatchObject({
      trackId: "t1",
      name: "Shared Song",
      artists: [{ id: "a1", name: "Artist A" }],
      playlistCount: 2,
      playlistNames: ["Playlist A", "Playlist B"],
    });
  });

  it("telt dezelfde track NIET extra als 'm twee keer in DEZELFDE playlist staat (per-playlist Set)", () => {
    const shared = makeTrack({ id: "t1" });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", name: "Playlist A", tracks: [makeItem(shared), makeItem(shared)] }),
    ]);

    expect(findDuplicateTracks(snapshot)).toEqual([]);
  });

  it("negeert items zonder track (lokaal bestand/episode, track: null)", () => {
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: [makeItem(null)] }),
      makePlaylist({ id: "p2", tracks: [makeItem(null)] }),
    ]);

    expect(findDuplicateTracks(snapshot)).toEqual([]);
  });

  it("sorteert op aantal playlists (aflopend), dan op naam", () => {
    const trackA = makeTrack({ id: "a", name: "Zulu Song" });
    const trackB = makeTrack({ id: "b", name: "Alpha Song" });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: [makeItem(trackA), makeItem(trackB)] }),
      makePlaylist({ id: "p2", tracks: [makeItem(trackA), makeItem(trackB)] }),
      makePlaylist({ id: "p3", tracks: [makeItem(trackA)] }),
    ]);

    const duplicates = findDuplicateTracks(snapshot);
    expect(duplicates.map((d) => d.trackId)).toEqual(["a", "b"]);
  });

  it("kapt af tot `limit`", () => {
    const tracks = ["a", "b", "c"].map((id) => makeTrack({ id, name: id }));
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: tracks.map(makeItem) }),
      makePlaylist({ id: "p2", tracks: tracks.map(makeItem) }),
    ]);

    expect(findDuplicateTracks(snapshot, 2)).toHaveLength(2);
  });

  it("telt twee DISTINCTE playlists met dezelfde naam als playlistCount 2, niet samengevoegd tot één (Map<playlistId>-ontwerp)", () => {
    const shared = makeTrack({ id: "t1", name: "Shared Song" });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", name: "Feestje", tracks: [makeItem(shared)] }),
      makePlaylist({ id: "p2", name: "Feestje", tracks: [makeItem(shared)] }),
    ]);

    const duplicates = findDuplicateTracks(snapshot);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].playlistCount).toBe(2);
    expect(duplicates[0].playlistNames).toEqual(["Feestje", "Feestje"]);
  });

  it("sorteert alfabetisch op naam bij gelijke playlistCount (localeCompare-tak)", () => {
    const trackZ = makeTrack({ id: "z", name: "Zulu Song" });
    const trackA = makeTrack({ id: "a", name: "Alpha Song" });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: [makeItem(trackZ), makeItem(trackA)] }),
      makePlaylist({ id: "p2", tracks: [makeItem(trackZ), makeItem(trackA)] }),
    ]);

    const duplicates = findDuplicateTracks(snapshot);
    expect(duplicates.map((d) => d.name)).toEqual(["Alpha Song", "Zulu Song"]);
  });

  it("levert niets op voor een snapshot zonder playlists (echt lege snapshot)", () => {
    const snapshot = makeSnapshot([]);
    expect(findDuplicateTracks(snapshot)).toEqual([]);
  });
});

describe("computeDedupSummary", () => {
  it("telt totalDuplicateTracks los van de (mogelijk afgekapte) `duplicates`-lijst", () => {
    const tracks = ["a", "b", "c"].map((id) => makeTrack({ id, name: id }));
    const unique = makeTrack({ id: "d", name: "unique" });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: [...tracks.map(makeItem), makeItem(unique)] }),
      makePlaylist({ id: "p2", tracks: tracks.map(makeItem) }),
    ]);

    const summary = computeDedupSummary(snapshot, 1);
    expect(summary.duplicates).toHaveLength(1);
    expect(summary.totalDuplicateTracks).toBe(3);
    expect(summary.totalDistinctTracks).toBe(4);
  });

  it("levert nullen op voor een snapshot zonder tracks", () => {
    const snapshot = makeSnapshot([makePlaylist({ id: "p1", tracks: [] })]);
    const summary = computeDedupSummary(snapshot);
    expect(summary).toEqual({
      duplicates: [],
      allDuplicates: [],
      totalDuplicateTracks: 0,
      totalDistinctTracks: 0,
    });
  });

  it("levert nullen op voor een echt lege snapshot (playlists: [])", () => {
    const summary = computeDedupSummary(makeSnapshot([]));
    expect(summary).toEqual({
      duplicates: [],
      allDuplicates: [],
      totalDuplicateTracks: 0,
      totalDistinctTracks: 0,
    });
  });
});

describe("topDuplicateArtists", () => {
  it("somt (playlistCount - 1) per artiest op over de meegegeven duplicaten", () => {
    const duplicates = [
      {
        trackId: "a",
        name: "A",
        artists: [{ id: "x", name: "Artist X" }],
        playlistCount: 3,
        playlistNames: ["p1", "p2", "p3"],
      },
      {
        trackId: "b",
        name: "B",
        artists: [{ id: "x", name: "Artist X" }],
        playlistCount: 2,
        playlistNames: ["p1", "p2"],
      },
      {
        trackId: "c",
        name: "C",
        artists: [{ id: "y", name: "Artist Y" }],
        playlistCount: 2,
        playlistNames: ["p1", "p2"],
      },
    ];

    const result = topDuplicateArtists(duplicates);
    expect(result).toEqual([
      { id: "x", name: "Artist X", extraCopies: 3 }, // (3-1) + (2-1) = 3
      { id: "y", name: "Artist Y", extraCopies: 1 },
    ]);
  });

  it("telt een samenwerking (meerdere artiesten op één track) voor elke artiest afzonderlijk mee", () => {
    const duplicates = [
      {
        trackId: "a",
        name: "A",
        artists: [
          { id: "x", name: "Artist X" },
          { id: "y", name: "Artist Y" },
        ],
        playlistCount: 2,
        playlistNames: ["p1", "p2"],
      },
    ];

    const result = topDuplicateArtists(duplicates);
    expect(result.find((r) => r.name === "Artist X")?.extraCopies).toBe(1);
    expect(result.find((r) => r.name === "Artist Y")?.extraCopies).toBe(1);
  });

  it("kapt af tot `limit`", () => {
    const duplicates = ["X", "Y", "Z"].map((name, i) => ({
      trackId: String(i),
      name,
      artists: [{ id: name, name }],
      playlistCount: 2,
      playlistNames: ["p1", "p2"],
    }));
    expect(topDuplicateArtists(duplicates, 2)).toHaveLength(2);
  });

  it("groepeert op artist.id, niet op naam (twee verschillende artiesten met dezelfde naam blijven twee aparte entries)", () => {
    const duplicates = [
      {
        trackId: "a",
        name: "A",
        artists: [{ id: "id-1", name: "Same Name" }],
        playlistCount: 2,
        playlistNames: ["p1", "p2"],
      },
      {
        trackId: "b",
        name: "B",
        artists: [{ id: "id-2", name: "Same Name" }],
        playlistCount: 3,
        playlistNames: ["p1", "p2", "p3"],
      },
    ];

    const result = topDuplicateArtists(duplicates);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: "id-2", name: "Same Name", extraCopies: 2 },
      { id: "id-1", name: "Same Name", extraCopies: 1 },
    ]);
  });

  it("sorteert alfabetisch op naam bij gelijke extraCopies (localeCompare-tak)", () => {
    const duplicates = [
      { trackId: "a", name: "A", artists: [{ id: "z", name: "Zulu Artist" }], playlistCount: 2, playlistNames: ["p1", "p2"] },
      { trackId: "b", name: "B", artists: [{ id: "y", name: "Alpha Artist" }], playlistCount: 2, playlistNames: ["p1", "p2"] },
    ];

    const result = topDuplicateArtists(duplicates);
    expect(result.map((r) => r.name)).toEqual(["Alpha Artist", "Zulu Artist"]);
  });

  it("telt over ALLE meegegeven duplicaten, ook die buiten de top-`limit` vallen (allDuplicates i.p.v. de afgekapte tabel)", () => {
    // 3 duplicaten van dezelfde artiest, gerankt onder een `limit` van 2 in de tabel-context --
    // topDuplicateArtists zelf krijgt hier de VOLLE lijst (zoals de aanroeper met allDuplicates doet)
    // en moet dus alle drie meetellen, niet alleen de eerste 2.
    const allDuplicates = [
      { trackId: "a", name: "A", artists: [{ id: "x", name: "Artist X" }], playlistCount: 4, playlistNames: ["p1", "p2", "p3", "p4"] },
      { trackId: "b", name: "B", artists: [{ id: "x", name: "Artist X" }], playlistCount: 3, playlistNames: ["p1", "p2", "p3"] },
      // Deze derde track zou buiten een top-2-tabel vallen, maar telt hier toch mee.
      { trackId: "c", name: "C", artists: [{ id: "x", name: "Artist X" }], playlistCount: 2, playlistNames: ["p1", "p2"] },
    ];

    const result = topDuplicateArtists(allDuplicates);
    // (4-1) + (3-1) + (2-1) = 3 + 2 + 1 = 6
    expect(result).toEqual([{ id: "x", name: "Artist X", extraCopies: 6 }]);
  });
});

describe("computeTopArtists", () => {
  it("telt track-entries per artiest, over alle playlists heen (incl. duplicaten over playlists heen)", () => {
    const trackByX = makeTrack({ id: "t1", artists: [{ id: "x", name: "Artist X" }] });
    const snapshot = makeSnapshot([
      makePlaylist({ id: "p1", tracks: [makeItem(trackByX)] }),
      makePlaylist({ id: "p2", tracks: [makeItem(trackByX)] }),
    ]);

    const ranking = computeTopArtists(snapshot);
    expect(ranking).toEqual([{ name: "Artist X", trackCount: 2, playlistCount: 2 }]);
  });

  it("telt een samenwerking voor elke artiest afzonderlijk mee", () => {
    const collab = makeTrack({
      id: "t1",
      artists: [
        { id: "x", name: "Artist X" },
        { id: "y", name: "Artist Y" },
      ],
    });
    const snapshot = makeSnapshot([makePlaylist({ id: "p1", tracks: [makeItem(collab)] })]);

    const ranking = computeTopArtists(snapshot);
    expect(ranking.map((r) => r.name).sort()).toEqual(["Artist X", "Artist Y"]);
  });

  it("sleutelt op artist.id, niet op naam (twee verschillende artiesten met dezelfde naam blijven apart)", () => {
    const trackA = makeTrack({ id: "t1", artists: [{ id: "id-1", name: "Same Name" }] });
    const trackB = makeTrack({ id: "t2", artists: [{ id: "id-2", name: "Same Name" }] });
    const snapshot = makeSnapshot([makePlaylist({ id: "p1", tracks: [makeItem(trackA), makeItem(trackB)] })]);

    const ranking = computeTopArtists(snapshot);
    expect(ranking).toHaveLength(2);
  });

  it("sorteert op trackCount aflopend, dan op naam, en kapt af tot `limit`", () => {
    const snapshot = makeSnapshot([
      makePlaylist({
        id: "p1",
        tracks: [
          makeItem(makeTrack({ id: "t1", artists: [{ id: "a", name: "Artist A" }] })),
          makeItem(makeTrack({ id: "t2", artists: [{ id: "b", name: "Artist B" }] })),
          makeItem(makeTrack({ id: "t3", artists: [{ id: "b", name: "Artist B" }] })),
        ],
      }),
    ]);

    expect(computeTopArtists(snapshot, 1)).toEqual([{ name: "Artist B", trackCount: 2, playlistCount: 1 }]);
  });

  it("negeert items zonder track", () => {
    const snapshot = makeSnapshot([makePlaylist({ id: "p1", tracks: [makeItem(null)] })]);
    expect(computeTopArtists(snapshot)).toEqual([]);
  });

  it("sorteert alfabetisch op naam bij gelijke trackCount (localeCompare-tak)", () => {
    const snapshot = makeSnapshot([
      makePlaylist({
        id: "p1",
        tracks: [
          makeItem(makeTrack({ id: "t1", artists: [{ id: "z", name: "Zulu Artist" }] })),
          makeItem(makeTrack({ id: "t2", artists: [{ id: "y", name: "Alpha Artist" }] })),
        ],
      }),
    ]);

    const ranking = computeTopArtists(snapshot);
    expect(ranking.map((r) => r.name)).toEqual(["Alpha Artist", "Zulu Artist"]);
  });

  it("levert niets op voor een snapshot zonder playlists (echt lege snapshot)", () => {
    expect(computeTopArtists(makeSnapshot([]))).toEqual([]);
  });
});

// --- Verdelingen (som van trackCount, op EnrichedPlaylist[]) --------------------------------

function makeParsed(overrides: Partial<ParsedPlaylistName> = {}): ParsedPlaylistName {
  return {
    typeLabel: null,
    color: null,
    density: null,
    gender: null,
    bpm: null,
    volume: null,
    contextTag: null,
    matched: false,
    ddSpeed: null,
    ddWord: null,
    ddLoudness: null,
    ddCode: null,
    phaseCode: null,
    feestzaalYear: null,
    ...overrides,
  };
}

function makeEnriched(overrides: Partial<EnrichedPlaylist> = {}): EnrichedPlaylist {
  return {
    id: "p1",
    name: "Playlist 1",
    uri: "spotify:playlist:p1",
    collaborative: false,
    public: true,
    snapshotId: "snap-1",
    owner: { id: "eigen-account-id", displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 10,
    ownerBucket: "dave",
    parsed: makeParsed(),
    emotion: null,
    done: false,
    sortBucket: "gesorteerd",
    world: "prive",
    autoWorld: "prive",
    worldIsOverridden: false,
    mmcBpm: null,
    mmcBpmIsOverridden: false,
    ...overrides,
  };
}

describe("sumTracksByWorld", () => {
  it("somt trackCount per wereld, met 0 voor een wereld zonder playlists", () => {
    const playlists = [
      makeEnriched({ id: "p1", world: "mmc", trackCount: 20 }),
      makeEnriched({ id: "p2", world: "mmc", trackCount: 5 }),
      makeEnriched({ id: "p3", world: "prive", trackCount: 7 }),
    ];
    expect(sumTracksByWorld(playlists)).toEqual({ mmc: 25, djcylow: 0, prive: 7 });
  });

  it("levert nullen op voor een lege lijst", () => {
    expect(sumTracksByWorld([])).toEqual({ mmc: 0, djcylow: 0, prive: 0 });
  });
});

describe("sumTracksByMmcBpm", () => {
  it("somt trackCount per BPM-tier, gescoped tot de MMC-wereld", () => {
    const playlists = [
      makeEnriched({ id: "p1", world: "mmc", mmcBpm: 128, trackCount: 30 }),
      makeEnriched({ id: "p2", world: "mmc", mmcBpm: 128, trackCount: 10 }),
      makeEnriched({ id: "p3", world: "mmc", mmcBpm: null, trackCount: 4 }),
      // Niet-MMC met toevallig ook mmcBpm gezet -- telt hier NIET mee (scoped tot mmc).
      makeEnriched({ id: "p4", world: "prive", mmcBpm: 176, trackCount: 999 }),
    ];
    expect(sumTracksByMmcBpm(playlists)).toEqual({ 96: 0, 112: 0, 128: 40, 176: 0, overig: 4 });
  });

  it("levert nullen op voor een lege lijst", () => {
    expect(sumTracksByMmcBpm([])).toEqual({ 96: 0, 112: 0, 128: 0, 176: 0, overig: 0 });
  });
});

describe("sumTracksByColor", () => {
  it("somt trackCount per Plutchik-kleur, met een aparte 'zonder kleur'-restwaarde", () => {
    const playlists = [
      makeEnriched({ id: "p1", parsed: makeParsed({ color: "Green" }), trackCount: 12 }),
      makeEnriched({ id: "p2", parsed: makeParsed({ color: "Green" }), trackCount: 3 }),
      makeEnriched({ id: "p3", parsed: makeParsed({ color: null }), trackCount: 8 }),
    ];

    const result = sumTracksByColor(playlists);
    expect(result.byColor.find((c) => c.color === "Green")?.trackCount).toBe(15);
    expect(result.byColor.find((c) => c.color === "Cyan")?.trackCount).toBe(0);
    expect(result.withoutColor).toBe(8);
    expect(result.byColor).toHaveLength(8); // alle 8 Plutchik-kleuren, ook die op 0
  });

  it("levert nullen op voor een lege lijst", () => {
    const result = sumTracksByColor([]);
    expect(result.byColor.every((c) => c.trackCount === 0)).toBe(true);
    expect(result.withoutColor).toBe(0);
  });

  it("houdt twee gelijktijdig niet-nul kleuren uit elkaar (geen doorlekken tussen sommen)", () => {
    const playlists = [
      makeEnriched({ id: "p1", parsed: makeParsed({ color: "Green" }), trackCount: 12 }),
      makeEnriched({ id: "p2", parsed: makeParsed({ color: "Cyan" }), trackCount: 7 }),
    ];

    const result = sumTracksByColor(playlists);
    expect(result.byColor.find((c) => c.color === "Green")?.trackCount).toBe(12);
    expect(result.byColor.find((c) => c.color === "Cyan")?.trackCount).toBe(7);
    // Alle overige kleuren blijven op 0 -- geen kruisbesmetting tussen de twee actieve sommen.
    expect(
      result.byColor
        .filter((c) => c.color !== "Green" && c.color !== "Cyan")
        .every((c) => c.trackCount === 0),
    ).toBe(true);
    expect(result.withoutColor).toBe(0);
  });
});

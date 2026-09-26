// Sorteren van de playlist-tabel: de pure logica uit playlistSort.ts. De UI-laag
// (PlaylistManager.tsx) blijft hier buiten -- die houdt alleen de state bij.
import { describe, expect, it } from "vitest";
import { SORT_COLUMNS, nextSort, sortKey, sortPlaylists, type PlaylistSort } from "./playlistSort";
import { WORLD_META } from "./classifyWorld";
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import type { ParsedPlaylistName } from "./parsePlaylistName";
import type { PlaylistMixInfo } from "@/lib/mixes/playlistMixInfo";

function makeParsed(over: Partial<ParsedPlaylistName> = {}): ParsedPlaylistName {
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
    ...over,
  };
}

function makePlaylist(over: Partial<EnrichedPlaylist> = {}): EnrichedPlaylist {
  return {
    id: "p1",
    name: "Een playlist",
    uri: "spotify:playlist:p1",
    collaborative: false,
    public: true,
    snapshotId: "snap-v1",
    owner: { id: "eigen-account-id", displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 10,
    ownerBucket: "dave",
    parsed: makeParsed(),
    emotion: null,
    sortBucket: "gesorteerd",
    done: false,
    world: "prive",
    autoWorld: "prive",
    worldIsOverridden: false,
    mmcBpm: null,
    mmcBpmIsOverridden: false,
    ...over,
  };
}

const mixInfo = (over: Partial<PlaylistMixInfo> = {}): PlaylistMixInfo => ({
  mixId: "20260303",
  matchedBy: "tracklist",
  family: "EDM",
  genre: "House",
  subgenre: "Tech House",
  descriptionState: "missing",
  descriptionDiffs: [],
  // Deze tests gaan over de sortering, niet over de playlistnaam: "in-sync" zegt dat er aan de naam niets
  // te doen valt, en geen enkele sorteersleutel leest deze drie velden.
  titleState: "in-sync",
  titleTarget: null,
  titleBlocker: null,
  ...over,
});

describe("SORT_COLUMNS", () => {
  it("dekt alle dertien kolommen, in de tabelvolgorde die Dave heeft vastgelegd", () => {
    expect(SORT_COLUMNS.map((c) => c.label)).toEqual([
      "Wereld",
      "Type",
      "BPM",
      "Naam",
      "Kleur",
      "ID",
      "Genre",
      "Subgenre",
      "Dicht.",
      "M/V",
      "Vol",
      "Tracks",
      "✓",
    ]);
  });
});

describe("sortKey", () => {
  it("leest de wereld als label, niet als sleutel -- je sorteert op wat het dropdownje toont", () => {
    // WORLD_META.mmc.label is "MMC" (classifyWorld.ts); de sleutel is óók "mmc", dus dit toetst
    // vooral dat de vergelijking via WORLD_META loopt -- bij DJ Cylow/Privé lopen ze wél uiteen.
    expect(sortKey(makePlaylist({ world: "mmc" }), null, "world")).toBe("MMC");
    expect(sortKey(makePlaylist({ world: "prive" }), null, "world")).toBe(WORLD_META.prive.label);
    expect(sortKey(makePlaylist({ world: "djcylow" }), null, "world")).toBe(WORLD_META.djcylow.label);
  });

  it("neemt binnen MMC de (evt. gecorrigeerde) tier als BPM, daarbuiten de geparsede BPM", () => {
    expect(sortKey(makePlaylist({ world: "mmc", mmcBpm: 176 }), null, "bpm")).toBe(176);
    expect(sortKey(makePlaylist({ world: "prive", parsed: makeParsed({ bpm: 112 }) }), null, "bpm")).toBe(112);
  });

  it("haalt ID, genre en subgenre uit de gekoppelde mix", () => {
    const p = makePlaylist();
    expect(sortKey(p, mixInfo(), "mixId")).toBe(20260303);
    expect(sortKey(p, mixInfo(), "genre")).toBe("House");
    expect(sortKey(p, mixInfo(), "subgenre")).toBe("Tech House");
  });

  it("levert null voor de mix-kolommen zonder gekoppelde mix", () => {
    const p = makePlaylist();
    expect(sortKey(p, null, "mixId")).toBeNull();
    expect(sortKey(p, null, "genre")).toBeNull();
    expect(sortKey(p, null, "subgenre")).toBeNull();
  });

  it("valt voor TYPE terug op de naamgevingsfamilie als er geen mix is", () => {
    const p = makePlaylist({ parsed: makeParsed({ typeLabel: "Classic Pop" }) });
    expect(sortKey(p, null, "type")).toBe("POP");
    expect(sortKey(p, mixInfo({ family: "ALT" }), "type")).toBe("ALT");
  });

  it("zet een `Vol. X`-werkbak ná de genummerde mixen maar vóór de playlists zonder Vol.", () => {
    expect(sortKey(makePlaylist({ parsed: makeParsed({ volume: 5 }) }), null, "volume")).toBe(5);
    expect(sortKey(makePlaylist({ parsed: makeParsed({ volume: "X" }) }), null, "volume")).toBe(Infinity);
    expect(sortKey(makePlaylist(), null, "volume")).toBeNull();
  });

  it("sorteert open vóór afgerond bij oplopend", () => {
    expect(sortKey(makePlaylist({ done: false }), null, "done")).toBe(0);
    expect(sortKey(makePlaylist({ done: true }), null, "done")).toBe(1);
  });
});

describe("sortPlaylists", () => {
  const sorteer = (
    playlists: EnrichedPlaylist[],
    sort: PlaylistSort,
    mixen: Record<string, PlaylistMixInfo> = {}
  ) => sortPlaylists(playlists, sort, mixen).map((p) => p.id);

  it("sorteert een tekstkolom alfabetisch, beide richtingen", () => {
    const lijst = [
      makePlaylist({ id: "b", name: "Beta" }),
      makePlaylist({ id: "a", name: "Alfa" }),
      makePlaylist({ id: "c", name: "Gamma" }),
    ];
    expect(sorteer(lijst, { column: "name", direction: "asc" })).toEqual(["a", "b", "c"]);
    expect(sorteer(lijst, { column: "name", direction: "desc" })).toEqual(["c", "b", "a"]);
  });

  it("sorteert BPM numeriek, niet lexicografisch (96 hoort vóór 112, niet erna)", () => {
    const lijst = [
      makePlaylist({ id: "p112", world: "mmc", mmcBpm: 112 }),
      makePlaylist({ id: "p96", world: "mmc", mmcBpm: 96 }),
      makePlaylist({ id: "p176", world: "mmc", mmcBpm: 176 }),
      makePlaylist({ id: "p128", world: "mmc", mmcBpm: 128 }),
    ];
    expect(sorteer(lijst, { column: "bpm", direction: "asc" })).toEqual(["p96", "p112", "p128", "p176"]);
  });

  it("negeert verschil in hoofdletters en diacrieten (Nederlandse collatie)", () => {
    const lijst = [
      makePlaylist({ id: "c", name: "cyan mix" }),
      makePlaylist({ id: "a", name: "Écarté" }),
      makePlaylist({ id: "b", name: "Delta" }),
    ];
    expect(sorteer(lijst, { column: "name", direction: "asc" })).toEqual(["c", "b", "a"]);
  });

  it("zet lege cellen onderaan -- óók bij aflopend sorteren", () => {
    const lijst = [
      makePlaylist({ id: "leeg1" }),
      makePlaylist({ id: "house" }),
      makePlaylist({ id: "leeg2" }),
      makePlaylist({ id: "techno" }),
    ];
    const mixen = {
      house: mixInfo({ genre: "House" }),
      techno: mixInfo({ genre: "Techno" }),
    };
    expect(sorteer(lijst, { column: "genre", direction: "asc" }, mixen)).toEqual([
      "house",
      "techno",
      "leeg1",
      "leeg2",
    ]);
    expect(sorteer(lijst, { column: "genre", direction: "desc" }, mixen)).toEqual([
      "techno",
      "house",
      "leeg1",
      "leeg2",
    ]);
  });

  it("is stabiel: gelijke waarden houden hun onderlinge volgorde uit de invoer", () => {
    const lijst = [
      makePlaylist({ id: "derde", parsed: makeParsed({ density: "Full" }) }),
      makePlaylist({ id: "eerste", parsed: makeParsed({ density: "Full" }) }),
      makePlaylist({ id: "tweede", parsed: makeParsed({ density: "Full" }) }),
    ];
    expect(sorteer(lijst, { column: "density", direction: "asc" })).toEqual(["derde", "eerste", "tweede"]);
    // Ook bij desc blijft de tie-break de invoervolgorde, niet de omgekeerde.
    expect(sorteer(lijst, { column: "density", direction: "desc" })).toEqual(["derde", "eerste", "tweede"]);
  });

  it("muteert de invoerlijst niet", () => {
    const lijst = [makePlaylist({ id: "b", name: "Beta" }), makePlaylist({ id: "a", name: "Alfa" })];
    sortPlaylists(lijst, { column: "name", direction: "asc" }, {});
    expect(lijst.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("sorteert de werkbakken tussen de genummerde mixen en de Vol.-loze playlists", () => {
    const lijst = [
      makePlaylist({ id: "geen" }),
      makePlaylist({ id: "werkbak", parsed: makeParsed({ volume: "X" }) }),
      makePlaylist({ id: "vol3", parsed: makeParsed({ volume: 3 }) }),
      makePlaylist({ id: "vol1", parsed: makeParsed({ volume: 1 }) }),
    ];
    expect(sorteer(lijst, { column: "volume", direction: "asc" })).toEqual([
      "vol1",
      "vol3",
      "werkbak",
      "geen",
    ]);
  });
});

describe("nextSort", () => {
  it("begint oplopend op een nieuwe kolom", () => {
    expect(nextSort(null, "name")).toEqual({ column: "name", direction: "asc" });
    expect(nextSort({ column: "bpm", direction: "desc" }, "name")).toEqual({
      column: "name",
      direction: "asc",
    });
  });

  it("gaat van oplopend naar aflopend en dan terug naar geen sortering", () => {
    expect(nextSort({ column: "name", direction: "asc" }, "name")).toEqual({
      column: "name",
      direction: "desc",
    });
    expect(nextSort({ column: "name", direction: "desc" }, "name")).toBeNull();
  });
});

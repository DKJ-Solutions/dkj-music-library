// playlistFilters.ts: de pure filter/groepeer/zoek/stats-laag onder de fase 5-interface. Deze
// tests toetsen alleen deze pure functies -- de UI-laag (PlaylistManager.tsx) blijft hier
// bewust buiten scope, zie het leverbriefje.
import { describe, expect, it } from "vitest";
import {
  countByMmcBpm,
  countByWorld,
  createEmptyFilters,
  filterByMmcBpm,
  filterByWorld,
  filterPlaylists,
  flattenForList,
  createDefaultFilters,
  isDefaultFilters,
  toggleSetFilter,
  withBpmOverride,
  withDoneStatus,
  withWorldOverride,
} from "./playlistFilters";
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import type { ParsedPlaylistName } from "./parsePlaylistName";

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

function makePlaylist(overrides: Partial<EnrichedPlaylist> = {}): EnrichedPlaylist {
  return {
    id: "p1",
    name: "Green House Mix Full (f)",
    uri: "spotify:playlist:p1",
    collaborative: false,
    public: true,
    snapshotId: "snap-v1",
    owner: { id: "eigen-account-id", displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 42,
    ownerBucket: "dave",
    parsed: makeParsed({ typeLabel: "House Mix", color: "Green", density: "Full", gender: "f" }),
    emotion: "Dankbaar",
    done: false,
    sortBucket: "gesorteerd",
    world: "mmc",
    autoWorld: "mmc",
    worldIsOverridden: false,
    mmcBpm: 128,
    mmcBpmIsOverridden: false,
    ...overrides,
  };
}

// De drie naam-velden van PlaylistMixInfo. Deze tests gaan over filteren, niet over de playlistnaam --
// "in-sync" zegt dat er aan de naam niets te doen valt, en de filters lezen deze velden niet.
const naamKlopt = { titleState: "in-sync" as const, titleTarget: null, titleBlocker: null };

describe("createDefaultFilters", () => {
  it("opent op `ID gevuld: Ja` -- de playlists met een mix zijn de belangrijke", () => {
    const standaard = createDefaultFilters();
    expect([...standaard.mixIds]).toEqual(["yes"]);
  });

  it("laat alle overige filters leeg -- alleen het ID-filter staat aan", () => {
    const standaard = createDefaultFilters();
    expect(standaard.search).toBe("");
    for (const veld of ["colors", "families", "genres", "subgenres", "densities", "genders", "bpms"] as const) {
      expect(standaard[veld].size, veld).toBe(0);
    }
  });
});

// Verving `hasActiveFilters`: sinds `ID gevuld` standaard op "Ja" staat is de vraag niet "is er iets
// actief" maar "wijkt de balk af van de stand waarin deze weergave opende" -- anders zou de wis-knop
// meteen bij het openen verschijnen terwijl er nog niets te wissen is.
describe("isDefaultFilters", () => {
  it("herkent de openingsstand, met of zonder het ID-filter", () => {
    expect(isDefaultFilters(createEmptyFilters(), createEmptyFilters())).toBe(true);
    expect(isDefaultFilters(createDefaultFilters(), createDefaultFilters())).toBe(true);
  });

  it("ziet een zoekterm als afwijking", () => {
    const standaard = createDefaultFilters();
    expect(isDefaultFilters({ ...standaard, search: "purple" }, standaard)).toBe(false);
  });

  it("ziet een kleur-toggle als afwijking", () => {
    const standaard = createDefaultFilters();
    expect(isDefaultFilters({ ...standaard, colors: new Set(["Green"]) }, standaard)).toBe(false);
  });

  it("ziet het uitzetten óf uitbreiden van het ID-filter als afwijking", () => {
    const standaard = createDefaultFilters();
    expect(isDefaultFilters({ ...standaard, mixIds: new Set() }, standaard)).toBe(false);
    expect(isDefaultFilters({ ...standaard, mixIds: new Set(["yes", "no"]) }, standaard)).toBe(false);
    // Zelfde inhoud, andere Set-instantie: dat is géén afwijking.
    expect(isDefaultFilters({ ...standaard, mixIds: new Set(["yes"]) }, standaard)).toBe(true);
  });

  it("vergelijkt tegen de meegegeven standaard, niet tegen 'leeg'", () => {
    // Een weergave zonder mix-bron opent leeg; dan ís "ID gevuld: Ja" juist een afwijking.
    expect(isDefaultFilters(createDefaultFilters(), createEmptyFilters())).toBe(false);
  });
});

describe("toggleSetFilter", () => {
  it("voegt een waarde toe als die nog niet aanwezig is", () => {
    const next = toggleSetFilter(new Set<string>(), "Green");
    expect(next.has("Green")).toBe(true);
  });

  it("verwijdert een waarde die al aanwezig is (immutable, laat de input ongemoeid)", () => {
    const current = new Set(["Green", "Red"]);
    const next = toggleSetFilter(current, "Green");
    expect(next.has("Green")).toBe(false);
    expect(next.has("Red")).toBe(true);
    expect(current.has("Green")).toBe(true); // origineel blijft onaangeroerd
  });
});

describe("filterPlaylists", () => {
  const playlists = [
    makePlaylist({ id: "p1", name: "Green House Mix Full (f)", parsed: makeParsed({ typeLabel: "House Mix", color: "Green", density: "Full", gender: "f" }) }),
    makePlaylist({ id: "p2", name: "176BPM EDM Purple Full (m)", parsed: makeParsed({ typeLabel: "EDM-emmer", color: "Purple", density: "Full", gender: "m", bpm: 176 }), done: true }),
    makePlaylist({ id: "p3", name: "Cyan Top 100 Vol. 3", parsed: makeParsed({ typeLabel: "Top 100", color: "Cyan", density: "Light" }) }),
  ];

  it("geeft alles terug zonder actieve filters", () => {
    expect(filterPlaylists(playlists, createEmptyFilters())).toHaveLength(3);
  });

  it("filtert case-insensitive op de zoekterm, over de playlistnaam", () => {
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), search: "purple" });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("filtert op kleur (meerdere kleuren = OR)", () => {
    const result = filterPlaylists(playlists, {
      ...createEmptyFilters(),
      colors: new Set(["Green", "Cyan"]),
    });
    expect(result.map((p) => p.id).sort()).toEqual(["p1", "p3"]);
  });

  it("filtert op dichtheid", () => {
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), densities: new Set(["Light"]) });
    expect(result.map((p) => p.id)).toEqual(["p3"]);
  });

  it("filtert op geslacht", () => {
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), genders: new Set(["m"]) });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("filtert op bpm", () => {
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), bpms: new Set([176]) });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  // Verving het oude filter op naamgevingsfamilie (`types`, bv. "Top 100"): sinds 2026-07-25 filtert
  // de toolbar op Dave's drie genre-lagen. TYPE valt terug op de naamgevingsfamilie waar geen mix is
  // (House Mix -> EDM), GENRE en SUBGENRE bestaan alleen via een gekoppelde mix.
  const mixen = {
    p1: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20260303", family: "EDM" as const, genre: "House", subgenre: "Tech House" },
    p2: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "20250101", family: "EDM" as const, genre: "Techno", subgenre: "Melodic Techno" },
  };

  it("filtert op TYPE, met de naamgevingsfamilie als terugval zonder mix", () => {
    // p1/p2 zijn EDM via hun mix, p3 ("Top 100") heeft geen mix en geen af te leiden soort.
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), families: new Set(["EDM"]) }, mixen);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);

    // Zonder mix-info valt p1 terug op typeLabel "House Mix" -> EDM; p2 op "EDM-emmer" -> EDM.
    const zonderMixen = filterPlaylists(playlists, { ...createEmptyFilters(), families: new Set(["EDM"]) });
    expect(zonderMixen.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("filtert op GENRE en SUBGENRE via de gekoppelde mix", () => {
    expect(
      filterPlaylists(playlists, { ...createEmptyFilters(), genres: new Set(["House"]) }, mixen).map((p) => p.id)
    ).toEqual(["p1"]);
    expect(
      filterPlaylists(playlists, { ...createEmptyFilters(), subgenres: new Set(["Melodic Techno"]) }, mixen).map(
        (p) => p.id
      )
    ).toEqual(["p2"]);
  });

  it("sluit een playlist zonder gekoppelde mix uit zodra op GENRE gefilterd wordt", () => {
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), genres: new Set(["House"]) }, {});
    expect(result).toHaveLength(0);
  });

  it("filtert op een gevulde of lege ID-cel", () => {
    // p1/p2 hebben een mix, p3 niet.
    expect(
      filterPlaylists(playlists, { ...createEmptyFilters(), mixIds: new Set(["yes"]) }, mixen).map((p) => p.id)
    ).toEqual(["p1", "p2"]);
    expect(
      filterPlaylists(playlists, { ...createEmptyFilters(), mixIds: new Set(["no"]) }, mixen).map((p) => p.id)
    ).toEqual(["p3"]);
  });

  it("rekent een mix zonder id-veld tot 'nee' -- de cel is dan immers ook leeg", () => {
    const zonderId = { p1: { ...naamKlopt, matchedBy: "tracklist" as const, descriptionState: "missing" as const, descriptionDiffs: [], mixId: "", family: "EDM" as const, genre: "House", subgenre: null } };
    expect(
      filterPlaylists(playlists, { ...createEmptyFilters(), mixIds: new Set(["no"]) }, zonderId).map((p) => p.id)
    ).toEqual(["p1", "p2", "p3"]);
  });

  it("laat ja+nee samen alles door, net als de andere Set-filters", () => {
    expect(
      filterPlaylists(playlists, { ...createEmptyFilters(), mixIds: new Set(["yes", "no"]) }, mixen)
    ).toHaveLength(3);
  });

  it("combineert het ID-filter met een genre-laag", () => {
    expect(
      filterPlaylists(
        playlists,
        { ...createEmptyFilters(), mixIds: new Set(["yes"]), genres: new Set(["Techno"]) },
        mixen
      ).map((p) => p.id)
    ).toEqual(["p2"]);
  });

  it("combineert de drie genre-lagen met AND", () => {
    expect(
      filterPlaylists(
        playlists,
        { ...createEmptyFilters(), families: new Set(["EDM"]), genres: new Set(["Techno"]) },
        mixen
      ).map((p) => p.id)
    ).toEqual(["p2"]);
    // Genre en subgenre die niet bij elkaar horen -> niets.
    expect(
      filterPlaylists(
        playlists,
        { ...createEmptyFilters(), genres: new Set(["House"]), subgenres: new Set(["Melodic Techno"]) },
        mixen
      )
    ).toHaveLength(0);
  });

  // Er stond hier een test op het STATUS-filter (open/afgerond). Dat filter is 2026-07-25 verwijderd
  // ("voegt weinig toe" -- het deed hetzelfde als sorteren op de ✓-kolom). `done` blijft wel een veld:
  // computeStats telt het nog, en de sorteerlaag kan erop sorteren (zie playlistSort.test.ts).

  it("combineert meerdere filters + zoekterm met AND", () => {
    const result = filterPlaylists(playlists, {
      ...createEmptyFilters(),
      search: "full",
      colors: new Set(["Purple"]),
      genders: new Set(["m"]),
    });
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("sluit een playlist zonder de gevraagde dimensie uit (bv. geen bpm terwijl bpm-filter actief is)", () => {
    const result = filterPlaylists(playlists, { ...createEmptyFilters(), bpms: new Set([112]) });
    expect(result).toHaveLength(0);
  });
});

// Verving de oude `groupPlaylists`-suite: het groeperen (kleur/type/dichtheid/emotie/status met
// tussenkoppen) is 2026-07-25 op Dave's verzoek uit de tabel verdwenen. Wat overblijft is de ene
// ordening die niets met groeperen te maken had -- ongesorteerd onderaan.
describe("flattenForList", () => {
  const dave = { id: "eigen-account-id", displayName: "Dave" };
  const gesorteerdGreen = makePlaylist({
    id: "p1",
    parsed: makeParsed({ typeLabel: "House Mix", color: "Green", density: "Full" }),
    emotion: "Dankbaar",
    sortBucket: "gesorteerd",
  });
  const gesorteerdPurple = makePlaylist({
    id: "p2",
    parsed: makeParsed({ typeLabel: "EDM-emmer", color: "Purple", density: "Light" }),
    emotion: "Verdrietig",
    done: true,
    sortBucket: "gesorteerd",
  });
  const nietEigen = makePlaylist({
    id: "p3",
    ownerBucket: "other",
    owner: { id: "iemand-anders", displayName: "Iemand Anders" },
    parsed: makeParsed(),
    emotion: null,
    sortBucket: "ongesorteerd",
  });
  const eigenNietHerkend = makePlaylist({
    id: "p4",
    owner: dave,
    parsed: makeParsed(),
    emotion: null,
    sortBucket: "ongesorteerd",
  });

  it("levert één platte lijst -- niets wordt weggelaten of gedupliceerd", () => {
    const playlists = [gesorteerdGreen, nietEigen, gesorteerdPurple, eigenNietHerkend];
    expect(flattenForList(playlists)).toHaveLength(playlists.length);
  });

  it("zet niet-eigen en niet-herkende eigen playlists achteraan, ongeacht hun plek in de invoer", () => {
    const result = flattenForList([nietEigen, gesorteerdGreen, eigenNietHerkend, gesorteerdPurple]);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("houdt de aangeleverde volgorde binnen elk van de twee blokken intact (stabiel)", () => {
    const result = flattenForList([gesorteerdPurple, gesorteerdGreen, eigenNietHerkend, nietEigen]);
    expect(result.map((p) => p.id)).toEqual(["p2", "p1", "p4", "p3"]);
  });

  it("laat een lijst zonder ongesorteerde playlists ongemoeid", () => {
    const result = flattenForList([gesorteerdGreen, gesorteerdPurple]);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});

// De computeStats-suite is 2026-07-25 verwijderd met de functie zelf: van de drie tellers boven de
// tabel is alleen het totaal over, en dat is `playlists.length` in PlaylistManager.tsx. Zie de
// toelichting op die plek in playlistFilters.ts.

describe("withDoneStatus", () => {
  it("zet de done-status van precies één playlist, de rest blijft ongewijzigd (immutable)", () => {
    const playlists = [makePlaylist({ id: "p1", done: false }), makePlaylist({ id: "p2", done: false })];
    const next = withDoneStatus(playlists, "p1", true);

    expect(next.find((p) => p.id === "p1")!.done).toBe(true);
    expect(next.find((p) => p.id === "p2")!.done).toBe(false);
    expect(playlists.find((p) => p.id === "p1")!.done).toBe(false); // origineel onaangeroerd
  });

  it("laat de lijst ongewijzigd als het playlist-id niet bestaat", () => {
    const playlists = [makePlaylist({ id: "p1", done: false })];
    const next = withDoneStatus(playlists, "onbekend", true);
    expect(next).toEqual(playlists);
  });
});

describe("withWorldOverride", () => {
  it("zet de wereld + het override-vlag van precies één playlist, de rest blijft ongewijzigd (immutable)", () => {
    const playlists = [
      makePlaylist({ id: "p1", world: "mmc", worldIsOverridden: false }),
      makePlaylist({ id: "p2", world: "mmc", worldIsOverridden: false }),
    ];
    const next = withWorldOverride(playlists, "p1", "djcylow", true);

    expect(next.find((p) => p.id === "p1")).toMatchObject({ world: "djcylow", worldIsOverridden: true });
    expect(next.find((p) => p.id === "p2")).toMatchObject({ world: "mmc", worldIsOverridden: false });
    // origineel onaangeroerd
    expect(playlists.find((p) => p.id === "p1")).toMatchObject({ world: "mmc", worldIsOverridden: false });
  });

  it("kan ook worldIsOverridden terugzetten naar false (de 'reset naar geraden'-actie)", () => {
    const playlists = [makePlaylist({ id: "p1", world: "prive", worldIsOverridden: true })];
    const next = withWorldOverride(playlists, "p1", "mmc", false);

    expect(next[0]).toMatchObject({ world: "mmc", worldIsOverridden: false });
  });

  it("laat de lijst ongewijzigd als het playlist-id niet bestaat", () => {
    const playlists = [makePlaylist({ id: "p1", world: "mmc", worldIsOverridden: false })];
    const next = withWorldOverride(playlists, "onbekend", "djcylow", true);
    expect(next).toEqual(playlists);
  });
});

describe("countByWorld", () => {
  it("telt playlists per wereld, en levert 0 op voor een wereld zonder playlists", () => {
    const playlists = [
      makePlaylist({ id: "p1", world: "mmc" }),
      makePlaylist({ id: "p2", world: "mmc" }),
      makePlaylist({ id: "p3", world: "djcylow" }),
    ];
    expect(countByWorld(playlists)).toEqual({ mmc: 2, djcylow: 1, prive: 0 });
  });

  it("levert nullen op voor een lege lijst -- de som blijft dus altijd exact playlists.length", () => {
    expect(countByWorld([])).toEqual({ mmc: 0, djcylow: 0, prive: 0 });
  });
});

describe("filterByWorld", () => {
  it("scopet de lijst tot precies de gevraagde wereld", () => {
    const playlists = [
      makePlaylist({ id: "p1", world: "mmc" }),
      makePlaylist({ id: "p2", world: "djcylow" }),
      makePlaylist({ id: "p3", world: "mmc" }),
    ];
    expect(filterByWorld(playlists, "mmc").map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("levert een lege lijst op als geen enkele playlist in de gevraagde wereld zit", () => {
    const playlists = [makePlaylist({ id: "p1", world: "prive" })];
    expect(filterByWorld(playlists, "djcylow")).toEqual([]);
  });
});

describe("withBpmOverride", () => {
  it("zet de effectieve BPM + het override-vlag van precies één playlist, de rest blijft ongewijzigd (immutable)", () => {
    const playlists = [
      makePlaylist({ id: "p1", mmcBpm: 128, mmcBpmIsOverridden: false }),
      makePlaylist({ id: "p2", mmcBpm: 128, mmcBpmIsOverridden: false }),
    ];
    const next = withBpmOverride(playlists, "p1", 176, true);

    expect(next.find((p) => p.id === "p1")).toMatchObject({ mmcBpm: 176, mmcBpmIsOverridden: true });
    expect(next.find((p) => p.id === "p2")).toMatchObject({ mmcBpm: 128, mmcBpmIsOverridden: false });
    // origineel onaangeroerd
    expect(playlists.find((p) => p.id === "p1")).toMatchObject({ mmcBpm: 128, mmcBpmIsOverridden: false });
  });

  it("kan mmcBpm ook op null zetten (reset naar 'overig/onbekend') en het override-vlag terugzetten", () => {
    const playlists = [makePlaylist({ id: "p1", mmcBpm: 176, mmcBpmIsOverridden: true })];
    const next = withBpmOverride(playlists, "p1", null, false);

    expect(next[0]).toMatchObject({ mmcBpm: null, mmcBpmIsOverridden: false });
  });

  it("laat de lijst ongewijzigd als het playlist-id niet bestaat", () => {
    const playlists = [makePlaylist({ id: "p1", mmcBpm: 128, mmcBpmIsOverridden: false })];
    const next = withBpmOverride(playlists, "onbekend", 176, true);
    expect(next).toEqual(playlists);
  });
});

describe("countByMmcBpm", () => {
  it("telt playlists per BPM-tier, en levert 0 op voor een tier zonder playlists", () => {
    const playlists = [
      makePlaylist({ id: "p1", mmcBpm: 128 }),
      makePlaylist({ id: "p2", mmcBpm: 128 }),
      makePlaylist({ id: "p3", mmcBpm: 176 }),
    ];
    expect(countByMmcBpm(playlists)).toEqual({ 96: 0, 112: 0, 128: 2, 176: 1, overig: 0 });
  });

  it("telt playlists zonder toewijsbare BPM (mmcBpm: null) als 'overig'", () => {
    const playlists = [makePlaylist({ id: "p1", mmcBpm: null }), makePlaylist({ id: "p2", mmcBpm: 96 })];
    expect(countByMmcBpm(playlists)).toEqual({ 96: 1, 112: 0, 128: 0, 176: 0, overig: 1 });
  });

  it("levert nullen op voor een lege lijst -- de som blijft dus altijd exact playlists.length", () => {
    expect(countByMmcBpm([])).toEqual({ 96: 0, 112: 0, 128: 0, 176: 0, overig: 0 });
  });
});

describe("filterByMmcBpm", () => {
  it("scopet de lijst tot precies de gevraagde BPM-tier", () => {
    const playlists = [
      makePlaylist({ id: "p1", mmcBpm: 128 }),
      makePlaylist({ id: "p2", mmcBpm: 176 }),
      makePlaylist({ id: "p3", mmcBpm: 128 }),
    ];
    expect(filterByMmcBpm(playlists, 128).map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("scopet tot de 'overig'-groep (mmcBpm: null)", () => {
    const playlists = [
      makePlaylist({ id: "p1", mmcBpm: null }),
      makePlaylist({ id: "p2", mmcBpm: 96 }),
    ];
    expect(filterByMmcBpm(playlists, "overig").map((p) => p.id)).toEqual(["p1"]);
  });

  it("levert een lege lijst op als geen enkele playlist in de gevraagde tier zit", () => {
    const playlists = [makePlaylist({ id: "p1", mmcBpm: 96 })];
    expect(filterByMmcBpm(playlists, 176)).toEqual([]);
  });
});

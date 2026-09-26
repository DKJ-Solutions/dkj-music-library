// playlistMixInfo: de brug omgedraaid -- van "welke playlist hoort bij deze mix?" naar de opzoektabel
// per playlist. Getoetst op de pure laag (buildPlaylistMixIndex), dus zonder de mix-map of een snapshot.
//
// De zwaartepunten liggen bij wat er mis kan gaan zodra twee mixen op dezelfde playlist uitkomen: dan
// bepaalt deze laag welk mix-ID de rij toont, en dus ook of het `#`-knopje ernaast aanbiedt om een
// correcte tag te overschrijven.
import { describe, expect, it } from "vitest";
import { buildPlaylistMixIndex } from "./playlistMixInfo";
import type { MixLink, MixLinkStatus, MixMatchCandidate } from "./matchMixes";
import type { Mix } from "./types";

function makeMix(over: Partial<Mix> = {}): Mix {
  return {
    id: "20260615",
    file: "light-red.json",
    spotifyId: null,
    title: "Tech House · Red Light (m) Mix · Vol. 1",
    spotifyTitle: null,
    genre: "House",
    subgenre: "Tech House",
    color: "Red",
    density: "Light",
    gender: "m",
    volume: 1,
    date: "2026-06-15",
    bpm: 128,
    topArtists: ["Chris Lake"],
    tracks: ["Chris Lake - Turn Off The Lights"],
    ...over,
  };
}

function makePlaylist(over: Partial<MixMatchCandidate> = {}): MixMatchCandidate {
  return {
    id: "pl1",
    name: "House Mix 🔴 Red Light (m) 🔴 Vol. 6",
    isMmc: true,
    trackCount: 1,
    tracks: ["Chris Lake Turn Off The Lights"],
    volume: 6,
    guessedBpm: 128,
    declaredMixId: null,
    description: null,
    ...over,
  };
}

function makeLink(over: Partial<MixLink> = {}): MixLink {
  const status: MixLinkStatus = over.status ?? "own-playlist";
  return {
    mix: makeMix(),
    status,
    playlist: makePlaylist(),
    containment: 1,
    sizeRatio: 1,
    volumeMismatch: false,
    trackCountDelta: 0,
    bpmMismatch: false,
    matchedBy: "tracklist",
    declaredIdConflict: null,
    ...over,
  };
}

describe("buildPlaylistMixIndex -- de opzoektabel", () => {
  it("zet een gekoppelde mix op zijn playlist-id, met de genre-lagen erbij", () => {
    const index = buildPlaylistMixIndex([makeLink()]);
    expect(index.byPlaylistId["pl1"]).toMatchObject({
      mixId: "20260615",
      family: "EDM",
      genre: "House",
      subgenre: "Tech House",
      matchedBy: "tracklist",
    });
  });

  it("laat een emmer en een niet-teruggevonden mix uit de tabel, maar meldt ze als ontbrekend", () => {
    const index = buildPlaylistMixIndex([
      makeLink({ mix: makeMix({ id: "20260101" }), status: "bucket-only" }),
      makeLink({ mix: makeMix({ id: "20240408" }), status: "unmatched", playlist: null }),
    ]);

    expect(index.byPlaylistId).toEqual({});
    expect(index.missingMixes.map((m) => [m.mixId, m.reason])).toEqual([
      ["20260101", "bucket-only"],
      ["20240408", "unmatched"],
    ]);
    // De emmer waarin de tracks zijn teruggevonden hoort erbij; bij "unmatched" is er niets te noemen.
    expect(index.missingMixes[0].bucketName).toBe("House Mix 🔴 Red Light (m) 🔴 Vol. 6");
    expect(index.missingMixes[1].bucketName).toBeNull();
  });

  it("telt de mixen met een gevuld ID, ook die zonder eigen playlist", () => {
    const index = buildPlaylistMixIndex([
      makeLink(),
      makeLink({ mix: makeMix({ id: "20260101" }), status: "bucket-only" }),
      makeLink({ mix: makeMix({ id: "" }), status: "unmatched", playlist: null }),
    ]);
    expect(index.mixesWithId).toBe(2);
  });

  it("sorteert de ontbrekende mixen op nieuwste ID", () => {
    const index = buildPlaylistMixIndex([
      makeLink({ mix: makeMix({ id: "20240408" }), status: "bucket-only" }),
      makeLink({ mix: makeMix({ id: "20260615" }), status: "bucket-only" }),
      makeLink({ mix: makeMix({ id: "20250101" }), status: "bucket-only" }),
    ]);
    expect(index.missingMixes.map((m) => m.mixId)).toEqual(["20260615", "20250101", "20240408"]);
  });
});

// DE BUG DIE MET DE TEGENSPRAAK AAN HET LICHT KWAM (2026-07-25). Draagt playlist P de tag `mix:A`, dan
// koppelt mix A eraan op de harde sleutel, terwijl mix B er via de tracklist óók op uit kan komen. Wie
// dan de rij hield hing af van de volgorde in de bron -- en kwam B eerst, dan toonde de tabel B's ID
// zonder merkteken, waarna het `#`-knopje aanbood om A's correcte tag te overschrijven.
describe("buildPlaylistMixIndex -- twee mixen op dezelfde playlist", () => {
  const geclaimd = makePlaylist({ declaredMixId: "20240408" });
  const opSleutel = makeLink({
    mix: makeMix({ id: "20240408", title: "Mix A" }),
    playlist: geclaimd,
    matchedBy: "declared-id",
  });
  const opTracklist = makeLink({
    mix: makeMix({ id: "20260615", title: "Mix B" }),
    playlist: geclaimd,
    matchedBy: "tracklist",
    declaredIdConflict: "playlist-claimed-by-other-mix",
  });

  it("laat de harde sleutel winnen, ook als de tracklist-koppeling eerst komt", () => {
    const index = buildPlaylistMixIndex([opTracklist, opSleutel]);
    expect(index.byPlaylistId["pl1"]).toMatchObject({ mixId: "20240408", matchedBy: "declared-id" });
  });

  it("en ook in de andere volgorde -- de uitkomst hangt niet aan de bronordening", () => {
    const index = buildPlaylistMixIndex([opSleutel, opTracklist]);
    expect(index.byPlaylistId["pl1"]).toMatchObject({ mixId: "20240408", matchedBy: "declared-id" });
  });

  it("meldt de verliezende mix als ontbrekend, met wie de playlist claimt", () => {
    // Zonder deze regel verdwijnt mix B uit béide tabellen: uit de hoofdtabel omdat A de rij houdt, uit
    // de ontbrekend-tabel omdat zijn status "own-playlist" is.
    const index = buildPlaylistMixIndex([opSleutel, opTracklist]);
    expect(index.missingMixes).toHaveLength(1);
    expect(index.missingMixes[0]).toMatchObject({
      mixId: "20260615",
      reason: "claimed-by-other-mix",
      claimedBy: { mixId: "20240408", playlistName: "House Mix 🔴 Red Light (m) 🔴 Vol. 6" },
    });
  });

  it("houdt zonder harde sleutel de eerste koppeling -- voorspelbaar, ook al is het een fout in de data", () => {
    const eerste = makeLink({ mix: makeMix({ id: "20260615" }) });
    const tweede = makeLink({ mix: makeMix({ id: "20240408" }) });
    expect(buildPlaylistMixIndex([eerste, tweede]).byPlaylistId["pl1"].mixId).toBe("20260615");
  });

  it("laat een verweesde tag de rij gewoon houden -- die is juist wél te corrigeren", () => {
    // Wijst de tag naar een niet-bestaande mix, dan is er geen andere mix die deze playlist claimt. De
    // rij hoort dus bij deze mix, met `matchedBy: "tracklist"` zodat het `#`-knopje verschijnt.
    const wees = makeLink({
      playlist: makePlaylist({ declaredMixId: "19990101" }),
      declaredIdConflict: "tag-points-to-unknown-mix",
    });
    const index = buildPlaylistMixIndex([wees]);
    expect(index.byPlaylistId["pl1"]).toMatchObject({ mixId: "20260615", matchedBy: "tracklist" });
    expect(index.missingMixes).toEqual([]);
  });
});

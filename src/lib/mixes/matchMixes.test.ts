// matchMixes: de brug tussen de mix-JSON's en de Spotify-playlists. De scenario's hieronder zijn
// rechtstreeks uit de echte data gehaald (zie het dossier, §"De mix-JSON's van de DJ Cylow-website
// <-> de MMC-playlists"): de uiteenlopende Vol.-nummering, de grote kleur-emmer die alle tracks
// bevat, en de BPM-gok die bij een Nu-Disco/Techno-mix per definitie mist.
import { describe, expect, it } from "vitest";
import {
  MATCH_CONTAINMENT_THRESHOLD,
  containment,
  findUnmirroredPlaylists,
  linkMixes,
  summarizeLinks,
  trackTokens,
  type MixMatchCandidate,
} from "./matchMixes";
import type { Mix } from "./types";

const TRACKS = [
  "Anabel Englund & Kamino - Belong to Me",
  "Roddy Lima - Shadows",
  "JUNTARO - Paranoia",
  "Chris Lake - Turn Off The Lights",
  "MEDUZA - Piece Of Your Heart",
];

/** Dezelfde tracks zoals de Spotify-snapshot ze levert: artiest(en) + titel als één regel, en met
 *  een remix-haakje dat de JSON niet noteert -- precies het verschil dat de tokenizer moet negeren. */
const SPOTIFY_TRACKS = [
  "Anabel Englund Kamino Belong to Me",
  "Roddy Lima Shadows",
  "JUNTARO Paranoia (Extended Mix)",
  "Chris Lake Turn Off The Lights",
  "MEDUZA Piece Of Your Heart",
];

function makeMix(overrides: Partial<Mix> = {}): Mix {
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
    slug: null,
    topArtists: ["Chris Lake"],
    tracks: TRACKS,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<MixMatchCandidate> = {}): MixMatchCandidate {
  return {
    id: "pl1",
    name: "House Mix 🔴 Red Light (m) 🔴 Vol. 6",
    isMmc: true,
    trackCount: SPOTIFY_TRACKS.length,
    tracks: SPOTIFY_TRACKS,
    volume: 6,
    guessedBpm: 128,
    // Standaard géén mix-ID in de beschrijving: de meeste tests toetsen juist de tracklist-heuristiek,
    // die alleen geldt zolang er geen harde sleutel is.
    declaredMixId: null,
    description: null,
    ...overrides,
  };
}

describe("trackTokens", () => {
  it("negeert haakjes-inhoud, korte woorden en stopwoorden", () => {
    const tokens = trackTokens(["Roddy Lima - Shadows (VIP Edit)"]);
    expect(tokens.has("roddy")).toBe(true);
    expect(tokens.has("lima")).toBe(true);
    expect(tokens.has("shadows")).toBe(true);
    // Uit het haakje -- staat er in de ene bron wel en in de andere niet.
    expect(tokens.has("edit")).toBe(false);
    expect(tokens.has("vip")).toBe(false);
  });

  it("levert een lege set voor lege of onbruikbare regels", () => {
    expect(trackTokens([]).size).toBe(0);
    expect(trackTokens(["", "-", "a b c"]).size).toBe(0);
  });
});

describe("containment", () => {
  it("meet welk deel van de eerste set in de tweede voorkomt", () => {
    expect(containment(new Set(["a", "b"]), new Set(["a", "b", "c"]))).toBe(1);
    expect(containment(new Set(["a", "b"]), new Set(["a", "z"]))).toBe(0.5);
  });

  it("is 0 voor een lege needle -- zonder tracks valt er niets te koppelen", () => {
    expect(containment(new Set(), new Set(["a"]))).toBe(0);
  });
});

describe("linkMixes -- de eigen mix-playlist", () => {
  it("koppelt een mix aan zijn MMC-playlist ondanks een afwijkend Vol.-nummer", () => {
    const [link] = linkMixes([makeMix()], [makeCandidate()]);

    expect(link.status).toBe("own-playlist");
    expect(link.playlist?.name).toBe("House Mix 🔴 Red Light (m) 🔴 Vol. 6");
    expect(link.containment).toBeGreaterThanOrEqual(MATCH_CONTAINMENT_THRESHOLD);
    // JSON zegt Vol. 1, Spotify Vol. 6 -- de koppeling staat, de afwijking wordt gemeld.
    expect(link.volumeMismatch).toBe(true);
    expect(link.trackCountDelta).toBe(0);
    expect(link.bpmMismatch).toBe(false);
  });

  it("meldt geen volume-afwijking als beide bronnen hetzelfde nummer dragen", () => {
    const [link] = linkMixes([makeMix({ volume: 6 })], [makeCandidate()]);
    expect(link.volumeMismatch).toBe(false);
  });

  it("meldt geen volume-afwijking tegen een werkbak -- daar is geen nummer om mee te botsen", () => {
    const [link] = linkMixes([makeMix()], [makeCandidate({ volume: "X" })]);
    expect(link.volumeMismatch).toBe(false);
  });

  it("rapporteert het verschil in trackaantal", () => {
    const [link] = linkMixes([makeMix()], [makeCandidate({ trackCount: 7 })]);
    expect(link.status).toBe("own-playlist");
    expect(link.trackCountDelta).toBe(2);
  });

  it("meldt een BPM-afwijking als de app-gok niet de echte BPM uit de JSON is", () => {
    // Een Nu-Disco-mix op 112 bpm heet op Spotify "House Mix" -> classifyBpm gokt 128.
    const [link] = linkMixes([makeMix({ genre: "Nu-Disco", bpm: 112 })], [makeCandidate({ guessedBpm: 128 })]);
    expect(link.bpmMismatch).toBe(true);
  });

  it("meldt geen BPM-afwijking als een van de twee onbekend is", () => {
    expect(linkMixes([makeMix({ bpm: null })], [makeCandidate()])[0].bpmMismatch).toBe(false);
    expect(linkMixes([makeMix()], [makeCandidate({ guessedBpm: null })])[0].bpmMismatch).toBe(false);
  });
});

describe("linkMixes -- de werkbak (Vol. X)", () => {
  // Het Vol.-token draagt de productiestatus (Dave, 2026-07-24): een cijfer = klaar en live, "Vol. X"
  // = tracks verzameld maar nog niet gemixt. Een mix uit de JSON's staat per definitie live op de
  // site, dus als die in een Vol. X-lijst zit, had die lijst een nummer moeten krijgen.
  it("meldt een mix die op Spotify nog in een Vol. X-lijst staat als 'work-queue'", () => {
    const [link] = linkMixes(
      [makeMix()],
      [makeCandidate({ name: "House Mix 🔴 Red Light (m) 🔴 Vol. X", volume: "X" })]
    );

    expect(link.status).toBe("work-queue");
    expect(link.playlist?.volume).toBe("X");
  });

  it("blijft de afwijkingen in trackaantal en BPM ook voor een werkbak melden", () => {
    const [link] = linkMixes(
      [makeMix({ bpm: 176 })],
      [makeCandidate({ volume: "X", trackCount: 8, guessedBpm: 128 })]
    );

    expect(link.status).toBe("work-queue");
    expect(link.trackCountDelta).toBe(3);
    expect(link.bpmMismatch).toBe(true);
  });

  it("kiest de genummerde playlist boven de werkbak als beide dezelfde tracks hebben", () => {
    const workbench = makeCandidate({
      id: "wb",
      name: "House Mix 🔴 Red Light (m) 🔴 Vol. X",
      volume: "X",
      trackCount: SPOTIFY_TRACKS.length,
    });
    // Gelijke containment én gelijke grootte: de sorteervoorkeur mag hier niet toevallig de werkbak
    // kiezen, dus de genummerde lijst staat als tweede in de lijst -- wie eerst komt, wint bij gelijk
    // spel, en dat is precies wat we NIET willen.
    const [link] = linkMixes([makeMix()], [workbench, makeCandidate()]);

    expect(link.status).toBe("own-playlist");
    expect(link.playlist?.id).toBe("pl1");
  });
});

describe("linkMixes -- de kleur-emmer", () => {
  const bucket = makeCandidate({
    id: "bucket",
    name: "Purple Light (f) 🟣 176BPM EDM",
    isMmc: false, // de emmers zitten in Privé, niet in MMC
    trackCount: 596,
    tracks: SPOTIFY_TRACKS,
    volume: null,
    guessedBpm: null,
  });

  it("herkent een grote verzamellijst als 'bucket-only', ook bij 100% containment", () => {
    const [link] = linkMixes([makeMix()], [bucket]);

    expect(link.containment).toBe(1);
    expect(link.status).toBe("bucket-only");
    expect(link.sizeRatio).toBeLessThan(0.05);
    // Afwijkingen zijn hier niet zinvol: er is geen eigen playlist om mee te vergelijken.
    expect(link.volumeMismatch).toBe(false);
    expect(link.trackCountDelta).toBe(0);
  });

  it("kiest de eigen mix-playlist boven de emmer die dezelfde tracks óók bevat", () => {
    const [link] = linkMixes([makeMix()], [bucket, makeCandidate()]);
    expect(link.status).toBe("own-playlist");
    expect(link.playlist?.id).toBe("pl1");
  });

  it("kiest de eigen playlist ook als de emmer een HÓGERE containment heeft", () => {
    // Het echte geval (o.a. `Drum & Bass 🟢 Green Full (f) 🟢 Vol. 1`): de eigen playlist mist een
    // track die niet op Spotify staat, de emmer bevat alles. Op een kale "hoogste containment wint"
    // zou de mix hier als "alleen in een emmer" eindigen, terwijl zijn playlist er wél is.
    const incomplete = makeCandidate({
      trackCount: 4,
      tracks: SPOTIFY_TRACKS.slice(0, 4), // 4 van de 5 tracks
    });
    const [link] = linkMixes([makeMix()], [bucket, incomplete]);

    expect(link.containment).toBeLessThan(1);
    expect(link.status).toBe("own-playlist");
    expect(link.playlist?.id).toBe("pl1");
    expect(link.trackCountDelta).toBe(-1);
  });

  it("valt alsnog op de emmer terug als de eigen playlist onder de drempel zakt", () => {
    // Grens van de vorige regel: mist de MMC-playlist zóveel tracks dat hij onder de
    // containment-drempel komt, dan is hij niet de weerspiegeling en telt de emmer weer.
    const tooDifferent = makeCandidate({ trackCount: 5, tracks: ["Iets Heel Anders Hier Staat"] });
    const [link] = linkMixes([makeMix()], [bucket, tooDifferent]);

    expect(link.status).toBe("bucket-only");
    expect(link.playlist?.id).toBe("bucket");
  });

  it("noemt een MMC-playlist die veel groter is dan de mix eveneens een emmer", () => {
    // Grootte weegt zelfstandig mee: ook binnen MMC is een lijst van 400 tracks geen mix van 5.
    const [link] = linkMixes([makeMix()], [makeCandidate({ isMmc: true, trackCount: 400 })]);
    expect(link.status).toBe("bucket-only");
  });
});

// De harde sleutel: het mix-ID in de playlistbeschrijving (`mix:20260303`, zie mixIdTag.ts). Dave heeft
// die afspraak 2026-07-25 ingevoerd om de koppeling van een gewogen gok naar een exacte match te brengen.
describe("linkMixes -- het gedeclareerde mix-ID uit de beschrijving", () => {
  it("koppelt op het ID en meldt dat als matchedBy", () => {
    const mix = makeMix({ id: "20260615" });
    const [link] = linkMixes([mix], [makeCandidate({ declaredMixId: "20260615" })]);

    expect(link.status).toBe("own-playlist");
    expect(link.matchedBy).toBe("declared-id");
    expect(link.declaredIdConflict).toBeNull();
  });

  it("laat de heuristiek matchedBy 'tracklist' geven zolang er geen tag is", () => {
    const [link] = linkMixes([makeMix()], [makeCandidate()]);
    expect(link.status).toBe("own-playlist");
    expect(link.matchedBy).toBe("tracklist");
  });

  it("wint van de tracklist-heuristiek: een playlist met de tag maar ZONDER overlappende tracks", () => {
    // Dit is de winst van de harde sleutel. Zonder tag zou deze playlist nooit gekoppeld worden
    // (containment 0), en met de tag is het toch de juiste -- bv. een mix waarvan de tracks op Spotify
    // ontbreken, of een playlist die net is leeggehaald en opnieuw gevuld wordt.
    const mix = makeMix({ id: "20260615" });
    const vreemd = makeCandidate({
      id: "getagd",
      name: "Zonder één gedeelde track",
      tracks: ["Iets Anders - Heel Andere Titel", "Nog Iemand - Nog Iets"],
      trackCount: 2,
      declaredMixId: "20260615",
    });

    const [link] = linkMixes([mix], [vreemd]);
    expect(link.status).toBe("own-playlist");
    expect(link.playlist?.id).toBe("getagd");
    expect(link.matchedBy).toBe("declared-id");
    // De containment blijft berekend en zichtbaar -- geen koppel-criterium meer, maar wél een controle.
    expect(link.containment).toBe(0);
  });

  it("wint ook van een emmer die dezelfde tracks bevat", () => {
    const mix = makeMix({ id: "20260615" });
    const emmer = makeCandidate({ id: "emmer", isMmc: false, trackCount: 596, volume: null });
    const getagd = makeCandidate({ id: "getagd", declaredMixId: "20260615" });

    const [link] = linkMixes([mix], [emmer, getagd]);
    expect(link.playlist?.id).toBe("getagd");
    expect(link.matchedBy).toBe("declared-id");
  });

  it("respecteert het Vol.-token: een getagde werkbak is 'work-queue', geen 'own-playlist'", () => {
    const mix = makeMix({ id: "20260615" });
    const [link] = linkMixes([mix], [makeCandidate({ volume: "X", declaredMixId: "20260615" })]);
    expect(link.status).toBe("work-queue");
    expect(link.matchedBy).toBe("declared-id");
  });

  it("meldt een tegenspraak als de gekoppelde playlist een ÁNDER ID declareert", () => {
    // De tracks wijzen naar deze mix, de beschrijving naar een andere -- dat hoort op te vallen. Het ID
    // in de tag bestaat hier niet in de bron (alleen 20260615 is meegegeven), dus dit is de wees-variant.
    const [link] = linkMixes([makeMix({ id: "20260615" })], [makeCandidate({ declaredMixId: "20240408" })]);

    expect(link.status).toBe("own-playlist");
    expect(link.matchedBy).toBe("tracklist");
    expect(link.declaredIdConflict).toBe("tag-points-to-unknown-mix");
  });

  it("kiest bij twee playlists met dezelfde tag de genummerde boven de werkbak", () => {
    const mix = makeMix({ id: "20260615" });
    const werkbak = makeCandidate({ id: "werkbak", volume: "X", declaredMixId: "20260615" });
    const genummerd = makeCandidate({ id: "genummerd", volume: 6, declaredMixId: "20260615" });

    expect(linkMixes([mix], [werkbak, genummerd])[0].playlist?.id).toBe("genummerd");
    // Ook als ze in de andere volgorde binnenkomen.
    expect(linkMixes([mix], [genummerd, werkbak])[0].playlist?.id).toBe("genummerd");
  });

  it("negeert een tag die naar een mix wijst die niet in de bron staat", () => {
    // De playlist claimt een onbekend ID; dan valt hij terug op de heuristiek voor de mixen die er zijn.
    const [link] = linkMixes([makeMix({ id: "20260615" })], [makeCandidate({ declaredMixId: "19990101" })]);
    expect(link.matchedBy).toBe("tracklist");
    expect(link.declaredIdConflict).toBe("tag-points-to-unknown-mix");
  });
});

// De vraag die PR #152 openliet: wát doe je met een tegenspraak? Dat hangt af van de soort, en die is af
// te leiden uit de bron -- bestaat de getagde mix daarin, of niet? (Dave, 2026-07-25.)
describe("linkMixes -- de twee soorten tegenspraak onderscheiden", () => {
  it("noemt het een wees-tag zodra het getagde ID niet in de bron bestaat", () => {
    const [link] = linkMixes([makeMix({ id: "20260615" })], [makeCandidate({ declaredMixId: "19990101" })]);
    // Corrigeerbaar: er is geen mix die deze tag nog nodig heeft.
    expect(link.declaredIdConflict).toBe("tag-points-to-unknown-mix");
  });

  it("noemt het een geclaimde playlist zodra het getagde ID WÉL in de bron bestaat", () => {
    // De situatie waarin blind corrigeren fout zou zijn: playlist P draagt de tag van mix A, en mix B
    // komt er via de tracklist óók op uit. A claimt P op de harde sleutel, dus de tag is goed -- B is de
    // mix die geen eigen playlist heeft.
    const mixA = makeMix({ id: "20240408", title: "Mix A" });
    const mixB = makeMix({ id: "20260615", title: "Mix B" });
    const playlistP = makeCandidate({ id: "P", declaredMixId: "20240408" });

    const [linkA, linkB] = linkMixes([mixA, mixB], [playlistP]);

    expect(linkA.matchedBy).toBe("declared-id");
    expect(linkA.declaredIdConflict).toBeNull();
    expect(linkB.matchedBy).toBe("tracklist");
    expect(linkB.declaredIdConflict).toBe("playlist-claimed-by-other-mix");
  });

  it("hangt niet aan de volgorde van de mixen in de bron", () => {
    // Dezelfde twee mixen, omgekeerd aangeleverd: het oordeel over de tag mag daar niet van afhangen.
    const mixA = makeMix({ id: "20240408", title: "Mix A" });
    const mixB = makeMix({ id: "20260615", title: "Mix B" });
    const playlistP = makeCandidate({ id: "P", declaredMixId: "20240408" });

    const links = linkMixes([mixB, mixA], [playlistP]);
    const b = links.find((l) => l.mix.id === "20260615")!;
    expect(b.declaredIdConflict).toBe("playlist-claimed-by-other-mix");
  });

  it("splitst de tellingen in de samenvatting uit naar soort", () => {
    // Twee losse gevallen naast elkaar, elk met hun eigen tracks zodat ze niet op dezelfde playlist
    // uitkomen: rond playlist P een geclaimde-playlist-botsing, rond playlist Q een wees-tag.
    const eigenTracks = ["Solo Artist - Alleenstaand Nummer", "Tweede Artiest - Ander Nummer"];
    const mixA = makeMix({ id: "20240408", title: "Mix A" });
    const mixB = makeMix({ id: "20260615", title: "Mix B" });
    const mixC = makeMix({ id: "20260101", title: "Mix C", tracks: eigenTracks });

    const geclaimd = makeCandidate({ id: "P", declaredMixId: "20240408" });
    const wees = makeCandidate({
      id: "Q",
      name: "Andere lijst",
      tracks: eigenTracks,
      trackCount: eigenTracks.length,
      declaredMixId: "19990101",
    });

    const summary = summarizeLinks(linkMixes([mixA, mixB, mixC], [geclaimd, wees]));

    // Het totaal blijft het totaal, met de twee soorten eronder.
    expect(summary.declaredIdMismatch).toBe(
      summary.tagPointsToUnknownMix + summary.playlistClaimedByOtherMix
    );
    expect(summary.playlistClaimedByOtherMix).toBe(1); // mix B, op de playlist van A
    expect(summary.tagPointsToUnknownMix).toBe(1); // mix C, op de playlist met de wees-tag
  });
});

describe("linkMixes -- niet teruggevonden", () => {
  it("laat een mix zonder passende playlist op 'unmatched' staan", () => {
    const other = makeCandidate({
      id: "other",
      name: "Worship",
      tracks: ["Hillsong United Oceans", "Elevation Worship Graves Into Gardens"],
    });
    const [link] = linkMixes([makeMix()], [other]);

    expect(link.status).toBe("unmatched");
    expect(link.containment).toBeLessThan(MATCH_CONTAINMENT_THRESHOLD);
  });

  it("laat een mix zonder tracklist 'unmatched' zijn i.p.v. willekeurig te koppelen", () => {
    const [link] = linkMixes([makeMix({ tracks: [] })], [makeCandidate()]);
    expect(link.status).toBe("unmatched");
    expect(link.playlist).toBeNull();
    expect(link.containment).toBe(0);
  });

  it("gaat om met een lege kandidatenlijst", () => {
    const [link] = linkMixes([makeMix()], []);
    expect(link.status).toBe("unmatched");
    expect(link.playlist).toBeNull();
  });
});

describe("findUnmirroredPlaylists -- de omgekeerde blik", () => {
  it("meldt een genummerde MMC-playlist waar geen mix tegenover staat", () => {
    const mirrored = makeCandidate({ id: "pl1" });
    const orphan = makeCandidate({
      id: "pl2",
      name: "House Mix 🟠 Orange Light (f) 🟠 Vol. 3",
      volume: 3,
      tracks: ["Iemand Anders Een Ander Nummer", "Nog Iemand Nog Een Nummer"],
    });
    const links = linkMixes([makeMix()], [mirrored, orphan]);

    expect(findUnmirroredPlaylists([mirrored, orphan], links).map((p) => p.id)).toEqual(["pl2"]);
  });

  it("rekent een Vol. X-werkbak nooit mee -- die hóórt geen mix te hebben", () => {
    const workbench = makeCandidate({
      id: "wb",
      name: "House Mix 🟠 Orange Light (f) 🟠 Vol. X",
      volume: "X",
      tracks: ["Iets Heel Anders"],
    });
    const links = linkMixes([makeMix()], [workbench]);

    expect(findUnmirroredPlaylists([workbench], links)).toEqual([]);
  });

  it("rekent playlists buiten MMC niet mee -- de conventie geldt alleen daar", () => {
    const bucket = makeCandidate({ id: "bucket", isMmc: false, volume: 2, tracks: ["Iets Heel Anders"] });
    const links = linkMixes([makeMix()], [bucket]);

    expect(findUnmirroredPlaylists([bucket], links)).toEqual([]);
  });

  it("beschouwt een playlist die alleen via een werkbak-link geraakt wordt als niet-weerspiegeld", () => {
    // De mix koppelt hier aan de werkbak (status work-queue); de genummerde playlist ernaast blijft
    // dus onweerspiegeld en moet gemeld worden.
    const workbench = makeCandidate({ id: "wb", volume: "X" });
    const numbered = makeCandidate({ id: "pl9", volume: 9, tracks: ["Iets Heel Anders"] });
    const links = linkMixes([makeMix()], [workbench, numbered]);

    expect(links[0].status).toBe("work-queue");
    expect(findUnmirroredPlaylists([workbench, numbered], links).map((p) => p.id)).toEqual(["pl9"]);
  });
});

describe("summarizeLinks", () => {
  it("telt de statussen en de afwijkingen", () => {
    const links = linkMixes(
      [makeMix(), makeMix({ id: "2", tracks: [] }), makeMix({ id: "3", bpm: 176 })],
      [makeCandidate()]
    );
    const summary = summarizeLinks(links);

    expect(summary.total).toBe(3);
    expect(summary.ownPlaylist).toBe(2);
    expect(summary.unmatched).toBe(1);
    expect(summary.bucketOnly).toBe(0);
    expect(summary.workQueue).toBe(0);
    expect(summary.volumeMismatch).toBe(2); // beide gekoppelde mixen zeggen Vol. 1 vs. Spotify Vol. 6
    expect(summary.bpmMismatch).toBe(1); // alleen de mix met bpm 176 tegen de gok 128
    expect(summary.trackCountMismatch).toBe(0);
  });

  it("telt de werkbak-status apart van de eigen playlists", () => {
    const links = linkMixes([makeMix(), makeMix({ id: "2" })], [makeCandidate({ volume: "X" })]);
    const summary = summarizeLinks(links);

    expect(summary.workQueue).toBe(2);
    expect(summary.ownPlaylist).toBe(0);
  });
});

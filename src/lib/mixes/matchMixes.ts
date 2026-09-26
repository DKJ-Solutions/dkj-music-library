// De BRUG: koppelt elke mix uit de DJ Cylow-JSON's aan zijn Spotify-playlist.
//
// WAAROM OP TRACKS EN NIET OP NAAM (zie het dossier, §"De mix-JSON's van de DJ Cylow-website <-> de
// MMC-playlists"): de twee bronnen delen geen enkele sleutel. Het `id`-veld (YYYYMMDD) bestaat alleen
// in de JSON, en het Vol.-nummer -- de enige kandidaat-sleutel die beide kanten dragen -- loopt
// structureel uiteen: de JSON nummert per genre-familie opnieuw binnen dezelfde kleur+power+frequency
// (light-red.json: House 1, 2, 1 · Techno 1, 2, 3 · D&B 1), terwijl Spotify per mix-familie doorlopend
// nummert. Bewezen voorbeeld: JSON "Red Light (m) Vol. 1" (House, id 20260615) is op Spotify
// "House Mix 🔴 Red Light (m) 🔴 Vol. 6". Wat wél betrouwbaar is: de tracks zelf -- 76 van de 77
// publieke mixen zijn zo teruggevonden.
//
// TWEE SIGNALEN, want containment alleen is niet genoeg. Een grote kleur-emmer als
// "Purple Light (f) 🟣 176BPM EDM" (596 tracks) bevat ALLE tracks van een mix en haalt dus 100%
// containment zonder de mix te ZIJN. Daarom weegt naast de containment ook de grootte-verhouding:
//   - containment  = welk deel van de mix-tracks in de playlist voorkomt  (is de mix er compleet?)
//   - sizeRatio    = min/max van de twee trackaantallen                   (is het dezelfde lijst?)
// Een echte mix-playlist zit rond containment 0.95+ / sizeRatio 0.95+; een emmer rond 1.0 / 0.05.
//
// Pure module: geen fs, geen React -- de fs-kant zit in mixStore.ts, het samenstellen in mixLinks.ts.
import type { Mix } from "./types";

/** Wat de matcher van een playlist nodig heeft -- een smalle projectie, zelfde recept als
 *  ClassifiableWorldPlaylist in spotify/classifyWorld.ts. */
export interface MixMatchCandidate {
  id: string;
  name: string;
  /** Is dit een MMC-playlist volgens de app-classificatie? Alleen MMC geldt als "eigen
   *  mix-playlist"; een match buiten MMC is per definitie een emmer/verzamellijst. */
  isMmc: boolean;
  trackCount: number;
  /** Eén regel per track, artiest(en) + titel samen -- de vorm waarin de snapshot ze levert. */
  tracks: string[];
  /** Vol.-nummer uit de playlistnaam, of `'X'`, of null.
   *
   *  HET VOL.-TOKEN DRAAGT DE PRODUCTIESTATUS (Dave, 2026-07-24): `Vol. X` is een **werkbak** --
   *  tracks verzameld, mix nog niet gemaakt, staat niet op de website. Een `Vol. <cijfer>` betekent
   *  klaar én live. Een mix die aan een `Vol. X`-playlist gekoppeld wordt is dus een signaal: die
   *  playlist had genummerd moeten worden. */
  volume: number | "X" | null;
  /** De BPM-tier die de app voor deze playlist GOKT (spotify/classifyBpm.ts), of null. */
  guessedBpm: number | null;
  /** Het mix-ID dat de playlistbeschrijving zélf noemt (zie mixIdTag.ts), of null.
   *
   *  Dit is de enige HARDE sleutel tussen de twee bronnen -- alle andere velden moeten worden afgeleid of
   *  gewogen. Waar hij gevuld is, hoeft er niet gegokt te worden. */
  declaredMixId: string | null;
  /** De rauwe beschrijving uit de snapshot. Naast `declaredMixId` (alleen de sleutel) nodig om de
   *  óverige velden in de beschrijving tegen de mix-JSON te kunnen leggen -- zie compareDescription in
   *  mixDescription.ts. */
  description: string | null;
}

export type MixLinkStatus =
  /** Een eigen genummerde MMC-playlist met (vrijwel) dezelfde tracklijst -- de weerspiegeling klopt. */
  | "own-playlist"
  /** De mix staat op Spotify nog in een `Vol. X`-werkbak, terwijl hij volgens de mix-data al klaar
   *  en live is -- die playlist had een nummer moeten krijgen. */
  | "work-queue"
  /** De tracks staan wél op Spotify, maar alleen in een grote verzamellijst/emmer. */
  | "bucket-only"
  /** Niet teruggevonden: geen playlist bevat deze tracklijst. */
  | "unmatched";

export interface MixLink {
  mix: Mix;
  status: MixLinkStatus;
  /** De best passende playlist, of null bij "unmatched". */
  playlist: MixMatchCandidate | null;
  /** Aandeel mix-tracks dat in de playlist voorkomt (0-1). */
  containment: number;
  /** min/max van de twee trackaantallen (0-1) -- laag = de playlist is veel groter dan de mix. */
  sizeRatio: number;
  /** Alleen bij "own-playlist": wijkt het Vol.-nummer af tussen de twee bronnen? */
  volumeMismatch: boolean;
  /** Alleen bij "own-playlist": playlist-trackcount minus mix-trackcount (0 = gelijk). */
  trackCountDelta: number;
  /** Alleen bij "own-playlist": wijkt de door de app gegokte BPM af van de echte BPM uit de JSON?
   *  `false` zodra een van de twee onbekend is -- dan is er niets tegen te spreken. */
  bpmMismatch: boolean;
  /** Hóé deze koppeling tot stand kwam: `"declared-id"` = de playlistbeschrijving noemt dit mix-ID
   *  (harde sleutel, geen gok), `"tracklist"` = de containment/grootte-heuristiek. `null` bij
   *  "unmatched". Dit is het vergelijkingsveld dat Dave met de `mix:`-tag heeft toegevoegd. */
  matchedBy: "declared-id" | "tracklist" | null;
  /** De aard van de tegenspraak tussen de tag en de tracks, of `null` als er niets tegen te spreken
   *  valt (geen tag, of een tag die deze mix zélf aanwijst). Zie {@link DeclaredIdConflict}: het
   *  onderscheid bepaalt of er wél of juist géén correctie-actie op zijn plaats is. */
  declaredIdConflict: DeclaredIdConflict | null;
}

/** De twee soorten tegenspraak tussen de `mix:`-tag van een playlist en de tracks erin -- en waarom ze
 *  uit elkaar gehouden moeten worden (de vraag die PR #152 openliet, Dave 2026-07-25).
 *
 *  De aanleiding: playlist P draagt `mix:A`, maar de tracks van mix B wijzen óók naar P. Wie daarop
 *  blind "corrigeer de tag naar B" aanbiedt, heeft de helft van de gevallen fout. Het verschil is
 *  gelukkig af te leiden uit de bron zelf -- bestaat mix A daarin, of niet? */
export type DeclaredIdConflict =
  /** De tag wijst een mix aan die in de bron BESTAAT. Die mix claimt deze playlist dan zelf al op de
   *  harde sleutel (de declared-id-ronde gaat immers vóór), dus de tag is vermoedelijk gewoon goed en
   *  déze koppeling is de misser: mix B heeft geen eigen playlist en de heuristiek heeft hem op de
   *  playlist van A gelegd. De tag corrigeren zou A zijn playlist afpakken -- dus geen actie, alleen
   *  de melding dat déze mix nog een eigen playlist mist. */
  | "playlist-claimed-by-other-mix"
  /** De tag wijst een mix-ID aan dat in de bron NIET bestaat: een wees. Ofwel een typefout in de
   *  beschrijving, ofwel een mix die uit `djcylow-react` verdwenen is. Hier is corrigeren naar het ID
   *  waar de tracks naar wijzen wél de juiste zet -- er is geen mix die de oude tag nog nodig heeft. */
  | "tag-points-to-unknown-mix";

/** Vanaf deze containment beschouwen we de mix als teruggevonden. 0,7 is ruim onder de waargenomen
 *  0,95+ van een echte match en ruim boven de ~0,5 die een toevallige genre-overlap haalt. */
export const MATCH_CONTAINMENT_THRESHOLD = 0.7;

/** Onder deze grootte-verhouding is de playlist een emmer, geen mix: hij bevat de tracklijst wel,
 *  maar is fors groter. 0,6 laat de normale 1-3 tracks afwijking (en een mix van 22 tracks in een
 *  playlist van 30) ruim door, terwijl een emmer van 100+ tracks er nooit onder komt. */
export const MATCH_SIZE_RATIO_THRESHOLD = 0.6;

// Woorden die in vrijwel elke tracktitel kunnen opduiken en dus niets onderscheiden. Bewust kort
// gehouden: de tokenizer gooit al alles onder de 4 letters weg, waarmee de meeste ruis verdwijnt.
const STOPWORDS: ReadonlySet<string> = new Set([
  "feat",
  "remix",
  "edit",
  "original",
  "extended",
  "version",
  "radio",
  "mix",
  "with",
  "your",
  "this",
  "that",
  "from",
  "into",
]);

/** Splitst een reeks track-regels in een woordenzak. Haakjes-inhoud (remix-/feat-vermeldingen)
 *  vervalt: de JSON en Spotify noteren die verschillend, terwijl artiest + titel wél overeenkomen.
 *  Woorden korter dan 4 letters vervallen ook -- die dragen te weinig onderscheid en de JSON schrijft
 *  "Artist - Title" in één string, dus we kunnen niet op veldgrens vertrouwen. */
export function trackTokens(lines: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const line of lines) {
    const cleaned = (line ?? "")
      .toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, " ")
      .replace(/[^a-z0-9]+/g, " ");
    for (const word of cleaned.split(" ")) {
      if (word.length > 3 && !STOPWORDS.has(word)) out.add(word);
    }
  }
  return out;
}

/** Welk deel van `needle` in `haystack` voorkomt (0-1). Leeg = 0: zonder tracks valt er niets te
 *  koppelen. */
export function containment(needle: ReadonlySet<string>, haystack: ReadonlySet<string>): number {
  if (needle.size === 0) return 0;
  let hits = 0;
  for (const word of needle) if (haystack.has(word)) hits++;
  return hits / needle.size;
}

function unmatched(
  mix: Mix,
  playlist: MixMatchCandidate | null,
  containmentScore: number,
  sizeRatio: number
): MixLink {
  return {
    mix,
    status: "unmatched",
    playlist,
    containment: containmentScore,
    sizeRatio,
    volumeMismatch: false,
    trackCountDelta: 0,
    bpmMismatch: false,
    matchedBy: null,
    declaredIdConflict: null,
  };
}

function sizeRatioOf(a: number, b: number): number {
  const max = Math.max(a, b);
  return max === 0 ? 0 : Math.min(a, b) / max;
}

/** Laatste tie-break bij twee even goede kandidaten: een genummerde MMC-playlist (klaar & live) is
 *  altijd de betere kandidaat dan de werkbak ernaast, en die weer beter dan een lijst buiten MMC. */
function preferenceRank(candidate: MixMatchCandidate): number {
  if (!candidate.isMmc) return 0;
  return typeof candidate.volume === "number" ? 2 : 1;
}

/** Koppelt elke mix aan zijn best passende playlist. De kandidaten worden één keer getokeniseerd en
 *  daarna voor alle mixen hergebruikt -- met ~80 mixen tegen ~350 playlists is dat het verschil
 *  tussen een merkbare en een onmerkbare stap. */
export function linkMixes(mixes: readonly Mix[], candidates: readonly MixMatchCandidate[]): MixLink[] {
  const indexed = candidates.map((candidate) => ({ candidate, tokens: trackTokens(candidate.tracks) }));
  // Welke mix-ID's de bron kent -- de enige extra kennis die nodig is om een afwijkende tag te kunnen
  // wegen: wijst hij naar een bestaande mix (dan is de tag waarschijnlijk goed) of naar niets (dan is
  // hij een wees). Zie DeclaredIdConflict.
  const knownMixIds = new Set(mixes.map((m) => m.id).filter(Boolean));

  return mixes.map((mix) => {
    const mixTokens = trackTokens(mix.tracks);

    // TWEE RONDEN, en de volgorde is essentieel. Eerst wordt alleen gekeken naar de kandidaten die
    // een eigen mix-playlist KÚNNEN zijn: binnen MMC en van vergelijkbare grootte. Pas als daar niets
    // boven de drempel zit, mogen de emmers meedoen.
    //
    // Zonder die scheiding wint de emmer het regelmatig van de echte playlist: de emmer bevat álle
    // tracks (containment 1.0), terwijl de eigen playlist er soms 1-3 mist die niet op Spotify staan
    // (containment ~0.9). Op een kale "hoogste containment wint" belandt zo'n mix dus als
    // "alleen in een emmer", terwijl zijn playlist er wél is -- waargenomen bij o.a.
    // `Drum & Bass 🟢 Green Full (f) 🟢 Vol. 1`.
    const scored = indexed.map(({ candidate, tokens }) => ({
      candidate,
      containment: containment(mixTokens, tokens),
      sizeRatio: sizeRatioOf(mix.tracks.length, candidate.trackCount),
      rank: preferenceRank(candidate),
    }));

    // DE HARDE SLEUTEL GAAT VOOR (Dave, 2026-07-25). Noemt een playlistbeschrijving dit mix-ID
    // (`mix:20260303`, zie mixIdTag.ts), dan ís dat de playlist -- geen drempel, geen weging, geen
    // twee ronden. De heuristiek hieronder blijft bestaan voor alle playlists zonder tag, en de
    // containment/grootte worden ook hier gewoon berekend: ze zijn dan geen koppel-criterium meer maar
    // een controle op de tag ("de beschrijving zegt deze mix, de tracks vertellen iets anders").
    //
    // Bij meerdere playlists met dezelfde tag wint dezelfde rangorde als elders: genummerd boven werkbak
    // boven buiten-MMC, en daarbinnen de beste containment. Dat is een fout in de data (twee playlists
    // die dezelfde mix claimen), maar de uitkomst hoort voorspelbaar te zijn.
    const declared = scored.filter((s) => s.candidate.declaredMixId === mix.id);
    if (declared.length > 0) {
      const beste = declared.reduce((a, b) =>
        b.rank > a.rank || (b.rank === a.rank && b.containment > a.containment) ? b : a
      );
      const status = beste.candidate.volume === "X" ? "work-queue" : "own-playlist";
      return describeLink(mix, beste, status, knownMixIds, "declared-id");
    }

    const ownCandidates = scored.filter(
      (s) => s.candidate.isMmc && s.sizeRatio >= MATCH_SIZE_RATIO_THRESHOLD
    );
    const own = pickBest(ownCandidates);

    if (own !== null && own.containment >= MATCH_CONTAINMENT_THRESHOLD) {
      // Of de weerspiegeling klopt, hangt nu aan het Vol.-token: een nummer betekent klaar & live
      // (goed), `Vol. X` betekent dat de mix op Spotify nog in de werkbak staat terwijl hij volgens
      // de mix-data al af is.
      return describeLink(
        mix,
        own,
        own.candidate.volume === "X" ? "work-queue" : "own-playlist",
        knownMixIds
      );
    }

    const fallback = pickBest(scored);
    // Twee losse checks i.p.v. één `fallback === null || fallback.containment < ...`: die vorm laat de
    // narrowing in de body sneuvelen (TS houdt er `never` van over).
    if (fallback === null) return unmatched(mix, null, 0, 0);
    if (fallback.containment < MATCH_CONTAINMENT_THRESHOLD) {
      // De beste-maar-te-zwakke kandidaat blijft wél zichtbaar: "51% in de grote D&B-emmer" is
      // informatiever dan een kale streep.
      return unmatched(mix, fallback.candidate, fallback.containment, fallback.sizeRatio);
    }
    return describeLink(mix, fallback, "bucket-only", knownMixIds);
  });
}

interface ScoredCandidate {
  candidate: MixMatchCandidate;
  containment: number;
  sizeRatio: number;
  rank: number;
}

/** Beste kandidaat uit een gescoorde lijst, in deze rangorde: (1) hoogste containment, (2) beste
 *  grootte-verhouding, (3) bij volledig gelijk spel de hoogste `preferenceRank` -- zodat een
 *  genummerde playlist voorgaat op de werkbak-variant ernaast (die kan blijven staan als restant).
 *  Kandidaten zonder één gedeeld woord doen niet mee. */
function pickBest(scored: readonly ScoredCandidate[]): ScoredCandidate | null {
  let best: ScoredCandidate | null = null;
  for (const item of scored) {
    if (item.containment === 0) continue;
    const better =
      best === null ||
      item.containment > best.containment ||
      (item.containment === best.containment &&
        (item.sizeRatio > best.sizeRatio ||
          (item.sizeRatio === best.sizeRatio && item.rank > best.rank)));
    if (better) best = item;
  }
  return best;
}

/** De aard van de tegenspraak tussen de tag van de gekoppelde playlist en dit mix-ID. `null` zodra er
 *  niets tegen te spreken valt: geen tag, of een tag die deze mix zélf aanwijst (bij een
 *  declared-id-match is de tag juist de reden van de koppeling). Zie {@link DeclaredIdConflict} voor
 *  waarom het onderscheid tussen de twee soorten uitmaakt. */
function declaredIdConflictOf(
  declared: string | null,
  mixId: string,
  knownMixIds: ReadonlySet<string>
): DeclaredIdConflict | null {
  if (declared === null || declared === mixId) return null;
  return knownMixIds.has(declared) ? "playlist-claimed-by-other-mix" : "tag-points-to-unknown-mix";
}

function describeLink(
  mix: Mix,
  best: ScoredCandidate,
  status: MixLinkStatus,
  knownMixIds: ReadonlySet<string>,
  matchedBy: "declared-id" | "tracklist" = "tracklist"
): MixLink {
  const isLinked = status === "own-playlist" || status === "work-queue";
  return {
    mix,
    status,
    playlist: best.candidate,
    containment: best.containment,
    sizeRatio: best.sizeRatio,
    matchedBy,
    declaredIdConflict: declaredIdConflictOf(best.candidate.declaredMixId, mix.id, knownMixIds),
    // De typeof-check dekt de werkbak vanzelf af: tegen `Vol. X` valt geen nummer te botsen (dat de
    // playlist geen nummer heeft, ís de "work-queue"-status al).
    volumeMismatch:
      isLinked &&
      mix.volume !== null &&
      typeof best.candidate.volume === "number" &&
      mix.volume !== best.candidate.volume,
    trackCountDelta: isLinked ? best.candidate.trackCount - mix.tracks.length : 0,
    bpmMismatch:
      isLinked &&
      mix.bpm !== null &&
      best.candidate.guessedBpm !== null &&
      mix.bpm !== best.candidate.guessedBpm,
  };
}

/** DE OMGEKEERDE BLIK. Omdat `Vol. <cijfer>` "klaar en live op de website" betekent, hoort élke
 *  genummerde MMC-playlist een mix in de JSON's te hebben. Deze functie levert de genummerde
 *  MMC-playlists die door geen enkele mix worden weerspiegeld -- ofwel mist daar een JSON-entry,
 *  ofwel is een werkbak te vroeg genummerd.
 *
 *  De `Vol. X`-werkbakken vallen hier bewust buiten: die hóren geen mix te hebben. */
export function findUnmirroredPlaylists(
  candidates: readonly MixMatchCandidate[],
  links: readonly MixLink[]
): MixMatchCandidate[] {
  const mirrored = new Set(
    links.filter((l) => l.status === "own-playlist" && l.playlist).map((l) => l.playlist!.id)
  );
  return candidates.filter(
    (c) => c.isMmc && typeof c.volume === "number" && !mirrored.has(c.id)
  );
}

/** Tellingen over een koppelresultaat -- voor de kop van de overzichtspagina. */
export function summarizeLinks(links: readonly MixLink[]) {
  return {
    total: links.length,
    ownPlaylist: links.filter((l) => l.status === "own-playlist").length,
    workQueue: links.filter((l) => l.status === "work-queue").length,
    bucketOnly: links.filter((l) => l.status === "bucket-only").length,
    unmatched: links.filter((l) => l.status === "unmatched").length,
    volumeMismatch: links.filter((l) => l.volumeMismatch).length,
    trackCountMismatch: links.filter((l) => l.trackCountDelta !== 0).length,
    bpmMismatch: links.filter((l) => l.bpmMismatch).length,
    /** Gekoppeld op de harde sleutel uit de playlistbeschrijving i.p.v. op de tracklist-heuristiek. */
    byDeclaredId: links.filter((l) => l.matchedBy === "declared-id").length,
    /** De gekoppelde playlist noemt een ánder mix-ID -- een tegenspraak tussen de twee bronnen. Het
     *  totaal van de twee soorten hieronder. */
    declaredIdMismatch: links.filter((l) => l.declaredIdConflict !== null).length,
    /** Tegenspraken waarbij de tag naar een mix wijst die niet in de bron bestaat -- een wees, en het
     *  enige geval waarin de tag ter plekke te corrigeren is. */
    tagPointsToUnknownMix: links.filter((l) => l.declaredIdConflict === "tag-points-to-unknown-mix")
      .length,
    /** Tegenspraken waarbij de playlist al door een ándere, bestaande mix geclaimd is -- déze mix mist
     *  dus een eigen playlist. Niets aan de tag te corrigeren. */
    playlistClaimedByOtherMix: links.filter(
      (l) => l.declaredIdConflict === "playlist-claimed-by-other-mix"
    ).length,
  };
}

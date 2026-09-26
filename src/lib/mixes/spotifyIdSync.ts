// WELKE PLAYLISTS DE SLEUTEL KRIJGEN, EN WAT ERAAN VERANDERT (Dave, 2026-08-11).
//
// Dave's opdracht, letterlijk: *"zet dit ID in elke Spotify-playlist die dezelfde title_spotify heeft"*.
// Dit bestand maakt daar een lijst van: per playlist die exact zo heet als een mix in de bron, wat er nu
// in de beschrijving staat en wat er komt te staan. Het schrijft zelf niets -- het is de PLANNING, en de
// enige schrijfroute blijft `POST /api/spotify/mix-tag` (zie playlistApi.ts: er is er maar één).
//
// DE MATCH IS DE NAAM, LETTERLIJK EN VERDER NIETS. Geen tracklist-heuristiek, geen bestaande mix-tag:
// alleen playlists waarvan de naam nu al precies gelijk is aan `title_spotify`. Dat is de strengste
// selectie die er is, en hij is met opzet los van de koppeling in matchMixes.ts -- een playlist die zo
// heet, ís die mix, en daar hoeft niets aan gewogen te worden.
//
// WAAROM DE MATCH NIET VIA `compareTitle` LOOPT (spotifyTitle.ts), hoewel die dezelfde vergelijking
// maakt: die functie kent ook de stand `blocked` -- de zes Cyan-playlists, waar de bron 💠 schrijft en
// Dave's playlists 🧊 gebruiken. Die blokkade gaat over het schrijven van de NAAM. Hier schrijven we de
// beschrijving, en een playlist die al exact zo heet is een harde match, ongeacht wat er over het
// hernoemen ervan te zeggen valt. De blokkade meenemen zou zes playlists uitsluiten om een reden die
// hier niet van toepassing is.
//
// TWEE LAGEN, zelfde rolverdeling als in playlistMixInfo.ts: `buildSpotifyIdPlan()` is de pure
// berekening (geen fs, dus rechtstreeks toetsbaar) en `getSpotifyIdPlan()` is het SERVER-ONLY laagje
// eromheen dat beide bronnen van schijf haalt.
import {
  compareDescription,
  parseMixDescription,
  withMixDescription,
  type DescriptionFieldDiff,
} from "./mixDescription";
import { readMixes } from "./mixStore";
import { descriptionKeyOf, spotifyIdBlocker } from "./spotifyId";
import type { Mix } from "./types";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import type { Snapshot } from "@/lib/spotify/types";

/** Wat deze planning van een playlist hoeft te weten. Bewust de kale drie velden: dit is een
 *  naam-vergelijking en een beschrijving-herschrijving, meer niet. */
export interface SyncPlaylist {
  id: string;
  name: string;
  description: string | null;
}

export type SpotifyIdRowState =
  /** De beschrijving draagt de sleutel al, en de rest van het blok klopt ook -- niets te doen. */
  | "in-sync"
  /** Er valt iets te schrijven: de sleutel, of een ander veld in hetzelfde blok. */
  | "to-write"
  /** De bron levert hier geen bruikbare `id_spotify` -- er is niets om op te waarderen. */
  | "blocked";

/** Eén playlist die op naam aan een mix vastzit, met wat er aan zijn beschrijving verandert. */
export interface SpotifyIdRow {
  playlistId: string;
  playlistName: string;
  mixId: string;
  /** Uit welk JSON-bestand de mix komt -- handig bij het rechtzetten van een blokkade. */
  mixFile: string;
  /** De sleutel zoals hij NU in de beschrijving staat, of `null` als er nog geen blok staat. */
  currentKey: string | null;
  /** De sleutel die er komt te staan: `id_spotify`, of het kale mix-ID bij een blokkade. */
  targetKey: string;
  currentDescription: string;
  targetDescription: string;
  /** Wat er inhoudelijk afwijkt, veld voor veld -- inclusief `id_spotify` zelf. Leeg bij `in-sync`. */
  diffs: DescriptionFieldDiff[];
  state: SpotifyIdRowState;
  /** Bij `blocked`: waarom, in Dave's eigen taal. Null bij de andere standen. */
  blocker: string | null;
}

/** Een naam waarop niet te koppelen valt omdat er meer dan één kandidaat aan hangt. Dan schrijft deze
 *  planning niets: welke van de twee bedoeld is, is niet uit de data af te leiden. */
export interface AmbiguousTitle {
  title: string;
  /** De mix-ID's die deze `title_spotify` dragen (meer dan één = de bron is dubbel). */
  mixIds: string[];
  /** De playlists die zo heten (meer dan één = Spotify is dubbel). */
  playlistIds: string[];
}

export interface SpotifyIdPlan {
  rows: SpotifyIdRow[];
  ambiguous: AmbiguousTitle[];
  /** Mixen mét een `title_spotify` waar geen enkele playlist zo heet -- de andere kant van de match.
   *  Niet per se een probleem: een mix hoeft geen playlist te hebben. */
  unmatchedMixIds: string[];
}

/** Groepeert op een sleutel en houdt de volgorde van binnenkomst aan -- zodat de uitkomst niet van de
 *  toevallige sorteervolgorde van een Map-iteratie afhangt. */
function groupBy<T>(items: readonly T[], key: (item: T) => string | null): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    const bestaand = out.get(k);
    if (bestaand) bestaand.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/** De planning: welke playlists krijgen de sleutel, en wat verandert er aan hun beschrijving.
 *
 *  Puur, dus rechtstreeks toetsbaar. Mixen zonder `title_spotify` doen niet mee -- zonder naam is er
 *  geen match te maken, en dat is geen afwijking maar een bron die dat veld nog niet vult. */
export function buildSpotifyIdPlan(
  mixes: readonly Mix[],
  playlists: readonly SyncPlaylist[]
): SpotifyIdPlan {
  const mixenPerTitel = groupBy(mixes, (m) => m.spotifyTitle);
  const playlistsPerNaam = groupBy(playlists, (p) => p.name);

  const rows: SpotifyIdRow[] = [];
  const ambiguous: AmbiguousTitle[] = [];
  const unmatchedMixIds: string[] = [];

  for (const [titel, mixGroep] of mixenPerTitel) {
    const playlistGroep = playlistsPerNaam.get(titel) ?? [];

    if (playlistGroep.length === 0) {
      // Geen playlist met deze naam. Dat is de gewone stand voor een mix die (nog) geen eigen playlist
      // heeft, dus het wordt gemeld en niet als fout geteld.
      for (const mix of mixGroep) unmatchedMixIds.push(mix.id);
      continue;
    }

    // DUBBELZINNIG AAN EEN VAN BEIDE KANTEN: dan schrijven we niets. Twee mixen met dezelfde
    // `title_spotify` (de bron is dubbel) of twee playlists met dezelfde naam (Spotify is dubbel) --
    // in beide gevallen is niet uit de data af te leiden wélke bedoeld is, en een gok zou hier de
    // beschrijving van de verkeerde playlist overschrijven.
    if (mixGroep.length > 1 || playlistGroep.length > 1) {
      ambiguous.push({
        title: titel,
        mixIds: mixGroep.map((m) => m.id),
        playlistIds: playlistGroep.map((p) => p.id),
      });
      continue;
    }

    rows.push(buildRow(mixGroep[0], playlistGroep[0]));
  }

  // Nieuwste mix bovenaan: het ID is `YYYYMMDD`, dus aflopend sorteren is chronologisch -- zelfde
  // afspraak als in playlistMixInfo.ts, zodat de twee overzichten dezelfde volgorde tonen.
  rows.sort((a, b) => (Number(b.mixId) || 0) - (Number(a.mixId) || 0));
  unmatchedMixIds.sort((a, b) => (Number(b) || 0) - (Number(a) || 0));

  return { rows, ambiguous, unmatchedMixIds };
}

function buildRow(mix: Mix, playlist: SyncPlaylist): SpotifyIdRow {
  const currentDescription = playlist.description ?? "";
  const targetDescription = withMixDescription(currentDescription, mix);
  const blocker = spotifyIdBlocker(mix);
  const vergelijking = compareDescription(currentDescription, mix);

  return {
    playlistId: playlist.id,
    playlistName: playlist.name,
    mixId: mix.id,
    mixFile: mix.file,
    currentKey: parseMixDescription(currentDescription)?.key ?? null,
    targetKey: descriptionKeyOf(mix),
    currentDescription,
    targetDescription,
    diffs: vergelijking.diffs,
    // De volgorde telt: een blokkade zegt "hier valt niets op te waarderen" en gaat vóór de vraag of er
    // toevallig een ander veld afwijkt -- dat laatste hoort bij de playlist-tabel, niet bij deze actie.
    state: blocker !== null ? "blocked" : targetDescription === currentDescription ? "in-sync" : "to-write",
    blocker,
  };
}

/** Dezelfde planning, met de mix-bron van schijf gehaald. SERVER-ONLY (fs via readMixes).
 *
 *  De snapshot komt van de AANROEPER en wordt hier niet zelf gelezen: het bestand is tientallen MB's en
 *  readSnapshot() cachet niet, dus wie hem al heeft hoort hem door te geven (zelfde afspraak als bij
 *  getMixLinks en getEnrichedSnapshot). Weglaten mag -- dan wordt hij alsnog gelezen.
 *
 *  Ontbreekt de mix-map of de snapshot, dan is het resultaat gewoon leeg -- dezelfde "geen bron = leeg,
 *  niet stuk"-lijn als mixStore.ts/snapshotStore.ts. */
export function getSpotifyIdPlan(gegeven?: Snapshot | null): SpotifyIdPlan {
  const snapshot = gegeven !== undefined ? gegeven : readSnapshot();
  const playlists: SyncPlaylist[] = (snapshot?.playlists ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
  }));
  return buildSpotifyIdPlan(readMixes(), playlists);
}

/** Samenvatting voor de kop van het overzicht -- dezelfde rol als summarizeLinks in matchMixes.ts. */
export function summarizeSpotifyIdPlan(plan: SpotifyIdPlan) {
  return {
    matched: plan.rows.length,
    toWrite: plan.rows.filter((r) => r.state === "to-write").length,
    inSync: plan.rows.filter((r) => r.state === "in-sync").length,
    blocked: plan.rows.filter((r) => r.state === "blocked").length,
    ambiguous: plan.ambiguous.length,
    unmatched: plan.unmatchedMixIds.length,
  };
}

// Fase 6: het data-dashboard op /spotify/dashboard -- dedup, top-artiesten, verdelingen. Pure
// functies, los van fs/React (zelfde stijl als playlistFilters.ts/classifyWorld.ts/classifyBpm.ts),
// zodat ze los getest kunnen worden zonder een snapshot-fixture op schijf te hoeven zetten.
//
// Werkt op TWEE databronnen:
// - de RUWE Snapshot (types.ts, met `tracks` per playlist) voor dedup/top-artiesten -- deze twee
//   vragen hebben echte trackdata nodig, die EnrichedPlaylist bewust weglaat (zie de docstring bij
//   `tracks` in enrichedPlaylists.ts: "wie de tracks nodig heeft, leest de snapshot rechtstreeks
//   via snapshotStore.ts" -- dat is precies wat de dashboard-pagina doet).
// - de VERRIJKTE EnrichedPlaylist[] (enrichedPlaylists.ts) voor de verdelingen: world/MMC-BPM zijn
//   PLAYLIST-classificaties (uit de naam gegokt, zie classifyWorld.ts/classifyBpm.ts), geen
//   per-track-classificatie -- Spotify's audio-features/BPM-endpoint is sinds de feb-2026-migratie
//   niet meer beschikbaar voor deze app (zie types.ts). "Verdeling van tracks" over deze dimensies
//   is daarom bewust de SOM van playlist.trackCount per bucket, niet een gok per los nummer.
//
// Scope-keuze (zie ook de changelog-entry app-spotify-dashboard.md): dedup/top-artiesten draaien
// over ALLE playlists in de snapshot (eigen + gevolgd) -- een gevolgde, niet-eigen playlist levert
// vrijwel nooit trackdata op (403 op /playlists/{id}/items, zie ingest.ts) en telt dus vanzelf
// nauwelijks mee. Geen aparte owner-filter nodig, in lijn met hoe enrichedPlaylists.ts zelf ook
// ALLE playlists verrijkt (de owner-filtering zit daar alleen in sortBucket, niet in een weglating).

import type { Snapshot } from "./types";
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import { SPOTIFY_WORLDS, type SpotifyWorld } from "./classifyWorld";
import { MMC_BPM_TIERS, type MmcBpmTier } from "./classifyBpm";
import { PLUTCHIK_COLORS, type PlutchikColor } from "./plutchikColors";
import { filterByWorld } from "./playlistFilters";

// --- Dedup: dubbele tracks over playlists heen ------------------------------------------------

/** Eén artiest zoals meegedragen in een DuplicateTrack -- id + naam (i.p.v. alleen een naam-string)
 *  zodat topDuplicateArtists() hieronder op artist.id kan sleutelen, net als computeTopArtists. */
export interface DuplicateTrackArtist {
  id: string;
  name: string;
}

export interface DuplicateTrack {
  trackId: string;
  name: string;
  /** Eén of meer artiesten (id + naam), in de volgorde van de Spotify-track zelf. */
  artists: DuplicateTrackArtist[];
  /** Aantal DISTINCTE playlists waarin deze track voorkomt (altijd >= 2 -- zie findDuplicateTracks). */
  playlistCount: number;
  playlistNames: string[];
}

interface DuplicateAccumulator {
  name: string;
  artists: DuplicateTrackArtist[];
  /** Sleutel = playlist-id, waarde = playlist-naam -- een Map i.p.v. een Set<name> omdat twee
   *  DISTINCTE playlists toevallig dezelfde naam kunnen dragen (bv. twee "Feestje"-varianten);
   *  dedupen op naam zou die dan ten onrechte laten samenvallen tot één "playlist". */
  playlistsById: Map<string, string>;
}

// Verzamelt, over ALLE playlists heen, per track-id in welke (distincte) playlists 'm voorkomt --
// een track die twee keer in DEZELFDE playlist staat (een echte kopieerfout binnen één lijst) telt
// hier niet extra mee (Map/Set op playlist-id i.p.v. count), want de vraag is expliciet "over
// playlists heen" (zie de opdracht), niet "binnen één playlist". `isLocal`-items en episodes hebben
// al geen `track.id` (zie mapTrack in ingest.ts) en vallen dus vanzelf buiten deze telling.
function collectDuplicates(snapshot: Snapshot): Map<string, DuplicateAccumulator> {
  const byTrackId = new Map<string, DuplicateAccumulator>();

  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      const track = item.track;
      if (!track) continue;

      let acc = byTrackId.get(track.id);
      if (!acc) {
        acc = {
          name: track.name,
          artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
          playlistsById: new Map(),
        };
        byTrackId.set(track.id, acc);
      }
      acc.playlistsById.set(playlist.id, playlist.name);
    }
  }

  return byTrackId;
}

// Zet een byTrackId-map om in de gesorteerde lijst van tracks die in 2+ distincte playlists
// voorkomen (playlistsById.size < 2 => geen duplicaat, dus overgeslagen). Ongekapt -- de aanroeper
// bepaalt zelf of/waar een `limit` wordt toegepast (findDuplicateTracks slice't voor de tabel,
// computeDedupSummary telt en geeft ALLES door aan topDuplicateArtists, zie hieronder).
function buildDuplicateTrackList(byTrackId: Map<string, DuplicateAccumulator>): DuplicateTrack[] {
  const duplicates: DuplicateTrack[] = [];
  for (const [trackId, acc] of byTrackId) {
    if (acc.playlistsById.size < 2) continue;
    duplicates.push({
      trackId,
      name: acc.name,
      artists: acc.artists,
      playlistCount: acc.playlistsById.size,
      playlistNames: Array.from(acc.playlistsById.values()).sort(),
    });
  }

  duplicates.sort((a, b) => b.playlistCount - a.playlistCount || a.name.localeCompare(b.name));
  return duplicates;
}

/** Alle tracks die in 2+ distincte playlists voorkomen, gesorteerd op aantal playlists (dan naam),
 *  desgewenst afgekapt tot `limit` (default 50 -- een dashboard-overzicht, geen volledige export). */
export function findDuplicateTracks(snapshot: Snapshot, limit = 50): DuplicateTrack[] {
  return buildDuplicateTrackList(collectDuplicates(snapshot)).slice(0, limit);
}

export interface DedupSummary {
  /** Top-N duplicaten (zie findDuplicateTracks), voor de tabel. */
  duplicates: DuplicateTrack[];
  /** ALLE duplicaat-tracks, ongekapt (dus niet slechts de top-N in `duplicates` hierboven) -- de
   *  bron voor topDuplicateArtists() hieronder, zodat de artiest-ranglijst over de hele
   *  bibliotheek telt, ook duplicaten die buiten de getoonde tabel vallen. */
  allDuplicates: DuplicateTrack[];
  /** Totaal aantal DISTINCTE tracks dat in 2+ playlists voorkomt -- ongeacht `limit`, zodat de UI
   *  altijd "toont X van Y" kan tonen ook als de tabel is afgekapt. */
  totalDuplicateTracks: number;
  /** Totaal aantal distincte tracks in de hele snapshot (duplicaten + unieke) -- de noemer voor
   *  "X van Y tracks komt dubbel voor". */
  totalDistinctTracks: number;
}

// Eén scan van de snapshot (collectDuplicates), niet twee: computeDedupSummary bouwde deze data
// eerder zowel via findDuplicateTracks() als via zijn eigen collectDuplicates()-aanroep op. Nu
// wordt de byTrackId-map precies één keer opgebouwd en hergebruikt voor zowel de (ongekapte)
// duplicatenlijst als de tellingen -- findDuplicateTracks blijft als losse export bestaan (voor
// de tests en voor aanroepers die alleen de tabel-lijst nodig hebben), maar wordt hier niet
// nogmaals aangeroepen.
export function computeDedupSummary(snapshot: Snapshot, limit = 50): DedupSummary {
  const byTrackId = collectDuplicates(snapshot);
  const allDuplicates = buildDuplicateTrackList(byTrackId);

  return {
    duplicates: allDuplicates.slice(0, limit),
    allDuplicates,
    totalDuplicateTracks: allDuplicates.length,
    totalDistinctTracks: byTrackId.size,
  };
}

export interface TopDuplicateArtist {
  id: string;
  name: string;
  /** Som van (playlistCount - 1) over alle duplicaat-tracks van deze artiest -- het aantal
   *  "overtollige" kopieën, niet het totaal aantal tracks van de artiest (zie computeTopArtists
   *  hieronder voor die vraag). Een track met meerdere artiesten telt voor elke artiest afzonderlijk
   *  mee (samenwerkingen delen 'm dus allebei toe) -- bewuste keuze, zie de changelog-entry. */
  extraCopies: number;
}

/** Welke artiesten hebben de meeste "overtollige" kopieën over hun duplicaat-tracks. Gesleuteld op
 *  artist.id (niet de naam) -- zelfde reden als computeTopArtists hieronder: twee artiesten met
 *  toevallig dezelfde naam mogen niet samengevoegd worden. Telt over de MEEGEGEVEN `duplicates`;
 *  de aanroeper geeft hier bewust de VOLLEDIGE, ongekapte duplicatenlijst (DedupSummary.allDuplicates)
 *  aan mee, niet de afgekapte top-N-tabel -- de ranglijst weegt dus de hele bibliotheek mee, ook
 *  duplicaten die buiten de getoonde tabel vallen. (Voorheen liep dit over de al-afgekapte
 *  top-50-tabel; die "consistent met de tabel"-keuze is losgelaten omdat Dave de ranglijst wil
 *  laten kloppen op de hele bibliotheek, niet op wat toevallig zichtbaar is.) */
export function topDuplicateArtists(duplicates: readonly DuplicateTrack[], limit = 10): TopDuplicateArtist[] {
  const byArtistId = new Map<string, { name: string; extraCopies: number }>();

  for (const dup of duplicates) {
    const extra = dup.playlistCount - 1;
    for (const artist of dup.artists) {
      let entry = byArtistId.get(artist.id);
      if (!entry) {
        entry = { name: artist.name, extraCopies: 0 };
        byArtistId.set(artist.id, entry);
      }
      entry.extraCopies += extra;
    }
  }

  return Array.from(byArtistId, ([id, entry]) => ({ id, name: entry.name, extraCopies: entry.extraCopies }))
    .sort((a, b) => b.extraCopies - a.extraCopies || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// --- Top-artiesten -------------------------------------------------------------------------

/** Aantal VERSCHILLENDE artiesten over de hele bibliotheek (alle playlists). Gesleuteld op
 *  artist.id, net als computeTopArtists: twee artiesten met toevallig dezelfde naam tellen dus als
 *  twee. Elke artiest op een track telt mee (ook de featured artiesten van een samenwerking). */
export function countDistinctArtists(snapshot: Snapshot): number {
  const artistIds = new Set<string>();
  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      for (const artist of item.track?.artists ?? []) artistIds.add(artist.id);
    }
  }
  return artistIds.size;
}

export interface ArtistRanking {
  name: string;
  /** Totaal aantal track-entries van deze artiest, over ALLE playlists heen (dus inclusief
   *  dezelfde track die in meerdere playlists staat -- dat telt hier bewust mee: een artiest die
   *  je overal terug laat komen is precies wat "meest voorkomend" betekent). */
  trackCount: number;
  /** Aantal distincte playlists waarin minstens één track van deze artiest voorkomt. */
  playlistCount: number;
}

/** Ranglijst van meest voorkomende artiesten, over de hele bibliotheek (alle playlists, tracks
 *  incl. duplicaten over playlists heen -- zie de docstring bij `trackCount`). Gesleuteld op
 *  artist.id (niet de naam) om artiesten met een toevallig gelijke naam niet samen te voegen, maar
 *  toont de naam voor weergave. */
export function computeTopArtists(snapshot: Snapshot, limit = 20): ArtistRanking[] {
  const byArtistId = new Map<string, { name: string; trackCount: number; playlistIds: Set<string> }>();

  for (const playlist of snapshot.playlists) {
    for (const item of playlist.tracks) {
      const track = item.track;
      if (!track) continue;

      for (const artist of track.artists) {
        let entry = byArtistId.get(artist.id);
        if (!entry) {
          entry = { name: artist.name, trackCount: 0, playlistIds: new Set() };
          byArtistId.set(artist.id, entry);
        }
        entry.trackCount++;
        entry.playlistIds.add(playlist.id);
      }
    }
  }

  return Array.from(byArtistId.values(), (entry) => ({
    name: entry.name,
    trackCount: entry.trackCount,
    playlistCount: entry.playlistIds.size,
  }))
    .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// --- Verdelingen: tracks (niet playlists) per dimensie --------------------------------------
// Elke functie hieronder somt playlist.trackCount (fase 3, Spotify's eigen trackcount) op per
// bucket -- GEEN aparte fs-read, deze werken op de al-verrijkte EnrichedPlaylist[] die de
// dashboard-pagina toch al voor de andere secties inleest.

/** Som van trackCount per wereld (mmc/djcylow/prive) -- zelfde drie buckets als de world-tiles op
 *  /spotify, maar hier het aantal TRACKS in plaats van het aantal playlists per wereld. */
export function sumTracksByWorld(playlists: readonly EnrichedPlaylist[]): Record<SpotifyWorld, number> {
  const sums = Object.fromEntries(SPOTIFY_WORLDS.map((w) => [w, 0])) as Record<SpotifyWorld, number>;
  for (const p of playlists) sums[p.world] += p.trackCount;
  return sums;
}

/** Som van trackCount per MMC-BPM-tier -- scoped tot de MMC-wereld (via filterByWorld, zelfde
 *  scoping als BpmOverviewSection.tsx doet voor de playlist-tellers). "overig" = MMC-playlists
 *  zonder toewijsbare BPM (mmcBpm: null). */
export function sumTracksByMmcBpm(playlists: readonly EnrichedPlaylist[]): Record<MmcBpmTier | "overig", number> {
  const mmcPlaylists = filterByWorld(playlists, "mmc");
  const sums = Object.fromEntries([...MMC_BPM_TIERS, "overig"].map((k) => [k, 0])) as Record<
    MmcBpmTier | "overig",
    number
  >;
  for (const p of mmcPlaylists) sums[p.mmcBpm ?? "overig"] += p.trackCount;
  return sums;
}

/** Som van trackCount per Plutchik-kleur (parsed.color) -- "Zonder kleur" is een aparte, niet in
 *  het record opgenomen restwaarde (zie ColorTrackSum hieronder), zelfde geest als de
 *  "Zonder kleur"-restgroep in groupPlaylists() (playlistFilters.ts). */
export interface ColorTrackSum {
  color: PlutchikColor;
  trackCount: number;
}

export interface ColorDistribution {
  byColor: ColorTrackSum[];
  /** Tracks in playlists zonder herkende kleur. */
  withoutColor: number;
}

export function sumTracksByColor(playlists: readonly EnrichedPlaylist[]): ColorDistribution {
  const sums = Object.fromEntries(PLUTCHIK_COLORS.map((c) => [c, 0])) as Record<PlutchikColor, number>;
  let withoutColor = 0;

  for (const p of playlists) {
    if (p.parsed.color) {
      sums[p.parsed.color] += p.trackCount;
    } else {
      withoutColor += p.trackCount;
    }
  }

  return {
    byColor: PLUTCHIK_COLORS.map((color) => ({ color, trackCount: sums[color] })),
    withoutColor,
  };
}

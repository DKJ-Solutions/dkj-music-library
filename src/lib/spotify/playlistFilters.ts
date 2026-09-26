// Fase 5: de flexibele filter/zoek-logica voor de /spotify-interface. Client-side, puur
// functioneel (geen fs/React hier) zodat de logica los van de UI getest kan worden -- de UI
// (PlaylistManager.tsx) roept alleen deze functies aan en houdt zelf de reactieve state bij.
//
// Werkt op EnrichedPlaylist[] uit enrichedPlaylists.ts (fase 4) -- dit bestand voegt geen nieuwe
// datavelden toe, het filtert/sorteert/zoekt alleen over wat er al is.
//
// HIER ZAT EERDER OOK HET GROEPEREN (2026-07-25 verwijderd op Dave's verzoek): een `groupPlaylists()`
// met een "Groepeer op"-keuze (kleur/type/dichtheid/emotie/status) die de lijst in secties met
// tussenkoppen brak. Dave wil de lijst in zijn geheel zien -- de kleur staat sindsdien als swatch in
// een eigen kolom op elke rij, dus een kleur-tussenkop voegde niets meer toe. Wat ervoor terugkomt is
// `flattenForList()` hieronder: één doorlopende lijst, met de ongesorteerde playlists achteraan.

import type { EnrichedPlaylist } from "./enrichedPlaylists";
import type { PlutchikColor } from "./plutchikColors";
import { SPOTIFY_WORLDS, type SpotifyWorld } from "./classifyWorld";
import { MMC_BPM_TIERS, type MmcBpmTier } from "./classifyBpm";
import { playlistFamily, playlistGenre, playlistSubgenre } from "./playlistGenreLayers";
import type { PlaylistMixInfo } from "@/lib/mixes/playlistMixInfo";

/** De vaste BPM-tiers uit Dave's naamgeving (zie parsePlaylistName.ts's EDM-emmer-familie). */
export const KNOWN_BPM_TIERS = [112, 128, 176] as const;

// HET FILTER OP NAAMGEVINGSFAMILIE IS VERVANGEN (Dave, 2026-07-25): waar hier eerst één
// `types`-filter stond op de typeLabel-families uit de playlistnaam (Music Mood, D&D, OST, Top 100
// ...), staan nu drie filters op Dave's genre-lagen -- `families` (EDM/ROCK/POP/ALT), `genres`
// (House/Drum & Bass/Techno/Nu-Disco) en `subgenres` (Tech House/Liquid Drum & Bass/...), dezelfde
// drie die de tabel als kolom toont. De naamgevingsfamilie zelf blijft bestaan in
// parsePlaylistName.ts en voedt nog steeds de BPM- en wereld-classificatie; ze is alleen niet meer
// filterbaar.
//
// HET STATUS-FILTER IS WEG (Dave, 2026-07-25: "voegt weinig toe"): een `statuses`-filter op
// open/afgerond deed hetzelfde als sorteren op de ✓-kolom, wat sinds de sorteerbare kolomkoppen
// (playlistSort.ts) mogelijk is. `done` blijft een veld op de playlist -- de toggle per rij en de
// teller in de stats-rij zijn ongewijzigd; alleen erop filteren kan niet meer.
export interface PlaylistFilters {
  search: string;
  colors: ReadonlySet<PlutchikColor>;
  /** TYPE -- de bovenste laag, afgeleid (zie playlistGenreLayers.ts). */
  families: ReadonlySet<string>;
  /** GENRE -- uit de gekoppelde mix. */
  genres: ReadonlySet<string>;
  /** SUBGENRE -- uit de gekoppelde mix. */
  subgenres: ReadonlySet<string>;
  /** Heeft deze rij een mix-ID? `"yes"` = gekoppeld aan een mix, `"no"` = lege ID-cel. Beide aan (of
   *  beide uit) betekent "alles", net als bij de andere Set-filters. Praktisch de vraag "welke
   *  playlists weerspiegelen nog geen mix" -- zie playlistMixInfo.ts. */
  mixIds: ReadonlySet<"yes" | "no">;
  densities: ReadonlySet<"Full" | "Light">;
  genders: ReadonlySet<"f" | "m">;
  bpms: ReadonlySet<number>;
}

export function createEmptyFilters(): PlaylistFilters {
  return {
    search: "",
    colors: new Set(),
    families: new Set(),
    genres: new Set(),
    subgenres: new Set(),
    mixIds: new Set(),
    densities: new Set(),
    genders: new Set(),
    bpms: new Set(),
  };
}

/** De stand waarin de tabel opent: leeg, behalve dat **`ID gevuld` op "Ja" staat** (Dave, 2026-07-25:
 *  "de playlisten met ID zijn veel belangrijker dan de playlists zonder ID"). Je begint dus bij de
 *  playlists die een mix weerspiegelen; de rest haal je erbij door "Nee" aan te zetten.
 *
 *  Alleen te gebruiken als er mix-info ís: zonder bron heeft geen enkele rij een ID en zou deze stand
 *  een lege tabel opleveren. Vandaar dat de UI daar op `createEmptyFilters()` terugvalt. */
export function createDefaultFilters(): PlaylistFilters {
  return { ...createEmptyFilters(), mixIds: new Set(["yes"]) };
}

/** Staat de filterbalk nog exact in zijn openingsstand? Gebruikt door de UI om de "wis filters"-actie
 *  te tonen of te verbergen.
 *
 *  Bewust een vergelijking met de standaardstand en niet "is er íets actief": sinds `ID gevuld` standaard
 *  op "Ja" staat, zou die laatste vraag de wis-knop meteen bij het openen laten verschijnen, terwijl er
 *  nog niets te wissen is. `defaults` is de stand waarmee deze weergave is geopend -- met of zonder het
 *  ID-filter, afhankelijk van of er een mix-bron is. */
export function isDefaultFilters(filters: PlaylistFilters, defaults: PlaylistFilters): boolean {
  const zelfdeSet = <T,>(a: ReadonlySet<T>, b: ReadonlySet<T>) =>
    a.size === b.size && [...a].every((waarde) => b.has(waarde));

  return (
    filters.search.trim() === defaults.search.trim() &&
    zelfdeSet(filters.colors, defaults.colors) &&
    zelfdeSet(filters.families, defaults.families) &&
    zelfdeSet(filters.genres, defaults.genres) &&
    zelfdeSet(filters.subgenres, defaults.subgenres) &&
    zelfdeSet(filters.mixIds, defaults.mixIds) &&
    zelfdeSet(filters.densities, defaults.densities) &&
    zelfdeSet(filters.genders, defaults.genders) &&
    zelfdeSet(filters.bpms, defaults.bpms)
  );
}

// Toggle-helper voor een Set-gebaseerd filterveld: aan/uit zetten van één waarde binnen een van
// de PlaylistFilters-Sets, immutable (nieuwe Set, geschikt voor React state).
export function toggleSetFilter<T>(current: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

// --- Zoeken + filteren --------------------------------------------------------------------

/** Cross-playlist zoeken + alle actieve filters, in één doorloop over de lijst.
 *
 *  `mixInfoById` is nodig voor de genre-lagen: GENRE en SUBGENRE zijn alleen bekend via de gekoppelde
 *  mix (lib/mixes/playlistMixInfo.ts), en TYPE valt daarop terug voordat het de playlistnaam probeert.
 *  Zonder mix-info (geen bron gevonden) filteren die drie op niets -- de selects staan dan ook leeg. */
export function filterPlaylists(
  playlists: readonly EnrichedPlaylist[],
  filters: PlaylistFilters,
  mixInfoById: Record<string, PlaylistMixInfo> = {}
): EnrichedPlaylist[] {
  const term = filters.search.trim().toLowerCase();
  const filtertOpMix =
    filters.families.size > 0 ||
    filters.genres.size > 0 ||
    filters.subgenres.size > 0 ||
    filters.mixIds.size > 0;

  return playlists.filter((p) => {
    if (term && !p.name.toLowerCase().includes(term)) return false;
    if (filters.colors.size > 0 && (!p.parsed.color || !filters.colors.has(p.parsed.color))) return false;
    if (filtertOpMix) {
      const mixInfo = mixInfoById[p.id] ?? null;
      if (filters.mixIds.size > 0) {
        // Op de gevulde cel, niet op het bestaan van de koppeling: een mix zonder `id` in de JSON
        // (legacy-entry) toont hier ook een lege cel, en dan hoort hij bij "nee".
        const gevuld: "yes" | "no" = mixInfo?.mixId ? "yes" : "no";
        if (!filters.mixIds.has(gevuld)) return false;
      }
      if (filters.families.size > 0) {
        const family = playlistFamily(p, mixInfo);
        if (!family || !filters.families.has(family)) return false;
      }
      if (filters.genres.size > 0) {
        const genre = playlistGenre(mixInfo);
        if (!genre || !filters.genres.has(genre)) return false;
      }
      if (filters.subgenres.size > 0) {
        const subgenre = playlistSubgenre(mixInfo);
        if (!subgenre || !filters.subgenres.has(subgenre)) return false;
      }
    }
    if (filters.densities.size > 0 && (!p.parsed.density || !filters.densities.has(p.parsed.density))) return false;
    if (filters.genders.size > 0 && (!p.parsed.gender || !filters.genders.has(p.parsed.gender))) return false;
    if (filters.bpms.size > 0 && (!p.parsed.bpm || !filters.bpms.has(p.parsed.bpm))) return false;
    return true;
  });
}

// --- De platte lijst ------------------------------------------------------------------------

/** De lijst zoals de tabel hem toont: één doorlopende reeks, zonder tussenkoppen.
 *
 *  De enige ordening die overblijft is de scheiding die niet met groeperen te maken had: de
 *  ongesorteerde playlists (niet van Dave, of van Dave maar zonder herkend naampatroon -- zie
 *  `sortBucket` in enrichedPlaylists.ts) zakken naar de onderkant. Zij missen juist de dimensies
 *  waar de tabel op leunt, dus bovenaan zouden ze de lijst met lege cellen openen. Binnen elk van
 *  de twee blokken blijft de aangeleverde volgorde intact (stabiel). */
export function flattenForList(playlists: readonly EnrichedPlaylist[]): EnrichedPlaylist[] {
  return [
    ...playlists.filter((p) => p.sortBucket === "gesorteerd"),
    ...playlists.filter((p) => p.sortBucket === "ongesorteerd"),
  ];
}

// HIER STONDEN DE STATS (2026-07-25 verwijderd op Dave's verzoek: "de afgerond & ongesorteerd voegt
// ook erg weinig toe"). Een `computeStats()` leverde total/done/ongesorteerd voor de drie tellers boven
// de tabel. Er is er één van over -- het totaal -- en dat is simpelweg `playlists.length` in
// PlaylistManager.tsx; een functie plus interface plus tests eromheen was daarvoor meer ballast dan
// gemak. De done-vinkjes staan al in de tabel en "ongesorteerd" was de restcategorie van een
// groepering die er niet meer is.

// --- Done-toggle (optimistic update helper) ---------------------------------------------------

/** Immutable done-toggle op de lokale playlist-lijst -- gebruikt vóór/na de POST naar
 *  /api/spotify/done zodat de UI direct reageert (optimistic update) en bij een fout kan
 *  terugdraaien. */
export function withDoneStatus(
  playlists: readonly EnrichedPlaylist[],
  playlistId: string,
  done: boolean
): EnrichedPlaylist[] {
  return playlists.map((p) => (p.id === playlistId ? { ...p, done } : p));
}

// --- Wereld-correctie (optimistic update helper) ----------------------------------------------

/** Immutable wereld-correctie op de lokale playlist-lijst -- zelfde recept als withDoneStatus
 *  hierboven, gebruikt vóór/na de POST naar /api/spotify/world (zowel een correctie als een reset
 *  terug naar "geraden", zie PlaylistManager.tsx). */
export function withWorldOverride(
  playlists: readonly EnrichedPlaylist[],
  playlistId: string,
  world: SpotifyWorld,
  worldIsOverridden: boolean
): EnrichedPlaylist[] {
  return playlists.map((p) => (p.id === playlistId ? { ...p, world, worldIsOverridden } : p));
}

// --- Wereld-tellers ------------------------------------------------------------------------

/** Aantal playlists per wereld -- gebruikt door de nav-tegels op /spotify (zie de opdracht: "een
 *  teller per wereld"). Som van de drie tellers is altijd exact playlists.length -- elke playlist
 *  krijgt precies één effectieve wereld (classifyWorld.ts is een catch-all, nooit "geen"). */
export function countByWorld(playlists: readonly EnrichedPlaylist[]): Record<SpotifyWorld, number> {
  const counts = Object.fromEntries(SPOTIFY_WORLDS.map((w) => [w, 0])) as Record<SpotifyWorld, number>;
  for (const p of playlists) counts[p.world]++;
  return counts;
}

/** Scopet de playlist-lijst tot precies één wereld -- gebruikt door de drie wereld-sub-routes
 *  (WorldPage.tsx) om PlaylistManager op die subset te renderen. Centraal naast countByWorld
 *  hierboven, i.p.v. een inline .filter() in de UI-laag. */
export function filterByWorld(playlists: readonly EnrichedPlaylist[], world: SpotifyWorld): EnrichedPlaylist[] {
  return playlists.filter((p) => p.world === world);
}

// --- BPM-correctie (optimistic update helper) + BPM-tellers/-filter binnen MMC -----------------
// Zelfde recept als de wereld-correctie/-tellers/-filter hierboven, nu voor de BPM-sub-routes
// binnen MMC (musicmoodcolours/<tier>bpm, zie BpmPage.tsx). "overig" is de vangnet-sleutel voor
// mmcBpm === null (geen enkele classifyBpm-regel van toepassing) -- zichtbaar en corrigeerbaar
// i.p.v. stilzwijgend verdwijnend, zie de opdracht.

/** Immutable BPM-correctie op de lokale playlist-lijst -- gebruikt vóór/na de POST naar
 *  /api/spotify/bpm (zowel een correctie als een reset terug naar "geraden"). */
export function withBpmOverride(
  playlists: readonly EnrichedPlaylist[],
  playlistId: string,
  mmcBpm: MmcBpmTier | null,
  mmcBpmIsOverridden: boolean
): EnrichedPlaylist[] {
  return playlists.map((p) => (p.id === playlistId ? { ...p, mmcBpm, mmcBpmIsOverridden } : p));
}

/** Aantal playlists per BPM-tier binnen de meegegeven subset (typisch al gescoped tot MMC via
 *  filterByWorld) -- "overig" telt de playlists zonder toewijsbare BPM. Som van alle tellers is
 *  altijd exact playlists.length. */
export function countByMmcBpm(playlists: readonly EnrichedPlaylist[]): Record<MmcBpmTier | "overig", number> {
  const counts = Object.fromEntries([...MMC_BPM_TIERS, "overig"].map((k) => [k, 0])) as Record<
    MmcBpmTier | "overig",
    number
  >;
  for (const p of playlists) counts[p.mmcBpm ?? "overig"]++;
  return counts;
}

/** Scopet de playlist-lijst tot precies één BPM-tier (of "overig" voor mmcBpm === null) --
 *  gebruikt door de vier BPM-sub-routes (BpmPage.tsx). */
export function filterByMmcBpm(
  playlists: readonly EnrichedPlaylist[],
  bpm: MmcBpmTier | "overig"
): EnrichedPlaylist[] {
  return playlists.filter((p) => (p.mmcBpm ?? "overig") === bpm);
}

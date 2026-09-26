// Sorteren van de playlist-tabel op elke kolom (Dave, 2026-07-25). Puur functioneel, geen React/fs --
// de UI (PlaylistManager.tsx) houdt alleen bij op welke kolom en in welke richting gesorteerd wordt.
//
// Twee bewuste keuzes die het gedrag bepalen:
//
//  1. **Alfabetisch waar het tekst is, numeriek waar het een getal is.** Dave vroeg om alfabetisch
//     sorteren, maar op BPM/Vol/Tracks/ID zou dat 112 · 128 · 176 · 96 opleveren -- "9" komt na "1".
//     De sleutel per kolom bepaalt dus zelf of hij een string of een getal teruggeeft.
//  2. **Lege cellen zakken altijd naar de bodem**, in beide richtingen. Een kolom als ID of GENRE is
//     voor een deel van de rijen leeg (geen gekoppelde mix); die vooraan zetten bij "aflopend" zou de
//     lijst openen met ruis in plaats van met de waarden waarop je sorteert.
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import { WORLD_META } from "./classifyWorld";
import { playlistFamily, playlistGenre, playlistSubgenre } from "./playlistGenreLayers";
import { sortRows, type Sort, type SortKey } from "@/lib/sortRows";
import type { PlaylistMixInfo } from "@/lib/mixes/playlistMixInfo";

// De klik-cyclus en de vergelijkingsregels wonen in lib/sortRows.ts, gedeeld met de tweede tabel
// (MissingMixes). Hier blijft wat van déze tabel is: welke kolommen er zijn en wat een cel als
// sorteerwaarde oplevert.
export { nextSort } from "@/lib/sortRows";
export type { SortDirection } from "@/lib/sortRows";

/** Elke kolom van de tabel, met dezelfde sleutels als de koppenrij in PlaylistManager.tsx. */
export type SortColumn =
  | "world"
  | "type"
  | "bpm"
  | "name"
  | "color"
  | "mixId"
  | "genre"
  | "subgenre"
  | "density"
  | "gender"
  | "volume"
  | "tracks"
  | "done";

export type PlaylistSort = Sort<SortColumn>;

/** De kolommen in tabelvolgorde, met hun kop -- één bron voor de koppenrij én voor de labels in de
 *  aria-teksten, zodat de tabel en de sorteerknoppen niet uit elkaar kunnen lopen. */
export const SORT_COLUMNS: readonly { column: SortColumn; label: string }[] = [
  { column: "world", label: "Wereld" },
  { column: "type", label: "Type" },
  { column: "bpm", label: "BPM" },
  { column: "name", label: "Naam" },
  { column: "color", label: "Kleur" },
  { column: "mixId", label: "ID" },
  { column: "genre", label: "Genre" },
  { column: "subgenre", label: "Subgenre" },
  { column: "density", label: "Dicht." },
  { column: "gender", label: "M/V" },
  { column: "volume", label: "Vol" },
  { column: "tracks", label: "Tracks" },
  { column: "done", label: "✓" },
];

/** De klasse-/CSS-variabelenaam van een kolom (`col-mix-id`, `--col-mix-id`, `data-hidden~="mix-id"`).
 *
 *  Gelijk aan de kolomsleutel, met `mixId` als enige uitzondering: CSS-klassen en de spatie-lijst in
 *  `data-hidden` lezen beter in kebab-case, en HTML maakt attribuutnamen toch al lowercase. Deze ene
 *  functie is de brug tussen de TS-sleutels en `$playlist-cols` in _playlist-list.scss. */
export function columnCssName(column: SortColumn): string {
  return column === "mixId" ? "mix-id" : column;
}

/** De sorteerwaarde van één cel: een string (alfabetisch), een getal (numeriek), of null = leeg.
 *
 *  Leest bewust de **effectieve** waarde, niet de rauwe: de wereld en de MMC-BPM kunnen handmatig
 *  gecorrigeerd zijn, en dan hoort de tabel op de gecorrigeerde waarde te sorteren -- op wat je ziet. */
export function sortKey(
  playlist: EnrichedPlaylist,
  mixInfo: PlaylistMixInfo | null,
  column: SortColumn
): SortKey {
  const { parsed } = playlist;

  switch (column) {
    case "world":
      // Op het label, niet op de sleutel: je sorteert op wat er in het dropdownje staat.
      return WORLD_META[playlist.world].label;
    case "type":
      return playlistFamily(playlist, mixInfo);
    case "bpm":
      // Binnen MMC is de tier de echte waarde (evt. gecorrigeerd); daarbuiten de uit de naam
      // geparsede BPM -- exact wat de cel toont.
      return playlist.world === "mmc" ? playlist.mmcBpm : parsed.bpm;
    case "name":
      return playlist.name;
    case "color":
      return parsed.color;
    case "mixId":
      // "YYYYMMDD" -- als getal sorteren maakt het chronologisch i.p.v. lexicografisch. Bij dit
      // formaat komt dat op hetzelfde neer, maar het blijft kloppen als er ooit een korter ID opduikt.
      return mixInfo ? Number(mixInfo.mixId) || null : null;
    case "genre":
      return playlistGenre(mixInfo);
    case "subgenre":
      return playlistSubgenre(mixInfo);
    case "density":
      return parsed.density;
    case "gender":
      return parsed.gender;
    case "volume":
      // Een `Vol. X`-werkbak heeft geen nummer maar is niet leeg: die hoort ná de genummerde mixen en
      // vóór de playlists zonder Vol.-token. Infinity doet precies dat, zonder aparte tak in compare().
      if (parsed.volume === "X") return Infinity;
      return parsed.volume;
    case "tracks":
      return playlist.trackCount;
    case "done":
      // Open (0) voor afgerond (1) bij oplopend -- de nog te doen playlists bovenaan.
      return playlist.done ? 1 : 0;
  }
}

/** De gefilterde lijst gesorteerd op één kolom -- lege cellen onderaan, stabiel, zonder de invoer te
 *  muteren (zie `sortRows` voor die regels; ze gelden voor beide tabellen op de pagina). */
export function sortPlaylists(
  playlists: readonly EnrichedPlaylist[],
  sort: PlaylistSort,
  mixInfoById: Record<string, PlaylistMixInfo>
): EnrichedPlaylist[] {
  return sortRows(playlists, sort, (playlist, column) =>
    sortKey(playlist, mixInfoById[playlist.id] ?? null, column)
  );
}

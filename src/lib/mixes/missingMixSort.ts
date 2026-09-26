// Sorteren van de tweede tabel op /spotify: de mixen uit de DJ Cylow-bron zonder eigen playlist.
//
// Zelfde opzet als playlistSort.ts voor de hoofdtabel -- de klik-cyclus en de vergelijkingsregels komen
// uit lib/sortRows.ts, hier staat alleen wat van déze tabel is: de kolommen en de sorteerwaarde per cel.
// Dat de twee tabellen die machinerie delen is het punt: lege cellen zakken in beide naar de bodem, en
// een klik doet in beide hetzelfde.
//
// Puur functioneel (geen fs/React), ondanks dat het naast de server-only mix-laag woont: `MissingMix` is
// een plat datatype.
import { sortRows, type Sort, type SortKey } from "@/lib/sortRows";
import type { MissingMix } from "./playlistMixInfo";

export type MissingMixColumn =
  | "bpm"
  | "title"
  | "color"
  | "mixId"
  | "genre"
  | "subgenre"
  | "density"
  | "gender"
  | "volume"
  | "tracks"
  | "reason";

export type MissingMixSort = Sort<MissingMixColumn>;

/** De kolommen in tabelvolgorde met hun kop. Spiegelt de hoofdtabel (zie SORT_COLUMNS in
 *  spotify/playlistSort.ts) op de kolommen die voor een mix bestaan; de laatste staat op de plek van de
 *  done-vink en draagt de uitzondering-vlag. `srLabel` is de leesbare naam voor de aria-tekst, waar het
 *  zichtbare label maar één teken is. */
export const MISSING_MIX_COLUMNS: readonly {
  column: MissingMixColumn;
  label: string;
  srLabel?: string;
}[] = [
  { column: "bpm", label: "BPM" },
  { column: "title", label: "Mix" },
  { column: "color", label: "Kleur" },
  { column: "mixId", label: "ID" },
  { column: "genre", label: "Genre" },
  { column: "subgenre", label: "Subgenre" },
  { column: "density", label: "Dicht." },
  { column: "gender", label: "M/V" },
  { column: "volume", label: "Vol" },
  { column: "tracks", label: "Tr." },
  { column: "reason", label: "!", srLabel: "Niet teruggevonden" },
];

/** De sorteerwaarde van één cel. Numeriek waar het een getal is (bpm/ID/vol/tracks), alfabetisch bij de
 *  rest -- dezelfde afweging als in de hoofdtabel: string-sortering zou 112 · 128 · 176 · 96 opleveren. */
export function missingMixSortKey(mix: MissingMix, column: MissingMixColumn): SortKey {
  switch (column) {
    case "bpm":
      return mix.bpm;
    case "title":
      return mix.title;
    case "color":
      return mix.color;
    case "mixId":
      return Number(mix.mixId) || null;
    case "genre":
      return mix.genre;
    case "subgenre":
      return mix.subgenre;
    case "density":
      return mix.density;
    case "gender":
      return mix.gender;
    case "volume":
      return mix.volume;
    case "tracks":
      return mix.trackCount;
    case "reason":
      // De uitzonderingen bovenaan bij oplopend, in aflopende urgentie: "niet teruggevonden" (0), dan
      // "playlist is van een andere mix" (1), dan de normale "alleen in een emmer" (2). Dat zijn de
      // rijen die aandacht vragen, en dus wat je bij een klik op deze kolom wil zien.
      if (mix.reason === "unmatched") return 0;
      return mix.reason === "claimed-by-other-mix" ? 1 : 2;
  }
}

/** De lijst gesorteerd op één kolom. Zonder sortering geldt de bronordening (nieuwste mix eerst, zie
 *  getPlaylistMixIndex) -- dat is wat `sort === null` in de component betekent. */
export function sortMissingMixes(mixes: readonly MissingMix[], sort: MissingMixSort): MissingMix[] {
  return sortRows(mixes, sort, missingMixSortKey);
}

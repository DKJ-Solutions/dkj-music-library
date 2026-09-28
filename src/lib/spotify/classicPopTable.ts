// De Classic Pop-tabel (/spotify/classic-pop): elk nummer dat in minstens één playlist met "Classic Pop" in
// de naam staat, één keer, met de playlists waarin het zit. De rijen zelf bouwt playlistTableRows.ts, aan de
// serverkant, om dezelfde reden als bij de playlist-tabel: het jaar komt uit releaseYears.ts, en dat bestand
// neemt de database mee.
//
// Pure module: geen fs, geen sqlite -- ook vanuit een client-component te importeren.
import { fold } from "@/lib/library/register";
import type { SortKey } from "@/lib/sortRows";

/** Een Classic Pop-playlist zoals een rij hem noemt: de naam, en die naam zonder "Classic Pop" erachter. */
export interface ClassicPopPlaylistRef {
  id: string;
  name: string;
  /** De naam zonder "Classic Pop" aan het eind ("Cyan Full (f) 🧊"): in een kolom vol Classic Pop-playlists
   *  zegt dat stuk niets. Blijft er niets over, dan is het de hele naam. */
  label: string;
}

export interface ClassicPopRow {
  trackId: string;
  title: string;
  artists: string[];
  album: string;
  /** Het jaar van het nummer, zoals in de playlist-tabel: het vroegste van MusicBrainz, het Trackregister en
   *  het albumjaar (zie playlistTableRows.ts). */
  year: number | null;
  /** Het jaar van het album waar deze versie op staat, zoals Spotify het geeft. */
  albumYear: number | null;
  durationMs: number;
  /** De Classic Pop-playlists waarin het nummer staat, in de volgorde van de snapshot, elk één keer. */
  playlists: ClassicPopPlaylistRef[];
  /** Het vroegste moment waarop het aan één van die playlists is toegevoegd, of null als Spotify geen enkel
   *  moment kent. */
  firstAddedAt: string | null;
}

export type ClassicPopColumn = "title" | "artist" | "album" | "year" | "duration" | "playlists" | "firstAddedAt";

const CLASSIC_POP = /classic\s*pop/i;

/** Hoort deze playlist bij de tabel? Elke playlist met "Classic Pop" ergens in de naam, hoofdletterongevoelig. */
export function isClassicPopPlaylist(name: string): boolean {
  return CLASSIC_POP.test(name);
}

/** De naam van een Classic Pop-playlist zonder "Classic Pop" aan het eind. */
export function classicPopLabel(name: string): string {
  const label = name.replace(/\s*classic\s*pop\s*$/i, "").trim();
  return label === "" ? name : label;
}

/** De sorteerwaarde van een cel, voor sortRows(). */
export function classicPopSortKey(row: ClassicPopRow, column: ClassicPopColumn): SortKey {
  switch (column) {
    case "title":
      return row.title;
    case "artist":
      return row.artists.join(", ");
    case "album":
      return row.album;
    case "year":
      return row.year;
    case "duration":
      return row.durationMs;
    case "playlists":
      return row.playlists.length;
    case "firstAddedAt":
      return row.firstAddedAt;
  }
}

/** De rijen waarin de zoekterm voorkomt in titel, artiest, album of de naam van een playlist (hoofdletter- en
 *  accent-ongevoelig). Zo toont "cyan" alles uit de cyaan-playlists. */
export function filterClassicPopRows(rows: readonly ClassicPopRow[], query: string): ClassicPopRow[] {
  const term = fold(query.trim());
  if (!term) return [...rows];
  return rows.filter((row) =>
    fold([row.title, ...row.artists, row.album, ...row.playlists.map((p) => p.name)].join(" ")).includes(term)
  );
}

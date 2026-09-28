// De tabel van één playlist (eerste gebruiker: /spotify/maple-classic): de rij, de zoekterm en de
// sorteerwaarde per kolom. De rijen zelf bouwt playlistTableRows.ts, aan de serverkant, omdat het jaar
// uit releaseYears.ts komt en dat bestand de database meeneemt.
//
// Pure module: geen fs, geen sqlite -- ook vanuit een client-component te importeren.
import { fold } from "@/lib/library/register";
import type { SortKey } from "@/lib/sortRows";

export interface PlaylistTableRow {
  /** Plek in de playlist, vanaf 1 -- ook de standaardvolgorde van de tabel. */
  position: number;
  trackId: string;
  title: string;
  artists: string[];
  album: string;
  year: number | null;
  durationMs: number;
  /** ISO-tijdstip waarop het nummer aan de playlist is toegevoegd, of null als Spotify het niet kent. */
  addedAt: string | null;
  /** Wie het nummer toevoegde: de Spotify-naam, of het user-id als de snapshot die naam niet kent. null
   *  als Spotify het niet weet (een verwijderd account). */
  addedBy: string | null;
}

export type PlaylistTableColumn = "position" | "title" | "artist" | "album" | "year" | "duration" | "addedAt" | "addedBy";

/** De sorteerwaarde van een cel, voor sortRows(). */
export function playlistSortKey(row: PlaylistTableRow, column: PlaylistTableColumn): SortKey {
  switch (column) {
    case "position":
      return row.position;
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
    case "addedAt":
      return row.addedAt;
    case "addedBy":
      return row.addedBy;
  }
}

/** De rijen waarin de zoekterm voorkomt in titel, artiest, album of toevoeger (hoofdletter- en accent-ongevoelig). */
export function filterPlaylistRows(rows: readonly PlaylistTableRow[], query: string): PlaylistTableRow[] {
  const term = fold(query.trim());
  if (!term) return [...rows];
  return rows.filter((row) => fold([row.title, ...row.artists, row.album, row.addedBy ?? ""].join(" ")).includes(term));
}

/** Een duur als m:ss, of h:mm:ss vanaf een uur. */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** De link naar een nummer op Spotify. */
export function trackUrl(id: string): string {
  return `https://open.spotify.com/track/${encodeURIComponent(id)}`;
}

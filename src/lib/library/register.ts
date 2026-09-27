// HET TRACKREGISTER: de rijen en het filter achter /spotify/trackregister.
//
// De pagina leest de bibliotheek (libraryFile.ts), en die bouwt zich op een verse kloon zelf op uit de
// export in git -- dus het register is op elke machine met de repo te zien, zonder account of sync.
// Hier staat alleen wat de tabel nodig heeft: één compacte rij per track, en het filter op zoekterm,
// dkj_bpm en dkj_album.
//
// Pure module: geen fs, geen sqlite -- ook vanuit een client-component te importeren.
import type { StoredTrack } from "./trackStore";

export interface RegisterRow {
  id: string;
  title: string;
  /** Eigen artiest-ID's, hoofdartiest eerst. */
  artistIds: string[];
  /** De naam bij elk artiest-ID, in dezelfde volgorde (het ID zelf als de naam onbekend is). */
  artistNames: string[];
  artist: string | null;
  albumArtist: string | null;
  bpm: string | null;
  album: string | null;
  file: string | null;
}

/** Filterwaarde voor "geen waarde ingevuld"; geen geldige optie van dkj_bpm of dkj_album. */
export const EMPTY_FILTER = "__leeg__";

export interface RegisterFilter {
  term: string;
  /** "" = alle, EMPTY_FILTER = leeg, anders een optie. */
  bpm: string;
  album: string;
}

const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

export function toRegisterRow(track: StoredTrack, artistNames: Record<string, string>): RegisterRow {
  const ids = Array.isArray(track.dkj_artist_ids)
    ? track.dkj_artist_ids.filter((id): id is string => typeof id === "string")
    : [];
  return {
    id: track.dkj_track_id,
    title: text(track.title) ?? "",
    artistIds: ids,
    artistNames: ids.map((id) => artistNames[id] ?? id),
    artist: text(track.dkj_artist),
    albumArtist: text(track.dkj_albumartiest),
    bpm: text(track.dkj_bpm),
    album: text(track.dkj_album),
    file: text(track.dkj_file),
  };
}

/** Kleine letters, zonder accenten: "Röyksopp" vindt "royksopp". */
export function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Alles waarop gezocht wordt, in één gevouwen string. */
export function searchText(row: RegisterRow): string {
  return fold(
    [row.id, row.title, ...row.artistIds, ...row.artistNames, row.artist, row.albumArtist, row.bpm, row.album, row.file]
      .filter(Boolean)
      .join(" ")
  );
}

const matches = (value: string | null, want: string) =>
  want === "" || (want === EMPTY_FILTER ? value === null : value === want);

/** De rijen die bij het filter passen. `haystacks` is searchText() per rij, vooraf berekend. */
export function filterRegister(
  rows: readonly RegisterRow[],
  haystacks: readonly string[],
  filter: RegisterFilter
): RegisterRow[] {
  const term = fold(filter.term.trim());
  return rows.filter(
    (row, i) =>
      (term === "" || haystacks[i].includes(term)) && matches(row.bpm, filter.bpm) && matches(row.album, filter.album)
  );
}

/** Hoe vaak elke waarde van `key` voorkomt; lege waarden tellen onder EMPTY_FILTER. */
export function countBy(rows: readonly RegisterRow[], key: "bpm" | "album"): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key] ?? EMPTY_FILTER;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

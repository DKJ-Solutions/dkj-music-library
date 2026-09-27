// HET TRACKREGISTER: de rijen en het filter achter /spotify/trackregister.
//
// De pagina leest de bibliotheek (libraryFile.ts), en die bouwt zich op een verse kloon zelf op uit de
// export in git -- dus het register is op elke machine met de repo te zien, zonder account of sync.
// Hier staat alleen wat de tabel nodig heeft: één compacte rij per track, en het filter op zoekterm,
// dkj_bpm en dkj_album.
//
// Pure module: geen fs, geen sqlite -- ook vanuit een client-component te importeren.
import { albumsOfPlaylists } from "./albumFromPlaylists";
import type { PlaylistLink } from "./playlistLink";
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
  /** De albums die de playlists noemen (albumsOfPlaylists). Meer dan één: de playlists verschillen, en
   *  dan blijft `album` leeg tot je zelf kiest. */
  albumCandidates: string[];
  file: string | null;
  /** De eigen groepen (dkj_group), in de volgorde van de options. */
  groups: string[];
  /** De Spotify-playlists waarin de track staat (spotify_playlist). */
  playlists: PlaylistLink[];
}

/** Filterwaarde voor "geen waarde ingevuld"; geen geldige optie van dkj_bpm of dkj_album. */
export const EMPTY_FILTER = "__leeg__";

export interface RegisterFilter {
  term: string;
  /** "" = alle, EMPTY_FILTER = leeg, anders een optie. */
  bpm: string;
  album: string;
  /** Leeg of weggelaten = alle. */
  group?: string;
}

const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

export function toRegisterRow(track: StoredTrack, artistNames: Record<string, string>): RegisterRow {
  const ids = Array.isArray(track.dkj_artist_ids)
    ? track.dkj_artist_ids.filter((id): id is string => typeof id === "string")
    : [];
  const playlists = Array.isArray(track.spotify_playlist)
    ? track.spotify_playlist.filter(
        (p): p is PlaylistLink =>
          typeof p === "object" && p !== null && typeof (p as PlaylistLink).id === "string" && typeof (p as PlaylistLink).name === "string"
      )
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
    albumCandidates: albumsOfPlaylists(playlists.map((p) => p.name)),
    file: text(track.dkj_file),
    groups: Array.isArray(track.dkj_group) ? track.dkj_group.filter((g): g is string => typeof g === "string") : [],
    playlists,
  };
}

/** Kleine letters, zonder accenten: "Röyksopp" vindt "royksopp". */
export function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Alles waarop gezocht wordt, in één gevouwen string. */
export function searchText(row: RegisterRow): string {
  return fold(
    [row.id, row.title, ...row.artistIds, ...row.artistNames, row.artist, row.albumArtist, row.bpm, row.album, ...row.groups, row.file, ...row.playlists.map((p) => p.name)]
      .filter(Boolean)
      .join(" ")
  );
}

const matches = (value: string | null, want: string) =>
  want === "" || (want === EMPTY_FILTER ? value === null : value === want);

/** Een lijst past als hij de gekozen waarde bevat; EMPTY_FILTER past bij een lege lijst. */
const matchesList = (values: readonly string[], want: string) =>
  want === "" || (want === EMPTY_FILTER ? values.length === 0 : values.includes(want));

/** De rijen die bij het filter passen. `haystacks` is searchText() per rij, vooraf berekend. */
export function filterRegister(
  rows: readonly RegisterRow[],
  haystacks: readonly string[],
  filter: RegisterFilter
): RegisterRow[] {
  const term = fold(filter.term.trim());
  return rows.filter(
    (row, i) =>
      (term === "" || haystacks[i].includes(term)) && matches(row.bpm, filter.bpm) &&
      matches(row.album, filter.album) &&
      matchesList(row.groups, filter.group ?? "")
  );
}

/** Hoe vaak elke waarde van `key` voorkomt; lege waarden tellen onder EMPTY_FILTER. */
export function countBy(rows: readonly RegisterRow[], key: "bpm" | "album" | "groups"): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    // Bij een lijst telt de rij mee bij elk van zijn waarden.
    const values = key === "groups" ? (row.groups.length > 0 ? row.groups : [EMPTY_FILTER]) : [row[key] ?? EMPTY_FILTER];
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** De kolommen waarop de tabel kan sorteren; elke kolom van het register. */
export type SortKey = "id" | "file" | "artist" | "albumArtist" | "artistIds" | "playlists" | "bpm" | "album" | "groups";

export interface RegisterSort {
  key: SortKey;
  dir: "asc" | "desc";
}

// Numeriek, zodat 96BPM voor 112BPM komt en PRO2 voor PRO10; hoofdletters en accenten tellen niet.
const collator = new Intl.Collator("nl", { numeric: true, sensitivity: "base" });

/** De tekst waarop een rij sorteert; een lijst op zijn waarden achter elkaar, null als er niets staat. */
function sortValue(row: RegisterRow, key: SortKey): string | null {
  const list = (values: readonly string[]) => (values.length > 0 ? values.join(", ") : null);
  switch (key) {
    case "artistIds":
      return list(row.artistIds);
    case "playlists":
      return list(row.playlists.map((p) => p.name));
    case "groups":
      return list(row.groups);
    default:
      return row[key];
  }
}

/** De rijen gesorteerd op één kolom. Lege cellen staan altijd onderaan, in beide richtingen; gelijke
 *  waarden houden hun volgorde. Zonder sortering komt de lijst ongewijzigd terug. */
export function sortRegister(rows: readonly RegisterRow[], sort: RegisterSort | null): RegisterRow[] {
  if (!sort) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  const keyed = rows.map((row) => ({ row, value: sortValue(row, sort.key) }));
  keyed.sort((a, b) => {
    if (a.value === null || b.value === null) return a.value === b.value ? 0 : a.value === null ? 1 : -1;
    return sign * collator.compare(a.value, b.value);
  });
  return keyed.map((entry) => entry.row);
}
